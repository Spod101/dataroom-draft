"use client"

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LayoutGridIcon, ListIcon } from "lucide-react";
import { DownloadButton } from "./download-button";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  showDownload?: boolean;
  onDownload?: () => void;
}

export function ViewToggle({ 
  viewMode, 
  onViewModeChange,
  showDownload = true,
  onDownload
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-4">
      {/* View Mode Toggle */}
      <div className="flex items-center border border-border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          className={`h-12 px-5 rounded-r-none ${
            viewMode === "grid"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGridIcon className="h-6 w-6" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="ghost"
          size="sm"
          className={`h-12 px-5 rounded-l-none ${
            viewMode === "list"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
          }`}
          onClick={() => onViewModeChange("list")}
        >
          <ListIcon className="h-6 w-6" />
        </Button>
      </div>

      {/* Download Button */}
      {showDownload && (
        <DownloadButton onClick={onDownload} />
      )}
    </div>
  );
}
