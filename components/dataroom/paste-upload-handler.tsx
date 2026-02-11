"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import { useDataRoom } from "@/contexts/dataroom-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { FileIcon, XIcon } from "lucide-react";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface PasteUploadHandlerProps {
  onUpload: (files: File[]) => Promise<void>;
  enabled?: boolean;
}

export function PasteUploadHandler({ onUpload, enabled = true }: PasteUploadHandlerProps) {
  const toast = useToast();
  const { state } = useDataRoom();
  const [pastedFiles, setPastedFiles] = React.useState<File[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStartTime, setUploadStartTime] = React.useState<number | null>(null);
  
  // Only show upload progress if this paste dialog initiated the upload
  const upload = isUploading && uploadStartTime && state.upload ? state.upload : null;

  React.useEffect(() => {
    if (!enabled) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        setPastedFiles(files);
        setShowConfirmDialog(true);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [enabled]);

  const handleConfirmUpload = async () => {
    setIsUploading(true);
    setUploadStartTime(Date.now());
    try {
      await onUpload(pastedFiles);
      toast.success(`Uploaded ${pastedFiles.length} file${pastedFiles.length > 1 ? "s" : ""}`);
      setShowConfirmDialog(false);
      setPastedFiles([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadStartTime(null);
    }
  };

  const handleCancel = () => {
    if (isUploading) {
      // User wants to cancel during upload - show confirmation dialog
      setShowCancelDialog(true);
    } else {
      setShowConfirmDialog(false);
      setPastedFiles([]);
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    setShowConfirmDialog(false);
    setPastedFiles([]);
    setIsUploading(false);
    setUploadStartTime(null);
  };

  return (
    <>
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Pasted Files?</DialogTitle>
          <DialogDescription>
            You pasted {pastedFiles.length} file{pastedFiles.length > 1 ? "s" : ""}. Confirm to upload to this folder.
          </DialogDescription>
        </DialogHeader>

        {/* Upload progress */}
        {upload && isUploading && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">
                  Uploading {upload.completedFiles}/{upload.totalFiles}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {upload.currentFileName ? upload.currentFileName : "Starting..."}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.totalBytes)}
                </p>
              </div>
              <div className="shrink-0 text-sm font-medium text-primary tabular-nums">
                {upload.totalBytes > 0
                  ? Math.min(100, Math.round((upload.uploadedBytes / upload.totalBytes) * 100))
                  : upload.totalFiles > 0
                    ? Math.min(100, Math.round((upload.completedFiles / upload.totalFiles) * 100))
                    : 0}
                %
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-primary/15 overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{
                  width: `${
                    upload.totalBytes > 0
                      ? Math.min(100, Math.round((upload.uploadedBytes / upload.totalBytes) * 100))
                      : upload.totalFiles > 0
                        ? Math.min(100, Math.round((upload.completedFiles / upload.totalFiles) * 100))
                        : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* File list */}
        {!isUploading && (
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {pastedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
              >
                <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Cancel confirmation dialog */}
    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Upload?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel the upload? Files that haven't been uploaded yet will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Uploading</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmCancel} variant="destructive">
            Cancel Upload
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
