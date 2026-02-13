/**
 * Utility for auto-creating tuition fee items in Item Master
 *
 * When invoices are created from "Tuition Fees by Year Group" data,
 * this utility ensures corresponding items exist in the Item Master.
 *
 * Key Features:
 * - Items serve as templates (Item Code + Nominal Code only)
 * - Prices come from "Tuition Fees by Year Group", not from items
 * - Same item can be used for multiple terms with different prices
 */

export interface Item {
  id: string
  itemCode: string
  name: string
  description: string
  amount: number
  category?: string
  nominalCode?: string
  documentType?: string
  isActive: boolean
  applicableGrades: string[]
  invoiceType?: "student" | "external" | "eca"
}

// Standard tuition fee item definitions
// These items are templates - prices come from TuitionByYear data
export const TUITION_FEE_ITEMS = {
  TERM_1: {
    itemCode: "TUI-T1",
    nominalCode: "4110003",
    name: "Tuition Fee - Term 1",
    description: "First term tuition payment for academic year",
    category: "Tuition",
    documentType: "SI"
  },
  TERM_2: {
    itemCode: "TUI-T2",
    nominalCode: "4110004",
    name: "Tuition Fee - Term 2",
    description: "Second term tuition payment for academic year",
    category: "Tuition",
    documentType: "SI"
  },
  TERM_3: {
    itemCode: "TUI-T3",
    nominalCode: "4110007",
    name: "Tuition Fee - Term 3",
    description: "Third term tuition payment for academic year",
    category: "Tuition",
    documentType: "SI"
  }
} as const

const ALL_GRADES = [
  "Pre-Nursery",
  "Nursery",
  "Reception",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
  "Year 12",
  "Year 13"
]

// Get storage key for items (must match ItemManagement and InvoiceCreation)
const getItemsStorageKey = (category: string): string => {
  switch (category) {
    case "afterschool":
      return "afterschoolItems"
    case "event":
      return "eventItems"
    case "summer":
      return "summerItems"
    case "external":
      return "externalItems"
    case "eca":
      return "ecaItems"
    default:
      return "invoiceItems" // student/tuition invoices
  }
}

// Load items from localStorage
const loadItemsFromStorage = (invoiceCategory: string = "student"): Item[] => {
  const storageKey = getItemsStorageKey(invoiceCategory)
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
  }
  return []
}

// Save items to localStorage
const saveItemsToStorage = (items: Item[], invoiceCategory: string = "student") => {
  try {
    localStorage.setItem(getItemsStorageKey(invoiceCategory), JSON.stringify(items))
  } catch (error) {
    console.error("Failed to save items to localStorage:", error)
  }
}

/**
 * Parse item name to extract term number and grade ID
 * Matches patterns like:
 *   "Tuition fee - Term 1 / Year 5"
 *   "Term 2 Tuition Fee - Nursery"
 *   "Tuition Term 3 - Pre-Nursery"
 */
export const parseTuitionItemName = (name: string): { term: number | null, gradeId: string | null } => {
  let term: number | null = null
  let gradeId: string | null = null

  // Extract term number (Term 1, Term 2, Term 3)
  const termMatch = name.match(/Term\s*(\d)/i)
  if (termMatch) {
    const t = parseInt(termMatch[1])
    if (t >= 1 && t <= 3) term = t
  }

  // Extract grade - check Pre-Nursery first (contains "Nursery")
  if (/Pre[- ]?Nursery/i.test(name)) {
    gradeId = 'pre-nursery'
  } else if (/Reception/i.test(name)) {
    gradeId = 'reception'
  } else {
    const yearMatch = name.match(/Year\s*(\d+)/i)
    if (yearMatch) {
      gradeId = `year${yearMatch[1]}`
    } else if (/Nursery/i.test(name)) {
      gradeId = 'nursery'
    }
  }

  return { term, gradeId }
}

