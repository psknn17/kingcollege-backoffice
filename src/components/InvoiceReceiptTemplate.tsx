import { useState, useMemo } from "react"
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
import { Plus, Edit, Trash2, Eye, Star, FileText, Receipt, Copy } from "lucide-react"
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

// ─── Defaults ────────────────────────────────────────────────────────────────

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

// ─── Placeholder Chips ────────────────────────────────────────────────────────

const INVOICE_PLACEHOLDERS = [
  { key: "{parentName}", label: "Parent Name" },
  { key: "{studentName}", label: "Student Name" },
  { key: "{studentId}", label: "Student ID" },
  { key: "{grade}", label: "Year Group" },
  { key: "{invoiceNumber}", label: "Invoice No." },
  { key: "{invoiceAmount}", label: "Amount" },
  { key: "{dueDate}", label: "Due Date" },
]

const RECEIPT_PLACEHOLDERS = [
  { key: "{parentName}", label: "Parent Name" },
  { key: "{studentName}", label: "Student Name" },
  { key: "{receiptNumber}", label: "Receipt No." },
  { key: "{receiptDate}", label: "Receipt Date" },
  { key: "{amount}", label: "Amount" },
  { key: "{paymentMethod}", label: "Payment Method" },
]

// ─── Sample preview data ──────────────────────────────────────────────────────

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

function applyPlaceholders(text: string, sample: Record<string, string>): string {
  return Object.entries(sample).reduce(
    (result, [key, val]) => result.replaceAll(key, val),
    text
  )
}

// ─── Template Panel (reused for both tabs) ───────────────────────────────────

interface TemplatePanelProps {
  storageKey: string
  defaultTemplates: EmailTemplate[]
  placeholders: typeof INVOICE_PLACEHOLDERS
  sampleData: Record<string, string>
  userCanEdit: boolean
  confirmDialog: ReturnType<typeof useConfirmDialog>
}

function TemplatePanel({
  storageKey,
  defaultTemplates,
  placeholders,
  sampleData,
  userCanEdit,
  confirmDialog,
}: TemplatePanelProps) {
  const [templates, setTemplates] = usePersistedState<EmailTemplate[]>(storageKey, defaultTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ name: "", subject: "", body: "" })
  const [errors, setErrors] = useState<{ name?: string; subject?: string; body?: string }>({})

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

  const openPreview = (t: EmailTemplate) => {
    setPreviewTemplate(t)
    setIsPreviewOpen(true)
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
    if (!form.name.trim()) errs.name = "Name is required"
    if (!form.subject.trim()) errs.subject = "Subject is required"
    if (!form.body.trim()) errs.body = "Body is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (editingTemplate) {
      setTemplates(prev =>
        prev.map(t => t.id === editingTemplate.id ? { ...t, ...form } : t)
      )
      toast.success("Template updated")
    } else {
      const isFirst = templates.length === 0
      setTemplates(prev => [
        ...prev,
        {
          id: `tpl-${Date.now()}`,
          ...form,
          isDefault: isFirst,
          createdAt: new Date().toISOString(),
        },
      ])
      toast.success("Template added")
    }
    setIsDialogOpen(false)
  }

  const handleDelete = (t: EmailTemplate) => {
    confirmDialog.confirm(() => {
      setTemplates(prev => {
        const updated = prev.filter(x => x.id !== t.id)
        if (t.isDefault && updated.length > 0) {
          updated[0].isDefault = true
        }
        return updated
      })
      toast.success("Template deleted")
    })
  }

  const insertPlaceholder = (key: string) => {
    setForm(prev => ({ ...prev, body: prev.body + key }))
  }

  return (
    <>
      <div className="space-y-4">
        {/* Table */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
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
                <TableHead className="text-center">Default</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No templates yet. Click "Add Template" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-left font-medium">
                      {t.name}
                      {t.isDefault && (
                        <Badge className="ml-2 bg-green-100 text-green-700 text-xs">Default</Badge>
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
                        <Button variant="ghost" size="sm" onClick={() => openPreview(t)} title="Preview">
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ maxWidth: "680px", padding: "24px" }}>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Add Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Template Name <span className="text-red-500">*</span></Label>
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
              <Label>Subject <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Invoice {invoiceNumber} — Payment Due {dueDate}"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                autoComplete="off"
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
            </div>

            {/* Placeholder chips */}
            <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              <p className="text-xs font-medium text-blue-700 mb-1.5">Insert placeholder into body:</p>
              <div className="flex flex-wrap gap-1.5">
                {placeholders.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    className="text-xs bg-white border border-blue-300 text-blue-700 rounded px-2 py-0.5 hover:bg-blue-100 font-mono"
                  >
                    {p.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label>Body <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Write your email body here..."
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                className={`min-h-48 font-mono text-sm resize-y ${errors.body ? "border-red-500" : ""}`}
              />
              {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingTemplate ? "Save Changes" : "Add Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent style={{ maxWidth: "620px", padding: "24px" }}>
          <DialogHeader>
            <DialogTitle>Preview — {previewTemplate?.name}</DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-3">
              <div className="bg-gray-50 border rounded-md p-4 space-y-2">
                <div className="flex gap-2 text-sm">
                  <span className="font-medium text-muted-foreground w-16 shrink-0">Subject:</span>
                  <span>{applyPlaceholders(previewTemplate.subject, sampleData)}</span>
                </div>
                <hr />
                <div className="flex gap-2 text-sm">
                  <span className="font-medium text-muted-foreground w-16 shrink-0">Body:</span>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {applyPlaceholders(previewTemplate.body, sampleData)}
                  </pre>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Preview uses sample data. Actual email will use real student/invoice data.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
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
                placeholders={INVOICE_PLACEHOLDERS}
                sampleData={INVOICE_SAMPLE}
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
                placeholders={RECEIPT_PLACEHOLDERS}
                sampleData={RECEIPT_SAMPLE}
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
