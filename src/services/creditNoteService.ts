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

// Use the same key as ReceiptPageUpdated so both components share one store
const STORAGE_KEY = "creditNotesRecords"

// ========================
// TYPES
// ========================

export interface CreditNoteUsage {
  invoiceId?: string
  receiptNo?: string
  appliedAmount: number
  appliedAt: string
  appliedBy: "staff" | "parent"
}

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
  usageHistory?: CreditNoteUsage[]
  // legacy single-use fields (kept for backwards compat)
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
    if (!stored) return []
    const raw: any[] = JSON.parse(stored)
    // Bridge CreditNoteManagement format → service CreditNote format
    return raw.map(cn => ({
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      studentName: cn.studentName,
      studentId: cn.studentId,
      familyCode: cn.parentName ?? cn.familyCode,  // CreditNoteManagement stores family code as `parentName`
      // CreditNoteManagement stores the credit value as `creditAmount`
      amount: cn.creditAmount ?? cn.amount ?? 0,
      remainingBalance: cn.remainingBalance,
      reason: cn.reason,
      status: (cn.status === "applied" ? "used" : cn.status === "draft" ? "pending" : cn.status) as CreditNote["status"],
      issueDate: cn.issueDate instanceof Date
        ? cn.issueDate.toISOString()
        : typeof cn.issueDate === "string" ? cn.issueDate : new Date(cn.issueDate).toISOString(),
      appliedToInvoice: cn.appliedToInvoice,
      appliedToReceipt: cn.appliedToReceipt,
      appliedAt: cn.appliedAt ?? cn.appliedDate,
      appliedBy: cn.appliedBy,
    }))
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
  studentId?: string,
  studentName?: string
): Promise<CreditNote[]> {
  const all = await getAllCreditNotes()
  return all.filter(cn => {
    const isAvailable = cn.status === "issued" || cn.status === "partial"
    const matchesFamily =
      (familyCode && cn.familyCode === familyCode) ||
      (studentId && cn.studentId === studentId) ||
      (studentName && cn.studentName &&
        cn.studentName.trim().toLowerCase() === studentName.trim().toLowerCase())
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
  // Read raw records (CreditNoteManagement format) — do NOT go through getAllCreditNotes()
  // so we preserve all original fields when writing back
  const stored = localStorage.getItem(STORAGE_KEY)
  const raw: any[] = stored ? JSON.parse(stored) : []
  const appliedAt = new Date().toISOString()

  const updated = raw.map(cn => {
    const payload = payloads.find(p => p.creditNoteId === cn.id)
    if (!payload) return cn

    const creditValue = cn.creditAmount ?? cn.amount ?? 0
    const currentBalance = cn.remainingBalance ?? creditValue
    const newBalance = Math.max(0, currentBalance - payload.appliedAmount)
    // Map back to CreditNoteManagement's status enum
    const newStatus = newBalance === 0 ? "applied" : "issued"

    const newEntry: CreditNoteUsage = {
      invoiceId: payload.invoiceId,
      receiptNo: payload.receiptNo,
      appliedAmount: payload.appliedAmount,
      appliedAt,
      appliedBy: payload.appliedBy,
    }
    const existingHistory: CreditNoteUsage[] = cn.usageHistory ?? []

    return {
      ...cn,
      status: newStatus,
      remainingBalance: newBalance,
      usageHistory: [...existingHistory, newEntry],
      // keep legacy fields pointing to latest usage
      appliedToInvoice: payload.invoiceId ?? cn.appliedToInvoice,
      appliedToReceipt: payload.receiptNo ?? cn.appliedToReceipt,
      appliedDate: appliedAt,
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
