/**
 * Naming Utility - Pure TypeScript for output filename generation
 * Used by backend and UI display consistently
 */

const INVALID_WINDOWS_CHARS = /[<>:"/\\|?*\0]/g;

export function generateOutputFilename(
  originalFileName: string,
  completionDate: Date,
  existingFiles: string[] = []
): string {
  // Extract stem (filename without extension)
  const lastDotIndex = originalFileName.lastIndexOf('.');
  const stem = lastDotIndex !== -1 ? originalFileName.slice(0, lastDotIndex) : originalFileName;

  // Clean stem: remove invalid Windows chars, replace spaces with underscores
  let cleanedStem = stem
    .replace(INVALID_WINDOWS_CHARS, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  // Trim leading/trailing underscores and empty result
  cleanedStem = cleanedStem.replace(/^_+|_+$|^[_.]+|[_.]+$/, '');

  if (!cleanedStem) {
    cleanedStem = 'untitled';
  }

  // Format date: _{HHmm}_{yyyyMMdd}.md
  const hours = String(completionDate.getHours()).padStart(2, '0');
  const minutes = String(completionDate.getMinutes()).padStart(2, '0');
  const year = String(completionDate.getFullYear());
  const month = String(completionDate.getMonth() + 1).padStart(2, '0');
  const day = String(completionDate.getDate()).padStart(2, '0');

  const timestamp = `_${hours}${minutes}_${year}${month}${day}`;
  const candidateName = `${cleanedStem}${timestamp}.md`;

  // Collision handling: append _2, _3, etc. (insert before extension)
  if (existingFiles.length === 0) {
    return candidateName;
  }

  let counter = 2;

  while (true) {
    const collisionName = `${candidateName.slice(0, -3)}_${counter}.md`;
    
    if (!existingFiles.some((file) => file.toLowerCase() === collisionName.toLowerCase())) {
      return collisionName;
    }

    counter++;
  }
}
