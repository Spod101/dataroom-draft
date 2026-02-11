import type {
  DataRoomPath,
  DataRoomFolder,
  DataRoomFile,
  DataRoomItem,
} from "@/lib/dataroom-types";
import { isFolder, isFile } from "@/lib/dataroom-types";

export type ItemWithPath = { item: DataRoomItem; path: DataRoomPath };

/** Flatten the full tree into items with their path (slug array). Includes root-level folders and all descendants. */
export function getFlattenedItems(rootFolders: DataRoomFolder[]): ItemWithPath[] {
  const result: ItemWithPath[] = [];
  function walk(path: DataRoomPath, folders: DataRoomFolder[]) {
    for (const folder of folders) {
      const fullPath = [...path, folder.slug];
      result.push({ item: folder, path: fullPath });
      const childFolders = folder.children.filter((c): c is DataRoomFolder => isFolder(c));
      const childFiles = folder.children.filter((c): c is DataRoomFile => isFile(c));
      for (const file of childFiles) result.push({ item: file, path: fullPath });
      walk(fullPath, childFolders);
    }
  }
  walk([], rootFolders);
  return result;
}

export type FileTypeCategory =
  | "pdf"
  | "word"
  | "excel"
  | "ppt"
  | "image"
  | "video"
  | "other";

/** Map file (mimeType / name) to a category for filtering. */
export function getFileTypeCategory(file: DataRoomFile): FileTypeCategory {
  const mime = (file.mimeType ?? "").toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (
    mime.includes("word") ||
    mime.includes("msword") ||
    mime.includes("wordprocessing") ||
    /\.(doc|docx)$/.test(name)
  )
    return "word";
  if (
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    /\.(xls|xlsx)$/.test(name)
  )
    return "excel";
  if (
    mime.includes("powerpoint") ||
    mime.includes("presentation") ||
    /\.(ppt|pptx)$/.test(name)
  )
    return "ppt";
  if (mime.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name))
    return "image";
  if (mime.includes("video") || /\.(mp4|webm|ogg|mov|avi|mkv)$/.test(name))
    return "video";
  return "other";
}

export const FILE_TYPE_OPTIONS: { id: string; name: string }[] = [
  { id: "all", name: "All types" },
  { id: "pdf", name: "PDF" },
  { id: "image", name: "Image" },
  { id: "video", name: "Video" },
];

/** Selected date is YYYY-MM-DD (calendar date). Empty string = any date. */
export type SearchFilterState = {
  search: string;
  fileType: string;
  /** Calendar date YYYY-MM-DD, or "" for any date */
  date: string;
};

/** True if item's modified date (ISO) falls on the given calendar day (YYYY-MM-DD). */
function isoMatchesCalendarDate(iso: string | undefined, dateStr: string): boolean {
  if (!dateStr || !iso) return false;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return false;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const itemDateStr = `${y}-${m}-${d}`;
  return itemDateStr === dateStr;
}

/**
 * Filter by file type and date only (no search). Use for per-folder filtering.
 */
export function applyFiltersOnly(
  items: ItemWithPath[],
  state: Pick<SearchFilterState, "fileType" | "date">
): ItemWithPath[] {
  const { fileType, date: dateStr } = state;
  const hasFileType = fileType !== "all" && fileType.length > 0;
  const hasDate = dateStr.length > 0;
  if (!hasFileType && !hasDate) return items;
  return items.filter(({ item }) => {
    if (hasFileType) {
      if (isFolder(item)) return false;
      if (getFileTypeCategory(item) !== fileType) return false;
    }
    const iso = "modifiedIso" in item ? (item as DataRoomFile | DataRoomFolder).modifiedIso : undefined;
    if (hasDate && !isoMatchesCalendarDate(iso, dateStr)) return false;
    return true;
  });
}

/**
 * Filter flattened items by search term, file type, and date (calendar day).
 * Use for global search (search runs over full tree).
 */
export function applySearchAndFilters(
  items: ItemWithPath[],
  _rootFolders: DataRoomFolder[],
  state: SearchFilterState
): ItemWithPath[] {
  const { search, fileType, date: dateStr } = state;
  const searchLower = search.trim().toLowerCase();
  const hasSearch = searchLower.length > 0;
  const hasFileType = fileType !== "all" && fileType.length > 0;
  const hasDate = dateStr.length > 0;
  const hasAnyFilter = hasSearch || hasFileType || hasDate;

  if (!hasAnyFilter) return items;

  return items.filter(({ item }) => {
    if (hasSearch && !item.name.toLowerCase().includes(searchLower)) return false;
    if (hasFileType) {
      if (isFolder(item)) return false;
      if (getFileTypeCategory(item) !== fileType) return false;
    }
    const iso = "modifiedIso" in item ? (item as DataRoomFile | DataRoomFolder).modifiedIso : undefined;
    if (hasDate && !isoMatchesCalendarDate(iso, dateStr)) return false;
    return true;
  });
}

/** Build display path (e.g. "Company Profile / Proposals") from path slugs and root folders. */
export function getLocationLabel(path: DataRoomPath, rootFolders: DataRoomFolder[]): string {
  if (path.length === 0) return "Data Room";
  let current: DataRoomFolder[] = rootFolders;
  const names: string[] = [];
  for (const slug of path) {
    const folder = current.find((f) => f.slug === slug);
    if (!folder) {
      names.push(slug);
      break;
    }
    names.push(folder.name);
    const childFolders = folder.children.filter((c): c is DataRoomFolder => isFolder(c));
    current = childFolders;
  }
  return names.join(" / ");
}
