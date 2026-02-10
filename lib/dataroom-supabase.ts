import { supabase } from "@/lib/supabase";
import type { DataRoomFolder, DataRoomFile } from "@/lib/dataroom-types";
import { slugFromName, uniqueSlug } from "@/lib/dataroom-types";

const BUCKET_NAME = "data-room";

type DbFolder = {
  id: string;
  parent_folder_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  last_modified: string;
  modified_by: string | null;
  is_deleted: boolean;
};

type DbFile = {
  id: string;
  folder_id: string;
  item_type: "file" | "link";
  name: string;
  filename: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  url: string | null;
  last_modified: string;
  modified_by: string | null;
  is_deleted: boolean;
};

function formatModified(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime())
    return "Today at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (dDate.getTime() === yesterday.getTime())
    return "Yesterday at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString() + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function sizeStr(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function dbFileToDataRoomFile(row: DbFile): DataRoomFile {
  return {
    id: row.id,
    name: row.name,
    type: row.item_type,
    size: sizeStr(row.file_size),
    modified: formatModified(row.last_modified),
    modifiedBy: "—",
    sharing: "Shared",
    mimeType: row.file_type ?? undefined,
    description: undefined,
    url: row.url ?? undefined,
    storagePath: row.storage_path ?? undefined,
  };
}

function dbFolderToDataRoomFolder(
  row: DbFolder,
  childFolders: DataRoomFolder[],
  childFiles: DataRoomFile[]
): DataRoomFolder {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    modified: formatModified(row.last_modified),
    modifiedBy: "—",
    sharing: "Shared",
    children: [...childFolders, ...childFiles],
  };
}

/** Fetch full folder + file tree from DB and return root folders (DataRoomFolder[]). */
export async function fetchDataRoomTree(): Promise<DataRoomFolder[]> {
  const [foldersRes, filesRes] = await Promise.all([
    supabase
      .from("folders")
      .select("id, parent_folder_id, name, slug, description, last_modified, modified_by, is_deleted")
      .eq("is_deleted", false),
    supabase
      .from("files")
      .select("id, folder_id, item_type, name, filename, file_type, file_size, storage_path, url, last_modified, modified_by, is_deleted")
      .eq("is_deleted", false),
  ]);

  if (foldersRes.error) throw new Error(foldersRes.error.message);
  if (filesRes.error) throw new Error(filesRes.error.message);

  const folders = (foldersRes.data ?? []) as DbFolder[];
  const files = (filesRes.data ?? []) as DbFile[];

  const fileMap = new Map<string, DataRoomFile>();
  for (const row of files) {
    fileMap.set(row.id, dbFileToDataRoomFile(row));
  }

  const folderRowsByParent = new Map<string | null, DbFolder[]>();
  for (const f of folders) {
    const key = f.parent_folder_id;
    if (!folderRowsByParent.has(key)) folderRowsByParent.set(key, []);
    folderRowsByParent.get(key)!.push(f);
  }

  const filesByFolder = new Map<string, DataRoomFile[]>();
  for (const row of files) {
    const file = fileMap.get(row.id)!;
    if (!filesByFolder.has(row.folder_id)) filesByFolder.set(row.folder_id, []);
    filesByFolder.get(row.folder_id)!.push(file);
  }

  function buildFolder(row: DbFolder): DataRoomFolder {
    const childRows = folderRowsByParent.get(row.id) ?? [];
    const childFolders = childRows.sort((a, b) => a.name.localeCompare(b.name)).map(buildFolder);
    const childFiles = (filesByFolder.get(row.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    return dbFolderToDataRoomFolder(row, childFolders, childFiles);
  }

  const rootRows = (folderRowsByParent.get(null) ?? []).sort((a, b) => a.name.localeCompare(b.name));
  return rootRows.map(buildFolder);
}

/** Create a folder. parentFolderId null = root. Returns new folder id. */
export async function createFolder(
  parentFolderId: string | null,
  name: string,
  existingSiblingSlugs: string[] = []
): Promise<DataRoomFolder> {
  const slug = uniqueSlug(slugFromName(name), existingSiblingSlugs);
  const { data, error } = await supabase
    .from("folders")
    .insert({
      parent_folder_id: parentFolderId,
      name,
      slug,
    })
    .select("id, parent_folder_id, name, slug, description, last_modified, modified_by, is_deleted")
    .single();

  if (error) throw new Error(error.message);
  const row = data as DbFolder;
  return dbFolderToDataRoomFolder(row, [], []);
}

/** Get sibling slugs for a parent (for unique slug when creating folder). */
export async function getSiblingSlugs(parentFolderId: string | null): Promise<string[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("slug")
    .eq("parent_folder_id", parentFolderId ?? null)
    .eq("is_deleted", false);
  if (error) return [];
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

/** Upload a single file to storage and insert into files. Returns DataRoomFile. */
export async function uploadFileToFolder(folderId: string, file: File): Promise<DataRoomFile> {
  const fileId = crypto.randomUUID();
  const path = `${folderId}/${fileId}/${file.name}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("files")
    .insert({
      id: fileId,
      folder_id: folderId,
      item_type: "file",
      name: file.name,
      filename: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      storage_path: path,
    })
    .select("id, folder_id, item_type, name, filename, file_type, file_size, storage_path, url, last_modified, modified_by, is_deleted")
    .single();

  if (error) throw new Error(error.message);
  return dbFileToDataRoomFile(data as DbFile);
}

/** Rename a folder; updates slug to keep it unique among siblings. */
export async function renameFolder(folderId: string, newName: string, siblingSlugs: string[]): Promise<void> {
  const slug = uniqueSlug(slugFromName(newName), siblingSlugs);
  const { error } = await supabase.from("folders").update({ name: newName, slug, last_modified: new Date().toISOString() }).eq("id", folderId);
  if (error) throw new Error(error.message);
}

/** Soft-delete folder. */
export async function deleteFolder(folderId: string): Promise<void> {
  const { error } = await supabase.from("folders").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", folderId);
  if (error) throw new Error(error.message);
}

/** Rename a file. */
export async function renameFile(fileId: string, newName: string): Promise<void> {
  const { error } = await supabase.from("files").update({ name: newName, filename: newName, last_modified: new Date().toISOString() }).eq("id", fileId);
  if (error) throw new Error(error.message);
}

/** Soft-delete file. */
export async function deleteFile(fileId: string): Promise<void> {
  const { error } = await supabase.from("files").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", fileId);
  if (error) throw new Error(error.message);
}
