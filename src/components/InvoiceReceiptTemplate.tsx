import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import {
  Plus, Eye, Star, FileText, Receipt, Trash2, Edit, MoreHorizontal, Copy,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "./ui/dropdown-menu"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import {
  type EmailTemplate,
  migrateTemplates,
  saveTemplates,
  getVariablesForType,
  getSampleForType,
  renderTemplate,
} from "@/utils/emailTemplateUtils"

// ─── Email Preview Content ───────────────────────────────────────────────────

function EmailPreviewContent({
  subject,
  body,
  sample,
}: {
  subject: string
  body: string
  sample: Record<string, string>
}) {
  const subjectResult = renderTemplate(subject, sample)
  const bodyResult = renderTemplate(body, sample)

  return (
    <div className="rounded-lg border bg-white overflow-hidden text-sm">
      <div className="bg-gray-50 border-b px-6 py-4 space-y-2">
        <div className="flex gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">To:</span>
          <span className="text-xs text-gray-700">parent@example.com</span>
        </div>
        <div className="flex gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">Subject:</span>
          <span className="text-sm font-semibold text-gray-900 leading-snug">
            {subject ? (
              <span dangerouslySetInnerHTML={{ __html: highlightMissing(subjectResult) }} />
            ) : (
              <span className="text-gray-300 font-normal">No subject</span>
            )}
          </span>
        </div>
      </div>
      <div className="px-6 py-6 min-h-[200px]">
        {body ? (
          <div
            className="text-sm leading-relaxed text-gray-800"
            dangerouslySetInnerHTML={{ __html: highlightMissing(bodyResult) }}
          />
        ) : (
          <p className="text-muted-foreground italic text-sm">No content yet.</p>
        )}
      </div>
    </div>
  )
}

function highlightMissing(result: { rendered: string; missingVars: string[]; unknownVars: string[] }): string {
  let html = escapeHtml(result.rendered)
  for (const v of result.missingVars) {
    const label = v.replace(/[{}]/g, "")
    html = html.replace(
      escapeHtml(v),
      `<span class="bg-red-100 text-red-700 px-1 rounded text-xs font-medium">[Missing: ${label}]</span>`
    )
  }
  for (const v of result.unknownVars) {
    const label = v.replace(/[{}]/g, "")
    html = html.replace(
      escapeHtml(v),
      `<span class="bg-yellow-100 text-yellow-700 px-1 rounded text-xs font-medium">[Unknown: ${label}]</span>`
    )
  }
  html = html.replace(/\n/g, "<br>")
  return html
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// ─── Preview Dialog ──────────────────────────────────────────────────────────

function PreviewDialog({
  open,
  onClose,
  template,
}: {
  open: boolean
  onClose: () => void
  template: EmailTemplate | null
}) {
  if (!template) return null
  const sample = getSampleForType(template.type)

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent style={{ maxWidth: "780px" }} className="p-8">
        <DialogHeader>
          <DialogTitle>Email Preview — {template.name}</DialogTitle>
          <DialogDescription>
            This is how the email will appear to parents (using sample data).
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <EmailPreviewContent subject={template.subject} body={template.body} sample={sample} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit / New Template Dialog ──────────────────────────────────────────────

export function EditTemplateDialog({
  open,
  onClose,
  template,
  templateType,
  onSave,
}: {
  open: boolean
  onClose: () => void
  template: EmailTemplate | null
  templateType: "invoice" | "receipt"
  onSave: (form: { name: string; subject: string; body: string }) => void
}) {
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editTab, setEditTab] = useState<"edit" | "preview">("edit")

  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const isInvoice = templateType === "invoice"
  const variables = getVariablesForType(templateType)
  const sample = getSampleForType(templateType)
  const placeholders = {
    name: isInvoice ? "Term 1 Tuition Invoice Email" : "Payment Confirmation Receipt Email",
    subject: isInvoice
      ? "Invoice {{invoiceNumber}} for {{studentName}} — Due {{dueDate}}"
      : "Receipt {{receiptNumber}} — Payment Confirmed for {{studentName}}",
    body: isInvoice
      ? "Dear {{parentName}},\n\nPlease find attached the invoice for {{studentName}} ({{grade}}).\n\nInvoice No.: {{invoiceNumber}}\nAmount: {{invoiceAmount}} THB\nDue Date: {{dueDate}}\n\nKindly arrange payment before the due date.\n\nBest regards,\n{{schoolName}}"
      : "Dear {{parentName}},\n\nThank you for your payment for {{studentName}} ({{grade}}).\n\nReceipt No.: {{receiptNumber}}\nAmount: {{amount}} THB\nPayment Method: {{paymentMethod}}\nDate: {{receiptDate}}\n\nPlease keep this receipt for your records.\n\nBest regards,\n{{schoolName}}",
  }

  const insertVariable = (key: string, target: "subject" | "body") => {
    if (target === "subject") {
      const el = subjectRef.current
      if (el) {
        const start = el.selectionStart ?? el.value.length
        const end = el.selectionEnd ?? el.value.length
        const newVal = el.value.slice(0, start) + key + el.value.slice(end)
        setSubject(newVal)
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + key.length, start + key.length) })
      } else {
        setSubject(prev => prev + key)
      }
    } else {
      const el = bodyRef.current
      if (el) {
        const start = el.selectionStart ?? el.value.length
        const end = el.selectionEnd ?? el.value.length
        const newVal = el.value.slice(0, start) + key + el.value.slice(end)
        setBody(newVal)
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + key.length, start + key.length) })
      } else {
        setBody(prev => prev + key)
      }
    }
  }

  // Sync form when dialog opens
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name)
        setSubject(template.subject)
        setBody(template.body)
      } else {
        setName("")
        setSubject("")
        setBody("")
      }
      setErrors({})
      setEditTab("edit")
    }
  }, [open, template])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Template name is required"
    if (!subject.trim()) errs.subject = "Subject is required"
    if (!body.trim()) errs.body = "Email body is required"
    setErrors(errs)
    const valid = Object.keys(errs).length === 0
    if (!valid) setEditTab("edit")
    return valid
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ name: name.trim(), subject: subject.trim(), body: body.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent style={{ maxWidth: "580px" }} className="p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        {/* Name — always visible */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Template Name <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder={placeholders.name}
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="off"
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Edit / Preview tabs */}
        <div className="flex items-center gap-1 border-b">
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "edit" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setEditTab("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === "preview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setEditTab("preview")}
          >
            Preview
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {editTab === "edit" ? (
            <div className="space-y-4">
              {/* Subject */}
              <div className="rounded-lg border p-4 space-y-3">
                <Label className="text-sm font-semibold">
                  Email Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  ref={subjectRef}
                  placeholder={placeholders.subject}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  autoComplete="off"
                  className={errors.subject ? "border-red-500" : ""}
                />
                {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Click to insert variable</p>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => insertVariable(v.key, "subject")}
                        title={`Insert ${v.label} (e.g. ${v.example})`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="rounded-lg border p-4 space-y-3">
                <Label className="text-sm font-semibold">
                  Email Body <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  ref={bodyRef}
                  placeholder={placeholders.body}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className={`text-sm resize-none ${errors.body ? "border-red-500" : ""}`}
                  rows={10}
                />
                {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Click to insert variable</p>
                  <div className="flex flex-wrap gap-1.5">
                    {variables.map(v => (
                      <button
                        key={v.key}
                        type="button"
                        className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => insertVariable(v.key, "body")}
                        title={`Insert ${v.label} (e.g. ${v.example})`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmailPreviewContent subject={subject || placeholders.subject} body={body || placeholders.body} sample={sample} />
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{template ? "Save Changes" : "Create Template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Template Panel ──────────────────────────────────────────────────────────

interface TemplatePanelProps {
  type: "invoice" | "receipt"
  templates: EmailTemplate[]
  setTemplates: (fn: (prev: EmailTemplate[]) => EmailTemplate[]) => void
  userCanEdit: boolean
  confirmDialog: ReturnType<typeof useConfirmDialog>
}

function TemplatePanel({
  type,
  templates,
  setTemplates,
  userCanEdit,
  confirmDialog,
}: TemplatePanelProps) {
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  const { user } = useAuth()
  const currentUser = user?.username || user?.name || "Staff"
  const filtered = templates.filter(t => t.type === type)

  const openNew = () => { setEditingTemplate(null); setEditDialogOpen(true) }
  const openEdit = (t: EmailTemplate) => { setEditingTemplate(t); setEditDialogOpen(true) }

  const handleSetDefault = (t: EmailTemplate) => {
    setTemplates(prev =>
      prev.map(x => {
        if (x.type === type) {
          return { ...x, isDefault: x.id === t.id }
        }
        return x
      })
    )
    toast.success("Default template updated")
  }

  const handleDuplicate = (t: EmailTemplate) => {
    const now = new Date().toISOString()
    setTemplates(prev => [...prev, {
      ...t,
      id: `tpl-${Date.now()}`,
      name: `${t.name} (Copy)`,
      isDefault: false,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }])
    toast.success("Template duplicated")
  }

  const handleDelete = (t: EmailTemplate) => {
    confirmDialog.confirm(() => {
      setTemplates(prev => {
        const updated = prev.filter(x => x.id !== t.id)
        // Auto-promote if the deleted one was default
        if (t.isDefault) {
          const sameType = updated.filter(x => x.type === t.type && x.status === "active")
          if (sameType.length > 0) {
            const idx = updated.findIndex(x => x.id === sameType[0].id)
            if (idx >= 0) updated[idx] = { ...updated[idx], isDefault: true }
          }
        }
        return updated
      })
      toast.success("Template deleted")
    })
  }

  const handleSave = (form: { name: string; subject: string; body: string }) => {
    const now = new Date().toISOString()
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => {
        if (t.id !== editingTemplate.id) return t
        return {
          ...t,
          ...form,
          updatedAt: now,
          createdBy: currentUser,
          version: t.version + 1,
        }
      }))
      toast.success("Template updated")
    } else {
      const isFirst = filtered.length === 0
      setTemplates(prev => [...prev, {
        id: `tpl-${Date.now()}`,
        ...form,
        type,
        language: "en" as const,
        isDefault: isFirst,
        status: "active" as const,
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser,
        version: 1,
      }])
      toast.success("Template created")
    }
    setEditDialogOpen(false)
  }

  return (
    <>
      {/* Header row */}
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-muted-foreground">
          {filtered.length} template{filtered.length !== 1 ? "s" : ""}
        </p>
        {userCanEdit && (
          <Button size="sm" onClick={openNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        )}
      </div>

      {/* Template list */}
      <div className="rounded-lg border divide-y">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-6 text-sm text-muted-foreground">
            No templates yet — click "New Template" to create one.
          </div>
        ) : (
          filtered.map(t => {
            const sample = getSampleForType(type)
            const renderedSubject = renderTemplate(t.subject, sample).rendered
            const updatedDate = new Date(t.updatedAt)
            const formattedDate = updatedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

            return (
              <div key={t.id} className="px-6 py-4 space-y-1.5">
                {/* Row 1: name + badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{t.name}</span>
                  {t.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800 shrink-0">
                      <Star className="w-3 h-3 fill-yellow-500" />
                      Default
                    </span>
                  )}
                </div>
                {/* Row 2: subject preview */}
                <p className="text-xs text-muted-foreground truncate">
                  {renderedSubject}
                </p>
                {/* Row 3: metadata + actions */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground/70">
                    Last updated {formattedDate}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setPreviewTemplate(t)}>
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Preview
                    </Button>
                    {userCanEdit && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => openEdit(t)}>
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDuplicate(t)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            {!t.isDefault && (
                              <DropdownMenuItem onClick={() => handleSetDefault(t)}>
                                <Star className="w-4 h-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(t)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Dialogs */}
      <PreviewDialog
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
      />
      <EditTemplateDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        template={editingTemplate}
        templateType={type}
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

  const [templates, setTemplatesRaw] = useState<EmailTemplate[]>([])

  useEffect(() => {
    const migrated = migrateTemplates()
    setTemplatesRaw(migrated)
  }, [])

  const setTemplates = (fn: (prev: EmailTemplate[]) => EmailTemplate[]) => {
    setTemplatesRaw(prev => {
      const next = fn(prev)
      saveTemplates(next)
      return next
    })
  }

  return (
    <div className="p-6 space-y-6">
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        onConfirm={confirmDialog.handleConfirm}
        titleKey="Delete Template"
        descriptionKey="Are you sure you want to delete this template? This action cannot be undone."
        variant="destructive"
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
            Invoice Templates
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Receipt Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-6">
          <Card>
            <CardHeader className="!px-8 !py-5">
              <CardTitle>Invoice Email Templates</CardTitle>
              <CardDescription>Templates used when sending invoices to parents by email</CardDescription>
            </CardHeader>
            <CardContent className="!px-8 !pb-8">
              <TemplatePanel
                type="invoice"
                templates={templates}
                setTemplates={setTemplates}
                userCanEdit={userCanEdit}
                confirmDialog={confirmDialog}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="mt-6">
          <Card>
            <CardHeader className="!px-8 !py-5">
              <CardTitle>Receipt Email Templates</CardTitle>
              <CardDescription>Templates used when sending receipts to parents by email</CardDescription>
            </CardHeader>
            <CardContent className="!px-8 !pb-8">
              <TemplatePanel
                type="receipt"
                templates={templates}
                setTemplates={setTemplates}
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
