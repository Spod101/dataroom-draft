"use client";

import * as React from "react";
import type {
  DataRoomPath,
  DataRoomFolder,
  DataRoomFile,
  DataRoomItem,
} from "@/lib/dataroom-types";
import { isFolder, isFile } from "@/lib/dataroom-types";
import {
  fetchRootFolders,
  fetchFolderChildren,
  createFolder,
  uploadFileToFolder,
  renameFolder,
  renameFile,
  deleteFolder,
  deleteFile,
  updateFolderOrder,
  moveFolderToParent,
  moveFileToFolder,
} from "@/lib/dataroom-supabase";
import { withTimeout } from "@/lib/retry-utils";
import { getUniqueFileName, preserveExtensionOnRename } from "@/lib/dataroom-utils";
import { useAuth } from "@/contexts/auth-context";

export type DataRoomState = {
  rootFolders: DataRoomFolder[];
  loading: boolean;
  error: string | null;
  upload: UploadProgress | null;
  loadedFolderIds: Set<string>; // Track which folders have had their children loaded
};

export type UploadProgress = {
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  uploadedBytes: number;
  currentFileName: string | null;
  abortController: AbortController;
};

function getFolderAtPath(
  rootFolders: DataRoomFolder[],
  path: DataRoomPath
): DataRoomFolder | null {
  if (path.length === 0) return null;
  let current: DataRoomFolder[] = rootFolders;
  let folder: DataRoomFolder | undefined;
  for (const slug of path) {
    folder = current.find((f) => f.slug === slug);
    if (!folder) return null;
    current = folder.children.filter((c): c is DataRoomFolder =>
      isFolder(c)
    ) as DataRoomFolder[];
  }
  return folder ?? null;
}

function getFolderById(
  rootFolders: DataRoomFolder[],
  folderId: string
): DataRoomFolder | null {
  for (const folder of rootFolders) {
    if (folder.id === folderId) return folder;
    const childFolders = folder.children.filter((c): c is DataRoomFolder => isFolder(c));
    const found = getFolderById(childFolders, folderId);
    if (found) return found;
  }
  return null;
}

function isDescendantOf(
  rootFolders: DataRoomFolder[],
  possibleDescendantId: string,
  ancestorId: string
): boolean {
  const ancestor = getFolderById(rootFolders, ancestorId);
  if (!ancestor) return false;
  
  const childFolders = ancestor.children.filter((c): c is DataRoomFolder => isFolder(c));
  for (const child of childFolders) {
    if (child.id === possibleDescendantId) return true;
    if (isDescendantOf(rootFolders, possibleDescendantId, child.id)) return true;
  }
  return false;
}

function getChildrenAtPath(
  rootFolders: DataRoomFolder[],
  path: DataRoomPath
): DataRoomItem[] {
  if (path.length === 0) return rootFolders;
  const folder = getFolderAtPath(rootFolders, path);
  return folder ? folder.children : [];
}

/** Immutably set children at path (for move/setSharing only). */
function setChildrenAtPath(
  rootFolders: DataRoomFolder[],
  path: DataRoomPath,
  newChildren: DataRoomItem[]
): DataRoomFolder[] {
  if (path.length === 0) return newChildren as DataRoomFolder[];
  const [head, ...rest] = path;
  return rootFolders.map((f) => {
    if (f.slug !== head) return f;
    if (rest.length === 0) return { ...f, children: newChildren };
    const childFolders = f.children.filter((c): c is DataRoomFolder => isFolder(c));
    const updatedChildFolders = setChildrenAtPath(childFolders, rest, newChildren);
    const files = f.children.filter((c): c is DataRoomFile => isFile(c));
    return { ...f, children: [...updatedChildFolders, ...files] };
  });
}

