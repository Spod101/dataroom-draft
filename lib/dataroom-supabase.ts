import { supabase } from "@/lib/supabase";
import { withRetry } from "@/lib/retry-utils";
import type { DataRoomFolder, DataRoomFile } from "@/lib/dataroom-types";
import { slugFromName, uniqueSlug } from "@/lib/dataroom-types";
import { preserveExtensionOnRename } from "@/lib/dataroom-utils";

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
  order_index: number | null;
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

type AuditTargetType = "folder" | "file" | "permission";
type FileEventType = "view" | "download";

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

function dbFileToDataRoomFile(row: DbFile, userDisplayNames: Map<string, string>): DataRoomFile {
  return {
    id: row.id,
    name: row.name,
    type: row.item_type,
    size: sizeStr(row.file_size),
    modified: formatModified(row.last_modified),
    modifiedIso: row.last_modified ?? undefined,
    modifiedBy: (row.modified_by && userDisplayNames.get(row.modified_by)) ?? "—",
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
  childFiles: DataRoomFile[],
  userDisplayNames: Map<string, string>,
  itemCountOverride?: number,
  subfolderCountOverride?: number
): DataRoomFolder {
  const children = [...childFolders, ...childFiles];
  const itemCount = typeof itemCountOverride === "number" ? itemCountOverride : children.length;
  const subfolderCount =
    typeof subfolderCountOverride === "number"
      ? subfolderCountOverride
      : childFolders.length;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    modified: formatModified(row.last_modified),
    modifiedIso: row.last_modified ?? undefined,
    modifiedBy: (row.modified_by && userDisplayNames.get(row.modified_by)) ?? "—",
    sharing: "Shared",
    children,
    itemCount,
    subfolderCount,
    orderIndex: row.order_index ?? undefined,
  };
}

/** Fetch display names for user ids (from users table). */
async function fetchUserDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", unique);
  if (error) return new Map();
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const r = row as { id: string; name: string | null };
    map.set(r.id, r.name?.trim() || "Unknown");
  }
  return map;
}

