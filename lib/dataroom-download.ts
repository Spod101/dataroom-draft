import JSZip from "jszip";
import { supabase } from "@/lib/supabase";
import type { DataRoomFile, DataRoomFolder, DataRoomPath } from "@/lib/dataroom-types";
import { isFolder, isFile } from "@/lib/dataroom-types";
import { logAuditEvent, trackFileEvent } from "@/lib/dataroom-supabase";

const BUCKET_NAME = "data-room";
const SIGNED_URL_EXPIRY_SEC = 600; // 10 minutes

/** Get folder at path; path [] = root (use rootFolders as children). */
function getFolderAtPath(rootFolders: DataRoomFolder[], path: DataRoomPath): DataRoomFolder | null {
  if (path.length === 0) {
    return { id: "", name: "", slug: "", children: rootFolders, modified: "", modifiedBy: "", sharing: "" } as DataRoomFolder;
  }
  let current: DataRoomFolder[] = rootFolders;
  for (let i = 0; i < path.length; i++) {
    const slug = path[i];
    const folder = current.find((f) => f.slug === slug);
    if (!folder) return null;
    if (i === path.length - 1) return folder;
    current = folder.children.filter((c): c is DataRoomFolder => isFolder(c));
  }
  return null;
}

/** Result of collecting folder contents: files with paths, and all folder paths (including empty). */
function collectFilesAndFoldersInFolder(
  rootFolders: DataRoomFolder[],
  folderPath: DataRoomPath
): { files: { file: DataRoomFile; relativePath: string }[]; folderPaths: string[] } {
  const folder = getFolderAtPath(rootFolders, folderPath);
  if (!folder) return { files: [], folderPaths: [] };
  const files: { file: DataRoomFile; relativePath: string }[] = [];
  const folderPaths: string[] = [];

  function walk(children: (DataRoomFile | DataRoomFolder)[], prefix: string) {
    for (const item of children) {
      const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
      if (isFile(item)) {
        files.push({ file: item, relativePath });
      } else {
        folderPaths.push(relativePath);
        walk(item.children, relativePath);
      }
    }
  }

  walk(folder.children, "");
  return { files, folderPaths };
}

/** Download a single file from Supabase Storage (or external link) and log events. */
export async function downloadFile(file: DataRoomFile): Promise<void> {
  try {
    await trackFileEvent("download", file.id);
    await logAuditEvent("file.download", "file", { targetId: file.id, fileId: file.id });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to record download analytics/audit", e);
  }

  if (file.type === "file" && file.storagePath?.trim()) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(file.storagePath, SIGNED_URL_EXPIRY_SEC, { download: file.name });

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? "Failed to get download link");
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (file.url?.trim()) {
    window.open(file.url, "_blank");
    return;
  }

  throw new Error("File cannot be downloaded");
}

/**
 * Download folder (and all its contents recursively) as a ZIP file.
 * Includes empty folders. Only files with storagePath are included; link-only items are skipped.
 */
export async function downloadFolderZip(
  folderPath: DataRoomPath,
  rootFolders: DataRoomFolder[],
  folderName: string
): Promise<void> {
  const { files, folderPaths } = collectFilesAndFoldersInFolder(rootFolders, folderPath);
  const filesToZip = files.filter((e) => e.file.type === "file" && e.file.storagePath?.trim());
  if (filesToZip.length === 0 && folderPaths.length === 0) {
    throw new Error("This folder is empty.");
  }

  const zip = new JSZip();

  // Add empty folders first (sorted so parents come before children)
  const sortedFolderPaths = [...folderPaths].sort((a, b) => a.length - b.length);
  for (const rel of sortedFolderPaths) {
    const path = rel.replace(/^\/+/, "").replace(/\/+/g, "/");
    if (!path) continue;
    const parts = path.split("/");
    let current: JSZip = zip;
    for (const part of parts) {
      current = current.folder(part) ?? current;
    }
  }

  for (const { file, relativePath } of filesToZip) {
    const path = relativePath.replace(/^\/+/, "").replace(/\/+/g, "/");
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(file.storagePath!);
    if (error || !data) {
      throw new Error(`Failed to download "${file.name}": ${error?.message ?? "Unknown error"}`);
    }
    zip.file(path, data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folderName.replace(/[^\w\s-]/g, "")}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
