import { open } from '@tauri-apps/plugin-dialog'

/**
 * Seam module for file picker dialog.
 * Wraps Tauri's dialog plugin to enable easy mocking in tests.
 */
export async function pickFilesViaDialog(): Promise<string[] | null> {
  return open({ multiple: true })
}
