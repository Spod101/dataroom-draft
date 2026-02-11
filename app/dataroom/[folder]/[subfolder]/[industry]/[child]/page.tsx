"use client";

import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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
import { NewDropdown } from "@/components/dataroom/new-dropdown";
import { UploadFilesDialog } from "@/components/dataroom/upload-files-dialog";
import { downloadFile, downloadFolderZip } from "@/lib/dataroom-download";
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
import { TableSkeleton } from "@/components/dataroom/table-skeleton";
import { GridSkeleton } from "@/components/dataroom/grid-skeleton";

function getItemIcon(item: DataRoomItem, size: "sm" | "lg" = "lg") {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-10 w-10";
  if (isFolder(item)) return <FolderIcon className={`${sizeClass} text-primary`} />;
  if (item.type === "link") return <LinkIconLucide className={`${sizeClass} text-blue-500`} />;
  return <FileTextIcon className={`${sizeClass} text-muted-foreground`} />;
}

export default function IndustryChildPage() {
  const router = useRouter();
  const params = useParams();
  const folderSlug = params.folder as string;
  const subfolderSlug = params.subfolder as string;
  const industrySlug = params.industry as string;
  const childSlug = params.child as string;
  const path = React.useMemo(
    () => [folderSlug, subfolderSlug, industrySlug, childSlug],
    [folderSlug, subfolderSlug, industrySlug, childSlug]
  );

  const { state, getChildren, getFolder, loadFolderChildren, addFolder, addFiles, uploadFiles, renameItem, deleteItem, moveItem, setSharing } =
    useDataRoom();
  const toast = useToast();
  const parentFolder = getFolder([folderSlug]);
  const subfolder = getFolder([folderSlug, subfolderSlug]);
  const industryFolder = getFolder([folderSlug, subfolderSlug, industrySlug]);
  const folder = getFolder(path);
  const children = getChildren(path);

  // Lazy load folder children when navigating into this folder
  React.useEffect(() => {
    if (parentFolder && !state.loadedFolderIds.has(parentFolder.id)) {
      loadFolderChildren(parentFolder.id);
    }
    if (subfolder && !state.loadedFolderIds.has(subfolder.id)) {
      loadFolderChildren(subfolder.id);
    }
    if (industryFolder && !state.loadedFolderIds.has(industryFolder.id)) {
      loadFolderChildren(industryFolder.id);
    }
    if (folder && !state.loadedFolderIds.has(folder.id)) {
      loadFolderChildren(folder.id);
    }
  }, [parentFolder, subfolder, industryFolder, folder, state.loadedFolderIds, loadFolderChildren]);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const ignoreNextRowClickRef = React.useRef(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameItemId, setRenameItemId] = React.useState<string | null>(null);
  const [renameName, setRenameName] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null);
  const [deleteIds, setDeleteIds] = React.useState<Set<string>>(new Set());
  const [deleteName, setDeleteName] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");
  const [shareAccess, setShareAccess] = React.useState<"view" | "edit">("view");
  const [shareItem, setShareItem] = React.useState<DataRoomItem | null>(null);
  const [overwriteOpen, setOverwriteOpen] = React.useState(false);
  const [overwriteName, setOverwriteName] = React.useState("");
  const [overwriteResolve, setOverwriteResolve] = React.useState<((ok: boolean) => void) | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = React.useState<DataRoomFile[]>([]);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveItemObj, setMoveItemObj] = React.useState<DataRoomItem | null>(null);
  const [moveItems, setMoveItems] = React.useState<DataRoomItem[] | null>(null);
  const [moveConfirmOpen, setMoveConfirmOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [moveTargetPath, setMoveTargetPath] = React.useState<DataRoomPath | null>(null);
  const [moveTargetLabel, setMoveTargetLabel] = React.useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<DataRoomFile | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const existingFileNames = React.useMemo(
    () => new Set(children.filter(isFile).map((f) => f.name)),
    [children]
  );

  const totalItems = children.length;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedChildren = children.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Keep current page when data changes; clamp if page becomes invalid.
  React.useEffect(() => setPage((p) => Math.min(Math.max(p, 1), totalPages)), [totalPages]);

  const handleRename = async (newName: string) => {
    if (!renameItemId) return;
    setRenameOpen(false);
    const id = renameItemId;
    setRenameItemId(null);
    try {
      await renameItem(path, id, newName);
      toast.success("Item renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  };

  const openRename = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setRenameItemId(item.id);
    setRenameName(item.name);
    setRenameOpen(true);
  };

  const handleDelete = async () => {
    const idsToDelete = deleteIds.size > 0 ? deleteIds : deleteItemId ? new Set([deleteItemId]) : new Set<string>();
    if (idsToDelete.size === 0) return;
    setDeleteOpen(false);
    setDeleteItemId(null);
    const ids: string[] = Array.from(idsToDelete);
    setDeleteIds(new Set());
    try {
      for (const id of ids) await deleteItem(path, id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(ids.length === 1 ? "Item deleted" : `${ids.length} items deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const openDelete = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setDeleteItemId(item.id);
    setDeleteIds(new Set());
    setDeleteName(item.name);
    setDeleteOpen(true);
  };

  const sharingToAccess = (sharing: string | undefined): "view" | "edit" => {
    if (!sharing) return "view";
    const s = sharing.toLowerCase();
    if (s.includes("edit")) return "edit";
    return "view";
  };

  const openShare = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (isFolder(item))
      setShareLink(`${base}/dataroom/${folderSlug}/${subfolderSlug}/${industrySlug}/${childSlug}/${item.slug}`);
    else
      setShareLink(`${base}/dataroom/${folderSlug}/${subfolderSlug}/${industrySlug}/${childSlug}?file=${item.id}`);
    setShareItem(item);
    setShareAccess(sharingToAccess(item.sharing));
    setShareOpen(true);
  };

  const handleShareAccessChange = (access: "view" | "edit") => {
    setShareAccess(access);
    if (!shareItem) return;
    const label =
      access === "edit"
        ? "Anyone with link (edit)"
        : "Anyone with link (view)";
    setSharing(path, shareItem.id, label);
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
    } else {
      addFiles(path, files);
      setUploadDialogOpen(false);
    }
  };

  const handleOverwriteWarning = (
    name: string,
    files: DataRoomFile[],
    resolve: (ok: boolean) => void
  ) => {
    setOverwriteName(name);
    setPendingUploadFiles(files);
    setOverwriteResolve(() => resolve);
    setOverwriteOpen(true);
  };

  const confirmOverwrite = () => {
    overwriteResolve?.(true);
    addFiles(path, pendingUploadFiles);
    setOverwriteOpen(false);
    setOverwriteResolve(null);
    setPendingUploadFiles([]);
    toast.success("File overwritten");
  };

  const cancelOverwrite = () => {
    overwriteResolve?.(false);
    setOverwriteOpen(false);
    setOverwriteResolve(null);
    setPendingUploadFiles([]);
  };

  const handleFolderDownload = () => {
    const name = folder?.name ?? childSlug ?? "Folder";
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

  const openMove = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setMoveItemObj(item);
    setMoveItems(null);
    setMoveOpen(true);
  };

  const selectedItems = React.useMemo(
    () => children.filter((c) => selectedIds.has(c.id)),
    [children, selectedIds]
  );
  const allSelected = children.length > 0 && selectedIds.size === children.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(children.map((c) => c.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const openBulkMove = () => {
    if (selectedItems.length === 0) return;
    setMoveItemObj(null);
    setMoveItems(selectedItems);
    setMoveOpen(true);
  };
  const openBulkDelete = () => {
    if (selectedItems.length === 0) return;
    setDeleteItemId(null);
    setDeleteIds(new Set(selectedItems.map((i) => i.id)));
    setDeleteName(selectedItems.length === 1 ? selectedItems[0].name : `${selectedItems.length} items`);
    setDeleteOpen(true);
  };

  const handleMoveSelect = (targetPath: DataRoomPath) => {
    const label =
      targetPath.length === 0 ? "Data Room" : (getFolder(targetPath)?.name ?? targetPath[targetPath.length - 1]);
    setMoveTargetPath(targetPath);
    setMoveTargetLabel(label);
    setMoveConfirmOpen(true);
  };

  const handleMoveConfirm = () => {
    if (moveTargetPath === null) return;
    const itemsToMove = moveItems && moveItems.length > 0 ? moveItems : moveItemObj ? [moveItemObj] : [];
    if (itemsToMove.length === 0) return;
    for (const item of itemsToMove) moveItem(path, item.id, moveTargetPath);
    setMoveConfirmOpen(false);
    setMoveTargetPath(null);
    setMoveTargetLabel("");
    setMoveItemObj(null);
    setMoveItems(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      itemsToMove.forEach((i) => next.delete(i.id));
      return next;
    });
  };

  if (!folder) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Folder not found</p>
        </div>
      </SidebarInset>
    );
  }

  const navigateTo = (item: DataRoomItem) => {
    if (isFolder(item)) {
      router.push(`/dataroom/${folderSlug}/${subfolderSlug}/${industrySlug}/${childSlug}/${item.slug}`);
    } else if (isFile(item)) {
      setPreviewFile(item);
      setPreviewOpen(true);
    }
  };

  const openPreview = (file: DataRoomFile) => {
    ignoreNextRowClickRef.current = true;
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dataroom">Data Room</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dataroom/${folderSlug}`}>{parentFolder?.name ?? folderSlug}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dataroom/${folderSlug}/${subfolderSlug}`}>{subfolder?.name ?? subfolderSlug}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/dataroom/${folderSlug}/${subfolderSlug}/${industrySlug}`}>
                  {industryFolder?.name ?? industrySlug}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{folder.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden border-b">
        <Image src="/banner.png" alt="Data Room Banner" fill className="object-cover" priority />
      </div>

      <div className="flex flex-1 flex-col p-6 gap-4">
        <DataRoomControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDownload={handleFolderDownload}
          onNewFolder={() => setNewFolderOpen(true)}
          onFileUpload={() => setUploadDialogOpen(true)}
          onFolderUpload={() => setUploadDialogOpen(true)}
        />

        <UploadFilesDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onFiles={handleUpload}
          onReplaceWarning={handleOverwriteWarning}
          existingNames={existingFileNames}
          errorMessage={uploadError}
        />

        {someSelected && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
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
        )}

        <div className="flex-1">
          {state.loading ? (
            viewMode === "list" ? (
              <Card className="border-primary/20">
                <TableSkeleton rows={8} showLocationColumn={showLocationColumn} showCheckbox={true} />
              </Card>
            ) : (
              <GridSkeleton items={8} />
            )
          ) : viewMode === "list" ? (
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
                    <TableHead>Modified</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>File size</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedChildren.map((item) => (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer hover:bg-primary/5 group ${selectedIds.has(item.id) ? "bg-primary/5" : ""}`}
                      onClick={() => {
                        if (ignoreNextRowClickRef.current) {
                          ignoreNextRowClickRef.current = false;
                          return;
                        }
                        navigateTo(item);
                      }}
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
                          <span className="group-hover:text-primary transition-colors">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.modified}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.modifiedBy}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {isFile(item) ? item.size : isFolder(item) ? `${item.children.length} items` : ""}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                              onSelect={(e) => { e.preventDefault(); openRename(item); }}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openShare(item); }}
                            >
                              <LinkIconLucide className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openMove(item); }}
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
                              onSelect={(e) => { e.preventDefault(); openDelete(item); }}
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
              {children.length > 0 && (
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
              {paginatedChildren.map((item) => (
                <Card
                  key={item.id}
                  className={`group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 h-full ${selectedIds.has(item.id) ? "ring-2 ring-primary" : ""}`}
                  onClick={() => {
                    if (ignoreNextRowClickRef.current) {
                      ignoreNextRowClickRef.current = false;
                      return;
                    }
                    navigateTo(item);
                  }}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
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
                            onSelect={(e) => { e.preventDefault(); openRename(item); }}
                          >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="focus:bg-primary/10 focus:text-primary"
                            onSelect={(e) => { e.preventDefault(); openShare(item); }}
                          >
                            <LinkIconLucide className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="focus:bg-primary/10 focus:text-primary"
                            onSelect={(e) => { e.preventDefault(); openMove(item); }}
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
                            onSelect={(e) => { e.preventDefault(); openDelete(item); }}
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-auto">
                      <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                      {isFile(item) && item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                      <p className="text-sm text-muted-foreground">Create a subfolder here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {totalPages > 1 && (
                <TablePagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={setPage}
                />
              )}
            </div>
            </div>
          )}
        </div>
      </div>

      <InputDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New Folder"
        description="Create a new subfolder inside this folder."
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

      <ConfirmDialog
        open={overwriteOpen}
        onOpenChange={(open) => !open && cancelOverwrite()}
        title="Overwrite file?"
        description={`A file named "${overwriteName}" already exists. Do you want to replace it with the new version?`}
        confirmLabel="Overwrite"
        cancelLabel="Cancel"
        onConfirm={confirmOverwrite}
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
          movingItems={moveItems ?? undefined}
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
              : `Move "${(moveItemObj ?? moveItems?.[0])?.name}" to ${moveTargetLabel}?`
            : ""
        }
        confirmLabel="Move"
        cancelLabel="Cancel"
        onConfirm={handleMoveConfirm}
      />
    </SidebarInset>
  );
}
