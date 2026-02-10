import { supabase } from "@/lib/supabase";
import type { DataRoomFile } from "@/lib/dataroom-types";
import { logAuditEvent, trackFileEvent } from "@/lib/dataroom-supabase";

const BUCKET_NAME = "data-room";
const SIGNED_URL_EXPIRY_SEC = 600; // 10 minutes

/** Download a single file from Supabase Storage (or external link) and log events. */
export async function downloadFile(file: DataRoomFile): Promise<void> {
  try {
    await trackFileEvent("download", file.id);
    await logAuditEvent("file.download", "file", { targetId: file.id, fileId: file.id });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Failed to record download analytics/audit", e);
  }

  if (file.type === "file" && file.storagePath?.trim()) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(file.storagePath, SIGNED_URL_EXPIRY_SEC, { download: file.name });

    if (error || !data?.signedUrl) {
      // eslint-disable-next-line no-console
      console.error("Failed to create signed download URL", error);
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (file.url?.trim()) {
    window.open(file.url, "_blank");
  }
}

/** Folder ZIP download — placeholder until implemented. */
export function downloadFolderZip(_folderName: string) {
  // TODO: generate ZIP from storage and trigger download
}
