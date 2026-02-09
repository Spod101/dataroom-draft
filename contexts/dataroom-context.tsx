"use client";

import * as React from "react";
import type {
  DataRoomPath,
  DataRoomFolder,
  DataRoomFile,
  DataRoomItem,
} from "@/lib/dataroom-types";
import {
  isFolder,
  isFile,
  uid,
  slugFromName,
  uniqueSlug,
} from "@/lib/dataroom-types";
import { getInitialDataRoomState } from "@/lib/dataroom-initial-state";

export type DataRoomState = {
  rootFolders: DataRoomFolder[];
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

function getChildrenAtPath(
  rootFolders: DataRoomFolder[],
  path: DataRoomPath
): DataRoomItem[] {
  if (path.length === 0) return rootFolders;
  const folder = getFolderAtPath(rootFolders, path);
  return folder ? folder.children : [];
}

/** Immutably set children at path. path=[] sets rootFolders. */
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
  if (d.toDateString() === today.toDateString()) return "Today at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString() + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const now = formatDate();
const modifiedBy = "You";

type Action =
  | { type: "ADD_FOLDER"; path: DataRoomPath; name: string }
  | { type: "ADD_FILES"; path: DataRoomPath; files: DataRoomFile[] }
  | { type: "RENAME"; path: DataRoomPath; itemId: string; newName: string }
  | { type: "DELETE"; path: DataRoomPath; itemId: string }
  | { type: "REPLACE_FILE"; path: DataRoomPath; fileId: string; file: DataRoomFile }
  | { type: "MOVE_ITEM"; sourcePath: DataRoomPath; itemId: string; targetPath: DataRoomPath }
  | { type: "SET_SHARING"; path: DataRoomPath; itemId: string; sharing: string }
  | { type: "RESET" };

function reducer(state: DataRoomState, action: Action): DataRoomState {
  switch (action.type) {
    case "RESET":
      return { rootFolders: getInitialDataRoomState() };
    case "ADD_FOLDER": {
      const children = getChildrenAtPath(state.rootFolders, action.path);
      const existingSlugs = children
        .filter((c): c is DataRoomFolder => isFolder(c))
        .map((c) => c.slug);
      const slug = uniqueSlug(slugFromName(action.name), existingSlugs);
      const newFolder: DataRoomFolder = {
        id: uid(),
        name: action.name,
        slug,
        modified: now,
        modifiedBy,
        sharing: "Shared",
        children: [],
      };
      const newChildren: DataRoomItem[] = [...children, newFolder];
      return {
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, newChildren),
      };
    }
    case "ADD_FILES": {
      let children = [...getChildrenAtPath(state.rootFolders, action.path)];
      for (const file of action.files) {
        const idx = children.findIndex(
          (c) => isFile(c) && c.name === file.name
        );
        if (idx >= 0) children[idx] = file;
        else children.push(file);
      }
      return {
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, children),
      };
    }
    case "RENAME": {
      const children = getChildrenAtPath(state.rootFolders, action.path);
      const newChildren = children.map((c) => {
        if (c.id !== action.itemId) return c;
        if (isFolder(c)) {
          const otherSlugs = children
            .filter((x): x is DataRoomFolder => isFolder(x) && x.id !== action.itemId)
            .map((x) => x.slug);
          return {
            ...c,
            name: action.newName,
            slug: uniqueSlug(slugFromName(action.newName), otherSlugs),
            modified: now,
            modifiedBy,
          };
        }
        return { ...c, name: action.newName, modified: now, modifiedBy };
      });
      return {
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, newChildren),
      };
    }
    case "DELETE": {
      const children = getChildrenAtPath(state.rootFolders, action.path).filter(
        (c) => c.id !== action.itemId
      );
      return {
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, children),
      };
    }
    case "REPLACE_FILE": {
      const children = getChildrenAtPath(state.rootFolders, action.path).map(
        (c) => (c.id === action.fileId ? action.file : c)
      );
      return {
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, children),
      };
    }
    case "MOVE_ITEM": {
      const sourceChildren = getChildrenAtPath(state.rootFolders, action.sourcePath);
      const item = sourceChildren.find((c) => c.id === action.itemId);
      if (!item) return state;
      if (
        action.sourcePath.length === action.targetPath.length &&
        action.sourcePath.every((s, i) => s === action.targetPath[i])
      ) {
        return state;
      }
      if (isFolder(item)) {
        const descendantPrefix = [...action.sourcePath, item.slug];
        if (
          action.targetPath.length >= descendantPrefix.length &&
          descendantPrefix.every((s, i) => action.targetPath[i] === s)
        ) {
          return state;
        }
      }
      let targetChildren = [...getChildrenAtPath(state.rootFolders, action.targetPath)];
      const moved =
        isFolder(item)
          ? {
              ...item,
              slug: uniqueSlug(
                item.slug,
                targetChildren.filter((c): c is DataRoomFolder => isFolder(c)).map((c) => c.slug)
              ),
              modified: now,
              modifiedBy,
            }
          : { ...item, modified: now, modifiedBy };
      const newSourceChildren = sourceChildren.filter((c) => c.id !== action.itemId);
      const newTargetChildren = [...targetChildren, moved];
      let next = setChildrenAtPath(state.rootFolders, action.sourcePath, newSourceChildren);
      next = setChildrenAtPath(next, action.targetPath, newTargetChildren);
      return { rootFolders: next };
    }
    case "SET_SHARING": {
      const children = getChildrenAtPath(state.rootFolders, action.path);
      const newChildren = children.map((c) =>
        c.id === action.itemId
          ? { ...c, sharing: action.sharing, modified: now, modifiedBy }
          : c
      );
      return {
        rootFolders: setChildrenAtPath(state.rootFolders, action.path, newChildren),
      };
    }
    default:
      return state;
  }
}

