// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string
  name: string
  type: "invoice" | "receipt"
  language: "en"
  subject: string
  body: string
  isDefault: boolean
  status: "active" | "draft"
  createdAt: string
  updatedAt: string
  createdBy: string
  version: number
}

// ─── Variable definitions ────────────────────────────────────────────────────

export interface TemplateVariable {
  key: string
  label: string
  example: string
}

export const INVOICE_VARIABLES: TemplateVariable[] = [
  { key: "{{parentName}}",    label: "Parent Name",    example: "Mr. Robert Smith" },
  { key: "{{studentName}}",   label: "Student Name",   example: "James Smith" },
  { key: "{{studentId}}",     label: "Student ID",     example: "KC2025001" },
  { key: "{{grade}}",         label: "Year Group",     example: "Year 7" },
  { key: "{{invoiceNumber}}", label: "Invoice No.",    example: "2025INV-000123" },
  { key: "{{invoiceAmount}}", label: "Amount",         example: "130,000" },
  { key: "{{dueDate}}",       label: "Due Date",       example: "31/01/2026" },
  { key: "{{schoolName}}",    label: "School Name",    example: "King's College International School Bangkok" },
]

export const RECEIPT_VARIABLES: TemplateVariable[] = [
  { key: "{{parentName}}",     label: "Parent Name",     example: "Mr. Robert Smith" },
  { key: "{{studentName}}",    label: "Student Name",    example: "James Smith" },
  { key: "{{studentId}}",      label: "Student ID",      example: "KC2025001" },
  { key: "{{grade}}",          label: "Year Group",      example: "Year 7" },
  { key: "{{receiptNumber}}",  label: "Receipt No.",     example: "R2025-00456" },
  { key: "{{receiptDate}}",    label: "Receipt Date",    example: "28/02/2026" },
  { key: "{{amount}}",         label: "Amount",          example: "130,000" },
  { key: "{{paymentMethod}}",  label: "Payment Method",  example: "Bank Transfer" },
  { key: "{{schoolName}}",     label: "School Name",     example: "King's College International School Bangkok" },
]

export const INVOICE_SAMPLE: Record<string, string> = {
  "{{parentName}}": "Mr. Robert Smith",
  "{{studentName}}": "James Smith",
  "{{studentId}}": "KC2025001",
  "{{grade}}": "Year 7",
  "{{invoiceNumber}}": "2025INV-000123",
  "{{invoiceAmount}}": "130,000",
  "{{dueDate}}": "31/01/2026",
  "{{schoolName}}": "King's College International School Bangkok",
}

export const RECEIPT_SAMPLE: Record<string, string> = {
  "{{parentName}}": "Mr. Robert Smith",
  "{{studentName}}": "James Smith",
  "{{studentId}}": "KC2025001",
  "{{grade}}": "Year 7",
  "{{receiptNumber}}": "R2025-00456",
  "{{receiptDate}}": "28/02/2026",
  "{{amount}}": "130,000",
  "{{paymentMethod}}": "Bank Transfer",
  "{{schoolName}}": "King's College International School Bangkok",
}

// ─── Known variable keys ─────────────────────────────────────────────────────

const ALL_KNOWN_VARS = new Set([
  ...INVOICE_VARIABLES.map(v => v.key),
  ...RECEIPT_VARIABLES.map(v => v.key),
])

// ─── Render template ─────────────────────────────────────────────────────────

export interface RenderResult {
  rendered: string
  missingVars: string[]
  unknownVars: string[]
}

