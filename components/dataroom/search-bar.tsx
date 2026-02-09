"use client"

import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch?: (value: string) => void;
  /** Use compact style inside cards/panels */
  variant?: "default" | "compact";
}

export function SearchBar({ 
  placeholder = "Search files and folders...",
  value,
  onSearch,
  variant = "default"
}: SearchBarProps) {
  if (variant === "compact") {
    return (
      <div className="relative">
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onSearch?.(e.target.value)}
          className="pr-9 h-9 border-primary/20 focus-visible:ring-primary/20"
        />
        <SearchIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border border-primary/20 shadow-sm p-3 hover:border-primary/40 transition-colors">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/60" />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          className="pl-9 h-9 border-0 focus-visible:ring-0 focus-visible:ring-primary/20 shadow-none bg-transparent placeholder:text-muted-foreground"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
    </div>
  );
}