function formatDate() {
  const d = new Date();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return "Today at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString())
    return "Yesterday at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString() + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const now = formatDate();

type Action =
  | { type: "SET_TREE"; rootFolders: DataRoomFolder[] }
  | { type: "SET_ROOT_FOLDERS"; rootFolders: DataRoomFolder[] }
  | { type: "SET_FOLDER_CHILDREN"; folderId: string; folders: DataRoomFolder[]; files: DataRoomFile[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "ADD_FILES_AT_PATH"; path: DataRoomPath; files: DataRoomFile[] }
  | { type: "MOVE_ITEM"; sourcePath: DataRoomPath; itemId: string; targetPath: DataRoomPath; modifiedBy: string }
  | { type: "SET_SHARING"; path: DataRoomPath; itemId: string; sharing: string; modifiedBy: string }
  | { type: "REORDER_FOLDERS"; path: DataRoomPath; folderIds: string[] }
  | { type: "UPLOAD_START"; totalFiles: number; totalBytes: number; abortController: AbortController }
  | { type: "UPLOAD_UPDATE"; completedFiles: number; uploadedBytes: number; currentFileName: string | null }
  | { type: "UPLOAD_END" };

function updateFolderChildren(
  folders: DataRoomFolder[],
  folderId: string,
  childFolders: DataRoomFolder[],
  childFiles: DataRoomFile[]
): DataRoomFolder[] {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return { ...folder, children: [...childFolders, ...childFiles] };
    }
    // Recursively check children
    const childFolderList = folder.children.filter((c): c is DataRoomFolder => isFolder(c));
    if (childFolderList.length > 0) {
      const updatedChildFolders = updateFolderChildren(childFolderList, folderId, childFolders, childFiles);
      const childFileList = folder.children.filter((c): c is DataRoomFile => isFile(c));
      return { ...folder, children: [...updatedChildFolders, ...childFileList] };
    }
    return folder;
  });
}

function reducer(state: DataRoomState, action: Action): DataRoomState {
  switch (action.type) {
    case "SET_TREE":
      return { ...state, rootFolders: action.rootFolders, loading: false, error: null };
    case "SET_ROOT_FOLDERS":
      return { ...state, rootFolders: action.rootFolders, loading: false, error: null, loadedFolderIds: new Set<string>() };
    case "SET_FOLDER_CHILDREN": {
      const updatedFolders = updateFolderChildren(
        state.rootFolders,
        action.folderId,
        action.folders,
        action.files
      );
      const newLoadedIds = new Set(state.loadedFolderIds);
      newLoadedIds.add(action.folderId);
      return { ...state, rootFolders: updatedFolders, loadedFolderIds: newLoadedIds };
    }
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    case "ADD_FILES_AT_PATH": {
      const current = getChildrenAtPath(state.rootFolders, action.path);
      const newChildren = [...current, ...action.files];
      return { ...state, rootFolders: setChildrenAtPath(state.rootFolders, action.path, newChildren) };
    }
    case "MOVE_ITEM": {
      const sourceChildren = getChildrenAtPath(state.rootFolders, action.sourcePath);
      const item = sourceChildren.find((c) => c.id === action.itemId);
      if (!item) return state;
      const targetChildren = [...getChildrenAtPath(state.rootFolders, action.targetPath)];
      const newSourceChildren = sourceChildren.filter((c) => c.id !== action.itemId);
      const newTargetChildren = [...targetChildren, { ...item, modified: now, modifiedBy: action.modifiedBy }];
      let next = setChildrenAtPath(state.rootFolders, action.sourcePath, newSourceChildren);
      next = setChildrenAtPath(next, action.targetPath, newTargetChildren);
      return { ...state, rootFolders: next };
    }
    case "SET_SHARING": {
      const children = getChildrenAtPath(state.rootFolders, action.path);
      const newChildren = children.map((c) =>
        c.id === action.itemId ? { ...c, sharing: action.sharing, modified: now, modifiedBy: action.modifiedBy } : c
      );
      return {
        ...state,
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, newChildren),
      };
    }
    case "UPLOAD_START":
      return {
        ...state,
        upload: {
          totalFiles: action.totalFiles,
          completedFiles: 0,
          totalBytes: action.totalBytes,
          uploadedBytes: 0,
          currentFileName: null,
          abortController: action.abortController,
        },
      };
    case "UPLOAD_UPDATE":
      return state.upload
        ? {
            ...state,
            upload: {
              ...state.upload,
              completedFiles: action.completedFiles,
              uploadedBytes: action.uploadedBytes,
              currentFileName: action.currentFileName,
            },
          }
        : state;
    case "UPLOAD_END":
      return { ...state, upload: null };
    case "REORDER_FOLDERS": {
      const folders = getChildrenAtPath(state.rootFolders, action.path).filter(isFolder);
      const files = getChildrenAtPath(state.rootFolders, action.path).filter(isFile);
      const orderedFolders = action.folderIds
        .map((id) => folders.find((f) => f.id === id))
        .filter((f): f is DataRoomFolder => !!f)
        .map((f, index) => ({ ...f, orderIndex: index }));
      const newChildren = [...orderedFolders, ...files];
      return { ...state, rootFolders: setChildrenAtPath(state.rootFolders, action.path, newChildren) };
    }
    default:
      return state;
  }
}

