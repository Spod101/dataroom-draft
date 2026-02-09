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
import { isFolder, type DataRoomFolder, type DataRoomItem } from "@/lib/dataroom-types";
import {
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  FolderIcon,
  UsersIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROOT_PATH: string[] = [];

export default function DataRoomPage() {
  const router = useRouter();
  const { getChildren, addFolder, renameItem, deleteItem } = useDataRoom();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const ignoreNextRowClickRef = React.useRef(false);

  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameItemId, setRenameItemId] = React.useState<string | null>(null);
  const [renameName, setRenameName] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteItemId, setDeleteItemId] = React.useState<string | null>(null);
  const [deleteName, setDeleteName] = React.useState("");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");

  const folders = getChildren(ROOT_PATH).filter((c): c is DataRoomFolder => isFolder(c));

  const handleNewFolder = (name: string) => {
    addFolder(ROOT_PATH, name);
    setNewFolderOpen(false);
  };

  const openRename = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setRenameItemId(item.id);
    setRenameName(item.name);
    setRenameOpen(true);
  };

  const handleRename = (newName: string) => {
    if (!renameItemId) return;
    renameItem(ROOT_PATH, renameItemId, newName);
    setRenameOpen(false);
    setRenameItemId(null);
  };

  const openDelete = (item: DataRoomItem) => {
    ignoreNextRowClickRef.current = true;
    setDeleteItemId(item.id);
    setDeleteName(item.name);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deleteItemId) return;
    deleteItem(ROOT_PATH, deleteItemId);
    setDeleteOpen(false);
    setDeleteItemId(null);
  };

  const openShare = (folder: DataRoomFolder) => {
    ignoreNextRowClickRef.current = true;
    const path = typeof window !== "undefined" ? window.location.origin : "";
    setShareLink(`${path}/dataroom/${folder.slug}`);
    setShareOpen(true);
  };

  const itemsCount = (folder: DataRoomFolder) =>
    folder.children.length > 0 ? `${folder.children.length} items` : "0 items";

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
        <DataRoomControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchPlaceholder="Search file or folder"
          onDownload={() => {}}
        />

        <div className="flex-1">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {folders.map((folder) => (
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
                            onSelect={(e) => { e.preventDefault(); openRename(folder); }}
                          >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="focus:bg-primary/10 focus:text-primary"
                            onSelect={(e) => { e.preventDefault(); openShare(folder); }}
                          >
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="focus:bg-destructive/10 focus:text-destructive"
                            onSelect={(e) => { e.preventDefault(); openDelete(folder); }}
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
          ) : (
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
                  {folders.map((folder) => (
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
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <UsersIcon className="h-4 w-4" />
                          {folder.sharing}
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
                              onSelect={(e) => { e.preventDefault(); openRename(folder); }}
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-primary/10 focus:text-primary"
                              onSelect={(e) => { e.preventDefault(); openShare(folder); }}
                            >
                              <LinkIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="focus:bg-destructive/10 focus:text-destructive"
                              onSelect={(e) => { e.preventDefault(); openDelete(folder); }}
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
          )}
        </div>
      </div>

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
      />
    </SidebarInset>
  );
}
