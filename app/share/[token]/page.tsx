"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel, FieldGroup } from "@/components/ui/field";
import { FileTextIcon, FolderIcon, XIcon, AlertCircleIcon } from "lucide-react";
import { FilePreviewModal } from "@/components/dataroom/file-preview-modal";
import type { DataRoomFile, DataRoomFolder } from "@/lib/dataroom-types";
import { isFile, isFolder } from "@/lib/dataroom-types";
import { loadShareFolder, loadShareFile, getShareLinkByToken, createViewerSession, trackFileEventWithViewer, getShareFileSignedUrl } from "./actions";

type ShareLinkState = "loading" | "invalid" | "expired" | "revoked" | "email_required" | "ready";

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [state, setState] = React.useState<ShareLinkState>("loading");
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [shareLink, setShareLink] = React.useState<any>(null);
  const [viewerSessionId, setViewerSessionId] = React.useState<string | null>(null);
  const [folderData, setFolderData] = React.useState<DataRoomFolder | null>(null);
  const [previewFile, setPreviewFile] = React.useState<DataRoomFile | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrlOverride, setPreviewUrlOverride] = React.useState<string | null>(null);

  // Load share link on mount
  React.useEffect(() => {
    async function loadShareLink() {
      if (!token) {
        setState("invalid");
        return;
      }

      const link = await getShareLinkByToken(token);
      if (!link) {
        setState("invalid");
        return;
      }

      setShareLink(link);

      // Check if email is already in session storage (for this token)
      const sessionKey = `share_email_${token}`;
      const storedEmail = sessionStorage.getItem(sessionKey);
      if (storedEmail) {
        // Create viewer session and proceed
        try {
          const session = await createViewerSession({ shareLinkId: link.id, email: storedEmail });
          setViewerSessionId(session.id);
          await loadContent(link, storedEmail);
          setState("ready");
        } catch (error) {
          // If session creation fails, clear and show email form
          sessionStorage.removeItem(sessionKey);
          setState("email_required");
        }
      } else {
        setState("email_required");
      }
    }

    loadShareLink();
  }, [token]);

  async function loadContent(link: any, viewerEmail: string) {
    if (link.target_type === "folder") {
      const folder = await loadShareFolder(link.target_id);
      if (!folder) {
        setState("invalid");
        return;
      }
      setFolderData(folder);
    } else {
      const file = await loadShareFile(link.target_id);
      if (!file) {
        setState("invalid");
        return;
      }

      // Resolve signed URL on the server for storage-backed files, so public viewers can access it.
      const signedUrl = await getShareFileSignedUrl(file.storagePath);
      setPreviewUrlOverride(signedUrl);

      // Auto-open preview for single file
      setPreviewFile(file);
      setPreviewOpen(true);

      // Track view
      if (viewerSessionId) {
        trackFileEventWithViewer({
          eventType: "view",
          fileId: file.id,
          folderId: null,
          viewerSessionId,
          email: viewerEmail,
        }).catch(console.error);
      }
    }
  }

  function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!shareLink) return;

    try {
      const session = await createViewerSession({ shareLinkId: shareLink.id, email: trimmedEmail });
      setViewerSessionId(session.id);
      
      // Store email in session storage
      sessionStorage.setItem(`share_email_${token}`, trimmedEmail);
      
      await loadContent(shareLink, trimmedEmail);
      setState("ready");
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Failed to proceed");
    }
  }

  async function handleFileClick(file: DataRoomFile) {
    // Resolve signed URL for this file (if stored in Supabase Storage).
    const signedUrl = await getShareFileSignedUrl(file.storagePath);
    setPreviewUrlOverride(signedUrl);

    setPreviewFile(file);
    setPreviewOpen(true);

    // Track view
    if (viewerSessionId && shareLink) {
      trackFileEventWithViewer({
        eventType: "view",
        fileId: file.id,
        folderId: shareLink.target_type === "folder" ? shareLink.target_id : null,
        viewerSessionId,
        email: sessionStorage.getItem(`share_email_${token}`) || "",
      }).catch(console.error);
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircleIcon className="h-5 w-5 text-destructive" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This share link is invalid or has been removed. Please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "email_required") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Enter Your Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Field>
                <FieldLabel>Email Address</FieldLabel>
                <FieldGroup>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    autoFocus
                  />
                </FieldGroup>
                {emailError && <FieldError>{emailError}</FieldError>}
              </Field>
              <Button type="submit" className="w-full">
                Continue
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your email is required to access this shared content.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "ready" && shareLink) {
    return (
      <div className="min-h-screen bg-background">
        {/* Minimal header */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {shareLink.target_type === "folder" ? (
                <FolderIcon className="h-5 w-5 text-primary" />
              ) : (
                <FileTextIcon className="h-5 w-5 text-primary" />
              )}
              <h1 className="text-lg font-semibold">
                {shareLink.target_type === "folder" ? (folderData?.name || "Folder") : (previewFile?.name || "File")}
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {shareLink.target_type === "folder" && folderData ? (
            <div className="space-y-2">
              {folderData.children.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    This folder is empty.
                  </CardContent>
                </Card>
              ) : (
                folderData.children.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => isFile(item) && handleFileClick(item)}
                  >
                    <CardContent className="py-3 flex items-center gap-3">
                      {isFolder(item) ? (
                        <FolderIcon className="h-5 w-5 text-primary" />
                      ) : (
                        <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {isFile(item) && item.size && (
                          <p className="text-sm text-muted-foreground">{item.size}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : shareLink.target_type === "file" && previewFile ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">File preview is open.</p>
            </div>
          ) : null}
        </div>

        {/* File Preview Modal */}
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            isShareLink={true}
            initialUrl={previewUrlOverride}
          />
        )}
      </div>
    );
  }

  return null;
}
