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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2Icon, RotateCwIcon } from "lucide-react";
import { listTrash, restoreFolder, restoreFile, hardDeleteFolder, hardDeleteFile, type TrashSummary } from "@/lib/dataroom-supabase";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import { useDataRoom } from "@/contexts/dataroom-context";
import { FilterSelect } from "@/components/dataroom/filter-select";
import { TablePagination } from "@/components/ui/table-pagination";

const PAGE_SIZE = 10;

export default function TrashPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const currentUserId = profile?.id;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [trash, setTrash] = React.useState<TrashSummary | null>(null);
  const [selectedFolderIds, setSelectedFolderIds] = React.useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = React.useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  // Admins can filter, regular users always see only their deletions
  const [filterBy, setFilterBy] = React.useState<"all" | "mine">(isAdmin ? "all" : "mine");
  const { success, error: toastError } = useToast();
  const { refresh: refreshDataRoom } = useDataRoom();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTrash();
      setTrash(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trash");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleRestoreFolder = async (id: string) => {
    try {
      await restoreFolder(id);
      success("Folder restored");
      void load();
      await refreshDataRoom();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to restore folder");
    }
  };

  const handleRestoreFile = async (id: string) => {
    try {
      await restoreFile(id);
      success("File restored");
      void load();
      await refreshDataRoom();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to restore file");
    }
  };

  const handleHardDeleteFolder = async (id: string) => {
    try {
      await hardDeleteFolder(id);
      success("Folder permanently deleted");
      void load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to delete folder");
    }
  };

  const handleHardDeleteFile = async (id: string) => {
    try {
      await hardDeleteFile(id);
      success("File permanently deleted");
      void load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to delete file");
    }
  };

  // Filter trash items based on user role and selection
  const allFolders = trash?.folders ?? [];
  const allFiles = trash?.files ?? [];
  
  // Regular users ALWAYS see only their deletions (no option to see all)
  // Admins can toggle between "all" and "mine"
  const folders = !isAdmin || filterBy === "mine"
    ? allFolders.filter((f) => f.deleted_by === currentUserId)
    : allFolders;
  
  const files = !isAdmin || filterBy === "mine"
    ? allFiles.filter((f) => f.deleted_by === currentUserId)
    : allFiles;

  // Combine folders and files for pagination
  const allItems = [
    ...folders.map((f) => ({ ...f, itemType: 'folder' as const })),
    ...files.map((f) => ({ ...f, itemType: 'file' as const })),
  ];

  const hasItems = allItems.length > 0;
  const totalItems = allItems.length;
  const selectedCount = selectedFolderIds.size + selectedFileIds.size;
  const allSelected = totalItems > 0 && selectedCount === totalItems;
  const someSelected = selectedCount > 0;

  // Pagination
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedItems = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  
  // Reset to first page when filter changes
  React.useEffect(() => setPage(1), [filterBy]);
  // Keep current page when data changes; clamp if page becomes invalid
  React.useEffect(() => setPage((p) => Math.min(Math.max(p, 1), totalPages)), [totalPages]);

  const toggleFolder = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleFile = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedFolderIds(new Set());
      setSelectedFileIds(new Set());
    } else {
      setSelectedFolderIds(new Set(folders.map((f) => f.id)));
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  };
  const clearSelection = () => {
    setSelectedFolderIds(new Set());
    setSelectedFileIds(new Set());
  };

  const handleBulkRestore = async () => {
    try {
      for (const id of selectedFolderIds) {
        await restoreFolder(id);
      }
      for (const id of selectedFileIds) {
        await restoreFile(id);
      }
      const count = selectedFolderIds.size + selectedFileIds.size;
      success(count === 1 ? "Item restored" : `${count} items restored`);
      clearSelection();
      void load();
      await refreshDataRoom();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to restore");
    }
  };

  const handleBulkDeleteForever = async () => {
    try {
      for (const id of selectedFolderIds) {
        await hardDeleteFolder(id);
      }
      for (const id of selectedFileIds) {
        await hardDeleteFile(id);
      }
      const count = selectedFolderIds.size + selectedFileIds.size;
      success(count === 1 ? "Item permanently deleted" : `${count} items permanently deleted`);
      setBulkDeleteOpen(false);
      clearSelection();
      void load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumb className="ml-2 px-3 py-1 rounded-md bg-muted/50">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Trash</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Trash2Icon className="h-5 w-5 text-destructive" />
            <h1 className="text-lg font-semibold">Trash</h1>
            {!isAdmin && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Viewing your deleted items
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Dropdown - Only visible to admins */}
            {isAdmin && (
              <FilterSelect
                label="Show"
                value={filterBy}
                onValueChange={(value) => {
                  setFilterBy(value as "all" | "mine");
                  clearSelection();
                }}
                options={[
                  { id: "all", name: "All items" },
                  { id: "mine", name: "My deletions only" },
                ]}
              />
            )}
            
            {someSelected && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={handleBulkRestore}
                >
                  <RotateCwIcon className="h-4 w-4" />
                  Restore ({selectedCount})
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  <Trash2Icon className="h-4 w-4" />
                  Delete forever ({selectedCount})
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear selection
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => load()}
              disabled={loading}
            >
              <RotateCwIcon className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 flex-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Deleted items</CardTitle>
            {hasItems && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={toggleSelectAll}
              >
                {allSelected ? "Clear selection" : "Select all"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Loading trash...
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center justify-center py-12 text-destructive text-sm">
                Failed to load trash: {error}
              </div>
            )}

            {!loading && !error && !hasItems && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <Trash2Icon className="h-8 w-8 opacity-60" />
                <p>No items in trash.</p>
              </div>
            )}

            {!loading && !error && hasItems && (
              <>
                <div className="divide-y">
                  {paginatedItems.map((item) => {
                    const isFolder = item.itemType === 'folder';
                    const isSelected = isFolder 
                      ? selectedFolderIds.has(item.id) 
                      : selectedFileIds.has(item.id);
                    const toggleItem = isFolder ? toggleFolder : toggleFile;
                    const handleRestore = isFolder ? handleRestoreFolder : handleRestoreFile;
                    const handleHardDelete = isFolder ? handleHardDeleteFolder : handleHardDeleteFile;

                    return (
                      <div
                        key={`${item.itemType}-${item.id}`}
                        className={`flex items-center gap-4 px-6 py-3 hover:bg-accent/40 transition-colors ${isSelected ? "bg-accent/40" : ""}`}
                      >
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(item.id)}
                            aria-label={`Select ${item.name}`}
                          />
                        </div>
                        <div className={`w-6 shrink-0 ${isFolder ? "text-primary" : "text-muted-foreground"}`}>
                          {isFolder ? (
                            <Trash2Icon className="h-4 w-4" />
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {isFolder ? 'Folder' : 'File'} · Deleted {item.deleted_at
                              ? new Date(item.deleted_at).toLocaleString()
                              : "Unknown"}
                            {isAdmin && item.deleted_by_name && (
                              <span className="ml-1">
                                by <span className="font-medium">{item.deleted_by_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(item.id)}
                          >
                            Restore
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleHardDelete(item.id)}
                          >
                            Delete forever
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete forever?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedCount} item{selectedCount !== 1 ? "s" : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleBulkDeleteForever}>
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarInset>
  );
}

