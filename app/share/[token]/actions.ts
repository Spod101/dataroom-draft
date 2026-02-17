"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { DataRoomFile, DataRoomFolder } from "@/lib/dataroom-types";

export type ShareLink = {
  id: string;
  token: string;
  target_type: "file" | "folder";
  target_id: string;
  created_by: string;
  expires_at: string | null;
  password_hash: string | null;
  require_email: boolean;
  require_nda: boolean;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Load folder data for share link.
 */
export async function loadShareFolder(folderId: string): Promise<DataRoomFolder | null> {
  const { data: folderRow, error: folderError } = await supabaseAdmin
    .from("folders")
    .select("*")
    .eq("id", folderId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (folderError || !folderRow) return null;

  const { data: childFolders } = await supabaseAdmin
    .from("folders")
    .select("*")
    .eq("parent_folder_id", folderId)
    .eq("is_deleted", false)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  const { data: childFiles } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("folder_id", folderId)
    .eq("is_deleted", false)
    .order("name", { ascending: true });

  const folder: DataRoomFolder = {
    id: folderRow.id,
    name: folderRow.name,
    slug: folderRow.slug,
    modified: new Date(folderRow.last_modified).toLocaleString(),
    modifiedBy: "—",
    sharing: "Shared",
    children: [
      ...(childFolders || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        modified: new Date(f.last_modified).toLocaleString(),
        modifiedBy: "—",
        sharing: "Shared",
        children: [],
      })),
      ...(childFiles || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: f.item_type as "file" | "link",
        size: f.file_size ? `${(f.file_size / 1024).toFixed(1)} KB` : "—",
        modified: new Date(f.last_modified).toLocaleString(),
        modifiedBy: "—",
        sharing: "Shared",
        mimeType: f.file_type || undefined,
        url: f.url || undefined,
        storagePath: f.storage_path || undefined,
      })),
    ],
  };

  return folder;
}

/**
 * Load file data for share link.
 */
export async function loadShareFile(fileId: string): Promise<DataRoomFile | null> {
  const { data: fileRow, error: fileError } = await supabaseAdmin
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (fileError || !fileRow) return null;

  const file: DataRoomFile = {
    id: fileRow.id,
    name: fileRow.name,
    type: fileRow.item_type as "file" | "link",
    size: fileRow.file_size ? `${(fileRow.file_size / 1024).toFixed(1)} KB` : "—",
    modified: new Date(fileRow.last_modified).toLocaleString(),
    modifiedBy: "—",
    sharing: "Shared",
    mimeType: fileRow.file_type || undefined,
    url: fileRow.url || undefined,
    storagePath: fileRow.storage_path || undefined,
  };

  return file;
}

const STORAGE_BUCKET = "data-room";
const SIGNED_URL_EXPIRY_SEC = 3600; // 1 hour

export async function getShareFileSignedUrl(storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath || !storagePath.trim()) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SEC);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to create signed URL for share file", error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function getShareLinkByToken(token: string): Promise<ShareLink | null> {
  const { data, error } = await supabaseAdmin
    .from("share_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;

  const link = data as ShareLink;

  // Check if revoked
  if (link.revoked_at) return null;

  // Check if expired
  if (link.expires_at) {
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < new Date()) return null;
  }

  return link;
}

export async function createViewerSession(params: {
  shareLinkId: string;
  email: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from("viewer_sessions")
    .insert({
      share_link_id: params.shareLinkId,
      email: params.email.toLowerCase().trim(),
      first_seen_at: new Date().toISOString(),
      // last_seen_at is optional - will be updated via trigger or separate update if column exists
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create viewer session: ${error.message}`);
  return { id: data.id };
}

export async function trackFileEventWithViewer(params: {
  eventType: "view" | "download";
  fileId: string;
  folderId?: string | null;
  viewerSessionId: string;
  email: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("file_events").insert({
    user_id: null, // No user_id for anonymous viewers
    event_type: params.eventType,
    file_id: params.fileId,
    folder_id: params.folderId ?? null,
    details: { viewer_session_id: params.viewerSessionId, email: params.email },
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to insert file_events entry with viewer", error);
  }

  // Also log to audit_log with email in details
  const { error: auditError } = await supabaseAdmin.from("audit_log").insert({
    user_id: null,
    action: `file.${params.eventType}`,
    target_type: "file",
    target_id: params.fileId,
    folder_id: params.folderId ?? null,
    file_id: params.fileId,
    details: { viewer_session_id: params.viewerSessionId, email: params.email },
  });

  if (auditError) {
    // eslint-disable-next-line no-console
    console.error("Failed to insert audit_log entry with viewer", auditError);
  }
}
