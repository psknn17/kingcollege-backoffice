import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

/**
 * Download data as .xlsx file (Excel format)
 * @param headers - Array of column header strings
 * @param rows - Array of row arrays (values in same order as headers)
 * @param filename - Filename without extension (will add .xlsx)
 */
export function downloadAsXlsx(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string
): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1")

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(row => String(row[i] ?? "").length)
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
  ws["!cols"] = colWidths

  const xlsxBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" })
  const blob = new Blob([xlsxBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  })

  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  saveAs(blob, name)
}

/**
 * Parse .xlsx or .csv file into array of row objects
 * Keys are the column headers from row 1
 */
export function parseXlsxOrCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error("Failed to read file"))
          return
        }

        const workbook = XLSX.read(data, { type: "binary", cellText: true, cellDates: false })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: "",
          raw: false // Format all values as strings
        })

        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsBinaryString(file)
  })
}

/**
 * Get accept string for file input (xlsx + csv)
 */
export const XLSX_ACCEPT = ".xlsx,.xls,.csv"

/**
 * Format academic year for display: "2025-2026" → "2025/2026"
 * Accepts either format as input.
 */
export const formatAcademicYear = (year: string | undefined | null): string => {
  if (!year) return ""
  return year.replace(/-/g, "/")
}

/**
 * Normalize academic year for comparison: always returns "2025-2026" format
 * Used internally for filter comparisons to handle both formats.
 */
export const normalizeAcademicYear = (year: string | undefined | null): string => {
  if (!year) return ""
  return year.replace(/\//g, "-")
}