export async function fetchRootFolders(): Promise<DataRoomFolder[]> {
  return withRetry(async () => {
    const { data: folders, error: foldersError } = await supabase
      .from("folders")
      .select("id, parent_folder_id, name, slug, description, last_modified, modified_by, is_deleted, order_index")
      .is("parent_folder_id", null)
      .eq("is_deleted", false)
      .order("order_index", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (foldersError) throw new Error(foldersError.message);

    const folderRows = (folders ?? []) as DbFolder[];
    const modifiedByIds = folderRows.map((f) => f.modified_by).filter(Boolean) as string[];

    // Pre-compute item counts (direct children) for each root folder
    const rootFolderIds = folderRows.map((f) => f.id);
    const [childFoldersRes, childFilesRes] = await Promise.all([
      supabase
        .from("folders")
        .select("id, parent_folder_id, is_deleted")
        .in("parent_folder_id", rootFolderIds)
        .eq("is_deleted", false),
      supabase
        .from("files")
        .select("id, folder_id, is_deleted")
        .in("folder_id", rootFolderIds)
        .eq("is_deleted", false),
    ]);

    if (childFoldersRes.error) throw new Error(childFoldersRes.error.message);
    if (childFilesRes.error) throw new Error(childFilesRes.error.message);

    const childFolderRows = (childFoldersRes.data ?? []) as { parent_folder_id: string | null }[];
    const childFileRows = (childFilesRes.data ?? []) as { folder_id: string }[];

    const itemCounts = new Map<string, number>();
    const subfolderCounts = new Map<string, number>();
    for (const row of childFolderRows) {
      const parentId = row.parent_folder_id;
      if (!parentId) continue;
      itemCounts.set(parentId, (itemCounts.get(parentId) ?? 0) + 1);
      subfolderCounts.set(parentId, (subfolderCounts.get(parentId) ?? 0) + 1);
    }
    for (const row of childFileRows) {
      const folderId = row.folder_id;
      itemCounts.set(folderId, (itemCounts.get(folderId) ?? 0) + 1);
    }

    const userDisplayNames = await fetchUserDisplayNames(modifiedByIds);

    return folderRows.map((row) =>
      dbFolderToDataRoomFolder(
        row,
        [],
        [],
        userDisplayNames,
        itemCounts.get(row.id) ?? 0,
        subfolderCounts.get(row.id) ?? 0
      )
    );
  });
}
export async function fetchFolderChildren(folderId: string): Promise<{ folders: DataRoomFolder[]; files: DataRoomFile[] }> {
  return withRetry(async () => {
    const [foldersRes, filesRes] = await Promise.all([
      supabase
        .from("folders")
        .select("id, parent_folder_id, name, slug, description, last_modified, modified_by, is_deleted, order_index")
        .eq("parent_folder_id", folderId)
        .eq("is_deleted", false)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
      supabase
        .from("files")
        .select("id, folder_id, item_type, name, filename, file_type, file_size, storage_path, url, last_modified, modified_by, is_deleted")
        .eq("folder_id", folderId)
        .eq("is_deleted", false)
        .order("name", { ascending: true }),
    ]);

    if (foldersRes.error) throw new Error(foldersRes.error.message);
    if (filesRes.error) throw new Error(filesRes.error.message);

    const folderRows = (foldersRes.data ?? []) as DbFolder[];
    const fileRows = (filesRes.data ?? []) as DbFile[];

    const modifiedByIds = [
      ...folderRows.map((f) => f.modified_by).filter(Boolean),
      ...fileRows.map((f) => f.modified_by).filter(Boolean),
    ] as string[];

    // Pre-compute item counts and subfolder counts for each child folder we are returning.
    const childFolderIds = folderRows.map((f) => f.id);
    let itemCounts = new Map<string, number>();
    let subfolderCounts = new Map<string, number>();
    if (childFolderIds.length > 0) {
      const [grandchildFoldersRes, grandchildFilesRes] = await Promise.all([
        supabase
          .from("folders")
          .select("id, parent_folder_id, is_deleted")
          .in("parent_folder_id", childFolderIds)
          .eq("is_deleted", false),
        supabase
          .from("files")
          .select("id, folder_id, is_deleted")
          .in("folder_id", childFolderIds)
          .eq("is_deleted", false),
      ]);

      if (grandchildFoldersRes.error) throw new Error(grandchildFoldersRes.error.message);
      if (grandchildFilesRes.error) throw new Error(grandchildFilesRes.error.message);

      const grandchildFolderRows = (grandchildFoldersRes.data ?? []) as { parent_folder_id: string | null }[];
      const grandchildFileRows = (grandchildFilesRes.data ?? []) as { folder_id: string }[];

      itemCounts = new Map<string, number>();
      subfolderCounts = new Map<string, number>();
      for (const row of grandchildFolderRows) {
        const parentId = row.parent_folder_id;
        if (!parentId) continue;
        itemCounts.set(parentId, (itemCounts.get(parentId) ?? 0) + 1);
        subfolderCounts.set(parentId, (subfolderCounts.get(parentId) ?? 0) + 1);
      }
      for (const row of grandchildFileRows) {
        const folderId = row.folder_id;
        itemCounts.set(folderId, (itemCounts.get(folderId) ?? 0) + 1);
      }
    }

    const userDisplayNames = await fetchUserDisplayNames(modifiedByIds);

    const folders = folderRows.map((row) =>
      dbFolderToDataRoomFolder(
        row,
        [],
        [],
        userDisplayNames,
        itemCounts.get(row.id) ?? 0,
        subfolderCounts.get(row.id) ?? 0
      )
    );
    const files = fileRows.map((row) => dbFileToDataRoomFile(row, userDisplayNames));

    return { folders, files };
  });
}

/** 
 * Fetch full folder + file tree from DB and return root folders (DataRoomFolder[]).
 * LEGACY: Use fetchRootFolders() + fetchFolderChildren() for better performance.
 * Kept for backward compatibility.
 */
export async function fetchDataRoomTree(): Promise<DataRoomFolder[]> {
  const [foldersRes, filesRes] = await Promise.all([
    supabase
      .from("folders")
      .select("id, parent_folder_id, name, slug, description, last_modified, modified_by, is_deleted, order_index")
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

  const modifiedByIds = [
    ...folders.map((f) => f.modified_by).filter(Boolean),
    ...files.map((f) => f.modified_by).filter(Boolean),
  ] as string[];
  const userDisplayNames = await fetchUserDisplayNames(modifiedByIds);

  const fileMap = new Map<string, DataRoomFile>();
  for (const row of files) {
    fileMap.set(row.id, dbFileToDataRoomFile(row, userDisplayNames));
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
    const childFolders = childRows
      .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999) || a.name.localeCompare(b.name))
      .map(buildFolder);
    const childFiles = (filesByFolder.get(row.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    return dbFolderToDataRoomFolder(row, childFolders, childFiles, userDisplayNames);
  }

  const rootRows = (folderRowsByParent.get(null) ?? [])
    .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999) || a.name.localeCompare(b.name));
  return rootRows.map(buildFolder);
}

/** Get current user id from session (for modified_by). */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

async function getCurrentUserRole(): Promise<"admin" | "user" | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { role: "admin" | "user" }).role ?? null;
}

