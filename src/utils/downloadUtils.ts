import { saveAs } from "file-saver"

/**
 * Triggers a file download reliably across browsers using file-saver.
 * Handles Chrome on http://localhost where blob: URL download attribute is ignored.
 */
export function triggerDownload(
  content: string | Blob,
  filename: string,
  mimeType = "text/csv"
): void {
  let blob: Blob

  if (content instanceof Blob) {
    blob = content
  } else {
    // Add UTF-8 BOM for Excel CSV compatibility
    const text = content.startsWith("\uFEFF") ? content : "\uFEFF" + content
    blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  }

  saveAs(blob, filename)
}
