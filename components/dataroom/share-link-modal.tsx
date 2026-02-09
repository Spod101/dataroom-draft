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
import { Input } from "@/components/ui/input";
import { CopyIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";

type ShareAccess = "view" | "edit";

interface ShareLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: string;
  title?: string;
  /** Current access mode for the shared link. */
  access?: ShareAccess;
  /** Called when the user changes the access mode. */
  onAccessChange?: (access: ShareAccess) => void;
}

export function ShareLinkModal({
  open,
  onOpenChange,
  link,
  title = "Share link",
  access = "view",
  onAccessChange,
}: ShareLinkModalProps) {
  const [copied, setCopied] = React.useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("share-link-input") as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
    toast.success("Link copied to clipboard");
  };

  const description =
    access === "edit"
      ? "Anyone with the link can view, download, and edit this item."
      : "Anyone with the link can view and download this item.";

  const handleAccessChange = (value: ShareAccess) => {
    onAccessChange?.(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* General access row, like Google Drive: "Anyone with the link" + role dropdown */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              General access
            </span>
            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              <div className="flex flex-col text-xs">
                <span className="font-medium">Anyone with the link</span>
                <span className="text-muted-foreground">
                  {access === "edit"
                    ? "Editor · can view, download & edit"
                    : "Viewer · can view & download"}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 px-2 h-7 text-xs"
                  >
                    {access === "edit" ? "Editor" : "Viewer"}
                    <ChevronDownIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleAccessChange("view");
                    }}
                  >
                    Viewer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs"
                    onSelect={(e) => {
                      e.preventDefault();
                      handleAccessChange("edit");
                    }}
                  >
                    Editor
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Copy link row */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                id="share-link-input"
                readOnly
                value={link}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
                <CheckIcon className="h-3 w-3" />
                <span>Link copied to clipboard.</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
