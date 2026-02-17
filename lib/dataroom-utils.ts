export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getUniqueFileName(name: string, takenNames: Set<string>): string {
  // We treat names as case-insensitive for uniqueness, so "Test.png" and "test.png"
  // cannot coexist in the same folder.
  const lower = name.toLowerCase();
  if (!takenNames.has(lower)) {
    takenNames.add(lower);
    return name;
  }

  const lastDot = name.lastIndexOf(".");
  const hasExtension = lastDot > 0;
  const base = hasExtension ? name.slice(0, lastDot) : name;
  const ext = hasExtension ? name.slice(lastDot) : "";

  let index = 1;

  while (true) {
    const candidate = `${base} (${index})${ext}`;
    const candidateKey = candidate.toLowerCase();
    if (!takenNames.has(candidateKey)) {
      takenNames.add(candidateKey);
      return candidate;
    }
    index += 1;
  }
}

export function computeUniqueFileNameMappings(
  files: { name: string }[],
  existingNames: Set<string>
): { original: string; final: string }[] {
  // Use a case-insensitive view of existing names so that
  // "Test.png" and "test.png" are considered the same.
  const taken = new Set(Array.from(existingNames, (n) => n.toLowerCase()));
  const mappings: { original: string; final: string }[] = [];

  for (const file of files) {
    const final = getUniqueFileName(file.name, taken);
    if (final !== file.name) {
      mappings.push({ original: file.name, final });
    }
  }

  return mappings;
}

/**
 * When renaming a file, preserve the original extension if the user omits it.
 * - "report" + ".pdf" -> "report.pdf"
 * - "report.docx" + ".pdf" -> "report.docx" (user provided new extension)
 * - ".env" stays ".env" even if user types "env" (no implicit dotfiles logic).
 */
export function preserveExtensionOnRename(enteredName: string, originalName: string): string {
  const trimmedNewName = enteredName.trim();
  if (!trimmedNewName) {
    throw new Error("Name cannot be empty.");
  }

  const getExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf(".");
    // Ignore leading dot files like ".env" and names ending with "."
    if (lastDot <= 0 || lastDot === filename.length - 1) return "";
    return filename.slice(lastDot);
  };

  const originalExtension = getExtension(originalName);

  const newHasExtension = (() => {
    const lastDot = trimmedNewName.lastIndexOf(".");
    return lastDot > 0 && lastDot < trimmedNewName.length - 1;
  })();

  // If the user didn't type an extension but the old name had one, keep it.
  if (!newHasExtension && originalExtension) {
    return `${trimmedNewName}${originalExtension}`;
  }

  return trimmedNewName;
}
