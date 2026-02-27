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
import { Plus, Edit, Trash2, Eye, Star, FileText, Receipt, Copy, Info } from "lucide-react"
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

// ─── Placeholder definitions ──────────────────────────────────────────────────

const INVOICE_PLACEHOLDERS = [
  { key: "{parentName}",    label: "Parent Name",    example: "Mr. Robert Smith" },
  { key: "{studentName}",   label: "Student Name",   example: "James Smith" },
  { key: "{studentId}",     label: "Student ID",     example: "KC2025001" },
  { key: "{grade}",         label: "Year Group",     example: "Year 7" },
  { key: "{invoiceNumber}", label: "Invoice No.",    example: "2025INV-000123" },
  { key: "{invoiceAmount}", label: "Amount",         example: "130,000" },
  { key: "{dueDate}",       label: "Due Date",       example: "31/01/2026" },
]

const RECEIPT_PLACEHOLDERS = [
  { key: "{parentName}",    label: "Parent Name",    example: "Mr. Robert Smith" },
  { key: "{studentName}",   label: "Student Name",   example: "James Smith" },
  { key: "{receiptNumber}", label: "Receipt No.",    example: "R2025-00456" },
  { key: "{receiptDate}",   label: "Receipt Date",   example: "28/02/2026" },
  { key: "{amount}",        label: "Amount",         example: "130,000" },
  { key: "{paymentMethod}", label: "Payment Method", example: "Bank Transfer" },
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

// ─── How it works banner ──────────────────────────────────────────────────────

function HowItWorksBanner({ type }: { type: "invoice" | "receipt" }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5">
      <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-blue-800 mb-1">วิธีใช้งาน</p>
        <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside leading-relaxed">
          <li>สร้าง Template และกำหนดเนื้อหาอีเมลตามที่ต้องการ</li>
          <li>
            คลิก <Star className="w-3 h-3 inline text-yellow-500 fill-yellow-400" /> เพื่อตั้ง Template เป็น{" "}
            <span className="font-semibold">Default</span> — ระบบจะใช้ Template นี้เมื่อส่งอีเมล{type === "invoice" ? " Invoice" : " Receipt"}
          </li>
          <li>
            ตัวแปร เช่น <code className="bg-blue-100 px-1 rounded text-[11px]">{"{studentName}"}</code> จะถูกแทนที่ด้วยข้อมูลจริงโดยอัตโนมัติเมื่อส่งอีเมล
          </li>
        </ol>
      </div>
    </div>
  )
}

// ─── Template Panel ───────────────────────────────────────────────────────────

interface TemplatePanelProps {
  storageKey: string
  defaultTemplates: EmailTemplate[]
  placeholders: typeof INVOICE_PLACEHOLDERS
  sampleData: Record<string, string>
  type: "invoice" | "receipt"
  userCanEdit: boolean
  confirmDialog: ReturnType<typeof useConfirmDialog>
}