export type FolderWithPath = { path: DataRoomPath; folder: DataRoomFolder };

export function getAllFoldersWithPaths(rootFolders: DataRoomFolder[]): FolderWithPath[] {
  const out: FolderWithPath[] = [];
  function walk(path: DataRoomPath, folders: DataRoomFolder[]) {
    for (const f of folders) {
      out.push({ path: [...path, f.slug], folder: f });
      const childFolders = f.children.filter((c): c is DataRoomFolder => isFolder(c));
      walk([...path, f.slug], childFolders);
    }
  }
  walk([], rootFolders);
  return out;
}

type DataRoomContextValue = {
  state: DataRoomState;
  refresh: () => Promise<void>;
  loadFolderChildren: (folderId: string) => Promise<void>;
  getChildren: (path: DataRoomPath) => DataRoomItem[];
  getFolder: (path: DataRoomPath) => DataRoomFolder | null;
  addFolder: (path: DataRoomPath, name: string) => Promise<void>;
  uploadFiles: (path: DataRoomPath, files: File[]) => Promise<void>;
  cancelUpload: () => void;
  addFiles: (path: DataRoomPath, files: DataRoomFile[]) => void;
  renameItem: (path: DataRoomPath, itemId: string, newName: string) => Promise<void>;
  deleteItem: (path: DataRoomPath, itemId: string) => Promise<void>;
  replaceFile: (path: DataRoomPath, fileId: string, file: DataRoomFile) => void;
  moveItem: (sourcePath: DataRoomPath, itemId: string, targetPath: DataRoomPath) => void;
  setSharing: (path: DataRoomPath, itemId: string, sharing: string) => void;
  reorderFolders: (path: DataRoomPath, folderIds: string[]) => Promise<void>;
  moveFolderToFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
};

const DataRoomContext = React.createContext<DataRoomContextValue | null>(null);

