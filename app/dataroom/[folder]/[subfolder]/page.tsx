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
import { UploadDropZone } from "@/components/dataroom/upload-drop-zone";
import { downloadFile } from "@/lib/dataroom-download";
import {
  isFolder,
  isFile,
  type DataRoomFolder,
  type DataRoomFile,
  type DataRoomItem,
} from "@/lib/dataroom-types";
import {
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon as LinkIconLucide,
  FolderIcon,
  FileTextIcon,
  UsersIcon,
  UploadIcon,
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

  const { getChildren, getFolder, addFiles, renameItem, deleteItem } = useDataRoom();
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
    if (isFolder(item))
      router.push(`/dataroom/${folderSlug}/${subfolderSlug}/${item.slug}`);
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
        <DataRoomControls viewMode={viewMode} onViewModeChange={setViewMode} onDownload={() => {}} />

        <UploadDropZone
          onFiles={handleUpload}
          onReplaceWarning={handleOverwriteWarning}
          existingNames={existingFileNames}
          className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 overflow-hidden"
        >
          <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[120px] cursor-pointer hover:bg-primary/5 transition-colors">
              <UploadIcon className="h-10 w-10 text-primary" />
              <span className="text-sm font-medium text-primary">Drop files here or click to upload</span>
              <span className="text-xs text-muted-foreground">PDF, Word, Excel, PPT, images, videos</span>
            </CardContent>
          </Card>
        </UploadDropZone>

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
                            {isFile(item) && (
                              <DropdownMenuItem
                                className="focus:bg-primary/10 focus:text-primary"
                                onSelect={(e) => { e.preventDefault(); handleDownload(item); }}
                              >
                                Download
                              </DropdownMenuItem>
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
                          {isFile(item) && (
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); handleDownload(item); }}
                            >
                              Download
                            </DropdownMenuItem>
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
            </div>
          )}
        </div>
      </div>

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
    </SidebarInset>
  );
}