async function insertAuditLog(params: {
  action: string;
  targetType: AuditTargetType;
  targetId?: string | null;
  folderId?: string | null;
  fileId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    folder_id: params.folderId ?? null,
    file_id: params.fileId ?? null,
    details: params.details ?? {},
  });
  if (error) {
    // Do not block the main action on audit failures.
    // eslint-disable-next-line no-console
    console.error("Failed to insert audit_log entry", error);
  }
}

async function insertFileEvent(params: {
  eventType: FileEventType;
  fileId: string;
  folderId?: string | null;
}): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from("file_events").insert({
    user_id: userId,
    event_type: params.eventType,
    file_id: params.fileId,
    folder_id: params.folderId ?? null,
    details: {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to insert file_events entry", error);
  }
}

export async function logAuditEvent(
  action: string,
  targetType: AuditTargetType,
  options: {
    targetId?: string | null;
    folderId?: string | null;
    fileId?: string | null;
    details?: Record<string, unknown>;
  } = {}
): Promise<void> {
  await insertAuditLog({
    action,
    targetType,
    targetId: options.targetId ?? null,
    folderId: options.folderId ?? null,
    fileId: options.fileId ?? null,
    details: options.details ?? {},
  });
}

export async function trackFileEvent(
  eventType: FileEventType,
  fileId: string,
  folderId?: string | null
): Promise<void> {
  await insertFileEvent({ eventType, fileId, folderId: folderId ?? null });
}

async function canCurrentUserEditFolder(folderId: string): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (role === "admin") return true;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { data, error } = await supabase
    .from("permissions")
    .select("can_edit")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .maybeSingle();

  if (error || !data) return false;
  return !!(data as { can_edit: boolean | null }).can_edit;
}

async function canCurrentUserEditFile(fileId: string): Promise<boolean> {
  const role = await getCurrentUserRole();
  if (role === "admin") return true;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  // File-level permission
  const { data: filePerm, error: filePermErr } = await supabase
    .from("permissions")
    .select("can_edit")
    .eq("user_id", userId)
    .eq("file_id", fileId)
    .maybeSingle();
  if (filePermErr) return false;
  if (filePerm && (filePerm as { can_edit: boolean | null }).can_edit) return true;

  // Folder-level permission (requires we can read the file row)
  const { data: fileRow, error: fileRowErr } = await supabase
    .from("files")
    .select("folder_id")
    .eq("id", fileId)
    .maybeSingle();
  if (fileRowErr || !fileRow) return false;
  const folderId = (fileRow as { folder_id: string }).folder_id;
  return await canCurrentUserEditFolder(folderId);
}

async function assertCanEditFolder(folderId: string, action: string): Promise<void> {
  const ok = await canCurrentUserEditFolder(folderId);
  if (!ok) throw new Error(`You don't have permission to ${action} in this folder.`);
}

async function assertCanEditFile(fileId: string, action: string): Promise<void> {
  const ok = await canCurrentUserEditFile(fileId);
  if (!ok) throw new Error(`You don't have permission to ${action} this file.`);
}

