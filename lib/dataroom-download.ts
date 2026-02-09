/** Create a mock file (same name, dummy content) and trigger browser download */
export function downloadFile(name: string, mimeType?: string) {
  const content = `Mock file content for "${name}". This is temporary data - real file would be served from storage.`;
  const blob = new Blob([content], {
    type: mimeType ?? "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Mock download of a whole folder as a ZIP archive */
export function downloadFolderZip(folderName: string) {
  const safeName = folderName && folderName.trim().length > 0 ? folderName.trim() : "folder";
  const content = `Mock ZIP archive for folder "${safeName}". This is temporary data - real ZIP would be generated on the server.`;
  const blob = new Blob([content], {
    type: "application/zip",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
