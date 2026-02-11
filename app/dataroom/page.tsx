"use client";

import * as React from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataRoomControls } from "@/components/dataroom/dataroom-controls";
import { useDataRoom } from "@/contexts/dataroom-context";
import { ConfirmDialog } from "@/components/dataroom/confirm-dialog";
import { ShareLinkModal } from "@/components/dataroom/share-link-modal";
import { InputDialog } from "@/components/dataroom/input-dialog";
import { MoveToFolderModal } from "@/components/dataroom/move-to-folder-modal";
import { isFolder, isFile, type DataRoomPath, type DataRoomFolder, type DataRoomItem, type DataRoomFile } from "@/lib/dataroom-types";
import { downloadFolderZip, downloadFile } from "@/lib/dataroom-download";
import { getFlattenedItems, applySearchAndFilters, applyFiltersOnly, getLocationLabel } from "@/lib/dataroom-search-filter";
import { FilePreviewModal } from "@/components/dataroom/file-preview-modal";
import { useToast } from "@/components/ui/toast";
import {
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  FolderIcon,
  FileTextIcon,
  LinkIcon as LinkIconLucide,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TablePagination, PAGE_SIZE } from "@/components/ui/table-pagination";

const ROOT_PATH: string[] = [];

function getItemIcon(item: DataRoomItem, size: "sm" | "lg" = "lg") {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-10 w-10";
  if (isFolder(item)) return <FolderIcon className={`${sizeClass} text-primary`} />;
  if (item.type === "link") return <LinkIconLucide className={`${sizeClass} text-blue-500`} />;
  return <FileTextIcon className={`${sizeClass} text-muted-foreground`} />;
}