export function DataRoomProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const currentUserDisplayName = profile?.name ?? "You";

  const [state, dispatch] = React.useReducer(reducer, {
    rootFolders: [],
    loading: true,
    error: null,
    upload: null,
    loadedFolderIds: new Set<string>(),
  });

  // Shorter timeouts — if Supabase doesn't respond in 15s, fail fast instead of hanging
  const REFRESH_TIMEOUT_MS = 15_000;
  const FOLDER_LOAD_TIMEOUT_MS = 12_000;

  const refresh = React.useCallback(async () => {
    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const rootFolders = await withTimeout(
        fetchRootFolders(),
        REFRESH_TIMEOUT_MS,
        "Loading timed out. Check your connection and try again."
      );
      dispatch({ type: "SET_ROOT_FOLDERS", rootFolders });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      dispatch({ type: "SET_ERROR", error: err.message });
    }
  }, []);

  const loadedFolderIdsRef = React.useRef(state.loadedFolderIds);
  loadedFolderIdsRef.current = state.loadedFolderIds;

  const inFlightFolderIdsRef = React.useRef<Set<string>>(new Set());

  const loadFolderChildren = React.useCallback(async (folderId: string) => {
    if (loadedFolderIdsRef.current.has(folderId)) return;
    if (inFlightFolderIdsRef.current.has(folderId)) return;

    inFlightFolderIdsRef.current.add(folderId);
    try {
      const { folders, files } = await withTimeout(
        fetchFolderChildren(folderId),
        FOLDER_LOAD_TIMEOUT_MS,
        "Folder load timed out. Check your connection and try again."
      );
      dispatch({ type: "SET_FOLDER_CHILDREN", folderId, folders, files });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      dispatch({ type: "SET_ERROR", error: err.message });
    } finally {
      inFlightFolderIdsRef.current.delete(folderId);
    }
  }, []);

  // Stable ref for refresh to avoid stale closures
  const refreshRef = React.useRef(refresh);
  refreshRef.current = refresh;

  // Ref for upload abort controller
  const uploadAbortRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    uploadAbortRef.current = state.upload?.abortController ?? null;
  }, [state.upload?.abortController]);

  // Guard against concurrent refreshes
  const isRefreshingRef = React.useRef(false);

  // Initial data load — once on mount
  React.useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!mounted || isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try { await refreshRef.current(); } finally { isRefreshingRef.current = false; }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // Visibility change handler — refresh data after idle
  React.useEffect(() => {
    let hiddenAt: number | null = null;
    const MIN_IDLE_MS = 60_000; // Only refresh after 1+ min idle

    const handleVisibility = async () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        // Abort uploads when tab hidden
        uploadAbortRef.current?.abort();
      } else if (document.visibilityState === "visible" && hiddenAt !== null) {
        const idleTime = Date.now() - hiddenAt;
        hiddenAt = null;

        if (idleTime >= MIN_IDLE_MS && !isRefreshingRef.current) {
          isRefreshingRef.current = true;
          try { await refreshRef.current(); } finally { isRefreshingRef.current = false; }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const getChildren = React.useCallback(
    (path: DataRoomPath) => getChildrenAtPath(state.rootFolders, path),
    [state.rootFolders]
  );
  const getFolder = React.useCallback(
    (path: DataRoomPath) => getFolderAtPath(state.rootFolders, path),
    [state.rootFolders]
  );

  const addFolder = React.useCallback(
    async (path: DataRoomPath, name: string) => {
      const parentFolder = path.length === 0 ? null : getFolderAtPath(state.rootFolders, path);
      const parentId = parentFolder?.id ?? null;
      const siblingSlugs = parentId === null
        ? state.rootFolders.map((f) => f.slug)
        : getChildrenAtPath(state.rootFolders, path).filter(isFolder).map((f) => f.slug);
      await createFolder(parentId, name, siblingSlugs);
      await refresh();
    },
    [state.rootFolders, refresh]
  );

  const uploadFiles = React.useCallback(
    async (path: DataRoomPath, files: File[]) => {
      const folder = getFolderAtPath(state.rootFolders, path);
      if (!folder) throw new Error("Folder not found");

      // Build the set of already-taken names in this folder so we can ensure
      // that every uploaded file ends up with a unique name per folder:
      //   file.txt -> file (1).txt -> file (2).txt, etc.
      // We treat names as case-insensitive for uniqueness.
      const existingFileNames = new Set(
        folder.children
          .filter((c): c is DataRoomFile => isFile(c))
          .map((f) => f.name.toLowerCase())
      );
      const takenNames = new Set(existingFileNames);

      const totalBytes = files.reduce(
        (sum, f) => sum + (typeof f.size === "number" ? f.size : 0),
        0
      );
      const abortController = new AbortController();
      dispatch({
        type: "UPLOAD_START",
        totalFiles: files.length,
        totalBytes,
        abortController,
      });

      const added: DataRoomFile[] = [];
      let completedFiles = 0;
      let uploadedBytes = 0;
      let cancelled = false;

      try {
        for (const originalFile of files) {
          // Check if upload was cancelled
          if (abortController.signal.aborted) {
            cancelled = true;
            throw new Error("Upload cancelled");
          }

          // Compute a unique name for this file in the target folder (case-insensitive)
          const uniqueName = getUniqueFileName(originalFile.name, takenNames);

          // Wrap in a new File with the unique name if needed; size/type stay the same.
          const fileForUpload =
            uniqueName === originalFile.name
              ? originalFile
              : new File([originalFile], uniqueName, {
                  type: originalFile.type,
                });

          const fileSize =
            typeof fileForUpload.size === "number" ? fileForUpload.size : 0;
          const baseBytesForFile = uploadedBytes;
          let estimatedBytesForFile = 0;
          let interval: ReturnType<typeof setInterval> | undefined;

          // Start a lightweight timer to show smooth in-flight progress for the current file.
          if (fileSize > 0) {
            const maxEstimatedForFile = fileSize * 0.9; // cap at 90% until the upload actually finishes
            const tickBytes = maxEstimatedForFile / 20; // ~20 ticks to reach 90%
            interval = setInterval(() => {
              if (abortController.signal.aborted) {
                if (interval) clearInterval(interval);
                return;
              }
              estimatedBytesForFile = Math.min(
                maxEstimatedForFile,
                estimatedBytesForFile + tickBytes
              );
              dispatch({
                type: "UPLOAD_UPDATE",
                completedFiles,
                uploadedBytes: baseBytesForFile + estimatedBytesForFile,
                currentFileName: fileForUpload.name,
              });
            }, 300);
          } else {
            // Still show that we're working on this file name.
            dispatch({
              type: "UPLOAD_UPDATE",
              completedFiles,
              uploadedBytes,
              currentFileName: fileForUpload.name,
            });
          }

          try {
            // Check again right before upload
            if (abortController.signal.aborted) {
              cancelled = true;
              throw new Error("Upload cancelled");
            }

            const dataRoomFile = await uploadFileToFolder(
              folder.id,
              fileForUpload
            );

            // Check if cancelled while upload was in progress
            if (abortController.signal.aborted) {
              cancelled = true;
              throw new Error("Upload cancelled");
            }

            added.push(dataRoomFile);
          } finally {
            if (interval) clearInterval(interval);
          }

          completedFiles += 1;
          uploadedBytes += fileSize;
          dispatch({
            type: "UPLOAD_UPDATE",
            completedFiles,
            uploadedBytes,
            currentFileName: fileForUpload.name,
          });
        }

        // Show uploaded files immediately (optimistic)
        if (added.length)
          dispatch({ type: "ADD_FILES_AT_PATH", path, files: added });
        dispatch({ type: "SET_ERROR", error: null });
        try {
          await refresh();
        } catch (e) {
          // Still show error so user knows refetch failed (e.g. RLS on SELECT)
          dispatch({
            type: "SET_ERROR",
            error: e instanceof Error ? e.message : "Failed to refresh",
          });
          throw e;
        }
      } catch (e) {
        if (cancelled || abortController.signal.aborted) {
          // Upload was cancelled, clear the state immediately
          dispatch({ type: "UPLOAD_END" });
          throw new Error("Upload cancelled");
        }
        throw e;
      } finally {
        if (!cancelled) {
          dispatch({ type: "UPLOAD_END" });
        }
      }
    },
    [state.rootFolders, refresh]
  );

  const cancelUpload = React.useCallback(() => {
    if (state.upload?.abortController) {
      state.upload.abortController.abort();
      // Immediately clear the upload state for better responsiveness
      dispatch({ type: "UPLOAD_END" });
    }
  }, [state.upload]);

  const addFiles = React.useCallback((_path: DataRoomPath, _files: DataRoomFile[]) => {
    // In-memory only; used when upload is done elsewhere and we want to show optimistically.
    // Real uploads use uploadFiles(path, File[]).
  }, []);

  const renameItem = React.useCallback(
    async (path: DataRoomPath, itemId: string, newName: string) => {
      const children = getChildrenAtPath(state.rootFolders, path);
      const item = children.find((c) => c.id === itemId);
      if (!item) return;
      if (isFolder(item)) {
        const siblingSlugs = children.filter((c): c is DataRoomFolder => isFolder(c) && c.id !== itemId).map((c) => c.slug);
        await renameFolder(itemId, newName, siblingSlugs);
        await refresh();
      } else {
        await renameFile(itemId, newName);
        // For files, we need to reload the parent folder's children
        const parentFolder = path.length === 0 ? null : getFolderAtPath(state.rootFolders, path);
        if (parentFolder) {
          const { folders, files } = await fetchFolderChildren(parentFolder.id);
          dispatch({ type: "SET_FOLDER_CHILDREN", folderId: parentFolder.id, folders, files });
        }
      }
    },
    [state.rootFolders, refresh]
  );

  const deleteItem = React.useCallback(
    async (path: DataRoomPath, itemId: string) => {
      const children = getChildrenAtPath(state.rootFolders, path);
      const item = children.find((c) => c.id === itemId);
      if (!item) return;
      if (isFolder(item)) {
        await deleteFolder(itemId);
        await refresh();
      } else {
        await deleteFile(itemId);
        // For files, we need to reload the parent folder's children
        const parentFolder = path.length === 0 ? null : getFolderAtPath(state.rootFolders, path);
        if (parentFolder) {
          const { folders, files } = await fetchFolderChildren(parentFolder.id);
          dispatch({ type: "SET_FOLDER_CHILDREN", folderId: parentFolder.id, folders, files });
        }
      }
    },
    [state.rootFolders, refresh]
  );

  const replaceFile = React.useCallback((_path: DataRoomPath, _fileId: string, _file: DataRoomFile) => {
    // No-op; replace is not persisted for now.
  }, []);

  const moveItem = React.useCallback(
    async (sourcePath: DataRoomPath, itemId: string, targetPath: DataRoomPath) => {
      // Find the item to determine if it's a file or folder
      const sourceChildren = getChildrenAtPath(state.rootFolders, sourcePath);
      const item = sourceChildren.find((c) => c.id === itemId);
      if (!item) {
        console.error("Item not found:", itemId, "in source path:", sourcePath);
        return;
      }

      console.log("Moving item:", item.name, "from:", sourcePath, "to:", targetPath);

      // Optimistically update UI
      dispatch({ type: "MOVE_ITEM", sourcePath, itemId, targetPath, modifiedBy: currentUserDisplayName });

      try {
        if (isFolder(item)) {
          // For folders: targetPath is the destination parent path
          // If targetPath is [], we're moving to root (parent = null)
          // If targetPath is ["company-profile"], we're moving INTO company-profile folder
          let targetFolderId: string | null = null;
          
          if (targetPath.length > 0) {
            const targetFolder = getFolderAtPath(state.rootFolders, targetPath);
            if (!targetFolder) {
              throw new Error("Target folder not found");
            }
            targetFolderId = targetFolder.id;
          }
          
          // Get the order index (add to end of target folder)
          const targetChildren = getChildrenAtPath(state.rootFolders, targetPath);
          const orderIndex = targetChildren.filter(isFolder).length;
          
          console.log("Moving folder to parent ID:", targetFolderId, "with order:", orderIndex);
          await moveFolderToParent(itemId, targetFolderId, orderIndex);
        } else {
          // For files: targetPath must point to a folder (cannot be root)
          if (targetPath.length === 0) {
            throw new Error("Cannot move file to root - files must be in a folder");
          }
          
          const targetFolder = getFolderAtPath(state.rootFolders, targetPath);
          if (!targetFolder) {
            throw new Error("Target folder not found");
          }
          
          console.log("Moving file to folder ID:", targetFolder.id);
          await moveFileToFolder(itemId, targetFolder.id);
        }
        
        console.log("Move successful, refreshing...");
        // Refresh to get updated data from database
        await refresh();
      } catch (e) {
        // If DB update fails, refresh to revert UI to DB state
        console.error("Failed to move item:", e);
        await refresh();
        throw e;
      }
    },
    [state.rootFolders, currentUserDisplayName, refresh]
  );
  const setSharing = React.useCallback(
    (path: DataRoomPath, itemId: string, sharing: string) =>
      dispatch({ type: "SET_SHARING", path, itemId, sharing, modifiedBy: currentUserDisplayName }),
    [currentUserDisplayName]
  );

  const reorderFolders = React.useCallback(
    async (path: DataRoomPath, folderIds: string[]) => {
      // Optimistically update UI
      dispatch({ type: "REORDER_FOLDERS", path, folderIds });
      
      // Persist to database
      try {
        const updates = folderIds.map((id, index) => ({ id, orderIndex: index }));
        await updateFolderOrder(updates);
      } catch (e) {
        // If DB update fails, refresh to revert to DB state
        console.error("Failed to update folder order:", e);
        await refresh();
      }
    },
    [refresh]
  );

  const moveFolderToFolder = React.useCallback(
    async (folderId: string, targetFolderId: string | null) => {
      // Prevent moving a folder into itself
      if (folderId === targetFolderId) {
        throw new Error("Cannot move a folder into itself");
      }
      
      // Prevent moving a folder into its own descendant
      if (targetFolderId && isDescendantOf(state.rootFolders, targetFolderId, folderId)) {
        throw new Error("Cannot move a folder into its own subfolder");
      }
      
      // Get the target folder's children to determine the order index
      const targetChildren = targetFolderId === null 
        ? state.rootFolders 
        : getFolderById(state.rootFolders, targetFolderId)?.children.filter(isFolder) ?? [];
      
      const orderIndex = targetChildren.length; // Add to end
      
      try {
        await moveFolderToParent(folderId, targetFolderId, orderIndex);
        await refresh();
      } catch (e) {
        throw e;
      }
    },
    [state.rootFolders, refresh]
  );

  const value: DataRoomContextValue = {
    state,
    refresh,
    loadFolderChildren,
    getChildren,
    getFolder,
    addFolder,
    uploadFiles,
    cancelUpload,
    addFiles,
    renameItem,
    deleteItem,
    replaceFile,
    moveItem,
    setSharing,
    reorderFolders,
    moveFolderToFolder,
  };

  return (
    <DataRoomContext.Provider value={value}>
      {children}
    </DataRoomContext.Provider>
  );
}

export function useDataRoom() {
  const ctx = React.useContext(DataRoomContext);
  if (!ctx) throw new Error("useDataRoom must be used within DataRoomProvider");
  return ctx;
}
