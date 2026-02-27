import { useState } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { Plus, Edit, Trash2, Eye, Star, FileText, Receipt, Copy, Info, Mail } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  isDefault: boolean
  createdAt: string
}

// ─── Default templates ────────────────────────────────────────────────────────

const DEFAULT_INVOICE_TEMPLATES: EmailTemplate[] = [
  {
    id: "inv-default-en",
    name: "Standard Invoice Email (English)",
    subject: "Invoice {invoiceNumber} — Payment Due {dueDate}",
    body: `Dear {parentName},

Please find attached the invoice for {studentName} (ID: {studentId}, {grade}).

Invoice Details:
  • Invoice No.:  {invoiceNumber}
  • Amount:       {invoiceAmount} THB
  • Due Date:     {dueDate}

Kindly arrange payment before the due date to avoid any inconvenience.

If you have any questions, please contact the Finance & Accounting Department.

Best regards,
King's College International School Bangkok`,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "inv-default-th",
    name: "Standard Invoice Email (Thai)",
    subject: "ใบแจ้งหนี้ {invoiceNumber} — กำหนดชำระ {dueDate}",
    body: `เรียน คุณ{parentName},

กรุณาตรวจสอบใบแจ้งหนี้ของ {studentName} (รหัสนักเรียน: {studentId}, {grade})

รายละเอียดใบแจ้งหนี้:
  • เลขที่ใบแจ้งหนี้:  {invoiceNumber}
  • จำนวนเงิน:        {invoiceAmount} บาท
  • กำหนดชำระ:       {dueDate}

กรุณาชำระเงินภายในกำหนดเพื่อหลีกเลี่ยงความไม่สะดวก

หากมีข้อสงสัยกรุณาติดต่อฝ่ายการเงิน

ขอแสดงความนับถือ,
โรงเรียนนานาชาติคิงส์คอลเลจ กรุงเทพ`,
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
]

const DEFAULT_RECEIPT_TEMPLATES: EmailTemplate[] = [
  {
    id: "rcp-default-en",
    name: "Standard Receipt Email (English)",
    subject: "Payment Receipt {receiptNumber} — {studentName}",
    body: `Dear {parentName},

Thank you for your payment. Please find attached the receipt for {studentName}.

Receipt Details:
  • Receipt No.:       {receiptNumber}
  • Receipt Date:      {receiptDate}
  • Amount Received:   {amount} THB
  • Payment Method:    {paymentMethod}

Please keep this receipt for your records.

If you have any questions, please contact the Finance & Accounting Department.

Best regards,
King's College International School Bangkok`,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "rcp-default-th",
    name: "Standard Receipt Email (Thai)",
    subject: "ใบเสร็จรับเงิน {receiptNumber} — {studentName}",
    body: `เรียน คุณ{parentName},

ขอบคุณสำหรับการชำระเงิน กรุณาตรวจสอบใบเสร็จรับเงินของ {studentName}

รายละเอียดใบเสร็จ:
  • เลขที่ใบเสร็จ:    {receiptNumber}
  • วันที่รับเงิน:    {receiptDate}
  • จำนวนเงิน:       {amount} บาท
  • วิธีชำระเงิน:    {paymentMethod}

กรุณาเก็บใบเสร็จนี้ไว้เป็นหลักฐาน

ขอแสดงความนับถือ,
โรงเรียนนานาชาติคิงส์คอลเลจ กรุงเทพ`,
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
]

// ─── Variable definitions ─────────────────────────────────────────────────────

const INVOICE_VARIABLES = [
  { key: "{parentName}",    label: "Parent Name",    example: "Mr. Robert Smith" },
  { key: "{studentName}",   label: "Student Name",   example: "James Smith" },
  { key: "{studentId}",     label: "Student ID",     example: "KC2025001" },
  { key: "{grade}",         label: "Year Group",     example: "Year 7" },
  { key: "{invoiceNumber}", label: "Invoice No.",    example: "2025INV-000123" },
  { key: "{invoiceAmount}", label: "Amount",         example: "130,000" },
  { key: "{dueDate}",       label: "Due Date",       example: "31/01/2026" },
]

const RECEIPT_VARIABLES = [
  { key: "{parentName}",    label: "Parent Name",    example: "Mr. Robert Smith" },
  { key: "{studentName}",   label: "Student Name",   example: "James Smith" },
  { key: "{receiptNumber}", label: "Receipt No.",    example: "R2025-00456" },
  { key: "{receiptDate}",   label: "Receipt Date",   example: "28/02/2026" },
  { key: "{amount}",        label: "Amount",         example: "130,000" },
  { key: "{paymentMethod}", label: "Payment Method", example: "Bank Transfer" },
]

const INVOICE_SAMPLE: Record<string, string> = {
  "{parentName}": "Mr. Robert Smith",
  "{studentName}": "James Smith",
  "{studentId}": "KC2025001",
  "{grade}": "Year 7",
  "{invoiceNumber}": "2025INV-000123",
  "{invoiceAmount}": "130,000",
  "{dueDate}": "31/01/2026",
}

const RECEIPT_SAMPLE: Record<string, string> = {
  "{parentName}": "Mr. Robert Smith",
  "{studentName}": "James Smith",
  "{receiptNumber}": "R2025-00456",
  "{receiptDate}": "28/02/2026",
  "{amount}": "130,000",
  "{paymentMethod}": "Bank Transfer",
}

function applyVariables(text: string, sample: Record<string, string>): string {
  return Object.entries(sample).reduce(
    (result, [key, val]) => result.replaceAll(key, val),
    text
  )
}

// ─── How it works banner ──────────────────────────────────────────────────────

function HowItWorksBanner({ type }: { type: "invoice" | "receipt" }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5">
      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-blue-800 mb-1">How it works</p>
        <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside leading-relaxed">
          <li>Create an email template with the content you want to send to parents.</li>
          <li>
            Click <Star className="w-3 h-3 inline text-yellow-500 fill-yellow-400" /> to set a template as{" "}
            <span className="font-semibold">Default</span> — the system will use this when sending{" "}
            {type === "invoice" ? "invoice" : "receipt"} emails.
          </li>
          <li>
            Variables like <code className="bg-blue-100 px-1 rounded text-[11px] font-mono">{"{studentName}"}</code> are
            automatically replaced with real student data when the email is sent.
          </li>
        </ol>
      </div>
    </div>
  )
}

// ─── Email Preview panel ──────────────────────────────────────────────────────

function EmailPreview({
  subject,
  body,
  sample,
}: {
  subject: string
  body: string
  sample: Record<string, string>
}) {
  const previewSubject = applyVariables(subject || "(no subject)", sample)
  const previewBody = applyVariables(body || "", sample)
  const isEmpty = !subject && !body

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-gray-700">Live Preview</p>
        <span className="text-xs text-muted-foreground">(sample data)</span>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-2 rounded-lg border border-dashed bg-gray-50 p-6">
          <Mail className="w-8 h-8 opacity-30" />
          <p className="text-xs">Start typing to see a preview of your email here.</p>
        </div>
      ) : (
        <div className="flex-1 rounded-lg border bg-white overflow-hidden flex flex-col text-sm">
          {/* Email header */}
          <div className="bg-gray-50 border-b px-4 py-3 space-y-1.5">
            <div className="flex gap-2">
              <span className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5">To:</span>
              <span className="text-xs text-gray-700">parent@example.com</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-medium text-muted-foreground w-14 shrink-0 pt-0.5">Subject:</span>
              <span className="text-xs font-semibold text-gray-900 leading-snug">{previewSubject}</span>
            </div>
          </div>
          {/* Email body */}
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-800">
              {previewBody || <span className="text-muted-foreground italic">(body is empty)</span>}
            </pre>
          </div>
          <div className="border-t px-4 py-2 bg-gray-50">
            <p className="text-[10px] text-muted-foreground text-center">
              Preview uses sample data — actual email will use real student data
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Template Panel ───────────────────────────────────────────────────────────

interface TemplatePanelProps {
  storageKey: string
  defaultTemplates: EmailTemplate[]
  variables: typeof INVOICE_VARIABLES
  sampleData: Record<string, string>
  type: "invoice" | "receipt"
  userCanEdit: boolean
  confirmDialog: ReturnType<typeof useConfirmDialog>
}

function TemplatePanel({
  storageKey,
  defaultTemplates,
  variables,
  sampleData,
  type,
  userCanEdit,
  confirmDialog,
}: TemplatePanelProps) {
  const [templates, setTemplates] = usePersistedState<EmailTemplate[]>(storageKey, defaultTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ name: "", subject: "", body: "" })
  const [errors, setErrors] = useState<{ name?: string; subject?: string; body?: string }>({})
  const [bodyRef, setBodyRef] = useState<HTMLTextAreaElement | null>(null)

  const openAdd = () => {
    setEditingTemplate(null)
    setForm({ name: "", subject: "", body: "" })
    setErrors({})
    setIsDialogOpen(true)
  }

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t)
    setForm({ name: t.name, subject: t.subject, body: t.body })
    setErrors({})
    setIsDialogOpen(true)
  }

  const setDefault = (id: string) => {
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })))
    toast.success("Default template updated")
  }

  const handleDuplicate = (t: EmailTemplate) => {
    const copy: EmailTemplate = {
      ...t,
      id: `tpl-${Date.now()}`,
      name: `${t.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    setTemplates(prev => [...prev, copy])
    toast.success("Template duplicated")
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = "Template name is required"
    if (!form.subject.trim()) errs.subject = "Subject is required"
    if (!form.body.trim()) errs.body = "Email body is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...form } : t))
      toast.success("Template updated")
    } else {
      const isFirst = templates.length === 0
      setTemplates(prev => [
        ...prev,
        { id: `tpl-${Date.now()}`, ...form, isDefault: isFirst, createdAt: new Date().toISOString() },
      ])
      toast.success("Template added")
    }
    setIsDialogOpen(false)
  }

  const handleDelete = (t: EmailTemplate) => {
    confirmDialog.confirm(() => {
      setTemplates(prev => {
        const updated = prev.filter(x => x.id !== t.id)
        if (t.isDefault && updated.length > 0) updated[0].isDefault = true
        return updated
      })
      toast.success("Template deleted")
    })
  }

  const insertVariable = (key: string) => {
    if (bodyRef) {
      const start = bodyRef.selectionStart ?? form.body.length
      const end = bodyRef.selectionEnd ?? form.body.length
      const newBody = form.body.slice(0, start) + key + form.body.slice(end)
      setForm(prev => ({ ...prev, body: newBody }))
      setTimeout(() => {
        bodyRef.focus()
        bodyRef.setSelectionRange(start + key.length, start + key.length)
      }, 0)
    } else {
      setForm(prev => ({ ...prev, body: prev.body + key }))
    }
  }

  return (
    <>
      <HowItWorksBanner type={type} />

      {/* Table header */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        {userCanEdit && (
          <Button size="sm" onClick={openAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Template Name</TableHead>
              <TableHead className="text-left">Subject</TableHead>
              <TableHead className="text-center w-24">Default</TableHead>
              <TableHead className="text-center w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No templates yet — click "Add Template" to create one.
                </TableCell>
              </TableRow>
            ) : (
              templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-left font-medium">
                    {t.name}
                    {t.isDefault && (
                      <Badge className="ml-2 bg-green-100 text-green-700 text-xs border-0">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-left text-sm text-muted-foreground max-w-xs truncate">
                    {t.subject}
                  </TableCell>
                  <TableCell className="text-center">
                    {t.isDefault ? (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 mx-auto" title="Default template" />
                    ) : (
                      userCanEdit && (
                        <button
                          onClick={() => setDefault(t.id)}
                          title="Set as default"
                          className="text-muted-foreground hover:text-yellow-500 mx-auto block transition-colors"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)} title="Preview & Edit">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {userCanEdit && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)} title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)} title="Duplicate">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(t)}
                            title="Delete"
                            disabled={t.isDefault && templates.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── Add / Edit Dialog with Live Preview ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ maxWidth: "960px", padding: "0", overflow: "hidden" }}>
          <div className="flex" style={{ minHeight: "560px", maxHeight: "88vh" }}>

            {/* Left: Form */}
            <div className="flex flex-col" style={{ width: "52%", borderRight: "1px solid #e5e7eb" }}>
              <div className="px-6 pt-6 pb-4 border-b">
                <h2 className="text-base font-semibold">
                  {editingTemplate ? "Edit Template" : "Add Template"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill in the fields — the preview updates live on the right.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Template Name */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Standard Invoice Email (English)"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    autoComplete="off"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    Email Subject <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Invoice {invoiceNumber} — Payment Due {dueDate}"
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    autoComplete="off"
                    className={errors.subject ? "border-red-500" : ""}
                  />
                  {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    Email Body <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    ref={el => setBodyRef(el)}
                    placeholder="Type your email content here. Use the variable buttons below to insert dynamic data automatically."
                    value={form.body}
                    onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                    className={`font-mono text-sm resize-none ${errors.body ? "border-red-500" : ""}`}
                    style={{ minHeight: "200px" }}
                  />
                  {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
                </div>

                {/* Variables */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Insert Variables into Body</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Click a variable to insert it at your cursor. It will be replaced with real data when the email is sent.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {variables.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="flex flex-col items-start bg-white border border-gray-200 rounded-md px-2.5 py-2 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                        title={`Example: ${v.example}`}
                      >
                        <span className="text-xs font-medium text-gray-800 leading-tight">{v.label}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{v.key}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 px-6 py-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingTemplate ? "Save Changes" : "Add Template"}</Button>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="flex flex-col bg-gray-50" style={{ width: "48%" }}>
              <div className="px-6 pt-6 pb-4 border-b bg-white">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Preview</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Updates as you type — using sample data</p>
              </div>
              <div className="flex-1 overflow-hidden px-5 py-4">
                <EmailPreview
                  subject={form.subject}
                  body={form.body}
                  sample={sampleData}
                />
              </div>
              {/* Sample data reference */}
              <div className="px-5 py-3 border-t bg-white">
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">Sample data used in preview:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {variables.map(v => (
                    <div key={v.key} className="flex gap-1 text-[10px]">
                      <span className="text-gray-400 font-mono shrink-0">{v.key}</span>
                      <span className="text-gray-500">→ {sampleData[v.key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InvoiceReceiptTemplate() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const confirmDialog = useConfirmDialog()

  return (
    <div className="p-6 space-y-6">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
      />

      <div>
        <h1 className="text-2xl font-bold">{t("menu.invoiceReceiptTemplate")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage email templates sent to parents with invoices and receipts
        </p>
      </div>

      <Tabs defaultValue="invoice">
        <TabsList>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoice Template
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Receipt Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Email Templates</CardTitle>
              <CardDescription>
                Templates used when sending invoices to parents by email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePanel
                storageKey="emailTemplates:invoice"
                defaultTemplates={DEFAULT_INVOICE_TEMPLATES}
                variables={INVOICE_VARIABLES}
                sampleData={INVOICE_SAMPLE}
                type="invoice"
                userCanEdit={userCanEdit}
                confirmDialog={confirmDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Email Templates</CardTitle>
              <CardDescription>
                Templates used when sending receipts to parents by email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePanel
                storageKey="emailTemplates:receipt"
                defaultTemplates={DEFAULT_RECEIPT_TEMPLATES}
                variables={RECEIPT_VARIABLES}
                sampleData={RECEIPT_SAMPLE}
                type="receipt"
                userCanEdit={userCanEdit}
                confirmDialog={confirmDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
