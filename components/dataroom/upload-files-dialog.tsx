"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadDropZone, filesToDataRoomFiles } from "@/components/dataroom/upload-drop-zone";
import type { DataRoomFile } from "@/lib/dataroom-types";
import { FolderUp } from "lucide-react";

interface UploadFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives data room files and, when from drop/picker, the raw File[] for upload. Caller may close dialog after upload. */
  onFiles: (files: DataRoomFile[], rawFiles?: File[]) => void;
  onReplaceWarning?: (name: string, files: DataRoomFile[], resolve: (ok: boolean) => void) => void;
  existingNames?: Set<string>;
}

export function UploadFilesDialog({
  open,
  onOpenChange,
  onFiles,
  onReplaceWarning,
  existingNames = new Set(),
}: UploadFilesDialogProps) {
  const handleFiles = (files: DataRoomFile[], rawFiles?: File[]) => {
    onFiles(files, rawFiles);
    if (!rawFiles?.length) onOpenChange(false);
  };

  const handleReplaceWarning = (
    name: string,
    files: DataRoomFile[],
    resolve: (ok: boolean) => void
  ) => {
    onOpenChange(false);
    onReplaceWarning?.(name, files, resolve);
  };

  const folderInputRef = React.useRef<HTMLInputElement>(null);

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = "";
    if (!fileList?.length) return;
    const raw = Array.from(fileList);
    const files = filesToDataRoomFiles(fileList);
    const toReplace = files.filter((f) => existingNames.has(f.name));
    if (toReplace.length > 0 && onReplaceWarning) {
      onOpenChange(false);
      onReplaceWarning(toReplace[0].name, files, (ok) => {
        if (ok) onFiles(files, raw);
      });
    } else {
      onFiles(files, raw);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Choose files to upload into this folder. You can drag and drop or click to browse.
          </DialogDescription>
        </DialogHeader>
        <UploadDropZone
          onFiles={handleFiles}
          onReplaceWarning={onReplaceWarning ? handleReplaceWarning : undefined}
          existingNames={existingNames}
          className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 overflow-hidden min-h-[200px] cursor-pointer"
        >
          <div className="flex flex-col items-center justify-center gap-3 p-8 h-full min-h-[200px] text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
              <svg
                className="h-7 w-7 text-primary"
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
            <div>
              <p className="text-sm font-medium text-primary">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, Excel, PPT, images, videos
              </p>
            </div>
          </div>
        </UploadDropZone>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground text-center">Or upload an entire folder</p>
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            multiple
            onChange={handleFolderChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderUp className="h-4 w-4 mr-2" />
            Select folder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
