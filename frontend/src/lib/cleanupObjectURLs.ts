export function cleanupObjectURLs(urls: (string | null | undefined)[]): void {
  for (const url of urls) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
}