export type FolderWithPath = { path: DataRoomPath; folder: DataRoomFolder };

/** Returns all folders in the tree with their paths (for move-target picker). */
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
  getChildren: (path: DataRoomPath) => DataRoomItem[];
  getFolder: (path: DataRoomPath) => DataRoomFolder | null;
  addFolder: (path: DataRoomPath, name: string) => void;
  addFiles: (path: DataRoomPath, files: DataRoomFile[]) => void;
  renameItem: (path: DataRoomPath, itemId: string, newName: string) => void;
  deleteItem: (path: DataRoomPath, itemId: string) => void;
  replaceFile: (path: DataRoomPath, fileId: string, file: DataRoomFile) => void;
  moveItem: (sourcePath: DataRoomPath, itemId: string, targetPath: DataRoomPath) => void;
  setSharing: (path: DataRoomPath, itemId: string, sharing: string) => void;
};

const DataRoomContext = React.createContext<DataRoomContextValue | null>(null);

export function DataRoomProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, {
    rootFolders: getInitialDataRoomState(),
  });

  const getChildren = React.useCallback(
    (path: DataRoomPath) => getChildrenAtPath(state.rootFolders, path),
    [state.rootFolders]
  );
  const getFolder = React.useCallback(
    (path: DataRoomPath) => getFolderAtPath(state.rootFolders, path),
    [state.rootFolders]
  );
  const addFolder = React.useCallback(
    (path: DataRoomPath, name: string) =>
      dispatch({ type: "ADD_FOLDER", path, name }),
    []
  );
  const addFiles = React.useCallback(
    (path: DataRoomPath, files: DataRoomFile[]) =>
      dispatch({ type: "ADD_FILES", path, files }),
    []
  );
  const renameItem = React.useCallback(
    (path: DataRoomPath, itemId: string, newName: string) =>
      dispatch({ type: "RENAME", path, itemId, newName }),
    []
  );
  const deleteItem = React.useCallback(
    (path: DataRoomPath, itemId: string) =>
      dispatch({ type: "DELETE", path, itemId }),
    []
  );
  const replaceFile = React.useCallback(
    (path: DataRoomPath, fileId: string, file: DataRoomFile) =>
      dispatch({ type: "REPLACE_FILE", path, fileId, file }),
    []
  );
  const moveItem = React.useCallback(
    (sourcePath: DataRoomPath, itemId: string, targetPath: DataRoomPath) =>
      dispatch({ type: "MOVE_ITEM", sourcePath, itemId, targetPath }),
    []
  );
  const setSharing = React.useCallback(
    (path: DataRoomPath, itemId: string, sharing: string) =>
      dispatch({ type: "SET_SHARING", path, itemId, sharing }),
    []
  );

  const value: DataRoomContextValue = {
    state,
    getChildren,
    getFolder,
    addFolder,
    addFiles,
    renameItem,
    deleteItem,
    replaceFile,
    moveItem,
    setSharing,
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
