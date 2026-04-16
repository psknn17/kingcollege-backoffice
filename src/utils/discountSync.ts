/**
 * Utility to sync invoice discounts when discount groups change.
 * When a student is inactivated/removed from a discount group,
 * unpaid & unapproved invoices must have their discounts recalculated.
 */

const CREATED_INVOICES_STORAGE_KEY = "createdInvoices"

interface DiscountGroup {
  id: string
  name: string
  students: { id: string; name: string; isActive?: boolean }[]
  discountType: "percentage" | "fixed"
  discountPercentage: number
  fixedAmount: number
  isActive: boolean
}

/**
 * Get active discount groups for a student from a specific storage key
 */
const getActiveDiscountsForStudent = (studentId: string, storageKey: string): { name: string; amount: number; percentage?: number }[] => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []

    const groups: DiscountGroup[] = JSON.parse(stored)
    const discountItems: { name: string; amount: number; percentage?: number }[] = []

    groups.forEach(group => {
      if (group.isActive === false) return
      const studentInGroup = group.students?.some(s => s.id === studentId && s.isActive !== false)
      if (!studentInGroup) return

      // We'll calculate the actual amount later when we know the subtotal
      discountItems.push({
        name: group.name,
        amount: 0, // placeholder
        percentage: group.discountType === "percentage" ? group.discountPercentage : undefined
      })
    })

    return discountItems
  } catch {
    return []
  }
}

/**
 * Recalculate discount for a single invoice based on current discount groups
 */
const recalculateInvoiceDiscount = (invoice: any, storageKey: string) => {
  const studentId = invoice.studentId
  if (!studentId) return null

  // Get subtotal from items
  const subtotal = (invoice.items || []).reduce((sum: number, item: any) => {
    return sum + (item.amount || 0)
  }, 0)

  if (subtotal <= 0) return null

  // Get current active discounts for this student
  const stored = localStorage.getItem(storageKey)
  if (!stored) {
    // No discount groups at all — remove all group discounts
    return {
      discounts: [],
      totalDiscount: 0,
      netAmount: subtotal
    }
  }

  const groups: DiscountGroup[] = JSON.parse(stored)
  const discountItems: { name: string; amount: number; percentage?: number }[] = []
  let totalDiscountAmount = 0

  groups.forEach(group => {
    if (group.isActive === false) return
    const studentInGroup = group.students?.some(s => s.id === studentId && s.isActive !== false)
    if (!studentInGroup) return

    if (group.discountType === "percentage" && group.discountPercentage > 0) {
      const amount = Math.round(subtotal * group.discountPercentage / 100)
      discountItems.push({
        name: group.name,
        amount,
        percentage: group.discountPercentage
      })
      totalDiscountAmount += amount
    } else if (group.discountType === "fixed" && group.fixedAmount > 0) {
      discountItems.push({
        name: group.name,
        amount: group.fixedAmount
      })
      totalDiscountAmount += group.fixedAmount
    }
  })

  return {
    discounts: discountItems,
    totalDiscount: totalDiscountAmount,
    netAmount: Math.max(0, subtotal - totalDiscountAmount)
  }
}

/**
 * Update all unpaid/unapproved invoices when discount groups change.
 * Called after saving discount group changes.
 *
 * @param storageKey - The localStorage key for the discount groups (e.g. "studentGroups", "summerDiscountGroups")
 * @param category - The invoice category to filter (e.g. "tuition", "summer"). If not provided, updates all matching.
 */
export function syncInvoiceDiscounts(storageKey: string, category?: string) {
  try {
    const stored = localStorage.getItem(CREATED_INVOICES_STORAGE_KEY)
    if (!stored) return

    const invoices = JSON.parse(stored)
    let updated = false

    const updatedInvoices = invoices.map((invoice: any) => {
      // Only update invoices that are NOT paid and NOT approved
      const isPaid = invoice.status === "paid"
      const isApproved = invoice.approvalStatus === "approved"
      const isCancelled = invoice.status === "cancelled"

      if (isPaid || isApproved || isCancelled) return invoice

      // Filter by category if provided
      if (category && invoice.category !== category) return invoice

      // Skip non-discountable categories
      const cat = invoice.category || ""
      if (cat === "eca" || cat === "trip" || cat === "exam" || cat === "external") return invoice

      const result = recalculateInvoiceDiscount(invoice, storageKey)
      if (!result) return invoice

      // Check if discount actually changed
      const oldDiscount = invoice.totalDiscount ?? invoice.discountAmount ?? 0
      if (oldDiscount === result.totalDiscount &&
          JSON.stringify(invoice.discounts || []) === JSON.stringify(result.discounts)) {
        return invoice
      }

      updated = true
      return {
        ...invoice,
        discounts: result.discounts,
        totalDiscount: result.totalDiscount,
        discountAmount: result.totalDiscount,
        netAmount: result.netAmount,
        finalAmount: result.netAmount
      }
    })

    if (updated) {
      localStorage.setItem(CREATED_INVOICES_STORAGE_KEY, JSON.stringify(updatedInvoices))
    }

    return updated
  } catch (error) {
    console.error("Failed to sync invoice discounts:", error)
    return false
  }
}
