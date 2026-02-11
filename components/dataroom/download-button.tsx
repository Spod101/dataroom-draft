"use client"

import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronDownIcon } from "lucide-react";

interface DownloadButtonProps {
  onClick?: () => void;
  /** Show dropdown indicator */
  showDropdown?: boolean;
  /** Button size */
  size?: "sm" | "default";
  /** Button style variant */
  variant?: "primary" | "outline";
}

export function DownloadButton({ 
  onClick,
  showDropdown = false,
  size = "sm",
  variant = "outline"
}: DownloadButtonProps) {
  if (variant === "primary") {
    return (
      <Button 
        size={size}
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        onClick={onClick}
      >
        <DownloadIcon className="h-4 w-4" />
        Download
        {showDropdown && <ChevronDownIcon className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size={size}
      className="h-12 px-5 border-border text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/40 gap-2.5 text-lg"
      onClick={onClick}
    >
      <DownloadIcon className="h-6 w-6" />
      Download
      {showDropdown && <ChevronDownIcon className="h-6 w-6" />}
    </Button>
  );
}
