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
    <div className="bg-background rounded-xl border border-primary/20 shadow-sm p-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center border border-primary/20 rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 rounded-r-none ${
              viewMode === "grid"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGridIcon className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-3 rounded-l-none ${
              viewMode === "list"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-primary"
            }`}
            onClick={() => onViewModeChange("list")}
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Download Button */}
        {showDownload && (
          <DownloadButton onClick={onDownload} />
        )}
      </div>
    </div>
  );
}