export function renderTemplate(
  text: string,
  variables: Record<string, string>
): RenderResult {
  const missingVars: string[] = []
  const unknownVars: string[] = []

  const rendered = text.replace(/\{\{(\w+)\}\}/g, (match) => {
    if (variables[match] !== undefined) {
      return variables[match]
    }
    if (!ALL_KNOWN_VARS.has(match)) {
      unknownVars.push(match)
    } else {
      missingVars.push(match)
    }
    return match
  })

  return { rendered, missingVars, unknownVars }
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_PREFIX = "kingscollege_backoffice_"
const TEMPLATES_KEY = STORAGE_PREFIX + "emailTemplates"

export function loadTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

export function saveTemplates(templates: EmailTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch (e) {
    console.warn("Failed to save templates:", e)
  }
}

// ─── Default template seeds (English only) ───────────────────────────────────

export function getDefaultSeeds(): EmailTemplate[] {
  const now = new Date().toISOString()
  return [
    {
      id: "tpl-seed-inv-en",
      name: "Standard Invoice Email",
      type: "invoice",
      language: "en",
      subject: "Invoice {{invoiceNumber}} — Payment Due {{dueDate}}",
      body: `Dear {{parentName}},

Please find attached the invoice for {{studentName}} (ID: {{studentId}}, {{grade}}).

Invoice Details:
  \u2022 Invoice No.:  {{invoiceNumber}}
  \u2022 Amount:       {{invoiceAmount}} THB
  \u2022 Due Date:     {{dueDate}}

Kindly arrange payment before the due date to avoid any inconvenience.

If you have any questions, please contact the Finance & Accounting Department.

Best regards,
{{schoolName}}`,
      isDefault: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      version: 1,
    },
    {
      id: "tpl-seed-rcp-en",
      name: "Standard Receipt Email",
      type: "receipt",
      language: "en",
      subject: "Payment Receipt {{receiptNumber}} \u2014 {{studentName}}",
      body: `Dear {{parentName}},

Thank you for your payment. Please find attached the receipt for {{studentName}}.

Receipt Details:
  \u2022 Receipt No.:       {{receiptNumber}}
  \u2022 Receipt Date:      {{receiptDate}}
  \u2022 Amount Received:   {{amount}} THB
  \u2022 Payment Method:    {{paymentMethod}}

Please keep this receipt for your records.

If you have any questions, please contact the Finance & Accounting Department.

Best regards,
{{schoolName}}`,
      isDefault: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: "System",
      version: 1,
    },
  ]
}

// ─── Migration from old format ───────────────────────────────────────────────

interface OldEmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  isDefault: boolean
  createdAt: string
}

function migrateOldSyntax(text: string): string {
  return text.replace(/\{(\w+)\}/g, "{{$1}}")
}

export function migrateTemplates(): EmailTemplate[] {
  const prefix = "kingscollege_backoffice_"

  const existing = loadTemplates()
  if (existing.length > 0) return existing

  const oldInvoiceRaw = localStorage.getItem(prefix + "emailTemplates:invoice")
  const oldReceiptRaw = localStorage.getItem(prefix + "emailTemplates:receipt")

  let migrated: EmailTemplate[] = []

  if (oldInvoiceRaw || oldReceiptRaw) {
    const oldInvoice: OldEmailTemplate[] = oldInvoiceRaw ? JSON.parse(oldInvoiceRaw) : []
    const oldReceipt: OldEmailTemplate[] = oldReceiptRaw ? JSON.parse(oldReceiptRaw) : []

    for (const old of oldInvoice) {
      migrated.push({
        id: old.id,
        name: old.name,
        type: "invoice",
        language: "en",
        subject: migrateOldSyntax(old.subject),
        body: migrateOldSyntax(old.body),
        isDefault: old.isDefault,
        status: "active",
        createdAt: old.createdAt,
        updatedAt: old.createdAt,
        createdBy: "System",
        version: 1,
      })
    }

    for (const old of oldReceipt) {
      migrated.push({
        id: old.id,
        name: old.name,
        type: "receipt",
        language: "en",
        subject: migrateOldSyntax(old.subject),
        body: migrateOldSyntax(old.body),
        isDefault: old.isDefault,
        status: "active",
        createdAt: old.createdAt,
        updatedAt: old.createdAt,
        createdBy: "System",
        version: 1,
      })
    }

    // Ensure only one default per type
    for (const tp of ["invoice", "receipt"] as const) {
      const ofType = migrated.filter(t => t.type === tp)
      let foundDefault = false
      for (const t of ofType) {
        if (t.isDefault) {
          if (foundDefault) t.isDefault = false
          else foundDefault = true
        }
      }
    }
  }

  if (migrated.length === 0) {
    migrated = getDefaultSeeds()
  }

  saveTemplates(migrated)
  return migrated
}

// ─── Query helpers ───────────────────────────────────────────────────────────

export function getDefaultTemplate(
  templates: EmailTemplate[],
  type: "invoice" | "receipt"
): EmailTemplate | undefined {
  return templates.find(t => t.type === type && t.isDefault && t.status === "active")
}

export function getVariablesForType(type: "invoice" | "receipt") {
  return type === "invoice" ? INVOICE_VARIABLES : RECEIPT_VARIABLES
}

export function getSampleForType(type: "invoice" | "receipt") {
  return type === "invoice" ? INVOICE_SAMPLE : RECEIPT_SAMPLE
}
