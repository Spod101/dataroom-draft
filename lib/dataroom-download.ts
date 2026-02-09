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
