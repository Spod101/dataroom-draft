"use client";

import * as React from "react";
import { UploadIcon } from "lucide-react";
import type { DataRoomFile } from "@/lib/dataroom-types";
import { uid } from "@/lib/dataroom-types";

const ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/*",
  "video/*",
].join(",");

function formatDate() {
  const d = new Date();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return "Today at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString())
    return "Yesterday at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString() + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fileToDataRoomFile(f: File): DataRoomFile {
  const sizeStr = f.size < 1024 ? f.size + " B" : f.size < 1024 * 1024 ? (f.size / 1024).toFixed(1) + " KB" : (f.size / (1024 * 1024)).toFixed(1) + " MB";
  return {
    id: uid(),
    name: f.name,
    type: "file",
    size: sizeStr,
    modified: formatDate(),
    modifiedBy: "You",
    sharing: "Shared",
    mimeType: f.type,
  };
}

export function filesToDataRoomFiles(fileList: FileList | File[]): DataRoomFile[] {
  const arr = Array.isArray(fileList) ? fileList : Array.from(fileList);
  return arr.map(fileToDataRoomFile);
}

interface UploadDropZoneProps {
  /** Called with parsed data room files and optionally the raw File[] for upload. */
  onFiles: (files: DataRoomFile[], rawFiles?: File[]) => void;
  onReplaceWarning?: (name: string, files: DataRoomFile[], resolve: (ok: boolean) => void) => void;
  existingNames?: Set<string>;
  className?: string;
  children?: React.ReactNode;
  /** Optional ref to trigger file picker programmatically (e.g. from a "File upload" dropdown item). */
  openFilePickerRef?: React.MutableRefObject<(() => void) | null>;
  disabled?: boolean;
}

export function UploadDropZone({
  onFiles,
  onReplaceWarning,
  existingNames = new Set(),
  className,
  children,
  openFilePickerRef,
  disabled = false,
}: UploadDropZoneProps) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (openFilePickerRef) {
      openFilePickerRef.current = () => inputRef.current?.click();
      return () => {
        openFilePickerRef.current = null;
      };
    }
  }, [openFilePickerRef]);

  const runWithRaw = (dataRoomFiles: DataRoomFile[], raw: File[]) => {
    const toReplace = dataRoomFiles.filter((f) => existingNames.has(f.name));
    if (toReplace.length > 0 && onReplaceWarning) {
      onReplaceWarning(toReplace[0].name, dataRoomFiles, (ok) => {
        if (ok) onFiles(dataRoomFiles, raw);
      });
    } else {
      onFiles(dataRoomFiles, raw);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDrag(false);
    const raw = Array.from(e.dataTransfer.files ?? []);
    const files = raw.map(fileToDataRoomFile);
    if (files.length === 0) return;
    runWithRaw(files, raw);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = Array.from(e.target.files ?? []);
    e.target.value = "";
    const files = raw.map(fileToDataRoomFile);
    if (files.length === 0) return;
    runWithRaw(files, raw);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      className={`${className ?? ""} ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => !disabled && setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {children ?? (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 w-full min-h-[160px] transition-colors cursor-pointer ${
            drag
              ? "border-primary bg-primary/10"
              : "border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
          }`}
        >
          <UploadIcon className="h-10 w-10 text-primary" />
          <span className="text-sm font-medium text-primary">
            Drop files here or click to upload
          </span>
          <span className="text-xs text-muted-foreground">
            PDF, Word, Excel, PPT, images, videos
          </span>
        </div>
      )}
    </div>
  );
}
