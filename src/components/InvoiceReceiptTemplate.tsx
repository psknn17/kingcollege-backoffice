import { useState } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { Plus, Edit, Trash2, Eye, Star, FileText, Receipt, Copy, Info, ChevronRight, ArrowLeft } from "lucide-react"
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

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorksBanner({ type }: { type: "invoice" | "receipt" }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5">
      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="space-y-1 text-xs text-blue-700">
        <p className="font-semibold text-blue-800 text-sm">How it works</p>
        <p>
          1. Create a template and set it as <strong>Default</strong>{" "}
          <Star className="w-3 h-3 inline text-yellow-500 fill-yellow-400" />
        </p>
        <p>
          2. When a staff member sends a{" "}
          {type === "invoice" ? "invoice" : "receipt"} email, the system automatically uses the Default template.
        </p>
        <p>
          3. The template is personalised for each parent — e.g. "Dear{" "}
          <strong>Mr. Robert Smith</strong>" — using the student's real data.
        </p>
      </div>
    </div>
  )
}

// ─── Email Preview ────────────────────────────────────────────────────────────

function EmailPreviewContent({
  subject,
  body,
  sample,
}: {
  subject: string
  body: string
  sample: Record<string, string>
}) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden text-sm">
      {/* Email client-style header */}
      <div className="bg-gray-50 border-b px-5 py-3 space-y-2">
        <div className="flex gap-3">
          <span className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5">To:</span>
          <span className="text-xs text-gray-700">parent@example.com</span>
        </div>
        <div className="flex gap-3">
          <span className="text-xs text-muted-foreground w-14 shrink-0 pt-0.5">Subject:</span>
          <span className="text-sm font-semibold text-gray-900 leading-snug">
            {subject ? applyVariables(subject, sample) : <span className="text-gray-300 font-normal">No subject</span>}
          </span>
        </div>
      </div>
      {/* Email body */}
      <div className="px-5 py-5 min-h-48">
        {body ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
            {applyVariables(body, sample)}
          </pre>
        ) : (
          <p className="text-muted-foreground italic text-sm">No content yet.</p>
        )}
      </div>
    </div>
  )
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────

interface EditDialogProps {
  open: boolean
  onClose: () => void
  editingTemplate: EmailTemplate | null
  variables: typeof INVOICE_VARIABLES
  sampleData: Record<string, string>
  onSave: (form: { name: string; subject: string; body: string }) => void
}

function EditDialog({ open, onClose, editingTemplate, variables, sampleData, onSave }: EditDialogProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit")
  const [form, setForm] = useState({ name: "", subject: "", body: "" })
  const [errors, setErrors] = useState<{ name?: string; subject?: string; body?: string }>({})
  const [bodyRef, setBodyRef] = useState<HTMLTextAreaElement | null>(null)

  // Sync form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setForm(editingTemplate
        ? { name: editingTemplate.name, subject: editingTemplate.subject, body: editingTemplate.body }
        : { name: "", subject: "", body: "" }
      )
      setErrors({})
      setTab("edit")
    } else {
      onClose()
    }
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
    if (!validate()) { setTab("edit"); return }
    onSave(form)
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ maxWidth: "660px", padding: "0", overflow: "hidden" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <div>
            <DialogTitle className="text-base font-semibold">
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tab === "edit"
                ? "Fill in the template details, then click Preview to see how the email will look."
                : "This is how the email will look when sent to a parent (using sample data)."}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setTab("edit")}
              className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${
                tab === "edit" ? "bg-white shadow-sm text-gray-900" : "text-muted-foreground hover:text-gray-700"
              }`}
            >
              Edit
            </button>
            <button
              onClick={() => setTab("preview")}
              className={`text-xs px-3 py-1.5 rounded-sm font-medium transition-colors ${
                tab === "preview" ? "bg-white shadow-sm text-gray-900" : "text-muted-foreground hover:text-gray-700"
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* ── Edit Tab ── */}
        {tab === "edit" && (
          <div className="px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(88vh - 160px)" }}>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
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
              <Label className="text-sm font-medium">
                Email Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Invoice for James Smith — Payment Due 31/01/2026"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                autoComplete="off"
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Email Body <span className="text-red-500">*</span>
              </Label>
              <Textarea
                ref={el => setBodyRef(el)}
                placeholder="Write the email content here..."
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                className={`font-mono text-sm resize-none ${errors.body ? "border-red-500" : ""}`}
                style={{ minHeight: "220px" }}
              />
              {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
            </div>

            {/* Auto-fill variables */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-800">Auto-fill variables</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click a button to insert it into the body. When the email is sent, it will be
                  automatically replaced with the real student data.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    title={`Example: ${v.example}`}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-3 py-1.5 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-800">{v.label}</span>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{v.example}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: Click <strong>Preview</strong> at the top to see how the email will look with real data filled in.
              </p>
            </div>
          </div>
        )}

        {/* ── Preview Tab ── */}
        {tab === "preview" && (
          <div className="px-6 py-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(88vh - 160px)" }}>
            <EmailPreviewContent subject={form.subject} body={form.body} sample={sampleData} />
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {variables.map(v => (
                <span key={v.key} className="text-[11px] text-muted-foreground">
                  <span className="font-medium text-gray-500">{v.label}:</span>{" "}
                  <span className="text-gray-700">{sampleData[v.key]}</span>
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              Sample data shown above — actual email will use real student & invoice data.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-white">
          {tab === "preview" ? (
            <Button variant="ghost" size="sm" onClick={() => setTab("edit")} className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Edit
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>{editingTemplate ? "Save Changes" : "Add Template"}</Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
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

  const openAdd = () => { setEditingTemplate(null); setIsDialogOpen(true) }
  const openEdit = (t: EmailTemplate) => { setEditingTemplate(t); setIsDialogOpen(true) }

  const setDefault = (id: string) => {
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })))
    toast.success("Default template updated")
  }

  const handleDuplicate = (t: EmailTemplate) => {
    setTemplates(prev => [
      ...prev,
      { ...t, id: `tpl-${Date.now()}`, name: `${t.name} (Copy)`, isDefault: false, createdAt: new Date().toISOString() },
    ])
    toast.success("Template duplicated")
  }

  const handleSave = (form: { name: string; subject: string; body: string }) => {
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

  return (
    <>
      <HowItWorksBanner type={type} />

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
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 mx-auto" />
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

      <EditDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        editingTemplate={editingTemplate}
        variables={variables}
        sampleData={sampleData}
        onSave={handleSave}
      />
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
              <CardDescription>Templates used when sending invoices to parents by email</CardDescription>
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
              <CardDescription>Templates used when sending receipts to parents by email</CardDescription>
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
