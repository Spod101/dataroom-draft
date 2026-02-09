"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderPlusIcon, UploadIcon, FolderUp, ChevronDownIcon } from "lucide-react";

interface NewDropdownProps {
  onNewFolder: () => void;
  onFileUpload: () => void;
  onFolderUpload?: () => void;
}

export function NewDropdown({ onNewFolder, onFileUpload, onFolderUpload }: NewDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const handleNewFolder = () => {
    setOpen(false);
    onNewFolder();
  };

  const handleFileUpload = () => {
    setOpen(false);
    onFileUpload();
  };

  const handleFolderUpload = () => {
    setOpen(false);
    onFolderUpload?.();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="bg-background rounded-xl border border-primary/20 shadow-sm p-3 hover:border-primary/40 transition-colors flex items-center h-[3.75rem] cursor-pointer shrink-0 data-[state=open]:border-primary/40">
          <span className="sr-only">Add new</span>
          <span className="flex items-center gap-2 h-9 text-primary font-medium">
            <span className="text-base leading-none">+</span>
            <span>New</span>
            <ChevronDownIcon className="h-4 w-4 opacity-70" />
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem
          className="focus:bg-primary/10 focus:text-primary cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            handleNewFolder();
          }}
        >
          <FolderPlusIcon className="h-4 w-4 mr-3" />
          <span>New folder</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="focus:bg-primary/10 focus:text-primary cursor-pointer"
          onSelect={(e) => {
            e.preventDefault();
            handleFileUpload();
          }}
        >
          <UploadIcon className="h-4 w-4 mr-3" />
          <span>File upload</span>
        </DropdownMenuItem>
        {onFolderUpload && (
          <DropdownMenuItem
            className="focus:bg-primary/10 focus:text-primary cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              handleFolderUpload();
            }}
          >
            <FolderUp className="h-4 w-4 mr-3" />
            <span>Folder upload</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