function TemplatePanel({
  storageKey,
  defaultTemplates,
  placeholders,
  sampleData,
  type,
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

  const openPreview = (t: EmailTemplate) => {
    setPreviewTemplate(t)
    setIsPreviewOpen(true)
  }

  const setDefault = (id: string) => {
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })))
    toast.success("ตั้ง Default template เรียบร้อยแล้ว")
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
    toast.success("คัดลอก Template เรียบร้อยแล้ว")
  }

  const validate = () => {
    const errs: typeof errors = {}
    if (!form.name.trim()) errs.name = "กรุณากรอกชื่อ Template"
    if (!form.subject.trim()) errs.subject = "กรุณากรอก Subject"
    if (!form.body.trim()) errs.body = "กรุณากรอกเนื้อหาอีเมล"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (editingTemplate) {
      setTemplates(prev =>
        prev.map(t => t.id === editingTemplate.id ? { ...t, ...form } : t)
      )
      toast.success("อัปเดต Template เรียบร้อยแล้ว")
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
      toast.success("เพิ่ม Template เรียบร้อยแล้ว")
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
      toast.success("ลบ Template เรียบร้อยแล้ว")
    })
  }

  // Insert placeholder at cursor position in body textarea
  const insertPlaceholder = (key: string) => {
    if (bodyRef) {
      const start = bodyRef.selectionStart ?? form.body.length
      const end = bodyRef.selectionEnd ?? form.body.length
      const newBody = form.body.slice(0, start) + key + form.body.slice(end)
      setForm(prev => ({ ...prev, body: newBody }))
      // Restore cursor after insertion
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

      <div className="space-y-4">
        <div className="flex justify-between items-center">
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
                    ยังไม่มี Template — คลิก "Add Template" เพื่อสร้าง
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
                            title="ตั้งเป็น Default"
                            className="text-muted-foreground hover:text-yellow-500 mx-auto block transition-colors"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openPreview(t)} title="ดูตัวอย่าง">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {userCanEdit && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(t)} title="แก้ไข">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDuplicate(t)} title="คัดลอก">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(t)}
                              title="ลบ"
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

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ maxWidth: "700px", padding: "24px" }}>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "แก้ไข Template" : "เพิ่ม Template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Template Name */}
            <div className="space-y-1.5">
              <Label>ชื่อ Template <span className="text-red-500">*</span></Label>
              <Input
                placeholder="เช่น Standard Invoice Email (English)"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                autoComplete="off"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label>
                หัวเรื่องอีเมล (Subject) <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="เช่น Invoice {invoiceNumber} — กำหนดชำระ {dueDate}"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                autoComplete="off"
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <Label>
                เนื้อหาอีเมล (Body) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                ref={el => setBodyRef(el)}
                placeholder="พิมพ์เนื้อหาอีเมล และใช้ตัวแปรด้านล่างแทรกข้อมูลอัตโนมัติ..."
                value={form.body}
                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                className={`min-h-52 font-mono text-sm resize-y ${errors.body ? "border-red-500" : ""}`}
              />
              {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
            </div>

            {/* Variable chips — placed below body so user understands they go INTO body */}
            <div className="border rounded-md p-3 bg-gray-50 space-y-2">
              <div>
                <p className="text-xs font-semibold text-gray-700">ตัวแปรที่ใช้ได้ — คลิกเพื่อแทรกลงในเนื้อหา</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  ระบบจะแทนที่ตัวแปรด้วยข้อมูลจริงโดยอัตโนมัติเมื่อส่งอีเมล
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {placeholders.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    className="flex flex-col items-start bg-white border border-gray-200 rounded-md px-2.5 py-1.5 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                    title={`ตัวอย่าง: ${p.example}`}
                  >
                    <span className="text-xs font-medium text-gray-800 leading-tight">{p.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono leading-tight">{p.key}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave}>{editingTemplate ? "บันทึก" : "เพิ่ม Template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Preview Dialog ─── */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent style={{ maxWidth: "640px", padding: "24px" }}>
          <DialogHeader>
            <DialogTitle>ตัวอย่างอีเมล — {previewTemplate?.name}</DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-3">
              <div className="rounded-md border bg-white overflow-hidden">
                {/* Subject bar */}
                <div className="bg-gray-50 border-b px-4 py-2.5 flex gap-3 text-sm">
                  <span className="text-muted-foreground font-medium w-16 shrink-0">Subject:</span>
                  <span className="font-medium">{applyPlaceholders(previewTemplate.subject, sampleData)}</span>
                </div>
                {/* Body */}
                <div className="px-4 py-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                    {applyPlaceholders(previewTemplate.body, sampleData)}
                  </pre>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                ตัวอย่างนี้ใช้ข้อมูลสมมติ — เมื่อส่งจริงจะใช้ข้อมูลของนักเรียน/ผู้ปกครองจริง
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>ปิด</Button>
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
        title="ลบ Template"
        description="ต้องการลบ Template นี้ใช่หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้"
      />

      <div>
        <h1 className="text-2xl font-bold">{t("menu.invoiceReceiptTemplate")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          จัดการ Template อีเมลสำหรับส่ง Invoice และ Receipt ให้ผู้ปกครอง
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
                Template อีเมลสำหรับส่ง Invoice ให้ผู้ปกครอง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePanel
                storageKey="emailTemplates:invoice"
                defaultTemplates={DEFAULT_INVOICE_TEMPLATES}
                placeholders={INVOICE_PLACEHOLDERS}
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
                Template อีเมลสำหรับส่ง Receipt ให้ผู้ปกครอง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePanel
                storageKey="emailTemplates:receipt"
                defaultTemplates={DEFAULT_RECEIPT_TEMPLATES}
                placeholders={RECEIPT_PLACEHOLDERS}
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
