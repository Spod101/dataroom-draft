/** File download — will be wired to Supabase Storage when bucket is ready. */
export function downloadFile(_name: string, _mimeType?: string) {
  // TODO: fetch from storage and trigger download
}

/** Folder ZIP download — will be implemented when storage is ready. */
export function downloadFolderZip(_folderName: string) {
  // TODO: generate ZIP from storage and trigger download
}
