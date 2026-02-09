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
import { downloadFile } from "@/lib/dataroom-download";
import {
  isFolder,
  isFile,
  type DataRoomPath,
  type DataRoomFolder,
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
  UsersIcon,
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

function getItemIcon(item: DataRoomItem, size: "sm" | "lg" = "lg") {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-10 w-10";
  if (isFolder(item)) return <FolderIcon className={`${sizeClass} text-primary`} />;
  if (item.type === "link") return <LinkIconLucide className={`${sizeClass} text-blue-500`} />;
  return <FileTextIcon className={`${sizeClass} text-muted-foreground`} />;
}

export default function SubfolderPage() {
  const router = useRouter();
  const params = useParams();
  const folderSlug = params.folder as string;
  const subfolderSlug = params.subfolder as string;
  const path = React.useMemo(() => [folderSlug, subfolderSlug], [folderSlug, subfolderSlug]);

  const { getChildren, getFolder, addFolder, addFiles, renameItem, deleteItem, moveItem } = useDataRoom();
  const parentFolder = getFolder([folderSlug]);
  const folder = getFolder(path);
  const children = getChildren(path);

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const ignoreNextRowClickRef = React.useRef(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameItemId, setRenameItemId] = React.useState<string | null>(null);
  const [renameName, setRenameName] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null);
  const [deleteName, setDeleteName] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");
  const [overwriteOpen, setOverwriteOpen] = React.useState(false);
  const [overwriteName, setOverwriteName] = React.useState("");
  const [overwriteResolve, setOverwriteResolve] = React.useState<((ok: boolean) => void) | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = React.useState<DataRoomFile[]>([]);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveItemObj, setMoveItemObj] = React.useState<DataRoomItem | null>(null);
  const [moveConfirmOpen, setMoveConfirmOpen] = React.useState(false);
  const [moveTargetPath, setMoveTargetPath] = React.useState<DataRoomPath | null>(null);
  const [moveTargetLabel, setMoveTargetLabel] = React.useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<DataRoomFile | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const existingFileNames = React.useMemo(
    () => new Set(children.filter(isFile).map((f) => f.name)),
    [children]
  );

  const handleRename = (newName: string) => {
    if (!renameItemId) return;
    renameItem(path, renameItemId, newName);
    setRenameOpen(false);
    setRenameItemId(null);
  };

  const openRename = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setRenameItemId(item.id);
    setRenameName(item.name);
    setRenameOpen(true);
  };

  const handleDelete = () => {
    if (!deleteItemId) return;
    deleteItem(path, deleteItemId);
    setDeleteOpen(false);
    setDeleteItemId(null);
  };

  const openDelete = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setDeleteItemId(item.id);
    setDeleteName(item.name);
    setDeleteOpen(true);
  };

  const openShare = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (isFolder(item))
      setShareLink(`${base}/dataroom/${folderSlug}/${subfolderSlug}/${item.slug}`);
    else setShareLink(`${base}/dataroom/${folderSlug}/${subfolderSlug}?file=${item.id}`);
    setShareOpen(true);
  };

  const handleDownload = (file: DataRoomFile) => {
    downloadFile(file.name, file.mimeType);
  };

  const handleUpload = (files: DataRoomFile[]) => {
    addFiles(path, files);
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
  };

  const cancelOverwrite = () => {
    overwriteResolve?.(false);
    setOverwriteOpen(false);
    setOverwriteResolve(null);
    setPendingUploadFiles([]);
  };

  const handleNewFolder = (name: string) => {
    addFolder(path, name);
    setNewFolderOpen(false);
  };

  const openMove = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setMoveItemObj(item);
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
    moveItem(path, moveItemObj.id, moveTargetPath);
    setMoveConfirmOpen(false);
    setMoveTargetPath(null);
    setMoveTargetLabel("");
    setMoveItemObj(null);
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
      router.push(`/dataroom/${folderSlug}/${subfolderSlug}/${item.slug}`);
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
              <BreadcrumbPage>{folder.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="relative w-full h-48 md:h-64 lg:h-80 overflow-hidden border-b">
        <Image src="/banner.png" alt="Data Room Banner" fill className="object-cover" priority />
      </div>

      <div className="flex flex-1 flex-col p-6 gap-4">
        <div className="flex flex-row flex-wrap items-center gap-3">
          <NewDropdown
            onNewFolder={() => setNewFolderOpen(true)}
            onFileUpload={() => setUploadDialogOpen(true)}
            onFolderUpload={() => setUploadDialogOpen(true)}
          />
          <div className="flex-1 min-w-[200px]">
            <DataRoomControls viewMode={viewMode} onViewModeChange={setViewMode} onDownload={() => {}} />
          </div>
        </div>

        <UploadFilesDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onFiles={handleUpload}
          onReplaceWarning={handleOverwriteWarning}
          existingNames={existingFileNames}
        />

        <div className="flex-1">
          {viewMode === "list" ? (
            <Card className="border-primary/20">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead>Modified By</TableHead>
                    <TableHead>File size</TableHead>
                    <TableHead>Sharing</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {children.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-primary/5 group"
                      onClick={() => {
                        if (ignoreNextRowClickRef.current) {
                          ignoreNextRowClickRef.current = false;
                          return;
                        }
                        navigateTo(item);
                      }}
                    >
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
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <UsersIcon className="h-4 w-4" />
                          {item.sharing}
                        </div>
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
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((item) => (
                <Card
                  key={item.id}
                  className="group hover:shadow-lg hover:shadow-primary/10 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden border-primary/20 h-full"
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
                      {getItemIcon(item)}
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

      <ShareLinkModal open={shareOpen} onOpenChange={setShareOpen} link={shareLink} title="Share link" />

      {moveItemObj && (
        <MoveToFolderModal
          open={moveOpen}
          onOpenChange={setMoveOpen}
          itemName={moveItemObj.name}
          sourcePath={path}
          movingItem={moveItemObj}
          onSelect={handleMoveSelect}
        />
      )}

      <FilePreviewModal file={previewFile} open={previewOpen} onOpenChange={setPreviewOpen} />

      <ConfirmDialog
        open={moveConfirmOpen}
        onOpenChange={setMoveConfirmOpen}
        title="Move item"
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
