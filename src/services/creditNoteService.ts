/**
 * creditNoteService.ts
 *
 * Handles all Credit Note operations for the in-person payment workflow.
 * Currently uses localStorage as the data store.
 *
 * ─── HOW TO SWAP TO REAL API (when backend is ready) ───────────────────────
 * Replace each function body with a fetch() call to your API endpoint.
 * All functions are already async, so no call-site changes needed.
 *
 * Example swap for getCreditNotesByFamily:
 *   const res = await fetch(`/api/credit-notes?familyCode=${familyCode}`)
 *   return res.json()
 * ──────────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = "creditNotesRecords"

// ========================
// TYPES
// ========================

export interface CreditNote {
  id: string
  creditNoteNumber: string
  studentName: string
  studentId: string
  familyCode?: string
  amount: number
  remainingBalance?: number
  reason: string
  status: "issued" | "pending" | "cancelled" | "used" | "partial"
  issueDate: string
  appliedToInvoice?: string
  appliedToReceipt?: string
  appliedAt?: string
  appliedBy?: "staff" | "parent"
}

export interface ApplyCreditNotePayload {
  creditNoteId: string
  invoiceId?: string
  receiptNo?: string
  appliedAmount: number
  appliedBy: "staff" | "parent"
}

// ========================
// READ
// ========================

/** GET /api/credit-notes — all credit notes (backoffice admin view) */
export async function getAllCreditNotes(): Promise<CreditNote[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * GET /api/credit-notes?familyCode=xxx
 * Returns available (issued/partial) credit notes for a specific family.
 * Used by staff when processing in-person payment.
 */
export async function getCreditNotesByFamily(
  familyCode: string,
  studentId?: string
): Promise<CreditNote[]> {
  const all = await getAllCreditNotes()
  return all.filter(cn => {
    const isAvailable = cn.status === "issued" || cn.status === "partial"
    const matchesFamily =
      (familyCode && cn.familyCode === familyCode) ||
      (studentId && cn.studentId === studentId) ||
      (studentId && cn.studentName && cn.studentName.trim().toLowerCase() ===
        studentId.trim().toLowerCase())
    return isAvailable && matchesFamily
  })
}

// ========================
// WRITE
// ========================

/**
 * PATCH /api/credit-notes/:id/use
 * Marks one or more credit notes as "used" after staff applies them
 * during in-person payment. Records who applied it and to which invoice/receipt.
 */
export async function applyCreditNotes(
  payloads: ApplyCreditNotePayload[]
): Promise<void> {
  const all = await getAllCreditNotes()
  const appliedAt = new Date().toISOString()

  const updated = all.map(cn => {
    const payload = payloads.find(p => p.creditNoteId === cn.id)
    if (!payload) return cn

    const currentBalance = cn.remainingBalance ?? cn.amount
    const newBalance = Math.max(0, currentBalance - payload.appliedAmount)
    const newStatus: CreditNote["status"] = newBalance === 0 ? "used" : "partial"

    return {
      ...cn,
      status: newStatus,
      remainingBalance: newBalance,
      appliedToInvoice: payload.invoiceId ?? cn.appliedToInvoice,
      appliedToReceipt: payload.receiptNo ?? cn.appliedToReceipt,
      appliedAt,
      appliedBy: payload.appliedBy,
    }
  })

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error("[creditNoteService] Failed to save:", e)
    throw new Error("Failed to apply credit notes")
  }
}

/**
 * POST /api/credit-notes/bulk
 * Import credit notes from Excel (backoffice staff action).
 * Merges new notes with existing ones — won't overwrite already-used CNs.
 */
export async function importCreditNotes(notes: Omit<CreditNote, "id">[]): Promise<void> {
  const existing = await getAllCreditNotes()
  const existingNumbers = new Set(existing.map(cn => cn.creditNoteNumber))

  const toAdd: CreditNote[] = notes
    .filter(n => !existingNumbers.has(n.creditNoteNumber))
    .map((n, i) => ({
      ...n,
      id: `cn-import-${Date.now()}-${i}`,
    }))

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, ...toAdd]))
  } catch (e) {
    console.error("[creditNoteService] Import failed:", e)
    throw new Error("Failed to import credit notes")
  }
}

/**
 * PATCH /api/credit-notes/:id/cancel
 * Cancel a credit note (backoffice only).
 */
export async function cancelCreditNote(id: string): Promise<void> {
  const all = await getAllCreditNotes()
  const updated = all.map(cn =>
    cn.id === id ? { ...cn, status: "cancelled" as const } : cn
  )
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    throw new Error("Failed to cancel credit note")
  }
}