export default function DataRoomPage() {
  const router = useRouter();
  const { state, getChildren, getFolder, addFolder, renameItem, deleteItem, moveItem, setSharing } = useDataRoom();
  const toast = useToast();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const ignoreNextRowClickRef = React.useRef(false);

  const [searchValue, setSearchValue] = React.useState("");
  const [fileTypeFilter, setFileTypeFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("");

  const hasSearch = searchValue.trim() !== "";
  const flattenedItems = React.useMemo(() => getFlattenedItems(state.rootFolders), [state.rootFolders]);
  const filteredGlobalItems = React.useMemo(
    () =>
      applySearchAndFilters(flattenedItems, state.rootFolders, {
        search: searchValue,
        fileType: fileTypeFilter,
        date: dateFilter,
      }),
    [flattenedItems, state.rootFolders, searchValue, fileTypeFilter, dateFilter]
  );
  const rootItemsWithPath = React.useMemo(
    () => state.rootFolders.map((f) => ({ item: f as DataRoomItem, path: [f.slug] as DataRoomPath })),
    [state.rootFolders]
  );
  const filteredRootItems = React.useMemo(
    () =>
      applyFiltersOnly(rootItemsWithPath, { fileType: fileTypeFilter, date: dateFilter }),
    [rootItemsWithPath, fileTypeFilter, dateFilter]
  );
  const displayItemsWithPath = React.useMemo(() => {
    if (hasSearch) return filteredGlobalItems;
    return filteredRootItems;
  }, [hasSearch, filteredGlobalItems, filteredRootItems]);
  const showLocationColumn = hasSearch;
  const hasActiveSearchOrFilter = hasSearch || fileTypeFilter !== "all" || dateFilter !== "";

  const totalItems = hasActiveSearchOrFilter ? displayItemsWithPath.length : state.rootFolders.length;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedDisplayItems = displayItemsWithPath.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const paginatedFolders = state.rootFolders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // Reset to first page only when the user changes search/filters.
  React.useEffect(() => setPage(1), [searchValue, fileTypeFilter, dateFilter]);
  // Keep current page when data changes; clamp if page becomes invalid.
  React.useEffect(() => setPage((p) => Math.min(Math.max(p, 1), totalPages)), [totalPages]);

  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameItemId, setRenameItemId] = React.useState<string | null>(null);
  const [renamePath, setRenamePath] = React.useState<DataRoomPath>(ROOT_PATH);
  const [renameName, setRenameName] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteEntries, setDeleteEntries] = React.useState<{ item: DataRoomItem; path: DataRoomPath }[] | null>(null);
  const [deleteName, setDeleteName] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");
  const [shareAccess, setShareAccess] = React.useState<"view" | "edit">("view");
  const [shareItem, setShareItem] = React.useState<DataRoomItem | null>(null);
  const [shareItemPath, setShareItemPath] = React.useState<DataRoomPath>(ROOT_PATH);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveItemObj, setMoveItemObj] = React.useState<DataRoomItem | null>(null);
  const [moveItemPath, setMoveItemPath] = React.useState<DataRoomPath>(ROOT_PATH);
  const [moveConfirmOpen, setMoveConfirmOpen] = React.useState(false);
  const [moveTargetPath, setMoveTargetPath] = React.useState<DataRoomPath | null>(null);
  const [moveTargetLabel, setMoveTargetLabel] = React.useState("");
  const [previewFile, setPreviewFile] = React.useState<DataRoomFile | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const folders = getChildren(ROOT_PATH).filter((c): c is DataRoomFolder => isFolder(c));
  const itemParentPath = (item: DataRoomItem, itemPath: DataRoomPath): DataRoomPath =>
    isFolder(item) ? itemPath.slice(0, -1) : itemPath;

  const handleNewFolder = async (name: string) => {
    setNewFolderOpen(false);
    try {
      await addFolder(ROOT_PATH, name);
      toast.success("Folder created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create folder");
    }
  };

  const openRename = (item: DataRoomItem, itemPath: DataRoomPath) => {
    ignoreNextRowClickRef.current = true;
    setRenameItemId(item.id);
    setRenamePath(itemParentPath(item, itemPath));
    setRenameName(item.name);
    setRenameOpen(true);
  };

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

  const openDelete = (item: DataRoomItem, itemPath: DataRoomPath) => {
    ignoreNextRowClickRef.current = true;
    setDeleteEntries([{ item, path: itemPath }]);
    setDeleteName(item.name);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteEntries || deleteEntries.length === 0) return;
    const toDelete = deleteEntries;
    setDeleteOpen(false);
    setDeleteEntries(null);
    try {
      for (const { item: it, path: p } of toDelete) await deleteItem(itemParentPath(it, p), it.id);
      toast.success(toDelete.length === 1 ? "Item deleted" : `${toDelete.length} items deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const sharingToAccess = (sharing: string | undefined): "view" | "edit" => {
    if (!sharing) return "view";
    const s = sharing.toLowerCase();
    if (s.includes("edit")) return "edit";
    return "view";
  };

  const openShare = (item: DataRoomItem, itemPath: DataRoomPath) => {
    ignoreNextRowClickRef.current = true;
    setShareItemPath(itemParentPath(item, itemPath));
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const pathPrefix = itemPath.length ? itemPath.join("/") : "";
    if (isFolder(item))
      setShareLink(pathPrefix ? `${origin}/dataroom/${pathPrefix}` : `${origin}/dataroom/${item.slug}`);
    else setShareLink(pathPrefix ? `${origin}/dataroom/${pathPrefix}?file=${item.id}` : `${origin}/dataroom?file=${item.id}`);
    setShareItem(item);
    setShareAccess(sharingToAccess(item.sharing ?? ""));
    setShareOpen(true);
  };

  const itemsCount = (folder: DataRoomFolder) =>
    folder.children.length > 0 ? `${folder.children.length} items` : "0 items";

  const handleShareAccessChange = (access: "view" | "edit") => {
    setShareAccess(access);
    if (!shareItem) return;
    const label =
      access === "edit"
        ? "Anyone with link (edit)"
        : "Anyone with link (view)";
    setSharing(shareItemPath, shareItem.id, label);
  };

  const handleRootDownload = () => {
    downloadFolderZip([], state.rootFolders, "Data Room")
      .then(() => toast.success('Downloaded "Data Room" as ZIP'))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Download failed"));
  };

  const openMove = (item: DataRoomItem, itemPath: DataRoomPath) => {
    ignoreNextRowClickRef.current = true;
    setMoveItemObj(item);
    setMoveItemPath(itemParentPath(item, itemPath));
    setMoveOpen(true);
  };

  const handleMoveSelect = (targetPath: DataRoomPath) => {
    const label =
      targetPath.length === 0 ? "Data Room" : (getFolder(targetPath)?.name ?? targetPath[targetPath.length - 1]);
    setMoveTargetPath(targetPath);
    setMoveTargetLabel(label);
    setMoveConfirmOpen(true);
  };

  const handleMoveConfirm = () => {
    if (!moveItemObj || moveTargetPath === null) return;
    moveItem(moveItemPath, moveItemObj.id, moveTargetPath);
    setMoveConfirmOpen(false);
    setMoveTargetPath(null);
    setMoveTargetLabel("");
    setMoveItemObj(null);
  };

  const navigateTo = (item: DataRoomItem, itemPath: DataRoomPath) => {
    if (isFolder(item)) router.push("/dataroom/" + itemPath.join("/"));
    else if (isFile(item)) {
      setPreviewFile(item);
      setPreviewOpen(true);
    }
  };

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Data Room</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden border-b">
        <Image
          src="/banner.png"
          alt="Data Room Banner"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="flex flex-1 flex-col p-6 gap-4">
        {state.error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}
        {state.loading && folders.length === 0 ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : null}
        <DataRoomControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchPlaceholder="Search file or folder"
          searchValue={searchValue}
          onSearch={setSearchValue}
          fileTypeValue={fileTypeFilter}
          onFileTypeChange={setFileTypeFilter}
          dateValue={dateFilter}
          onDateChange={setDateFilter}
          onDownload={handleRootDownload}
        />

        <div className="flex-1">
          {hasActiveSearchOrFilter ? (
            <Card className="border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Name</TableHead>
                    {showLocationColumn && <TableHead className="w-[140px] max-w-[140px]">Location</TableHead>}
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
                      className="cursor-pointer hover:bg-primary/5 group"
                      onClick={() => {
                        if (ignoreNextRowClickRef.current) {
                          ignoreNextRowClickRef.current = false;
                          return;
                        }
                        navigateTo(item, rowPath);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {getItemIcon(item, "sm")}
                          <span className="group-hover:text-primary transition-colors">{item.name}</span>
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
                              onSelect={(e) => { e.preventDefault(); openRename(item, rowPath); }}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openShare(item, rowPath); }}
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
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
                                  onSelect={(e) => { e.preventDefault(); setPreviewFile(item); setPreviewOpen(true); }}
                                >
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="focus:bg-primary/10 focus:text-primary"
                                  onSelect={(e) => { e.preventDefault(); downloadFile(item).catch((err) => toast.error(err instanceof Error ? err.message : "Download failed")); }}
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
          ) : viewMode === "grid" ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {paginatedFolders.map((folder) => (
                <Card
                  key={folder.id}
                  className="group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 h-full"
                  onClick={() => {
                    if (ignoreNextRowClickRef.current) {
                      ignoreNextRowClickRef.current = false;
                      return;
                    }
                    router.push(`/dataroom/${folder.slug}`);
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-6 h-full flex flex-col relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-5xl">{folder.icon ?? "📁"}</div>
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
                              onSelect={(e) => { e.preventDefault(); openRename(folder, [folder.slug]); }}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openShare(folder, [folder.slug]); }}
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openMove(folder, [folder.slug]); }}
                            >
                              <FolderIcon className="h-4 w-4 mr-2" />
                              Move to...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-destructive/10 focus:text-destructive"
                              onSelect={(e) => { e.preventDefault(); openDelete(folder, [folder.slug]); }}
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-auto">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                          {folder.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {folder.description ?? `${folder.children.length} items`}
                        </p>
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
                      <p className="text-sm text-muted-foreground">Create a new folder</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {totalPages > 1 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={setPage}
              />
            )}
            </>
          ) : (
            <Card className="border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>File size</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFolders.map((folder) => (
                    <TableRow
                      key={folder.id}
                      className="cursor-pointer hover:bg-primary/5 group"
                      onClick={() => {
                        if (ignoreNextRowClickRef.current) {
                          ignoreNextRowClickRef.current = false;
                          return;
                        }
                        router.push(`/dataroom/${folder.slug}`);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="group-hover:text-primary transition-colors">
                            {folder.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {folder.modified}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {folder.modifiedBy}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {itemsCount(folder)}
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
                              onSelect={(e) => { e.preventDefault(); openRename(folder, [folder.slug]); }}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openShare(folder, [folder.slug]); }}
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openMove(folder, [folder.slug]); }}
                            >
                              <FolderIcon className="h-4 w-4 mr-2" />
                              Move to...
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-destructive/10 focus:text-destructive"
                              onSelect={(e) => { e.preventDefault(); openDelete(folder, [folder.slug]); }}
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
          )}
        </div>
      </div>

      <FilePreviewModal file={previewFile} open={previewOpen} onOpenChange={setPreviewOpen} />

      <InputDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New Folder"
        description="Create a new folder in the Data Room."
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

      {moveItemObj && (
        <MoveToFolderModal
          open={moveOpen}
          onOpenChange={setMoveOpen}
          itemName={moveItemObj.name}
          sourcePath={ROOT_PATH}
          movingItem={moveItemObj}
          onSelect={handleMoveSelect}
        />
      )}

      <ConfirmDialog
        open={moveConfirmOpen}
        onOpenChange={setMoveConfirmOpen}
        title="Move folder"
        description={
          moveItemObj
            ? `Move "${moveItemObj.name}" to ${moveTargetLabel}?`
            : ""
        }
        confirmLabel="Move"
        cancelLabel="Cancel"
        onConfirm={handleMoveConfirm}
      />
    </SidebarInset>
  );
}
