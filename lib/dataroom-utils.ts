export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getUniqueFileName(name: string, takenNames: Set<string>): string {
  if (!takenNames.has(name)) return name;

  const lastDot = name.lastIndexOf(".");
  const hasExtension = lastDot > 0;
  const base = hasExtension ? name.slice(0, lastDot) : name;
  const ext = hasExtension ? name.slice(lastDot) : "";

  let index = 1;

  while (true) {
    const candidate = `${base} (${index})${ext}`;
    if (!takenNames.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
}

export function computeUniqueFileNameMappings(
  files: { name: string }[],
  existingNames: Set<string>
): { original: string; final: string }[] {
  const taken = new Set(existingNames);
  const mappings: { original: string; final: string }[] = [];

  for (const file of files) {
    const final = getUniqueFileName(file.name, taken);
    taken.add(final);
    if (final !== file.name) {
      mappings.push({ original: file.name, final });
    }
  }

  return mappings;
}
