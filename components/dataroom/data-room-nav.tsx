"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRightIcon,
  FolderIcon,
  PencilIcon,
  Trash2Icon,
  FolderPlusIcon,
  PlusIcon,
  HomeIcon,
} from "lucide-react";
import type { DataRoomPath, DataRoomFolder } from "@/lib/dataroom-types";
import { isFolder } from "@/lib/dataroom-types";
import { useDataRoom } from "@/contexts/dataroom-context";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { InputDialog } from "@/components/dataroom/input-dialog";
import { ConfirmDialog } from "@/components/dataroom/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function pathKey(path: DataRoomPath): string {
  return path.join("/");
}

function hrefForPath(path: DataRoomPath): string {
  if (path.length === 0) return "/dataroom";
  return "/dataroom/" + path.join("/");
}

type ContextMenuState = {
  x: number;
  y: number;
  path: DataRoomPath;
  folder: DataRoomFolder;
};

export function DataRoomNav() {
  const pathname = usePathname();
  const toast = useToast();
  const { state, getChildren, addFolder, renameItem, deleteItem, reorderFolders, moveFolderToFolder } =
    useDataRoom();
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(
    null
  );
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [draggedParentPath, setDraggedParentPath] = React.useState<DataRoomPath>([]);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [dragOverType, setDragOverType] = React.useState<"reorder" | "move" | null>(null);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renamePath, setRenamePath] = React.useState<DataRoomPath>([]);
  const [renameId, setRenameId] = React.useState("");
  const [renameName, setRenameName] = React.useState("");
  const [addSubfolderOpen, setAddSubfolderOpen] = React.useState(false);
  const [addSubfolderPath, setAddSubfolderPath] = React.useState<DataRoomPath>(
    []
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePath, setDeletePath] = React.useState<DataRoomPath>([]);
  const [deleteId, setDeleteId] = React.useState("");
  const [deleteName, setDeleteName] = React.useState("");
  const contextMenuRef = React.useRef<HTMLDivElement>(null);

  const toggleExpanded = React.useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const closeContextMenu = React.useCallback(() => setContextMenu(null), []);

  React.useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => closeContextMenu();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu, closeContextMenu]);

  const handleRename = () => {
    if (!contextMenu) return;
    setRenamePath(contextMenu.path);
    setRenameId(contextMenu.folder.id);
    setRenameName(contextMenu.folder.name);
    setRenameOpen(true);
    closeContextMenu();
  };

  const handleAddSubfolder = () => {
    if (!contextMenu) return;
    setAddSubfolderPath([...contextMenu.path, contextMenu.folder.slug]);
    setAddSubfolderOpen(true);
    closeContextMenu();
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    setDeletePath(contextMenu.path);
    setDeleteId(contextMenu.folder.id);
    setDeleteName(contextMenu.folder.name);
    setDeleteOpen(true);
    closeContextMenu();
  };

  const sortedRootFolders = React.useMemo(() => {
    return [...state.rootFolders].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [state.rootFolders]);

  const handleDragStart = (folderId: string, parentPath: DataRoomPath) => {
    setDraggedId(folderId);
    setDraggedParentPath(parentPath); // This is the parent of the dragged folder
  };

  const handleDragOver = (e: React.DragEvent, folderId: string, parentPath: DataRoomPath) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId || draggedId === folderId) {
      setDragOverId(null);
      setDragOverType(null);
      return;
    }
    
    // Check if dragged folder and target folder are siblings (same parent)
    const areSiblings = draggedParentPath.length === parentPath.length && 
      draggedParentPath.every((slug, i) => slug === parentPath[i]);
    
    setDragOverId(folderId);
    setDragOverType(areSiblings ? "reorder" : "move");
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, targetParentPath: DataRoomPath) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDraggedParentPath([]);
      setDragOverId(null);
      setDragOverType(null);
      return;
    }
    
    // Check if they're siblings (share the same parent)
    const areSiblings = draggedParentPath.length === targetParentPath.length && 
      draggedParentPath.every((slug, i) => slug === targetParentPath[i]);
    
    try {
      if (areSiblings) {
        // Reorder within the same parent
        const siblings = getChildren(targetParentPath).filter(isFolder);
        const draggedIndex = siblings.findIndex((f) => f.id === draggedId);
        const targetIndex = siblings.findIndex((f) => f.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) {
          throw new Error("Invalid folder positions");
        }
        
        const reordered = [...siblings];
        const [removed] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, removed);
        
        await reorderFolders(targetParentPath, reordered.map((f) => f.id));
        toast.success("Folder reordered");
      } else {
        // Move to a different folder (target becomes the new parent)
        await moveFolderToFolder(draggedId, targetId);
        toast.success("Folder moved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    }
    
    setDraggedId(null);
    setDraggedParentPath([]);
    setDragOverId(null);
    setDragOverType(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDraggedParentPath([]);
    setDragOverId(null);
    setDragOverType(null);
  };

  const isRootActive = pathname === "/dataroom";
  const isRootDragOver = dragOverId === "root";

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId) {
      setDragOverId(null);
      setDragOverType(null);
      return;
    }
    
    // If dragged folder is already at root level, it's a reorder
    const isDraggedAtRoot = draggedParentPath.length === 0;
    
    setDragOverId("root");
    setDragOverType(isDraggedAtRoot ? "reorder" : "move");
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedId) {
      setDraggedId(null);
      setDraggedParentPath([]);
      setDragOverId(null);
      setDragOverType(null);
      return;
    }
    
    // Check if already at root
    const isDraggedAtRoot = draggedParentPath.length === 0;
    
    if (!isDraggedAtRoot) {
      // Move to root
      try {
        await moveFolderToFolder(draggedId, null);
        toast.success("Folder moved to root");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to move to root");
      }
    }
    // If already at root, do nothing (can't move root to root)
    
    setDraggedId(null);
    setDraggedParentPath([]);
    setDragOverId(null);
    setDragOverType(null);
  };

  return (
    <>
      <SidebarMenu>
        {/* Root navigation item - droppable */}
        <SidebarMenuItem
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
          className={cn(
            isRootDragOver && dragOverType === "move" && "bg-green-500/20 rounded-md border-2 border-green-500/40"
          )}
        >
          <SidebarMenuButton asChild isActive={isRootActive} className="font-semibold">
            <Link href="/dataroom" className="flex items-center gap-2">
              <HomeIcon className="size-4 shrink-0" />
              <span className="truncate group-data-[collapsible=icon]:hidden">HSI DATA ROOM</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        {/* Folder items */}
        {sortedRootFolders.map((folder) => (
          <NavFolder
            key={folder.id}
            folder={folder}
            path={[]}
            depth={0}
            pathname={pathname}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            onContextMenu={(e, path, f) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY, path, folder: f });
            }}
            draggedId={draggedId}
            dragOverId={dragOverId}
            dragOverType={dragOverType}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </SidebarMenu>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[140px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={handleRename}
          >
            <PencilIcon className="size-4" />
            Rename
          </button>
          <button
            type="button"
            className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            onClick={handleAddSubfolder}
          >
            <FolderPlusIcon className="size-4" />
            Add subfolder
          </button>
          <button
            type="button"
            className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2Icon className="size-4" />
            Delete
          </button>
        </div>
      )}

      <InputDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename folder"
        label="Name"
        placeholder="Folder name"
        submitLabel="Rename"
        defaultValue={renameName}
        onSubmit={async (value) => {
          setRenameOpen(false);
          try {
            await renameItem(renamePath, renameId, value);
            toast.success("Folder renamed");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Rename failed");
          }
        }}
      />
      <InputDialog
        open={addSubfolderOpen}
        onOpenChange={setAddSubfolderOpen}
        title="New subfolder"
        label="Name"
        placeholder="Subfolder name"
        submitLabel="Add"
        defaultValue=""
        onSubmit={async (value) => {
          setAddSubfolderOpen(false);
          try {
            await addFolder(addSubfolderPath, value);
            toast.success("Subfolder created");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to create subfolder");
          }
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete folder"
        description={`Delete "${deleteName}" and all its contents? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          setDeleteOpen(false);
          try {
            await deleteItem(deletePath, deleteId);
            toast.success("Folder deleted");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </>
  );
}

function NavFolder({
  folder,
  path,
  depth,
  pathname,
  expanded,
  toggleExpanded,
  onContextMenu,
  draggedId,
  dragOverId,
  dragOverType,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  folder: DataRoomFolder;
  path: DataRoomPath;
  depth: number;
  pathname: string;
  expanded: Set<string>;
  toggleExpanded: (key: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    path: DataRoomPath,
    folder: DataRoomFolder
  ) => void;
  draggedId: string | null;
  dragOverId: string | null;
  dragOverType: "reorder" | "move" | null;
  onDragStart: (folderId: string, path: DataRoomPath) => void;
  onDragOver: (e: React.DragEvent, folderId: string, path: DataRoomPath) => void;
  onDrop: (e: React.DragEvent, folderId: string, path: DataRoomPath) => void;
  onDragEnd: () => void;
}) {
  const fullPath = [...path, folder.slug];
  const key = pathKey(fullPath);
  const href = hrefForPath(fullPath);
  const isExpanded = expanded.has(key);
  const childFolders = React.useMemo(() => {
    return folder.children
      .filter((c): c is DataRoomFolder => isFolder(c))
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [folder.children]);
  const hasChildren = childFolders.length > 0;
  const isActive =
    pathname === href || (pathname.startsWith(href + "/") && pathname !== href);

  const indentClass =
    depth === 0
      ? "pl-0"
      : depth === 1
        ? "pl-2"
        : depth === 2
          ? "pl-4"
          : depth === 3
            ? "pl-6"
            : "pl-8";

  const isDragging = draggedId === folder.id;
  const isDragOver = dragOverId === folder.id;

  return (
    <SidebarMenuItem
      draggable
      onDragStart={() => onDragStart(folder.id, path)}
      onDragOver={(e) => onDragOver(e, folder.id, path)}
      onDrop={(e) => onDrop(e, folder.id, path)}
      onDragEnd={onDragEnd}
      className={cn(
        "group/folder cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isDragOver && dragOverType === "reorder" && "bg-primary/10 rounded-md",
        isDragOver && dragOverType === "move" && "bg-green-500/20 rounded-md border-2 border-green-500/40"
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 items-center gap-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:gap-0",
          indentClass
        )}
      >
        <button
          type="button"
          className="flex size-6 shrink-0 items-center justify-center rounded p-0 hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
          aria-expanded={hasChildren ? isExpanded : undefined}
          onClick={() => hasChildren && toggleExpanded(key)}
        >
          {hasChildren ? (
            <ChevronRightIcon
              className={cn("size-4 shrink-0 transition-transform", isExpanded && "rotate-90")}
            />
          ) : (
            <span className="size-4" />
          )}
        </button>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={folder.name}
          className="flex-1 min-w-0 rounded-md"
          onContextMenu={(e: React.MouseEvent) => onContextMenu(e, path, folder)}
        >
          <Link href={href} className="flex items-center gap-2 min-w-0" title={folder.name}>
            <FolderIcon className="size-4 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{folder.name}</span>
          </Link>
        </SidebarMenuButton>
      </div>
      {hasChildren && isExpanded && (
        <SidebarMenuSub className="mt-0 mx-2 border-l border-sidebar-border pl-1.5">
          {childFolders.map((child) => (
            <NavFolder
              key={child.id}
              folder={child}
              path={fullPath}
              depth={depth + 1}
              pathname={pathname}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
              onContextMenu={onContextMenu}
              draggedId={draggedId}
              dragOverId={dragOverId}
              dragOverType={dragOverType}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function AddNavigationButton() {
  const { addFolder } = useDataRoom();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&_span]:hidden"
        title="New root folder"
      >
        <PlusIcon className="size-4 shrink-0" />
        <span>New folder</span>
      </button>
      <InputDialog
        open={open}
        onOpenChange={setOpen}
        title="New folder"
        description="Add a new top-level folder to the Data Room."
        label="Name"
        placeholder="Folder name"
        submitLabel="Add"
        defaultValue=""
        onSubmit={async (value) => {
          setOpen(false);
          try {
            await addFolder([], value);
            toast.success("Folder created");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to create folder");
          }
        }}
      />
    </>
  );
}