/**
 * Get term number from term string
 * @param term - Term string like "Term 1", "term1", "Term 2 (2024)", etc.
 * @returns 1, 2, or 3
 */
export const getTermNumber = (term: string): 1 | 2 | 3 | null => {
  const termLower = term.toLowerCase()
  if (termLower.includes("term 1") || termLower.includes("term1")) return 1
  if (termLower.includes("term 2") || termLower.includes("term2")) return 2
  if (termLower.includes("term 3") || termLower.includes("term3")) return 3
  return null
}

/**
 * Get tuition fee item definition for a specific term
 */
export const getTuitionFeeItemDefinition = (termNumber: 1 | 2 | 3) => {
  switch (termNumber) {
    case 1:
      return TUITION_FEE_ITEMS.TERM_1
    case 2:
      return TUITION_FEE_ITEMS.TERM_2
    case 3:
      return TUITION_FEE_ITEMS.TERM_3
  }
}

/**
 * Check if a tuition fee item exists in Item Master
 */
export const checkTuitionItemExists = (
  itemCode: string,
  invoiceCategory: string = "student"
): boolean => {
  const items = loadItemsFromStorage(invoiceCategory)
  return items.some(item => item.itemCode === itemCode)
}

/**
 * Auto-create tuition fee items if they don't exist
 *
 * @param termNumber - Term number (1, 2, or 3)
 * @param invoiceCategory - Invoice category (default: "student")
 * @returns List of newly created item names (empty if all existed)
 */
export const autoCreateTuitionItems = (
  termNumber: 1 | 2 | 3,
  invoiceCategory: string = "student"
): string[] => {
  const items = loadItemsFromStorage(invoiceCategory)
  const createdItems: string[] = []

  const itemDef = getTuitionFeeItemDefinition(termNumber)
  if (!itemDef) return createdItems

  // Check if item already exists
  const exists = items.some(item => item.itemCode === itemDef.itemCode)

  if (!exists) {
    // Create new item
    const newItem: Item = {
      id: `item-${itemDef.itemCode.toLowerCase()}-${Date.now()}`,
      itemCode: itemDef.itemCode,
      name: itemDef.name,
      description: itemDef.description,
      amount: 0, // Price comes from TuitionByYear, not from item
      category: itemDef.category,
      nominalCode: itemDef.nominalCode,
      documentType: itemDef.documentType,
      isActive: true,
      applicableGrades: ALL_GRADES,
      invoiceType: "student"
    }

    items.push(newItem)
    createdItems.push(itemDef.name)

    console.log(`[Auto-Create] Created item: ${itemDef.itemCode} - ${itemDef.name}`)
  }

  // Save if any items were created
  if (createdItems.length > 0) {
    saveItemsToStorage(items, invoiceCategory)
    console.log(`[Auto-Create] Saved ${createdItems.length} new items to storage`)
  }

  return createdItems
}

/**
 * Auto-create tuition fee items for multiple terms at once
 * Useful when creating invoices for multiple terms simultaneously
 */
export const autoCreateMultipleTermItems = (
  termNumbers: Array<1 | 2 | 3>,
  invoiceCategory: string = "student"
): string[] => {
  const allCreatedItems: string[] = []

  for (const termNumber of termNumbers) {
    const created = autoCreateTuitionItems(termNumber, invoiceCategory)
    allCreatedItems.push(...created)
  }

  return allCreatedItems
}

/**
 * Get item code for a specific term
 */
export const getTuitionItemCode = (termNumber: 1 | 2 | 3): string | null => {
  const itemDef = getTuitionFeeItemDefinition(termNumber)
  return itemDef?.itemCode || null
}

/**
 * Get nominal code for a specific term
 */
export const getTuitionNominalCode = (termNumber: 1 | 2 | 3): string | null => {
  const itemDef = getTuitionFeeItemDefinition(termNumber)
  return itemDef?.nominalCode || null
}
