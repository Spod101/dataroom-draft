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
import { CopyIcon, CheckIcon, Trash2Icon, AlertCircleIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createShareLink, revokeShareLink } from "@/lib/dataroom-supabase";
import type { DataRoomItem } from "@/lib/dataroom-types";
import { isFile, isFolder } from "@/lib/dataroom-types";

interface ShareLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DataRoomItem | null;
  existingShareLinkId?: string | null;
  onShareLinkCreated?: (link: string, shareLinkId: string) => void;
  onShareLinkRevoked?: () => void;
}

export function ShareLinkModal({
  open,
  onOpenChange,
  item,
  existingShareLinkId,
  onShareLinkCreated,
  onShareLinkRevoked,
}: ShareLinkModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [shareLink, setShareLink] = React.useState<string | null>(null);
  const [shareLinkId, setShareLinkId] = React.useState<string | null>(existingShareLinkId || null);
  const [expirationDate, setExpirationDate] = React.useState<string>("");
  const [revoking, setRevoking] = React.useState(false);
  const [revoked, setRevoked] = React.useState(false);
  const toast = useToast();

  // Reset state when modal opens/closes or item changes
  React.useEffect(() => {
    if (!open) {
      setShareLink(null);
      setShareLinkId(existingShareLinkId || null);
      setExpirationDate("");
      setCopied(false);
      setRevoked(false);
      return;
    }
  }, [open, item?.id]);

  async function handleCreateLink() {
    if (!item) return;

    setLoading(true);
    try {
      const targetType = isFolder(item) ? "folder" : "file";
      const expiresAt = expirationDate ? expirationDate : null;

      const link = await createShareLink({
        targetType,
        targetId: item.id,
        expiresAt,
      });

      const base = typeof window !== "undefined" ? window.location.origin : "";
      const shareUrl = `${base}/share/${link.token}`;

      setShareLink(shareUrl);
      setShareLinkId(link.id);
      onShareLinkCreated?.(shareUrl, link.id);
      toast.success("Share link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create share link");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!shareLinkId) return;

    setRevoking(true);
    try {
      await revokeShareLink(shareLinkId);
      setRevoked(true);
      setShareLink(null);
      setShareLinkId(null);
      onShareLinkRevoked?.();
      toast.success("Share link revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke share link");
    } finally {
      setRevoking(false);
    }
  }

  async function handleCopy() {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
    } catch {
      const input = document.getElementById("share-link-input") as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard");
      }
    }
  }

  async function handleCreateNewLink() {
    setRevoked(false);
    setExpirationDate("");
    await handleCreateLink();
  }

  const minDate = new Date().toISOString().split("T")[0]; // Today's date in YYYY-MM-DD format

  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Link</DialogTitle>
          <DialogDescription>
            Create a secure link to share this {isFolder(item) ? "folder" : "file"}. Viewers will need to enter their email to access.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {revoked ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircleIcon className="h-4 w-4 shrink-0" />
                <span>This share link has been revoked.</span>
              </div>
              <Button onClick={handleCreateNewLink} className="w-full">
                Create New Link
              </Button>
            </div>
          ) : shareLink ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Expiration Date (Optional)
                </label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={minDate}
                  className="text-sm"
                />
                {expirationDate && (
                  <p className="text-xs text-muted-foreground">
                    Link will expire on {new Date(expirationDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <Input
                    id="share-link-input"
                    readOnly
                    value={shareLink}
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

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="w-full"
                >
                  {revoking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Revoking...
                    </>
                  ) : (
                    <>
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      Revoke Link
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Revoking will immediately disable this link. You can create a new one after revoking.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Expiration Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      min={minDate}
                      className="text-sm"
                    />
                  </div>
                  <Button onClick={handleCreateLink} disabled={loading} className="w-full">
                    {loading ? "Creating..." : "Create Share Link"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
