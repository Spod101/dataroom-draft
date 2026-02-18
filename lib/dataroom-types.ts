/** Path = array of slugs: [] = root, [folder] = first level, [folder, subfolder] = second, [folder, subfolder, industry] = third */
export type DataRoomPath = string[];

export type DataRoomFile = {
  id: string;
  name: string;
  type: "file" | "link";
  size?: string;
  modified: string;
  /** ISO date string for filtering by date uploaded */
  modifiedIso?: string;
  modifiedBy: string;
  sharing: string;
  mimeType?: string;
  description?: string;
  url?: string;
  /** Storage path for type "file" (Supabase Storage bucket key). Used to get preview URL. */
  storagePath?: string;
};

export type DataRoomFolder = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  modified: string;
  /** ISO date string for filtering by date */
  modifiedIso?: string;
  modifiedBy: string;
  sharing: string;
  children: DataRoomItem[];
  /** Number of direct children (folders + files). Useful before children are lazily loaded. */
  itemCount?: number;
  /** Number of direct subfolders. Used to show expand/collapse icon before children are loaded. */
  subfolderCount?: number;
  /** Order index for sidebar display (lower = higher in list) */
  orderIndex?: number;
};

export type DataRoomItem = DataRoomFile | DataRoomFolder;

export function isFolder(item: DataRoomItem | null | undefined): item is DataRoomFolder {
  if (!item) return false;
  return "children" in item && Array.isArray((item as DataRoomFolder).children);
}

export function isFile(item: DataRoomItem | null | undefined): item is DataRoomFile {
  if (!item) return false;
  return "type" in item && ((item as DataRoomFile).type === "file" || (item as DataRoomFile).type === "link");
}

function uid() {
  return `dr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function uniqueSlug(slug: string, existing: string[]): string {
  if (!existing.includes(slug)) return slug;
  let n = 1;
  while (existing.includes(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export { uid };
