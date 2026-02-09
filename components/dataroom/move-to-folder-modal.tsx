"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDataRoom, getAllFoldersWithPaths } from "@/contexts/dataroom-context";
import type { DataRoomPath, DataRoomItem } from "@/lib/dataroom-types";
import { isFolder } from "@/lib/dataroom-types";
import { FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function pathEquals(a: DataRoomPath, b: DataRoomPath): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

function pathStartsWith(path: DataRoomPath, prefix: DataRoomPath): boolean {
  return prefix.length <= path.length && prefix.every((s, i) => path[i] === s);
}

interface MoveToFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  sourcePath: DataRoomPath;
  movingItem: DataRoomItem;
  onSelect: (targetPath: DataRoomPath) => void;
}

export function MoveToFolderModal({
  open,
  onOpenChange,
  itemName,
  sourcePath,
  movingItem,
  onSelect,
}: MoveToFolderModalProps) {
  const { state, getFolder } = useDataRoom();
  const allFolders = React.useMemo(
    () => getAllFoldersWithPaths(state.rootFolders),
    [state.rootFolders]
  );

  const validTargets = React.useMemo(() => {
    const list: { path: DataRoomPath; label: string }[] = [];
    list.push({ path: [], label: "Data Room (root)" });
    const movingFolderSlug = isFolder(movingItem) ? movingItem.slug : null;
    const forbiddenPrefix = movingFolderSlug ? [...sourcePath, movingFolderSlug] : null;

    for (const { path, folder } of allFolders) {
      if (pathEquals(path, sourcePath)) continue;
      if (forbiddenPrefix && pathStartsWith(path, forbiddenPrefix)) continue;
      const parts: string[] = [];
      for (let i = 0; i < path.length; i++) {
        const p = path.slice(0, i + 1);
        const f = getFolder(p);
        parts.push(f?.name ?? p[p.length - 1]);
      }
      list.push({ path, label: parts.join(" → ") });
    }
    return list;
  }, [allFolders, sourcePath, movingItem, getFolder]);

  const handleSelect = (targetPath: DataRoomPath) => {
    onSelect(targetPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>
            Choose a destination for &quot;{itemName}&quot;. Files will be moved into the selected folder.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border p-1 space-y-0.5">
          {validTargets.map(({ path, label }) => (
            <button
              key={path.join("/") || "root"}
              type="button"
              onClick={() => handleSelect(path)}
              className={cn(
                "w-full flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm",
                "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
              )}
            >
              <FolderIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{label}</span>
            </button>
          ))}
          {validTargets.length === 0 && (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">
              No other folders available to move to.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
