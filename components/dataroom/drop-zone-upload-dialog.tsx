"use client";

import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useDataRoom } from "@/contexts/dataroom-context";
import { formatBytes } from "@/lib/dataroom-utils";

interface DropZoneUploadDialogProps {
  files: File[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[]) => Promise<void>;
}

export function DropZoneUploadDialog({ files, open, onOpenChange, onUpload }: DropZoneUploadDialogProps) {
  const { state, cancelUpload } = useDataRoom();
  const [isUploading, setIsUploading] = React.useState(false);
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [uploadStartTime, setUploadStartTime] = React.useState<number | null>(null);

  const upload = isUploading && uploadStartTime && state.upload ? state.upload : null;

  const handleConfirmUpload = async () => {
    setIsUploading(true);
    setUploadStartTime(Date.now());
    try {
      await onUpload(files);
      onOpenChange(false);
    } catch (error) {
      // Check if it was a cancellation
      if (error instanceof Error && error.message === "Upload cancelled") {
        // Cancellation is handled by the cancel flow, just reset state
        setIsUploading(false);
        setUploadStartTime(null);
        return;
      }
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      setUploadStartTime(null);
    }
  };

  const handleCancel = () => {
    if (isUploading) {
      setShowCancelDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmCancel = () => {
    cancelUpload();
    setShowCancelDialog(false);
    setIsUploading(false);
    setUploadStartTime(null);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // If trying to close while uploading, show cancel dialog instead
    if (!newOpen && isUploading) {
      setShowCancelDialog(true);
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>

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
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-primary">
                    {upload.totalBytes > 0 ? Math.round((upload.uploadedBytes / upload.totalBytes) * 100) : 0}%
                  </p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-primary/15 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${upload.totalBytes > 0 ? (upload.uploadedBytes / upload.totalBytes) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {!isUploading && (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <svg
                    className="h-5 w-5 text-primary shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={isUploading}>
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
