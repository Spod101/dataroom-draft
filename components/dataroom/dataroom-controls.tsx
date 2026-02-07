"use client"

import { SearchBar } from "./search-bar";
import { ViewToggle } from "./view-toggle";

interface DataRoomControlsProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onSearch?: (value: string) => void;
  onDownload?: () => void;
  searchPlaceholder?: string;
  showDownload?: boolean;
}

export function DataRoomControls({
  viewMode,
  onViewModeChange,
  onSearch,
  onDownload,
  searchPlaceholder,
  showDownload = true,
}: DataRoomControlsProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="flex-1">
        <SearchBar 
          placeholder={searchPlaceholder} 
          onSearch={onSearch}
        />
      </div>
      <div>
        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          showDownload={showDownload}
          onDownload={onDownload}
        />
      </div>
    </div>
  );
}
