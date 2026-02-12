"use client";

import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DataRoomControls } from "@/components/dataroom/dataroom-controls";
import { useDataRoom } from "@/contexts/dataroom-context";
import { ConfirmDialog } from "@/components/dataroom/confirm-dialog";
import { ShareLinkModal } from "@/components/dataroom/share-link-modal";
import { InputDialog } from "@/components/dataroom/input-dialog";
import { MoveToFolderModal } from "@/components/dataroom/move-to-folder-modal";
import { UploadFilesDialog } from "@/components/dataroom/upload-files-dialog";
import { downloadFile, downloadFolderZip } from "@/lib/dataroom-download";
import {
  getFlattenedItems,
  applySearchAndFilters,
  applyFiltersOnly,
  getLocationLabel,
} from "@/lib/dataroom-search-filter";
import { useToast } from "@/components/ui/toast";
import {
  isFolder,
  isFile,
  type DataRoomPath,
  type DataRoomFile,
  type DataRoomItem,
} from "@/lib/dataroom-types";
import { FilePreviewModal } from "@/components/dataroom/file-preview-modal";
import {
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon as LinkIconLucide,
  FolderIcon,
  FileTextIcon,
  PlusIcon,
  ArrowLeftIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { TablePagination, PAGE_SIZE } from "@/components/ui/table-pagination";
import { PasteUploadHandler } from "@/components/dataroom/paste-upload-handler";
import { DropZoneUploadDialog } from "@/components/dataroom/drop-zone-upload-dialog";
import { TableSkeleton } from "@/components/dataroom/table-skeleton";
import { GridSkeleton } from "@/components/dataroom/grid-skeleton";

function getItemIcon(item: DataRoomItem, size: "sm" | "lg" = "lg") {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-10 w-10";
  if (isFolder(item)) return <FolderIcon className={`${sizeClass} text-primary`} />;
  if (item.type === "link") return <LinkIconLucide className={`${sizeClass} text-blue-500`} />;
  return <FileTextIcon className={`${sizeClass} text-muted-foreground`} />;
}

export default function DynamicDataRoomPage() {
  const router = useRouter();
  const params = useParams();
  
  // path can be undefined (root), a string (single level), or string[] (multiple levels)
  const pathParam = params.path;
  const path: DataRoomPath = React.useMemo(() => {
    if (!pathParam) return [];
    if (typeof pathParam === "string") return [pathParam];
    return pathParam;
  }, [pathParam]);

  const { state, getChildren, getFolder, loadFolderChildren, addFolder, uploadFiles, renameItem, deleteItem, moveItem, setSharing } =
    useDataRoom();
  const toast = useToast();
  
  const folder = path.length > 0 ? getFolder(path) : null;
  const children = getChildren(path);

  // Lazy load all parent folders in the path chain
  React.useEffect(() => {
    const loadPathChain = async () => {
      // Load each folder in the path from root to current
      for (let i = 1; i <= path.length; i++) {
        const partialPath = path.slice(0, i);
        const folderAtPath = getFolder(partialPath);
        
        if (folderAtPath && !state.loadedFolderIds.has(folderAtPath.id)) {
          await loadFolderChildren(folderAtPath.id);
        }
      }
    };
    
    if (path.length > 0) {
      loadPathChain();
    }
  }, [path, state.loadedFolderIds, loadFolderChildren, getFolder]);

  // Also load children of the current folder
  React.useEffect(() => {
    if (folder && !state.loadedFolderIds.has(folder.id)) {
      loadFolderChildren(folder.id);
    }
  }, [folder, state.loadedFolderIds, loadFolderChildren]);

  const [searchValue, setSearchValue] = React.useState("");
  const [fileTypeFilter, setFileTypeFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("");

  const [isDragOver, setIsDragOver] = React.useState(false);
  const [dragCounter, setDragCounter] = React.useState(0);
  const [droppedFiles, setDroppedFiles] = React.useState<File[]>([]);
  const [dropDialogOpen, setDropDialogOpen] = React.useState(false);

  const hasSearch = searchValue.trim() !== "";
  const flattenedItems = React.useMemo(
    () => getFlattenedItems(state.rootFolders),
    [state.rootFolders]
  );
  const filteredGlobalItems = React.useMemo(
    () =>
      applySearchAndFilters(flattenedItems, state.rootFolders, {
        search: searchValue,
        fileType: fileTypeFilter,
        date: dateFilter,
      }),
    [flattenedItems, state.rootFolders, searchValue, fileTypeFilter, dateFilter]
  );
  const folderItemsWithPath = React.useMemo(
    () => children.map((item) => ({ 
      item, 
      path: isFolder(item) 
        ? (path.length === 0 ? [item.slug] : [...path, item.slug])  // Folders: append their slug
        : path  // Files: use parent folder path
    })),
    [children, path]
  );
  const filteredFolderItems = React.useMemo(
    () =>
      applyFiltersOnly(folderItemsWithPath, { fileType: fileTypeFilter, date: dateFilter }),
    [folderItemsWithPath, fileTypeFilter, dateFilter]
  );
  const displayItemsWithPath = React.useMemo(() => {
    if (hasSearch) return filteredGlobalItems;
    return filteredFolderItems;
  }, [hasSearch, filteredGlobalItems, filteredFolderItems]);
  const showLocationColumn = hasSearch;
  const hasActiveSearchOrFilter = hasSearch || fileTypeFilter !== "all" || dateFilter !== "";

  const totalItems = displayItemsWithPath.length;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedDisplayItems = displayItemsWithPath.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  
  React.useEffect(() => setPage(1), [searchValue, fileTypeFilter, dateFilter]);
  React.useEffect(() => setPage((p) => Math.min(Math.max(p, 1), totalPages)), [totalPages]);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameItemId, setRenameItemId] = React.useState<string | null>(null);
  const [renamePath, setRenamePath] = React.useState<DataRoomPath>(path);
  const [renameName, setRenameName] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteEntries, setDeleteEntries] = React.useState<{ item: DataRoomItem; path: DataRoomPath }[] | null>(null);
  const [deleteName, setDeleteName] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");
  const [shareAccess, setShareAccess] = React.useState<"view" | "edit">("view");
  const [shareItem, setShareItem] = React.useState<DataRoomItem | null>(null);
  const [shareItemPath, setShareItemPath] = React.useState<DataRoomPath>(path);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveItemObj, setMoveItemObj] = React.useState<DataRoomItem | null>(null);
  const [moveItemPath, setMoveItemPath] = React.useState<DataRoomPath>(path);
  const [moveItems, setMoveItems] = React.useState<{ item: DataRoomItem; path: DataRoomPath }[] | null>(null);
  const [moveConfirmOpen, setMoveConfirmOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [moveTargetPath, setMoveTargetPath] = React.useState<DataRoomPath | null>(null);
  const [moveTargetLabel, setMoveTargetLabel] = React.useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [previewFile, setPreviewFile] = React.useState<DataRoomFile | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const existingFileNames = React.useMemo(
    () => new Set(children.filter(isFile).map((f) => f.name)),
    [children]
  );

  const handleRename = async (newName: string) => {
    if (!renameItemId) return;
    const itemPath = renamePath;
    setRenameOpen(false);
    setRenameItemId(null);
    try {
      await renameItem(itemPath, renameItemId, newName);
      toast.success("Item renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  };

  const itemParentPath = (item: DataRoomItem, itemPath: DataRoomPath): DataRoomPath => {
    // For folders: itemPath includes the folder's slug, so remove it to get parent
    // For files: itemPath is already the parent folder path
    return isFolder(item) ? itemPath.slice(0, -1) : itemPath;
  };

  const openRename = (item: DataRoomItem, itemPath: DataRoomPath) => {
    setRenameItemId(item.id);
    setRenamePath(itemParentPath(item, itemPath));
    setRenameName(item.name);
    setRenameOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteEntries || deleteEntries.length === 0) return;
    const toDelete = deleteEntries;
    setDeleteOpen(false);
    setDeleteEntries(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      toDelete.forEach(({ item: it }) => next.delete(it.id));
      return next;
    });
    try {
      for (const { item: it, path: p } of toDelete) await deleteItem(itemParentPath(it, p), it.id);
      toast.success(toDelete.length === 1 ? "Item deleted" : `${toDelete.length} items deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const openDelete = (item: DataRoomItem, itemPath: DataRoomPath) => {
    setDeleteEntries([{ item, path: itemPath }]);
    setDeleteName(item.name);
    setDeleteOpen(true);
  };

  const sharingToAccess = (sharing: string | undefined): "view" | "edit" => {
    if (!sharing) return "view";
    const s = sharing.toLowerCase();
    if (s.includes("edit")) return "edit";
    return "view";
  };

  const openShare = (item: DataRoomItem, itemPath: DataRoomPath) => {
    setShareItemPath(itemParentPath(item, itemPath));
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const pathPrefix = itemPath.length ? itemPath.join("/") : "";
    if (isFolder(item))
      setShareLink(pathPrefix ? `${base}/dataroom/${pathPrefix}` : `${base}/dataroom/${item.slug}`);
    else setShareLink(pathPrefix ? `${base}/dataroom/${pathPrefix}?file=${item.id}` : `${base}/dataroom?file=${item.id}`);
    setShareItem(item);
    setShareAccess(sharingToAccess(item.sharing ?? ""));
    setShareOpen(true);
  };

  const handleShareAccessChange = (access: "view" | "edit") => {
    setShareAccess(access);
    if (!shareItem) return;
    const label =
      access === "edit"
        ? "Anyone with link (edit)"
        : "Anyone with link (view)";
    setSharing(shareItemPath, shareItem.id, label);
  };

  const handleDownload = (file: DataRoomFile) => {
    downloadFile(file).catch((err) => toast.error(err instanceof Error ? err.message : "Download failed"));
  };

  const handleUpload = (files: DataRoomFile[], rawFiles?: File[]) => {
    if (rawFiles?.length) {
      setUploadError(null);
      uploadFiles(path, rawFiles)
        .then(() => {
          toast.success("Files uploaded");
          setUploadDialogOpen(false);
        })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : "Upload failed";
          if (msg.toLowerCase().includes("don't have permission") || msg.toLowerCase().includes("do not have permission")) {
            setUploadError(msg);
          } else {
            toast.error(msg);
          }
        });
    }
  };

  const handleFolderDownload = () => {
    const name = folder?.name ?? (path.length > 0 ? path[path.length - 1] : "Data Room");
    downloadFolderZip(path, state.rootFolders, name)
      .then(() => toast.success(`Downloaded "${name}" as ZIP`))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Download failed"));
  };

  const handleNewFolder = async (name: string) => {
    setNewFolderOpen(false);
    try {
      await addFolder(path, name);
      toast.success("Folder created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create folder");
    }
  };

  const openMove = (item: DataRoomItem, itemPath: DataRoomPath) => {
    setMoveItemObj(item);
    setMoveItemPath(itemParentPath(item, itemPath));
    setMoveItems(null);
    setMoveOpen(true);
  };

  const selectedItemsWithPath = React.useMemo(
    () => displayItemsWithPath.filter(({ item }) => selectedIds.has(item.id)),
    [displayItemsWithPath, selectedIds]
  );
  
  const allSelected = displayItemsWithPath.length > 0 && selectedIds.size === displayItemsWithPath.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayItemsWithPath.map(({ item }) => item.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const openBulkMove = () => {
    if (selectedItemsWithPath.length === 0) return;
    setMoveItemObj(null);
    setMoveItems(selectedItemsWithPath);
    setMoveOpen(true);
  };
  
  const openBulkDelete = () => {
    if (selectedItemsWithPath.length === 0) return;
    setDeleteEntries(selectedItemsWithPath);
    setDeleteName(selectedItemsWithPath.length === 1 ? selectedItemsWithPath[0].item.name : `${selectedItemsWithPath.length} items`);
    setDeleteOpen(true);
  };

  const handleMoveSelect = (targetPath: DataRoomPath) => {
    const label =
      targetPath.length === 0 ? "Data Room" : (getFolder(targetPath)?.name ?? targetPath[targetPath.length - 1]);
    setMoveTargetPath(targetPath);
    setMoveTargetLabel(label);
    setMoveConfirmOpen(true);
  };

  const handleMoveConfirm = async () => {
    if (moveTargetPath === null) return;
    
    // Close dialog immediately for better UX
    setMoveConfirmOpen(false);
    const itemsToMove = moveItems && moveItems.length > 0 ? moveItems : (moveItemObj ? [{ item: moveItemObj, path: moveItemPath }] : []);
    
    try {
      // Move all items
      for (const { item, path: srcPath } of itemsToMove) {
        // srcPath needs to be the parent path where the item currently lives
        // For single item: moveItemPath is already the parent (processed by itemParentPath in openMove)
        // For bulk items: selectedItemsWithPath has the raw path, so we need to process it
        const parentPath = moveItems && moveItems.length > 0 ? itemParentPath(item, srcPath) : srcPath;
        await moveItem(parentPath, item.id, moveTargetPath);
      }
      
      // Clear selection after successful move
      setSelectedIds((prev) => {
        const next = new Set(prev);
        itemsToMove.forEach(({ item }) => next.delete(item.id));
        return next;
      });
      
      toast.success(itemsToMove.length === 1 ? "Item moved" : `${itemsToMove.length} items moved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Move failed");
    } finally {
      setMoveTargetPath(null);
      setMoveTargetLabel("");
      setMoveItemObj(null);
      setMoveItems(null);
    }
  };

  const navigateTo = (item: DataRoomItem, itemPath: DataRoomPath) => {
    if (isFolder(item)) {
      router.push("/dataroom/" + itemPath.join("/"));
    } else if (isFile(item)) {
      setPreviewFile(item);
      setPreviewOpen(true);
    }
  };

  const openPreview = (file: DataRoomFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const next = prev - 1;
      if (next === 0) setIsDragOver(false);
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setDroppedFiles(files);
    setDropDialogOpen(true);
  };

  const handleDropUpload = async (files: File[]) => {
    try {
      await uploadFiles(path, files);
      toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  // Build breadcrumbs dynamically
  const breadcrumbs = React.useMemo(() => {
    const crumbs: { name: string; href: string; isLast: boolean }[] = [];
    
    for (let i = 0; i < path.length; i++) {
      const partialPath = path.slice(0, i + 1);
      const folderAtPath = getFolder(partialPath);
      const name = folderAtPath?.name ?? path[i];
      const href = "/dataroom/" + partialPath.join("/");
      crumbs.push({ name, href, isLast: i === path.length - 1 });
    }
    
    return crumbs;
  }, [path, getFolder]);

  // Get parent path for back button
  const parentPath = path.length > 0 ? path.slice(0, -1) : null;
  const backHref = parentPath ? (parentPath.length > 0 ? `/dataroom/${parentPath.join("/")}` : "/dataroom") : null;

  if (path.length > 0 && !folder) {
    // Show loading state while folders are being lazy loaded
    return (
      <SidebarInset>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading folder...</p>
        </div>
      </SidebarInset>
    );
  }

  const currentFolderName = folder?.name ?? "Data Room";

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        {backHref && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backHref)}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        )}
        <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
          <BreadcrumbList>
            <BreadcrumbItem>
              {path.length === 0 ? (
                <BreadcrumbPage>Data Room</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href="/dataroom">Data Room</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.isLast ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.name}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden border-b">
        <Image src="/banner.png" alt="Data Room Banner" fill className="object-cover" priority />
      </div>

      <div 
        className="flex flex-1 flex-col p-6 gap-4 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary/50 flex items-center justify-center pointer-events-none">
            <div className="bg-background/95 rounded-lg shadow-lg p-8 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/20 mb-4">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-primary">Drop files to upload</p>
              <p className="text-sm text-muted-foreground mt-2">Release to upload to {currentFolderName}</p>
            </div>
          </div>
        )}
        
        {state.error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}
        
        <DataRoomControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDownload={handleFolderDownload}
          searchPlaceholder="Search files and folders..."
          searchValue={searchValue}
          onSearch={setSearchValue}
          fileTypeValue={fileTypeFilter}
          onFileTypeChange={setFileTypeFilter}
          dateValue={dateFilter}
          onDateChange={setDateFilter}
          onNewFolder={() => setNewFolderOpen(true)}
          onFileUpload={() => setUploadDialogOpen(true)}
          onFolderUpload={() => setUploadDialogOpen(true)}
        />

        <UploadFilesDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onFiles={handleUpload}
          existingNames={existingFileNames}
          errorMessage={uploadError}
        />

        {someSelected && (
          <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={openBulkMove}>
                <FolderIcon className="h-4 w-4 mr-2" />
                Move
              </Button>
              <Button variant="destructive" size="sm" onClick={openBulkDelete}>
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1">
          {state.loading ? (
            viewMode === "list" || hasActiveSearchOrFilter ? (
              <Card className="border-primary/20">
                <TableSkeleton rows={8} showLocationColumn={showLocationColumn} showCheckbox={true} />
              </Card>
            ) : (
              <GridSkeleton items={6} />
            )
          ) : viewMode === "list" || hasActiveSearchOrFilter ? (
            <Card className="border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleSelectAll()}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[40%]">Name</TableHead>
                    {showLocationColumn && (
                      <TableHead className="w-[140px] max-w-[140px]">Location</TableHead>
                    )}
                    <TableHead>Modified</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>File size</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDisplayItems.map(({ item, path: rowPath }) => (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer hover:bg-primary/5 group ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}
                      onClick={() => navigateTo(item, rowPath)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(item.id);
                              else next.delete(item.id);
                              return next;
                            })
                          }
                          aria-label={`Select ${item.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {getItemIcon(item, "sm")}
                          <span className="group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      {showLocationColumn && (
                        <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate" title={getLocationLabel(rowPath, state.rootFolders)}>
                          {getLocationLabel(rowPath, state.rootFolders)}
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground text-sm">{item.modified}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.modifiedBy}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {isFile(item) ? item.size : isFolder(item) ? `${item.children.length} items` : ""}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openRename(item, rowPath); }}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              {isFile(item) && item.type === "link" ? "Edit Link" : "Rename"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openShare(item, rowPath); }}
                            >
                              <LinkIconLucide className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openMove(item, rowPath); }}
                            >
                              <FolderIcon className="h-4 w-4 mr-2" />
                              Move to...
                            </DropdownMenuItem>
                            {isFile(item) && (
                              <>
                                <DropdownMenuItem
                                  className="focus:bg-primary/10 focus:text-primary"
                                  onSelect={(e) => { e.preventDefault(); openPreview(item); }}
                                >
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="focus:bg-primary/10 focus:text-primary"
                                  onSelect={(e) => { e.preventDefault(); handleDownload(item); }}
                                >
                                  Download
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              className="focus:bg-destructive/10 focus:text-destructive"
                              onSelect={(e) => { e.preventDefault(); openDelete(item, rowPath); }}
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={setPage}
                />
              )}
            </Card>
          ) : (
            <div>
              {displayItemsWithPath.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSelectAll()}
                  >
                    {allSelected ? "Clear selection" : "Select all"}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDisplayItems.map(({ item, path: rowPath }) => (
                  <Card
                    key={item.id}
                    className={`group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 h-full ${selectedIds.has(item.id) ? "ring-2 ring-primary" : ""}`}
                    onClick={() => navigateTo(item, rowPath)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6 h-full flex flex-col relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={(checked) =>
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(item.id);
                                else next.delete(item.id);
                                return next;
                              })
                            }
                            aria-label={`Select ${item.name}`}
                          />
                          {getItemIcon(item)}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                              >
                                <MoreVerticalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="focus:bg-primary/10 focus:text-primary"
                                onSelect={(e) => { e.preventDefault(); openRename(item, rowPath); }}
                              >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="focus:bg-primary/10 focus:text-primary"
                                onSelect={(e) => { e.preventDefault(); openShare(item, rowPath); }}
                              >
                                <LinkIconLucide className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="focus:bg-primary/10 focus:text-primary"
                                onSelect={(e) => { e.preventDefault(); openMove(item, rowPath); }}
                              >
                                <FolderIcon className="h-4 w-4 mr-2" />
                                Move to...
                              </DropdownMenuItem>
                              {isFile(item) && (
                                <>
                                  <DropdownMenuItem
                                    className="focus:bg-primary/10 focus:text-primary"
                                    onSelect={(e) => { e.preventDefault(); openPreview(item); }}
                                  >
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="focus:bg-primary/10 focus:text-primary"
                                    onSelect={(e) => { e.preventDefault(); handleDownload(item); }}
                                  >
                                    Download
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                className="focus:bg-destructive/10 focus:text-destructive"
                                onSelect={(e) => { e.preventDefault(); openDelete(item, rowPath); }}
                              >
                                <TrashIcon className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {!hasActiveSearchOrFilter && (
                  <Card
                    className="group hover:shadow-lg hover:shadow-primary/20 hover:border-primary transition-all cursor-pointer relative overflow-hidden border-2 border-dashed border-primary/40 bg-primary/5"
                    onClick={() => setNewFolderOpen(true)}
                  >
                    <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[180px]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 group-hover:scale-110 transition-all">
                          <PlusIcon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-semibold text-lg mb-1 text-primary">New Folder</h3>
                          <p className="text-sm text-muted-foreground">Create a new folder</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              {totalPages > 1 && (
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <InputDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New Folder"
        description={path.length === 0 ? "Create a new folder in the Data Room." : "Create a new subfolder."}
        label="Folder name"
        placeholder="Enter folder name"
        submitLabel="Create"
        onSubmit={handleNewFolder}
      />

      <InputDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Rename"
        description="Enter a new name for this item."
        label="Name"
        placeholder="Enter new name"
        submitLabel="Rename"
        defaultValue={renameName}
        onSubmit={handleRename}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete item"
        description={`Are you sure you want to delete "${deleteName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ShareLinkModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        link={shareLink}
        title="Share link"
        access={shareAccess}
        onAccessChange={handleShareAccessChange}
      />

      {(moveItemObj || (moveItems && moveItems.length > 0)) && (
        <MoveToFolderModal
          open={moveOpen}
          onOpenChange={setMoveOpen}
          itemName={moveItemObj?.name}
          sourcePath={path}
          movingItem={moveItemObj ?? undefined}
          movingItems={moveItems ? moveItems.map(({ item }) => item) : undefined}
          onSelect={handleMoveSelect}
        />
      )}

      <FilePreviewModal file={previewFile} open={previewOpen} onOpenChange={setPreviewOpen} />

      <ConfirmDialog
        open={moveConfirmOpen}
        onOpenChange={setMoveConfirmOpen}
        title="Move item"
        description={
          (moveItemObj || (moveItems && moveItems.length > 0))
            ? moveItems && moveItems.length > 1
              ? `Move ${moveItems.length} items to ${moveTargetLabel}?`
              : `Move "${(moveItemObj ?? moveItems?.[0]?.item)?.name}" to ${moveTargetLabel}?`
            : ""
        }
        confirmLabel="Move"
        cancelLabel="Cancel"
        onConfirm={handleMoveConfirm}
      />

      <PasteUploadHandler
        onUpload={(files) => uploadFiles(path, files)}
        enabled={!hasActiveSearchOrFilter}
      />

      <DropZoneUploadDialog
        files={droppedFiles}
        open={dropDialogOpen}
        onOpenChange={setDropDialogOpen}
        onUpload={handleDropUpload}
      />
    </SidebarInset>
  );
}
