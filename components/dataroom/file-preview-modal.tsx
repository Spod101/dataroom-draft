"use client";

import * as React from "react";
import { XIcon, FileTextIcon, ImageIcon, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataRoomFile } from "@/lib/dataroom-types";
import { cn } from "@/lib/utils";

type PreviewType = "pdf" | "image" | "video" | "ppt" | "unsupported";

function getPreviewType(file: DataRoomFile): PreviewType {
  const name = file.name.toLowerCase();
  const mimeType = file.mimeType?.toLowerCase() || "";

  // Check mimeType first
  if (mimeType.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (mimeType.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return "image";
  if (mimeType.includes("video") || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(name)) return "video";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || /\.(ppt|pptx)$/i.test(name)) return "ppt";

  // Fallback to extension
  if (name.endsWith(".pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return "image";
  if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(name)) return "video";
  if (/\.(ppt|pptx)$/i.test(name)) return "ppt";

  return "unsupported";
}

interface FilePreviewModalProps {
  file: DataRoomFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilePreviewModal({ file, open, onOpenChange }: FilePreviewModalProps) {
  const [previewError, setPreviewError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const previewType = file ? getPreviewType(file) : "unsupported";
  const hasUrl = file?.url && file.url.trim() !== "";

  React.useEffect(() => {
    if (open && file) {
      setPreviewError(false);
      setLoading(true);
    }
  }, [open, file]);

  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!open || !file) return null;

  const renderPreview = () => {
    if (!hasUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
          <p className="text-muted-foreground">File URL not configured.</p>
        </div>
      );
    }

    if (previewType === "unsupported") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
          <p className="text-muted-foreground">This file type cannot be previewed.</p>
        </div>
      );
    }

    if (previewType === "image") {
      return (
        <div className="flex items-center justify-center h-full p-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          <img
            src={file.url}
            alt={file.name}
            className={cn(
              "max-w-full max-h-full object-contain",
              loading && "opacity-0"
            )}
            onLoad={() => setLoading(false)}
            onError={() => {
              setPreviewError(true);
              setLoading(false);
            }}
          />
          {previewError && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load image</h3>
              <p className="text-muted-foreground">The image could not be loaded.</p>
            </div>
          )}
        </div>
      );
    }

    if (previewType === "video") {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video
            src={file.url}
            controls
            className="max-w-full max-h-full"
            onError={() => setPreviewError(true)}
          >
            Your browser does not support the video tag.
          </video>
          {previewError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <VideoIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to load video</h3>
              <p className="text-muted-foreground">The video could not be loaded.</p>
            </div>
          )}
        </div>
      );
    }

    // PDF or PPT (PPT tries to load as PDF)
    return (
      <div className="relative w-full h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={file.url}
          className="w-full h-full border-0"
          title={file.name}
          onLoad={() => {
            setLoading(false);
            // Check if iframe loaded successfully
            try {
              const iframe = iframeRef.current;
              if (iframe?.contentDocument || iframe?.contentWindow) {
                // Iframe loaded, but check if content is actually there
                setTimeout(() => {
                  try {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (!doc || doc.body.children.length === 0) {
                      setPreviewError(true);
                    }
                  } catch {
                    // Cross-origin, assume it's fine
                  }
                }, 1000);
              }
            } catch {
              // Cross-origin, assume it's fine
            }
          }}
          onError={() => {
            setPreviewError(true);
            setLoading(false);
          }}
        />
        {previewError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-background">
            <FileTextIcon className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
            <p className="text-muted-foreground">
              {previewType === "ppt"
                ? "PowerPoint file could not be converted to PDF or preview is not available."
                : "The PDF could not be loaded."}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        open ? "animate-in fade-in-0" : "hidden"
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full h-full flex flex-col bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {previewType === "image" && <ImageIcon className="h-5 w-5 text-primary shrink-0" />}
            {previewType === "video" && <VideoIcon className="h-5 w-5 text-primary shrink-0" />}
            {(previewType === "pdf" || previewType === "ppt") && (
              <FileTextIcon className="h-5 w-5 text-primary shrink-0" />
            )}
            <h2 className="text-lg font-semibold truncate">{file.name}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="shrink-0"
          >
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden relative">{renderPreview()}</div>
      </div>
    </div>
  );
}