/** Create a folder. parentFolderId null = root. Returns new folder. */
export async function createFolder(
  parentFolderId: string | null,
  name: string,
  existingSiblingSlugs: string[] = []
): Promise<DataRoomFolder> {
  // Root folder creation: allow admins only (unless you add a "root edit" concept).
  if (parentFolderId) {
    await assertCanEditFolder(parentFolderId, "create folders");
  } else {
    const role = await getCurrentUserRole();
    if (role !== "admin") throw new Error("You don't have permission to create root folders.");
  }

  const slug = uniqueSlug(slugFromName(name), existingSiblingSlugs);
  const now = new Date().toISOString();
  const modifiedBy = await getCurrentUserId();
  const { data, error } = await supabase
    .from("folders")
    .insert({
      parent_folder_id: parentFolderId,
      name,
      slug,
      last_modified: now,
      modified_by: modifiedBy,
    })
    .select("id, parent_folder_id, name, slug, description, last_modified, modified_by, is_deleted")
    .single();

  if (error) throw new Error(error.message);
  const row = data as DbFolder;
  await logAuditEvent("folder.create", "folder", {
    targetId: row.id,
    folderId: row.id,
    details: { name },
  });
  const userDisplayNames = modifiedBy ? await fetchUserDisplayNames([modifiedBy]) : new Map<string, string>();
  return dbFolderToDataRoomFolder(row, [], [], userDisplayNames, 0);
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
  await assertCanEditFolder(folderId, "upload files");

  const fileId = crypto.randomUUID();
  const path = `${folderId}/${fileId}/${file.name}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, file);
  if (uploadError) throw new Error(uploadError.message);

  const now = new Date().toISOString();
  const modifiedBy = await getCurrentUserId();
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
      last_modified: now,
      modified_by: modifiedBy,
    })
    .select("id, folder_id, item_type, name, filename, file_type, file_size, storage_path, url, last_modified, modified_by, is_deleted")
    .single();

  if (error) throw new Error(error.message);
  const row = data as DbFile;
  await logAuditEvent("file.upload", "file", {
    targetId: row.id,
    folderId,
    fileId: row.id,
    details: {
      name: file.name,
      size: file.size,
      type: file.type || null,
    },
  });
  const userDisplayNames = modifiedBy ? await fetchUserDisplayNames([modifiedBy]) : new Map<string, string>();
  return dbFileToDataRoomFile(row, userDisplayNames);
}

/** Rename a folder; updates slug to keep it unique among siblings. */
export async function renameFolder(folderId: string, newName: string, siblingSlugs: string[]): Promise<void> {
  await assertCanEditFolder(folderId, "rename folders");
  
  // Get old name before renaming
  const { data: oldData } = await supabase
    .from("folders")
    .select("name")
    .eq("id", folderId)
    .maybeSingle();
  const oldName = oldData ? (oldData as { name: string }).name : undefined;
  
  const slug = uniqueSlug(slugFromName(newName), siblingSlugs);
  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("folders")
    .update({ name: newName, slug, last_modified: new Date().toISOString(), modified_by: modifiedBy })
    .eq("id", folderId);
  if (error) throw new Error(error.message);
  await logAuditEvent("folder.rename", "folder", {
    targetId: folderId,
    folderId,
    details: { oldName, newName },
  });
}

/** Soft-delete folder. */
export async function deleteFolder(folderId: string): Promise<void> {
  await assertCanEditFolder(folderId, "delete folders");
  const { data: folderData } = await supabase
    .from("folders")
    .select("name")
    .eq("id", folderId)
    .maybeSingle();
  const folderName = folderData ? ((folderData as { name: string | null }).name ?? undefined) : undefined;
  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("folders")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: modifiedBy,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", folderId);
  if (error) throw new Error(error.message);
  await logAuditEvent("folder.delete", "folder", {
    targetId: folderId,
    folderId,
    details: folderName ? { name: folderName } : undefined,
  });
}

/** Rename a file.
 * If the user omits the file extension when renaming (e.g. "report" instead of "report.pdf"),
 * we automatically preserve the original extension so downloads keep a recognizable file type.
 */
export async function renameFile(fileId: string, newName: string): Promise<void> {
  await assertCanEditFile(fileId, "rename");
  
  // Get old file data before renaming
  const { data: oldData } = await supabase
    .from("files")
    .select("name, storage_path, item_type")
    .eq("id", fileId)
    .maybeSingle();
  
  if (!oldData) throw new Error("File not found");
  const oldName = (oldData as { name: string; storage_path: string | null; item_type: string }).name;
  const oldStoragePath = (oldData as { name: string; storage_path: string | null; item_type: string }).storage_path;
  const itemType = (oldData as { name: string; storage_path: string | null; item_type: string }).item_type;

  // Normalize and preserve extension when user doesn't supply one
  const finalNewName = preserveExtensionOnRename(newName, oldName);
  
  let newStoragePath = oldStoragePath;
  
  // If this is a file (not a link) and has a storage path, rename the physical file in storage
  if (itemType === "file" && oldStoragePath) {
    // Extract folder and file ID from old path: {folderId}/{fileId}/{oldFilename}
    const pathParts = oldStoragePath.split("/");
    if (pathParts.length >= 3) {
      const folderId = pathParts[0];
      const storedFileId = pathParts[1];
      newStoragePath = `${folderId}/${storedFileId}/${finalNewName}`;
      
      // Copy file to new path in storage
      const { error: copyError } = await supabase.storage
        .from(BUCKET_NAME)
        .copy(oldStoragePath, newStoragePath);
      
      if (copyError) throw new Error(`Failed to rename file in storage: ${copyError.message}`);
      
      // Delete old file from storage
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([oldStoragePath]);
      
      if (deleteError) {
        // Log warning but don't fail - the new file exists
        console.warn(`Warning: Could not delete old file from storage: ${deleteError.message}`);
      }
    }
  }
  
  // Update database with new name and storage path
  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("files")
    .update({
      name: finalNewName,
      filename: finalNewName,
      storage_path: newStoragePath,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", fileId);
  if (error) throw new Error(error.message);
  await logAuditEvent("file.rename", "file", {
    targetId: fileId,
    fileId,
    details: { oldName, newName: finalNewName },
  });
}

/** Soft-delete file. */
export async function deleteFile(fileId: string): Promise<void> {
  await assertCanEditFile(fileId, "delete");
  const { data: fileData } = await supabase
    .from("files")
    .select("name")
    .eq("id", fileId)
    .maybeSingle();
  const fileName = fileData ? ((fileData as { name: string | null }).name ?? undefined) : undefined;
  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("files")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: modifiedBy,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", fileId);
  if (error) throw new Error(error.message);
  await logAuditEvent("file.delete", "file", {
    targetId: fileId,
    fileId,
    details: fileName ? { name: fileName } : undefined,
  });
}

// -------- Trash helpers --------

type TrashFolderRow = {
  id: string;
  parent_folder_id: string | null;
  name: string;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_name?: string;
};

type TrashFileRow = {
  id: string;
  folder_id: string;
  name: string;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_name?: string;
};

export type TrashSummary = {
  folders: TrashFolderRow[];
  files: TrashFileRow[];
};

/** List soft-deleted folders and files for the current project. */
export async function listTrash(): Promise<TrashSummary> {
  const [foldersRes, filesRes] = await Promise.all([
    supabase
      .from("folders")
      .select("id, parent_folder_id, name, deleted_at, deleted_by")
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false }),
    supabase
      .from("files")
      .select("id, folder_id, name, deleted_at, deleted_by")
      .eq("is_deleted", true)
      .order("deleted_at", { ascending: false }),
  ]);

  if (foldersRes.error) throw new Error(foldersRes.error.message);
  if (filesRes.error) throw new Error(filesRes.error.message);

  const folders = (foldersRes.data ?? []) as TrashFolderRow[];
  const files = (filesRes.data ?? []) as TrashFileRow[];

  // Get all unique user IDs who deleted items
  const userIds = Array.from(
    new Set([
      ...folders.map((f) => f.deleted_by).filter(Boolean),
      ...files.map((f) => f.deleted_by).filter(Boolean),
    ] as string[])
  );

  // Fetch user names
  const userDisplayNames = await fetchUserDisplayNames(userIds);

  // Attach user names to folders and files
  const foldersWithNames = folders.map((folder) => ({
    ...folder,
    deleted_by_name: folder.deleted_by ? userDisplayNames.get(folder.deleted_by) : undefined,
  }));

  const filesWithNames = files.map((file) => ({
    ...file,
    deleted_by_name: file.deleted_by ? userDisplayNames.get(file.deleted_by) : undefined,
  }));

  return {
    folders: foldersWithNames,
    files: filesWithNames,
  };
}
export async function restoreFolder(folderId: string): Promise<void> {
  await assertCanEditFolder(folderId, "restore folders");

  const { data: folderData, error: folderError } = await supabase
    .from("folders")
    .select("name, parent_folder_id")
    .eq("id", folderId)
    .maybeSingle();

  if (folderError || !folderData) throw new Error("Folder not found");

  const folderRow = folderData as { name: string | null; parent_folder_id: string | null };
  const folderName = folderRow.name ?? "Untitled folder";
  const parentFolderId = folderRow.parent_folder_id;

  // Check for an existing non-deleted sibling with the same name
  let conflictQuery = supabase
    .from("folders")
    .select("id")
    .eq("name", folderName)
    .eq("is_deleted", false)
    .neq("id", folderId);

  if (parentFolderId === null) {
    conflictQuery = conflictQuery.is("parent_folder_id", null);
  } else {
    conflictQuery = conflictQuery.eq("parent_folder_id", parentFolderId);
  }

  const { data: conflict, error: conflictError } = await conflictQuery.maybeSingle();
  if (conflictError) throw new Error(conflictError.message);
  if (conflict) {
    throw new Error(
      `A folder named "${folderName}" already exists in this location. Rename or remove it before restoring.`
    );
  }

  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("folders")
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", folderId);
  if (error) throw new Error(error.message);

  await logAuditEvent("folder.restore", "folder", {
    targetId: folderId,
    folderId,
    details: folderName ? { name: folderName } : undefined,
  });
}

/** Restore a soft-deleted file from trash.
 * Enforces unique file names within a folder by blocking restore if a
 * non-deleted file in the same folder already has the same name.
 */
export async function restoreFile(fileId: string): Promise<void> {
  await assertCanEditFile(fileId, "restore");

  const { data: fileData, error: fileError } = await supabase
    .from("files")
    .select("name, folder_id")
    .eq("id", fileId)
    .maybeSingle();

  if (fileError || !fileData) throw new Error("File not found");

  const fileRow = fileData as { name: string | null; folder_id: string };
  const fileName = fileRow.name ?? "Untitled";
  const folderId = fileRow.folder_id;

  // Check for an existing non-deleted file with the same name in this folder
  const { data: conflict, error: conflictError } = await supabase
    .from("files")
    .select("id")
    .eq("folder_id", folderId)
    .eq("name", fileName)
    .eq("is_deleted", false)
    .neq("id", fileId)
    .maybeSingle();

  if (conflictError) throw new Error(conflictError.message);
  if (conflict) {
    throw new Error(
      `A file named "${fileName}" already exists in this folder. Rename or remove it before restoring.`
    );
  }

  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("files")
    .update({
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", fileId);
  if (error) throw new Error(error.message);

  await logAuditEvent("file.restore", "file", {
    targetId: fileId,
    fileId,
    details: fileName ? { name: fileName } : undefined,
  });
}

/** Permanently delete a folder (admin / editor only, RLS enforced). */
export async function hardDeleteFolder(folderId: string): Promise<void> {
  await assertCanEditFolder(folderId, "permanently delete folders");
  const { data: folderData } = await supabase
    .from("folders")
    .select("name")
    .eq("id", folderId)
    .maybeSingle();
  const folderName = folderData ? ((folderData as { name: string | null }).name ?? undefined) : undefined;
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw new Error(error.message);
  // Log after delete: use folder_id null (folder no longer exists) and targetId/details for ID
  await logAuditEvent("folder.hard_delete", "folder", {
    targetId: folderId,
    folderId: null,
    details: { deleted_folder_id: folderId, ...(folderName ? { name: folderName } : {}) },
  });
}

/** Permanently delete a file (admin / editor only, RLS enforced). */
export async function hardDeleteFile(fileId: string): Promise<void> {
  await assertCanEditFile(fileId, "permanently delete");
  const { data: fileData } = await supabase
    .from("files")
    .select("name")
    .eq("id", fileId)
    .maybeSingle();
  const fileName = fileData ? ((fileData as { name: string | null }).name ?? undefined) : undefined;
  const { error } = await supabase.from("files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
  // Log after delete: use file_id null (file no longer exists) and targetId/details for ID
  await logAuditEvent("file.hard_delete", "file", {
    targetId: fileId,
    fileId: null,
    details: { deleted_file_id: fileId, ...(fileName ? { name: fileName } : {}) },
  });
}

/** Update folder order indexes (for drag-to-reorder). */
export async function updateFolderOrder(updates: Array<{ id: string; orderIndex: number }>): Promise<void> {
  // Update each folder's order_index
  const promises = updates.map(({ id, orderIndex }) =>
    supabase
      .from("folders")
      .update({ order_index: orderIndex })
      .eq("id", id)
  );
  
  const results = await Promise.all(promises);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

/** Move file to a different folder. */
export async function moveFileToFolder(
  fileId: string,
  newFolderId: string
): Promise<void> {
  // Check permission to edit the file being moved
  await assertCanEditFile(fileId, "move");
  
  // Check permission to edit the destination folder
  await assertCanEditFolder(newFolderId, "move files into");
  
  // Get current file info (including old folder)
  const { data: fileData, error: fileError } = await supabase
    .from("files")
    .select("name, folder_id")
    .eq("id", fileId)
    .eq("is_deleted", false)
    .maybeSingle();
  
  if (fileError || !fileData) throw new Error("File not found");
  
  const oldFolderId = (fileData as { folder_id: string }).folder_id;
  const fileName = (fileData as { name: string }).name;
  
  // Get old folder name
  const { data: oldFolderData } = await supabase
    .from("folders")
    .select("name")
    .eq("id", oldFolderId)
    .maybeSingle();
  const oldFolderName = oldFolderData ? (oldFolderData as { name: string }).name : "Unknown";
  
  // Get new folder name
  const { data: newFolderData, error: newFolderError } = await supabase
    .from("folders")
    .select("name")
    .eq("id", newFolderId)
    .eq("is_deleted", false)
    .maybeSingle();
  
  if (newFolderError || !newFolderData) throw new Error("Target folder not found");
  const newFolderName = (newFolderData as { name: string }).name;
  
  const modifiedBy = await getCurrentUserId();
  const { error } = await supabase
    .from("files")
    .update({
      folder_id: newFolderId,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", fileId);
    
  if (error) throw new Error(error.message);
  
  await logAuditEvent("file.move", "file", {
    targetId: fileId,
    fileId,
    details: {
      fileName,
      oldFolderId,
      oldFolderName,
      newFolderId,
      newFolderName,
      description: `Moved "${fileName}" from "${oldFolderName}" to "${newFolderName}"`,
    },
  });
}

/** Move folder to a different parent (null = root). */
export async function moveFolderToParent(
  folderId: string,
  newParentId: string | null,
  orderIndex: number
): Promise<void> {
  // Check permission to edit the folder being moved
  await assertCanEditFolder(folderId, "move folders");
  
  // Check permission to edit the destination folder (if not root)
  if (newParentId) {
    await assertCanEditFolder(newParentId, "move folders into");
  }
  
  // Get current folder info (including old parent)
  const { data: folderData, error: folderError } = await supabase
    .from("folders")
    .select("name, parent_folder_id")
    .eq("id", folderId)
    .eq("is_deleted", false)
    .maybeSingle();
  
  if (folderError || !folderData) throw new Error("Folder not found");
  
  const oldParentId = (folderData as { parent_folder_id: string | null }).parent_folder_id;
  const folderName = (folderData as { name: string }).name;
  
  // Get old parent name (if exists)
  let oldParentName = "Root";
  if (oldParentId) {
    const { data: oldParentData } = await supabase
      .from("folders")
      .select("name")
      .eq("id", oldParentId)
      .maybeSingle();
    if (oldParentData) {
      oldParentName = (oldParentData as { name: string }).name;
    }
  }
  
  // Get new parent name (if exists)
  let newParentName = "Root";
  if (newParentId) {
    const { data: newParentData, error } = await supabase
      .from("folders")
      .select("name")
      .eq("id", newParentId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (error || !newParentData) throw new Error("Target folder not found");
    newParentName = (newParentData as { name: string }).name;
  }
  
  const modifiedBy = await getCurrentUserId();
  
  console.log("Attempting to move folder:", {
    folderId,
    oldParentId,
    newParentId,
    orderIndex,
    modifiedBy
  });
  
  const { data: updateResult, error } = await supabase
    .from("folders")
    .update({
      parent_folder_id: newParentId,
      order_index: orderIndex,
      last_modified: new Date().toISOString(),
      modified_by: modifiedBy,
    })
    .eq("id", folderId)
    .select();
    
  console.log("Folder move result:", { updateResult, error });
    
  if (error) {
    console.error("Folder move error:", error);
    throw new Error(error.message);
  }
  
  if (!updateResult || updateResult.length === 0) {
    console.error("No rows updated - folder might not exist or RLS policy blocked the update");
    throw new Error("Failed to update folder - no rows affected");
  }
  
  await logAuditEvent("folder.move", "folder", {
    targetId: folderId,
    folderId,
    details: {
      folderName,
      oldParentId,
      oldParentName,
      newParentId,
      newParentName,
      description: `Moved "${folderName}" from "${oldParentName}" to "${newParentName}"`,
    },
  });
}

// ============================================================================
// Share Links
// ============================================================================

export type ShareLink = {
  id: string;
  token: string;
  target_type: "file" | "folder";
  target_id: string;
  created_by: string;
  expires_at: string | null;
  password_hash: string | null;
  require_email: boolean;
  require_nda: boolean;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Generate a secure random token for share links.
 */
function generateShareToken(): string {
  // Generate a URL-safe random token (32 chars)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Create a new share link for a file or folder.
 * Always creates a new link (new token each time).
 */
export async function createShareLink(params: {
  targetType: "file" | "folder";
  targetId: string;
  expiresAt?: string | null; // ISO date string (date only, end of day)
}): Promise<ShareLink> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  // If expiresAt is provided (date only), set to end of day
  let expiresAtValue: string | null = null;
  if (params.expiresAt) {
    const date = new Date(params.expiresAt);
    date.setHours(23, 59, 59, 999); // End of day
    expiresAtValue = date.toISOString();
  }

  const token = generateShareToken();
  const { data, error } = await supabase
    .from("share_links")
    .insert({
      token,
      target_type: params.targetType,
      target_id: params.targetId,
      created_by: userId,
      expires_at: expiresAtValue,
      require_email: true, // Always require email
      require_nda: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create share link: ${error.message}`);

  await logAuditEvent("share_link.create", params.targetType === "folder" ? "folder" : "file", {
    targetId: params.targetId,
    folderId: params.targetType === "folder" ? params.targetId : null,
    fileId: params.targetType === "file" ? params.targetId : null,
    details: { token, expiresAt: expiresAtValue },
  });

  return data as ShareLink;
}

/**
 * Revoke a share link by setting revoked_at.
 */
export async function revokeShareLink(shareLinkId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data: link, error: fetchError } = await supabase
    .from("share_links")
    .select("target_type, target_id")
    .eq("id", shareLinkId)
    .eq("created_by", userId)
    .maybeSingle();

  if (fetchError || !link) throw new Error("Share link not found or access denied");

  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareLinkId)
    .eq("created_by", userId);

  if (error) throw new Error(`Failed to revoke share link: ${error.message}`);

  await logAuditEvent("share_link.revoke", link.target_type === "folder" ? "folder" : "file", {
    targetId: link.target_id,
    folderId: link.target_type === "folder" ? link.target_id : null,
    fileId: link.target_type === "file" ? link.target_id : null,
    details: { shareLinkId },
  });
}
