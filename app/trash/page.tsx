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
import { Trash2Icon, RotateCwIcon } from "lucide-react";
import { listTrash, restoreFolder, restoreFile, hardDeleteFolder, hardDeleteFile, type TrashSummary } from "@/lib/dataroom-supabase";
import { useToast } from "@/components/ui/toast";

export default function TrashPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [trash, setTrash] = React.useState<TrashSummary | null>(null);
  const { success, error: toastError } = useToast();

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
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to restore folder");
    }
  };

  const handleRestoreFile = async (id: string) => {
    try {
      await restoreFile(id);
      success("File restored");
      void load();
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

  const folders = trash?.folders ?? [];
  const files = trash?.files ?? [];
  const hasItems = folders.length > 0 || files.length > 0;

  return (
    <SidebarInset>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Trash</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Trash2Icon className="h-5 w-5 text-destructive" />
            <h1 className="text-lg font-semibold">Trash</h1>
          </div>
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

        <Card className="border-primary/20 flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deleted items</CardTitle>
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
              <div className="divide-y">
                {folders.map((folder) => (
                  <div
                    key={`folder-${folder.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="w-6 text-primary">
                      <Trash2Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{folder.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Folder · Deleted at{" "}
                        {folder.deleted_at
                          ? new Date(folder.deleted_at).toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreFolder(folder.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleHardDeleteFolder(folder.id)}
                      >
                        Delete forever
                      </Button>
                    </div>
                  </div>
                ))}

                {files.map((file) => (
                  <div
                    key={`file-${file.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="w-6 text-muted-foreground">
                      {/* simple dot for file */}
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        File · Deleted at{" "}
                        {file.deleted_at
                          ? new Date(file.deleted_at).toLocaleString()
                          : "Unknown"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreFile(file.id)}
                      >
                        Restore
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleHardDeleteFile(file.id)}
                      >
                        Delete forever
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarInset>
  );
}

