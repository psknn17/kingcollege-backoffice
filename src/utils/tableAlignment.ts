/**
 * Table Alignment Standard - System-wide Pattern
 *
 * This file defines the standard alignment rules for all tables in the system.
 * Apply these utilities to ensure consistent header and cell alignment.
 */

/**
 * Alignment types for table columns
 */
export type TableAlignment = "left" | "center" | "right"

/**
 * Column type determines default alignment
 */
export type ColumnType =
  | "text"           // Names, descriptions, IDs - LEFT aligned
  | "number"         // Numeric values, quantities - RIGHT aligned
  | "currency"       // Prices, amounts - RIGHT aligned
  | "date"           // Dates, timestamps - LEFT aligned
  | "status"         // Badges, status indicators - CENTER aligned
  | "actions"        // Action buttons - CENTER aligned
  | "checkbox"       // Checkboxes - CENTER aligned
  | "icon"           // Icons only - CENTER aligned

/**
 * Get standard alignment for a column type
 */
export function getAlignmentForType(type: ColumnType): TableAlignment {
  const alignmentMap: Record<ColumnType, TableAlignment> = {
    text: "left",
    number: "right",
    currency: "right",
    date: "left",
    status: "center",
    actions: "center",
    checkbox: "center",
    icon: "center",
  }
  return alignmentMap[type]
}

/**
 * Get Tailwind classes for alignment
 */
export function getAlignmentClass(alignment: TableAlignment): string {
  const classMap: Record<TableAlignment, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }
  return classMap[alignment]
}

/**
 * Helper to get alignment class from column type
 */
export function getColumnClass(type: ColumnType): string {
  return getAlignmentClass(getAlignmentForType(type))
}

/**
 * Standard column width classes (optional, for consistency)
 */
export const ColumnWidths = {
  xs: "w-16",      // Checkboxes, small icons
  sm: "w-24",      // Status badges, short codes
  md: "w-32",      // Dates, IDs
  lg: "w-48",      // Names, descriptions
  xl: "w-64",      // Long text fields
  auto: "w-auto",  // Let content determine width
  full: "w-full",  // Take remaining space
} as const

/**
 * Pre-configured column classes for common scenarios
 */
export const ColumnPresets = {
  // Checkbox column
  checkbox: "text-center w-12",

  // ID/Code columns
  id: "text-left w-32",
  code: "text-left w-24",

  // Text columns
  name: "text-left w-48",
  description: "text-left w-64",
  email: "text-left w-56",

  // Number columns
  quantity: "text-right w-24",
  amount: "text-right w-32",
  currency: "text-right w-32",
  percentage: "text-right w-24",

  // Date columns
  date: "text-left w-32",
  datetime: "text-left w-40",

  // Status columns
  status: "text-center w-32",
  badge: "text-center w-28",

  // Action columns
  actions: "text-center w-32",
  actionsWide: "text-center w-40",

  // Icon columns
  icon: "text-center w-16",
} as const

/**
 * Example usage in components:
 *
 * ```tsx
 * import { getColumnClass, ColumnPresets } from "@/utils/tableAlignment"
 *
 * // Method 1: Using type-based alignment
 * <TableHead className={getColumnClass("text")}>Name</TableHead>
 * <TableCell className={getColumnClass("text")}>John Doe</TableCell>
 *
 * // Method 2: Using presets
 * <TableHead className={ColumnPresets.name}>Name</TableHead>
 * <TableCell className={ColumnPresets.name}>John Doe</TableCell>
 *
 * // Method 3: Direct alignment
 * <TableHead className="text-right">Amount</TableHead>
 * <TableCell className="text-right">1,000 THB</TableCell>
 * ```
 */

/**
 * Validation helper - checks if header and cell have matching alignment
 */
export function validateAlignment(
  headerClass: string,
  cellClass: string
): boolean {
  const alignments = ["text-left", "text-center", "text-right"]

  const headerAlign = alignments.find((align) => headerClass.includes(align))
  const cellAlign = alignments.find((align) => cellClass.includes(align))

  return headerAlign === cellAlign
}
