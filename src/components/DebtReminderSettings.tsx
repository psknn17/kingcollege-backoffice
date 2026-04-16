import { useState, useMemo, useRef } from "react"
import ReactQuill from "react-quill-new"
import "react-quill-new/dist/quill.snow.css"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { cn } from "./ui/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { PaginationBar } from "./ui/pagination-bar"
import { Save, Bell, Plus, Trash2, Mail, CalendarIcon, Settings, Send, ChevronDown, Eye, XCircle, CheckCircle2, FileText, Clock as ClockIcon, Edit, Copy, Search, Filter, ArrowUpDown, Users } from "lucide-react"
import { format } from "date-fns"
import { formatAcademicYear } from "@/utils/xlsxUtils"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { toast } from "@/components/ui/sonner"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { logActivity } from "@/lib/activityLog"

interface DebtReminderTemplate {
  id: string
  name: string
  description: string
  subject: string
  emailTitle: string
  message: string
}

/* ── Minimal Quill config: font-size + bold + italic only ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QuillSize = ReactQuill.Quill.import("attributors/style/size") as any
QuillSize.whitelist = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"]
ReactQuill.Quill.register(QuillSize, true)

const FONT_SIZE_OPTIONS = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"]

const QUILL_FORMATS = ["size", "bold", "italic"]

/** Custom toolbar rendered as plain HTML — Quill binds to id */
function CustomToolbar({ id }: { id: string }) {
  return (
    <div id={id} className="ql-toolbar ql-snow" style={{ borderRadius: "0.5rem 0.5rem 0 0", background: "var(--muted)", borderColor: "var(--border)", padding: "6px 8px" }}>
      <span className="ql-formats">
        <select className="ql-size" defaultValue="">
          {FONT_SIZE_OPTIONS.map(s => (
            <option key={s} value={s === "14px" ? "" : s}>{s}</option>
          ))}
        </select>
      </span>
      <span className="ql-formats">
        <button className="ql-bold" />
        <button className="ql-italic" />
      </span>
    </div>
  )
}

function renderFormattedPreview(msg: string, sampleVars: Record<string, string>) {
  if (!msg || msg === "<p><br></p>") return null
  let html = msg
  for (const [key, val] of Object.entries(sampleVars)) {
    html = html.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"),
      `<span style="font-weight:600;color:#047857;background:#ecfdf5;padding:1px 4px;border-radius:4px">${val}</span>`)
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

const DEFAULT_REMINDER_TEMPLATES: DebtReminderTemplate[] = [
  {
    id: "tpl-first",
    name: "First Reminder",
    description: "Friendly first reminder for upcoming payment",
    subject: "Tuition Payment Reminder",
    emailTitle: "Friendly Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a friendly reminder that the tuition fee for <b>{student_name}</b> (ID: {student_id}, {year_group}) for {term}, Academic Year {academic_year} is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date} ({days_remaining} days remaining)<br><br>Please make your payment at your earliest convenience via the link below:<br>{payment_link}<br><br>If you have already made the payment, please disregard this email.<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-second",
    name: "Second Reminder",
    description: "Follow-up reminder for overdue payment",
    subject: "Tuition Payment Reminder",
    emailTitle: "Second Payment Reminder",
    message: "Dear {parent_name},<br><br>This is our second reminder regarding the outstanding payment for <b>{student_name}</b> (ID: {student_id}, {year_group}).<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Original Due Date:</b> {due_date}<br><b>Term:</b> {term}, Academic Year {academic_year}<br><br>We kindly ask you to settle this payment as soon as possible to avoid any disruption to your child's enrollment.<br><br>Pay online: {payment_link}<br><br>For any enquiries, please contact our Finance Office on +66 (0) 2481 9955.<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-final",
    name: "Final Notice",
    description: "Urgent final notice before action is taken",
    subject: "Urgent: Final Payment Notice",
    emailTitle: "Final Payment Notice",
    message: "Dear {parent_name},<br><br><b>This is a final notice</b> regarding the outstanding payment for <b>{student_name}</b> (ID: {student_id}, {year_group}).<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Original Due Date:</b> {due_date}<br><b>Term:</b> {term}, Academic Year {academic_year}<br><br>Please contact our Finance Office immediately to make payment arrangements. Failure to settle this balance may affect your child's enrollment status for the upcoming term.<br><br>Pay now: {payment_link}<br><br>This email was automatically generated. Please do not reply.<br>For further enquiries, please contact our Finance Office on +66 (0) 2481 9955.<br><br>Kind regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-overdue",
    name: "Overdue Notice",
    description: "Notice for payments that are already overdue",
    subject: "Overdue Payment Notice",
    emailTitle: "Overdue Payment Notice",
    message: "Dear {parent_name},<br><br>We wish to inform you that the following payment for <b>{student_name}</b> (ID: {student_id}, {year_group}) is now <b>overdue</b>.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Overdue:</b> {amount}<br><b>Due Date:</b> {due_date}<br><b>Term:</b> {term}, Academic Year {academic_year}<br><br>Please make immediate payment via: {payment_link}<br><br>If you are experiencing financial difficulties, please contact the Finance Office to discuss a payment plan.<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-eca",
    name: "ECA Payment Reminder",
    description: "Reminder for after-school / ECA activity fees",
    subject: "ECA Payment Reminder",
    emailTitle: "ECA Activity Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a reminder that the ECA (Extra-Curricular Activity) fee for <b>{student_name}</b> (ID: {student_id}, {year_group}) is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date}<br><b>Term:</b> {term}, Academic Year {academic_year}<br><br>Please make your payment via: {payment_link}<br><br>If you have already made the payment, please disregard this email.<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-trip",
    name: "Trip & Activity Payment",
    description: "Reminder for school trip and activity fees",
    subject: "Trip & Activity Payment Reminder",
    emailTitle: "Trip & Activity Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a reminder that the trip/activity fee for <b>{student_name}</b> (ID: {student_id}, {year_group}) is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date}<br><br>Please complete your payment before the deadline to secure your child's place.<br><br>Pay online: {payment_link}<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-bus",
    name: "School Bus Payment",
    description: "Reminder for school bus service fees",
    subject: "School Bus Payment Reminder",
    emailTitle: "School Bus Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a reminder that the school bus fee for <b>{student_name}</b> (ID: {student_id}, {year_group}) for {term}, Academic Year {academic_year} is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date}<br><br>Please make your payment via: {payment_link}<br><br>Failure to pay by the due date may result in suspension of the bus service.<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-exam",
    name: "Exam Payment Reminder",
    description: "Reminder for exam and assessment fees",
    subject: "Exam Payment Reminder",
    emailTitle: "Exam Fee Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a reminder that the exam/assessment fee for <b>{student_name}</b> (ID: {student_id}, {year_group}) is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date}<br><b>Term:</b> {term}, Academic Year {academic_year}<br><br>Please complete your payment before the deadline to ensure your child can sit the scheduled examination.<br><br>Pay online: {payment_link}<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-summer",
    name: "Summer Activity Payment",
    description: "Reminder for summer programme fees",
    subject: "Summer Activity Payment Reminder",
    emailTitle: "Summer Activity Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a reminder that the summer programme fee for <b>{student_name}</b> (ID: {student_id}, {year_group}) is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date}<br><b>Academic Year:</b> {academic_year}<br><br>Please make your payment before the deadline to confirm your child's place in the summer programme.<br><br>Pay online: {payment_link}<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-external",
    name: "External Invoice Reminder",
    description: "Reminder for external / miscellaneous invoices",
    subject: "External Invoice Payment Reminder",
    emailTitle: "External Invoice Payment Reminder",
    message: "Dear {parent_name},<br><br>This is a reminder that the following invoice for <b>{student_name}</b> (ID: {student_id}, {year_group}) is due.<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Due:</b> {amount}<br><b>Due Date:</b> {due_date}<br><br>Please make your payment via: {payment_link}<br><br>If you have already made the payment, please disregard this email.<br><br>Best regards,<br>Finance Office<br>{school_name}"
  },
  {
    id: "tpl-payment-confirm",
    name: "Payment Confirmation",
    description: "Confirmation email after payment is received",
    subject: "Payment Received — Thank You",
    emailTitle: "Payment Confirmation",
    message: "Dear {parent_name},<br><br>We are pleased to confirm that we have received your payment for <b>{student_name}</b> (ID: {student_id}, {year_group}).<br><br><b>Invoice No:</b> {invoice_number}<br><b>Amount Paid:</b> {amount}<br><b>Date of Payment:</b> {due_date}<br><b>Term:</b> {term}, Academic Year {academic_year}<br><br>This email serves as initial proof of payment. Kindly keep this email for your records.<br><br>Thank you for your continued support and cooperation.<br><br>This email was automatically generated. Please do not reply.<br>For further enquiries, please contact our Finance Office on +66 (0) 2481 9955.<br><br>Kind regards,<br>Finance Office<br>{school_name}"
  }
]

// Preset email subject options — synced with templates & system invoice categories
const PRESET_EMAIL_SUBJECTS = [
  "Tuition Payment Reminder",
  "ECA Payment Reminder",
  "Trip & Activity Payment Reminder",
  "Exam Payment Reminder",
  "Summer Activity Payment Reminder",
  "School Bus Payment Reminder",
  "External Invoice Payment Reminder",
  "Urgent: Final Payment Notice",
  "Overdue Payment Notice",
  "Payment Received — Thank You"
]

type InvoiceStatus = "unpaid" | "overdue"

const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
]

type ReminderStatus = "scheduled" | "reminded" | "cancelled"

interface ReminderConfig {
  id: string
  name: string
  academicYear: string // Academic year ID (e.g., "2024/2025")
  term: string // Term ID (e.g., "1", "2", "3")
  sendDate: string // Date string in YYYY-MM-DD format
  sendTime: string // Time string in HH:MM format (24-hour)
  method: "email"
  enabled: boolean
  subject: string
  emailTitle: string
  message: string
  invoiceStatuses: InvoiceStatus[]
  dueDateFilter?: string // ISO date string or "all"
  status: ReminderStatus
  scheduledAt?: string // ISO timestamp when scheduled
  sentAt?: string // ISO timestamp when sent
  recipientCount?: number // Number of recipients
}

// Helper function to format date for display
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "Not set"
  try {
    return format(new Date(dateStr), "dd MMMM yyyy")
  } catch {
    return dateStr
  }
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayString = (): string => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper function to validate date and time
const isDateTimeInPast = (dateStr: string, timeStr: string): boolean => {
  if (!dateStr || !timeStr) return false
  const now = new Date()
  const selectedDateTime = new Date(`${dateStr}T${timeStr}`)
  return selectedDateTime < now
}

const initialReminders: ReminderConfig[] = [
  {
    id: "1",
    name: "First Reminder",
    academicYear: "",
    term: "",
    sendDate: "",
    sendTime: "",
    method: "email",
    enabled: true,
    subject: "",
    emailTitle: "",
    message: "",
    invoiceStatuses: [],
    status: "scheduled"
  },
  {
    id: "2",
    name: "Second Reminder",
    academicYear: "",
    term: "",
    sendDate: "",
    sendTime: "",
    method: "email",
    enabled: true,
    subject: "",
    emailTitle: "",
    message: "",
    invoiceStatuses: [],
    status: "scheduled"
  },
  {
    id: "3",
    name: "Final Notice",
    academicYear: "",
    term: "",
    sendDate: "",
    sendTime: "",
    method: "email",
    enabled: true,
    subject: "",
    emailTitle: "",
    message: "",
    invoiceStatuses: [],
    status: "scheduled"
  }
]


// Interface for invoice email logs (shared with InvoiceManagement)
interface InvoiceEmailLog {
  id: string
  invoiceId: string
  invoiceNumber: string
  recipientEmail: string
  recipientName: string
  sentAt: string
  sentBy: string
  status: "sent" | "failed"
}

// Save reminder email to shared email logs
const saveReminderEmailLog = (subject: string, recipientCount: number) => {
  try {
    const existingLogs = localStorage.getItem("invoiceEmailLogs")
    const logs: InvoiceEmailLog[] = existingLogs ? JSON.parse(existingLogs) : []

    // Create log entry for the reminder email
    const newLog: InvoiceEmailLog = {
      id: `reminder-${Date.now()}`,
      invoiceId: `reminder-${Date.now()}`,
      invoiceNumber: `REMINDER-${Date.now()}`,
      recipientEmail: "multiple@recipients.com",
      recipientName: `${recipientCount} Recipients`,
      sentAt: new Date().toISOString(),
      sentBy: "admin@kingscollege.ac.th",
      status: "sent"
    }

    logs.push(newLog)
    localStorage.setItem("invoiceEmailLogs", JSON.stringify(logs))
  } catch (error) {
    console.error("Failed to save reminder email log:", error)
  }
}

export function DebtReminderSettings() {
  const { t } = useLanguage()
  const { academicYears } = useAcademicYears()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const cancelConfirm = useConfirmDialog()
  const [reminders, setReminders] = usePersistedState<ReminderConfig[]>("debt-reminder:reminders-v2", initialReminders)
  const [globalSettings, setGlobalSettings] = usePersistedState("debt-reminder:globalSettings", {
    enableReminders: true,
    fromEmail: "noreply@kingscollege.ac.th"
  })
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewReminder, setPreviewReminder] = useState<ReminderConfig | null>(null)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [reminderHistory, setReminderHistory] = useState<{ id: string; sentDate: string; subject: string; academicYear: string; term: string; recipients: number; status: string; message?: string }[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const historyPageSize = 10
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null)
  const [templatePickerDialog, setTemplatePickerDialog] = useState<{ isOpen: boolean; reminderId: string | null }>({ isOpen: false, reminderId: null })
  const [reminderTemplates, setReminderTemplates] = usePersistedState<DebtReminderTemplate[]>("debt-reminder:templates", DEFAULT_REMINDER_TEMPLATES)
  const [templateManageDialog, setTemplateManageDialog] = useState<{ isOpen: boolean; editing: DebtReminderTemplate | null }>({ isOpen: false, editing: null })
  const [isTemplateListOpen, setIsTemplateListOpen] = useState(false)

  // Send modal state
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendModalReminder, setSendModalReminder] = useState<ReminderConfig | null>(null)
  const [sendModalTab, setSendModalTab] = useState<string>("confirm")
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [sendInvoiceSearch, setSendInvoiceSearch] = useState("")
  const [isFinalConfirmOpen, setIsFinalConfirmOpen] = useState(false)
  const [isTestConfirmOpen, setIsTestConfirmOpen] = useState(false)
  const [sendMatchingInvoices, setSendMatchingInvoices] = useState<any[]>([])
  const [sendSelectedIds, setSendSelectedIds] = useState<Set<string>>(new Set())

  // Create/Edit reminder dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ReminderConfig | null>(null)

  // Table filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filterAcademicYear, setFilterAcademicYear] = useState("all")
  const [filterTerm, setFilterTerm] = useState("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // Sorting state
  const [sortField, setSortField] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = usePersistedState<number>("debt-reminder:pageSize", 10)

  // Get unique due dates from invoices filtered by reminder's academicYear, term, invoiceStatuses
  const getAvailableDueDates = (reminder: ReminderConfig): string[] => {
    try {
      const stored = localStorage.getItem("createdInvoices")
      if (!stored) return []
      const invoices: any[] = JSON.parse(stored)
      const dates = new Set<string>()

      // Normalize academic year: "2025/2026" -> "2025/2026"
      const normalizeYear = (y: string) => (y || "").replace("/", "-").trim()

      // Extract term number from any format: "Term 1", "2025-2026 - Term 1", "1", "term1"
      const extractTermNum = (t: string): string => {
        const m = (t || "").match(/[Tt]erm\s*(\d+)/)
        if (m) return m[1]
        const n = (t || "").match(/^\s*(\d+)\s*$/)
        if (n) return n[1]
        return ""
      }

      invoices.forEach(inv => {
        if (!inv.dueDate) return

        // Filter by academic year
        if (reminder.academicYear) {
          const ry = normalizeYear(reminder.academicYear)
          const iy = normalizeYear(inv.academicYear || "")
          if (iy && ry && ry !== iy) return
        }

        // Filter by term
        if (reminder.term) {
          const rt = extractTermNum(reminder.term)
          const it = extractTermNum(inv.term || "")
          if (rt && it && rt !== it) return
        }

        // Filter by invoice status
        const statuses = reminder.invoiceStatuses || []
        if (statuses.length > 0) {
          const invStatus = inv.status === "paid" ? "paid" : inv.status === "overdue" ? "overdue" : "unpaid"
          if (!statuses.includes(invStatus as InvoiceStatus)) return
        }

        const d = new Date(inv.dueDate)
        if (!isNaN(d.getTime())) dates.add(d.toISOString().split("T")[0])
      })
      return Array.from(dates).sort()
    } catch {
      return []
    }
  }
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", subject: "", emailTitle: "", message: "" })
  const reminderQuillRef = useRef<ReactQuill>(null)
  const templateQuillRef = useRef<ReactQuill>(null)
  const reminderEditorModules = useMemo(() => ({ toolbar: { container: "#reminder-toolbar" } }), [])
  const templateEditorModules = useMemo(() => ({ toolbar: { container: "#template-toolbar" } }), [])

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const reminderList = reminders || []

    const total = reminderList.length

    const scheduledReminders = reminderList.filter(r => r.status === "scheduled")

    const sentReminders = reminderList.filter(r => r.status === "reminded")

    const cancelledReminders = reminderList.filter(r => r.status === "cancelled")

    return {
      total,
      scheduledCount: scheduledReminders.length,
      sentCount: sentReminders.length,
      cancelledCount: cancelledReminders.length
    }
  }, [reminders])

  // Filtered and sorted reminders for table
  const filteredReminders = useMemo(() => {
    let result = [...(reminders || [])]

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(r =>
        r.name.toLowerCase().includes(lower) ||
        r.subject.toLowerCase().includes(lower) ||
        r.emailTitle.toLowerCase().includes(lower)
      )
    }

    // Academic Year filter
    if (filterAcademicYear !== "all") {
      result = result.filter(r => r.academicYear === filterAcademicYear)
    }

    // Term filter
    if (filterTerm !== "all") {
      result = result.filter(r => r.term === filterTerm)
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter(r => r.status === filterStatus)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "")
          break
        case "academicYear":
          cmp = (a.academicYear || "").localeCompare(b.academicYear || "")
          break
        case "term":
          cmp = (a.term || "").localeCompare(b.term || "")
          break
        case "sendDate":
          cmp = (a.sendDate || "").localeCompare(b.sendDate || "")
          break
        case "sendTime":
          cmp = (a.sendTime || "").localeCompare(b.sendTime || "")
          break
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "")
          break
        case "recipients":
          cmp = (a.recipientCount || 0) - (b.recipientCount || 0)
          break
        default:
          cmp = 0
      }
      return sortDirection === "asc" ? cmp : -cmp
    })

    return result
  }, [reminders, searchTerm, filterAcademicYear, filterTerm, filterStatus, sortField, sortDirection])

  // Paginated reminders
  const paginatedReminders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredReminders.slice(start, start + pageSize)
  }, [filteredReminders, currentPage, pageSize])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const addReminder = () => {
    const newReminder: ReminderConfig = {
      id: Date.now().toString(),
      name: "",
      academicYear: "",
      term: "",
      sendDate: "",
      sendTime: "",
      method: "email",
      enabled: true,
      subject: "",
      emailTitle: "",
      message: "",
      invoiceStatuses: [],
      status: "scheduled"
    }
    setEditingReminder(newReminder)
    setIsEditDialogOpen(true)
  }

  const openEditReminder = (reminder: ReminderConfig) => {
    setEditingReminder({ ...reminder })
    setIsEditDialogOpen(true)
  }

  const saveEditingReminder = () => {
    if (!editingReminder) return

    // Validate required fields
    if (!editingReminder.name.trim()) {
      toast.error("Please enter a reminder name")
      return
    }

    const exists = (reminders || []).find(r => r.id === editingReminder.id)
    if (exists) {
      // Update existing
      setReminders((current) =>
        (current || []).map(r => r.id === editingReminder.id ? editingReminder : r)
      )
      toast.success("Reminder updated")
      logActivity({ action: "Update Reminder", module: "Debt Reminders", detail: `Updated reminder: "${editingReminder.name}"` })
    } else {
      // Add new
      setReminders((current) => [...(current || []), editingReminder])
      toast.success("Reminder created")
      logActivity({ action: "Create Reminder", module: "Debt Reminders", detail: `Created reminder: "${editingReminder.name}"` })
    }
    setIsEditDialogOpen(false)
    setEditingReminder(null)
    return editingReminder
  }

  const openNewTemplate = () => {
    setTemplateForm({ name: "", description: "", subject: "", emailTitle: "", message: "" })
    setTemplateManageDialog({ isOpen: true, editing: null })
  }

  const openEditTemplate = (template: DebtReminderTemplate) => {
    setTemplateForm({ name: template.name, description: template.description, subject: template.subject, emailTitle: template.emailTitle, message: template.message })
    setTemplateManageDialog({ isOpen: true, editing: template })
  }

  const saveTemplateForm = () => {
    if (!templateForm.name.trim() || !templateForm.message.trim()) {
      toast.error("Name and message are required")
      return
    }
    if (templateManageDialog.editing) {
      setReminderTemplates((current) => (current || []).map(t => t.id === templateManageDialog.editing!.id ? { ...t, ...templateForm } : t))
      toast.success("Template updated")
      logActivity({ action: "Update Template", module: "Debt Reminders", detail: `Updated template: "${templateForm.name}", Subject: "${templateForm.subject}"` })
    } else {
      const newTemplate: DebtReminderTemplate = { id: `tpl-${Date.now()}`, ...templateForm }
      setReminderTemplates((current) => [...(current || []), newTemplate])
      toast.success("Template created")
      logActivity({ action: "Create Template", module: "Debt Reminders", detail: `Created template: "${templateForm.name}", Subject: "${templateForm.subject}"` })
    }
    setTemplateManageDialog({ isOpen: false, editing: null })
  }

  const deleteTemplate = (id: string) => {
    const template = (reminderTemplates || []).find(t => t.id === id)
    setReminderTemplates((current) => (current || []).filter(t => t.id !== id))
    toast.success("Template deleted")
    logActivity({ action: "Delete Template", module: "Debt Reminders", detail: `Deleted template: ${template?.name || id}` })
  }

  const applyTemplate = (reminderId: string, template: DebtReminderTemplate) => {
    // If editing in dialog, apply to editingReminder
    if (editingReminder && editingReminder.id === reminderId) {
      setEditingReminder(prev => prev ? { ...prev, subject: template.subject, emailTitle: template.emailTitle, message: template.message } : prev)
    } else {
      setReminders((current) =>
        (current || []).map(r =>
          r.id === reminderId
            ? { ...r, subject: template.subject, emailTitle: template.emailTitle, message: template.message }
            : r
        )
      )
    }
    setTemplatePickerDialog({ isOpen: false, reminderId: null })
    toast.success(`Template "${template.name}" applied`)
  }

  const updateReminder = (id: string, field: keyof ReminderConfig, value: any) => {
    setReminders((currentReminders) =>
      (currentReminders || []).map(reminder =>
        reminder.id === id ? { ...reminder, [field]: value } : reminder
      )
    )
  }

  const deleteReminder = (id: string) => {
    setReminders((currentReminders) => (currentReminders || []).filter(reminder => reminder.id !== id))
  }

  const handleDuplicateReminder = (reminder: ReminderConfig) => {
    const duplicate: ReminderConfig = {
      ...reminder,
      id: Date.now().toString(),
      name: `${reminder.name} (Copy)`,
      status: "scheduled",
      sendDate: "",
      sendTime: reminder.sendTime || "09:00",
      scheduledAt: undefined,
      sentAt: undefined,
      recipientCount: undefined,
    }
    setReminders((currentReminders) => [...(currentReminders || []), duplicate])
    toast.success("Reminder duplicated", {
      description: `"${duplicate.name}" created as scheduled`
    })
    logActivity({ action: "Duplicate Reminder", module: "Debt Reminders", detail: `Duplicated from: "${reminder.name}" -> "${duplicate.name}", Subject: "${duplicate.subject}"` })
  }

  const handleOpenHistory = () => {
    try {
      const stored = localStorage.getItem("emailReminderHistory")
      const existingHistory = stored ? JSON.parse(stored) : []

      // Generate mock data and merge with existing
      const subjects = ["Tuition Payment Reminder", "School Bus Payment Reminder", "Overdue Payment Notice", "Final Payment Reminder", "ECA Fee Reminder"]
      const terms = ["Term 1", "Term 2", "Term 3"]
      const years = ["2025/2026", "2024/2025"]
      const mockHistory = Array.from({ length: 40 }, (_, i) => {
        const date = new Date(2026, 0, 5 + Math.floor(i * 1.8))
        return {
          id: `mock-${i + 1}`,
          sentDate: date.toISOString().split("T")[0],
          subject: subjects[i % subjects.length],
          academicYear: years[i % years.length],
          term: terms[i % terms.length],
          recipients: Math.floor(Math.random() * 180) + 50,
          status: "sent"
        }
      })
      const history = [...mockHistory, ...existingHistory]

      setReminderHistory(history)
    } catch {
      setReminderHistory([])
    }
    setHistoryPage(1)
    setIsHistoryModalOpen(true)
  }

  const handleDateChange = (id: string, newDate: string) => {
    const reminder = editingReminder?.id === id ? editingReminder : (reminders || []).find(r => r.id === id)
    if (!reminder) return

    // Check if reminder is locked (scheduled)
    if (isReminderLocked(reminder)) {
      toast.error("Cannot edit", {
        description: "Scheduled reminders are locked. Cancel schedule first to edit."
      })
      return
    }

    // Check if date is in the past
    const today = getTodayString()
    if (newDate < today) {
      toast.error("Invalid date", {
        description: "Cannot select a date in the past"
      })
      return
    }

    // Update the date
    if (editingReminder?.id === id) {
      setEditingReminder(prev => prev ? { ...prev, sendDate: newDate } : prev)
    } else {
      updateReminder(id, "sendDate", newDate)
    }

    // If the selected date is today, validate the time
    if (newDate === today && reminder.sendTime) {
      if (isDateTimeInPast(newDate, reminder.sendTime)) {
        toast.error("Invalid time", {
          description: "Cannot select a time in the past for today's date"
        })
      }
    }
  }

  const handleTimeChange = (id: string, newTime: string) => {
    const reminder = editingReminder?.id === id ? editingReminder : (reminders || []).find(r => r.id === id)
    if (!reminder) return

    // Check if reminder is locked (scheduled)
    if (isReminderLocked(reminder)) {
      toast.error("Cannot edit", {
        description: "Scheduled reminders are locked. Cancel schedule first to edit."
      })
      return
    }

    // Update the time
    if (editingReminder?.id === id) {
      setEditingReminder(prev => prev ? { ...prev, sendTime: newTime } : prev)
    } else {
      updateReminder(id, "sendTime", newTime)
    }

    // If the selected date is today, validate the time
    const today = getTodayString()
    if (reminder.sendDate === today) {
      if (isDateTimeInPast(reminder.sendDate, newTime)) {
        toast.error("Invalid time", {
          description: "Cannot select a time in the past for today's date"
        })
      }
    }
  }

  // Helper to check if reminder is locked (reminded/sent reminders are read-only)
  const isReminderLocked = (reminder: ReminderConfig): boolean => {
    return reminder.status === "reminded"
  }

  // Helper to check if scheduled send time is still in the future
  const isScheduledInFuture = (reminder: ReminderConfig): boolean => {
    if (!reminder.sendDate || !reminder.sendTime) return false
    const scheduledTime = new Date(`${reminder.sendDate}T${reminder.sendTime}`)
    return scheduledTime > new Date()
  }

  // Load invoices matching a reminder's criteria
  const getMatchingInvoices = (reminder: ReminderConfig): any[] => {
    try {
      const stored = localStorage.getItem("createdInvoices")
      if (!stored) return []
      const invoices: any[] = JSON.parse(stored)

      const normalizeYear = (y: string) => (y || "").replace("/", "-").trim()
      const extractTermNum = (t: string): string => {
        const m = (t || "").match(/[Tt]erm\s*(\d+)/)
        if (m) return m[1]
        const n = (t || "").match(/^\s*(\d+)\s*$/)
        if (n) return n[1]
        return ""
      }

      return invoices.filter(inv => {
        if (reminder.academicYear) {
          const ry = normalizeYear(reminder.academicYear)
          const iy = normalizeYear(inv.academicYear || "")
          if (iy && ry && ry !== iy) return false
        }
        if (reminder.term) {
          const rt = extractTermNum(reminder.term)
          const it = extractTermNum(inv.term || inv.termName || "")
          if (rt && it && rt !== it) return false
        }
        const statuses = reminder.invoiceStatuses || []
        if (statuses.length > 0) {
          const invStatus = inv.status === "paid" ? "paid" : inv.status === "overdue" ? "overdue" : "unpaid"
          if (!statuses.includes(invStatus as InvoiceStatus)) return false
        }
        return true
      })
    } catch { return [] }
  }

  const openSendModal = (reminder: ReminderConfig) => {
    const matching = getMatchingInvoices(reminder)
    setSendMatchingInvoices(matching)
    setSendSelectedIds(new Set(matching.map((inv: any) => inv.id)))
    setSendModalReminder(reminder)
    setSendModalTab("confirm")
    setTestEmailAddress("")
    setSendInvoiceSearch("")
    setIsSendModalOpen(true)
  }

  const handleSendNow = (reminder: ReminderConfig) => {
    // Validate reminder has required fields
    if (!reminder.subject || !reminder.message) {
      toast.error("Cannot send reminder", {
        description: "Please fill in subject and message before sending"
      })
      return
    }

    if (!reminder.enabled) {
      toast.error("Cannot send reminder", {
        description: "Please enable this reminder first"
      })
      return
    }

    // Get academic year name for display
    const academicYear = academicYears.find(y => y.id === reminder.academicYear)
    const term = academicYear?.terms.find(t => t.id === reminder.term)

    // Use selected invoice count, fallback to mock
    const mockRecipientCount = sendSelectedIds.size > 0 ? sendSelectedIds.size : Math.floor(Math.random() * 150) + 50

    // Create history entry
    const historyEntry = {
      id: `reminder-${Date.now()}`,
      sentDate: new Date().toISOString().split('T')[0],
      subject: reminder.subject,
      academicYear: academicYear?.name || reminder.academicYear,
      term: term?.name || `Term ${reminder.term}`,
      recipients: mockRecipientCount,
      status: "sent",
      message: reminder.message
    }

    // Save to emailReminderHistory
    try {
      const existingHistory = localStorage.getItem("emailReminderHistory")
      const history = existingHistory ? JSON.parse(existingHistory) : []
      history.unshift(historyEntry) // Add to beginning
      localStorage.setItem("emailReminderHistory", JSON.stringify(history))
    } catch (error) {
      console.error("Failed to save email history:", error)
    }

    // Also save to invoice email logs
    saveReminderEmailLog(reminder.subject, mockRecipientCount)

    // Update reminder status to sent
    updateReminder(reminder.id, "status", "reminded")
    updateReminder(reminder.id, "sentAt", new Date().toISOString())
    updateReminder(reminder.id, "recipientCount", mockRecipientCount)

    toast.success(`Reminder email sent to ${mockRecipientCount} recipients`, {
      description: `Subject: ${reminder.subject}`
    })
    logActivity({ action: "Send Reminder Email", module: "Debt Reminders", detail: `Subject: "${reminder.subject}", Recipients: ${mockRecipientCount}, Academic Year: ${academicYear?.name || reminder.academicYear}, Term: ${term?.name || reminder.term}` })
  }

  const handlePreviewReminder = (reminder: ReminderConfig) => {
    // Validate before preview
    if (!reminder.subject || !reminder.message) {
      toast.error("Cannot preview reminder", {
        description: "Please fill in subject and message first"
      })
      return
    }

    // Set default sendTime if not set (for old reminders)
    if (!reminder.sendTime) {
      updateReminder(reminder.id, "sendTime", "09:00")
    }

    // Set default status if not set (for old reminders)
    if (!reminder.status) {
      updateReminder(reminder.id, "status", "scheduled")
    }

    // Use existing recipient count if available, otherwise generate once
    const recipientCount = reminder.recipientCount || (Math.floor(Math.random() * 150) + 50)
    if (!reminder.recipientCount) {
      updateReminder(reminder.id, "recipientCount", recipientCount)
    }

    setPreviewReminder({ ...reminder, recipientCount })
    setIsPreviewModalOpen(true)
  }

  const handleScheduleReminder = () => {
    if (!previewReminder) return

    // Validate schedule date/time
    if (!previewReminder.sendDate) {
      toast.error("Cannot schedule reminder", {
        description: "Please set a send date first"
      })
      return
    }

    // Update reminder to scheduled status
    updateReminder(previewReminder.id, "status", "scheduled")
    updateReminder(previewReminder.id, "scheduledAt", new Date().toISOString())

    toast.success("Reminder scheduled successfully", {
      description: `Will send on ${formatDisplayDate(previewReminder.sendDate)} at ${previewReminder.sendTime}`
    })
    logActivity({ action: "Schedule Reminder", module: "Debt Reminders", detail: `Scheduled "${previewReminder.subject}" for ${formatDisplayDate(previewReminder.sendDate)} at ${previewReminder.sendTime}` })

    setIsPreviewModalOpen(false)
    setPreviewReminder(null)
  }

  const handleCancelSchedule = (reminder: ReminderConfig) => {
    // Only allow canceling scheduled reminders
    if (reminder.status !== "scheduled") {
      toast.error("Cannot cancel", {
        description: "Only scheduled reminders can be cancelled"
      })
      return
    }

    cancelConfirm.confirm(() => {
      // Update to scheduled status
      updateReminder(reminder.id, "status", "scheduled")
      updateReminder(reminder.id, "scheduledAt", undefined)

      toast.success("Schedule cancelled", {
        description: `${reminder.name} has been moved back to scheduled`
      })
      logActivity({ action: "Cancel Schedule", module: "Debt Reminders", detail: `Cancelled schedule for "${reminder.name}"` })
    })
  }

  const handleEditScheduled = (reminder: ReminderConfig) => {
    // Only allow editing scheduled reminders
    if (reminder.status !== "scheduled") {
      toast.error("Cannot edit", {
        description: "Only scheduled reminders can be edited"
      })
      return
    }

    // Update to scheduled status to allow editing
    updateReminder(reminder.id, "status", "scheduled")
    updateReminder(reminder.id, "scheduledAt", undefined)

    // Close preview modal
    setIsPreviewModalOpen(false)

    toast.success("Moved to scheduled for editing", {
      description: `${reminder.name} can now be edited`
    })
  }

  const getStatusBadge = (status: ReminderStatus | undefined) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
            Scheduled
          </Badge>
        )
      case "reminded":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
            Reminded
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
            Cancelled
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
            Scheduled
          </Badge>
        )
    }
  }

  const getInvoiceStatusBadges = (statuses: InvoiceStatus[]) => {
    if (!statuses || statuses.length === 0) {
      return <span className="text-muted-foreground text-xs">-</span>
    }
    return (
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {statuses.map(s => (
          <Badge key={s} variant="outline" className={cn(
            "text-xs",
            s === "unpaid" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-red-50 text-red-700 border-red-200"
          )}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        ))}
      </div>
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterAcademicYear("all")
    setFilterTerm("all")
    setFilterStatus("all")
    setCurrentPage(1)
  }

  const getReminderDisplayAcademicYear = (reminder: ReminderConfig) => {
    const year = academicYears.find(y => y.id === reminder.academicYear)
    return year ? formatAcademicYear(year.name) : reminder.academicYear || "-"
  }

  const getReminderDisplayTerm = (reminder: ReminderConfig) => {
    const year = academicYears.find(y => y.id === reminder.academicYear)
    const term = year?.terms.find(t => t.id === reminder.term)
    return term?.name || (reminder.term ? `Term ${reminder.term}` : "-")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("debt.reminderSettings")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("debt.reminderSettingsDesc")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsTemplateListOpen(true)} className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates Debt Reminder
          </Button>
          <Button onClick={addReminder} disabled={!userCanEdit} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Reminder
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Reminders</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.scheduledCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Send className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.sentCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.cancelledCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search bar + Filters toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, subject, or title..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>

          {/* Collapsible filters */}
          {showFilters && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Academic Year</Label>
                  <Select value={filterAcademicYear} onValueChange={(v) => { setFilterAcademicYear(v); setCurrentPage(1) }}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Academic Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Academic Years</SelectItem>
                      {academicYears.map(year => (
                        <SelectItem key={year.id} value={year.id}>
                          {formatAcademicYear(year.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Term</Label>
                  <Select value={filterTerm} onValueChange={(v) => { setFilterTerm(v); setCurrentPage(1) }}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Terms</SelectItem>
                      {filterAcademicYear !== "all"
                        ? academicYears.find(y => y.id === filterAcademicYear)?.terms.map(term => (
                            <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                          )) || []
                        : academicYears.flatMap(y => y.terms).filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i).map(term => (
                            <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1) }}>
                    <SelectTrigger>
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="reminded">Reminded</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead align="left" className="cursor-pointer" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="left" className="cursor-pointer" onClick={() => handleSort("academicYear")}>
                    <div className="flex items-center gap-1">Academic Year <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="left" className="cursor-pointer" onClick={() => handleSort("term")}>
                    <div className="flex items-center gap-1">Term <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="left" className="cursor-pointer" onClick={() => handleSort("sendDate")}>
                    <div className="flex items-center gap-1">Send Date <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="left" className="cursor-pointer" onClick={() => handleSort("sendTime")}>
                    <div className="flex items-center gap-1">Send Time <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="center">Invoice Status</TableHead>
                  <TableHead align="center" className="cursor-pointer" onClick={() => handleSort("status")}>
                    <div className="flex items-center justify-center gap-1">Status <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="right" className="cursor-pointer" onClick={() => handleSort("recipients")}>
                    <div className="flex items-center justify-end gap-1">Recipients <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></div>
                  </TableHead>
                  <TableHead align="center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReminders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No reminders found</p>
                      <p className="text-xs mt-1">Create a new reminder or adjust your filters</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReminders.map((reminder) => (
                    <TableRow key={reminder.id}>
                      <TableCell align="left" className="font-medium">{reminder.name || "-"}</TableCell>
                      <TableCell align="left">{getReminderDisplayAcademicYear(reminder)}</TableCell>
                      <TableCell align="left">{getReminderDisplayTerm(reminder)}</TableCell>
                      <TableCell align="left">{reminder.sendDate ? format(new Date(reminder.sendDate), "dd/MM/yyyy") : "-"}</TableCell>
                      <TableCell align="left">{reminder.sendTime || "-"}</TableCell>
                      <TableCell align="center">{getInvoiceStatusBadges(reminder.invoiceStatuses)}</TableCell>
                      <TableCell align="center">{getStatusBadge(reminder.status)}</TableCell>
                      <TableCell align="right">{reminder.recipientCount?.toLocaleString() || "-"}</TableCell>
                      <TableCell align="center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (!reminder.subject || !reminder.message) {
                                toast.error("Cannot preview", { description: "Subject and message are required" })
                                return
                              }
                              handlePreviewReminder(reminder)
                            }}
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditReminder(reminder)}
                            disabled={!userCanEdit || isReminderLocked(reminder)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (!reminder.academicYear || !reminder.term || !reminder.subject || !reminder.sendDate || !reminder.sendTime || !reminder.message) {
                                toast.error("Please fill in all required fields before sending")
                                return
                              }
                              openSendModal(reminder)
                            }}
                            disabled={!userCanEdit || !reminder.enabled || reminder.status === "reminded"}
                            title="Send Now"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                            onClick={() => {
                              updateReminder(reminder.id, "status", "cancelled")
                              toast.success("Reminder cancelled")
                              logActivity({ action: "Cancel Reminder", module: "Debt Reminder", detail: `Cancelled reminder "${reminder.name}"` })
                            }}
                            disabled={!userCanEdit || reminder.status !== "scheduled"}
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteReminder(reminder.id)}
                            disabled={!userCanEdit || isReminderLocked(reminder)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredReminders.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Reminder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false)
          setEditingReminder(null)
        }
      }}>
        <DialogContent className="max-w-3xl p-6 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {editingReminder && (reminders || []).find(r => r.id === editingReminder.id) ? "Edit Reminder" : "Create Reminder"}
            </DialogTitle>
          </DialogHeader>

          {editingReminder && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Name & Enable */}
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Reminder Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={editingReminder.name}
                    onChange={(e) => setEditingReminder(prev => prev ? { ...prev, name: e.target.value } : prev)}
                    placeholder="Enter reminder name"
                  />
                </div>
              </div>

              {/* Academic Year & Term */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("debtReminder.academicYear")} <span className="text-destructive">*</span></Label>
                  <Select
                    value={editingReminder.academicYear}
                    onValueChange={(value) => setEditingReminder(prev => prev ? { ...prev, academicYear: value } : prev)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("debtReminder.selectAcademicYear")} />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears.map(year => (
                        <SelectItem key={year.id} value={year.id}>
                          {formatAcademicYear(year.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("debtReminder.term")} <span className="text-destructive">*</span></Label>
                  <Select
                    value={editingReminder.term}
                    onValueChange={(value) => setEditingReminder(prev => prev ? { ...prev, term: value } : prev)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("debtReminder.selectTerm")} />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears
                        .find(y => y.id === editingReminder.academicYear)
                        ?.terms.map(term => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        )) || []}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Email Subject, Invoice Status Filter & Due Date Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("debtReminder.emailSubject")} <span className="text-destructive">*</span></Label>
                  <Select
                    value={editingReminder.subject}
                    onValueChange={(value) => setEditingReminder(prev => prev ? { ...prev, subject: value } : prev)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("debtReminder.selectEmailSubject")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_EMAIL_SUBJECTS.map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("debtReminder.invoiceStatusFilter")}</Label>
                  <div className="flex items-center gap-3">
                    {INVOICE_STATUS_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={editingReminder.invoiceStatuses?.includes(option.value) ?? false}
                          onCheckedChange={(checked) => {
                            const current = editingReminder.invoiceStatuses || []
                            const updated = checked
                              ? [...current, option.value]
                              : current.filter(s => s !== option.value)
                            setEditingReminder(prev => prev ? { ...prev, invoiceStatuses: updated } : prev)
                          }}
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("debtReminder.dueDateFilter")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editingReminder.dueDateFilter || editingReminder.dueDateFilter === "all" ? "text-muted-foreground" : ""
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingReminder.dueDateFilter && editingReminder.dueDateFilter !== "all"
                          ? format(new Date(editingReminder.dueDateFilter), "dd MMM yyyy")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editingReminder.dueDateFilter && editingReminder.dueDateFilter !== "all" ? new Date(editingReminder.dueDateFilter) : undefined}
                        onSelect={(date) => setEditingReminder(prev => prev ? { ...prev, dueDateFilter: date ? format(date, "yyyy-MM-dd") : "all" } : prev)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Email Title */}
              <div className="space-y-2">
                <Label>{t("debtReminder.emailTitle")}</Label>
                <Input
                  value={editingReminder.emailTitle}
                  onChange={(e) => setEditingReminder(prev => prev ? { ...prev, emailTitle: e.target.value } : prev)}
                  placeholder="Enter custom email title..."
                />
              </div>

              {/* Send Date & Send Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {t("debtReminder.sendDate")}
                  </Label>
                  <Popover open={openCalendarId === `edit-${editingReminder.id}`} onOpenChange={(open) => setOpenCalendarId(open ? `edit-${editingReminder.id}` : null)}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !editingReminder.sendDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingReminder.sendDate ? format(new Date(editingReminder.sendDate), "dd/MM/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editingReminder.sendDate ? new Date(editingReminder.sendDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            handleDateChange(editingReminder.id, format(date, "yyyy-MM-dd"))
                            setOpenCalendarId(null)
                          }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("debtReminder.sendTime")}
                  </Label>
                  <Input
                    type="time"
                    value={editingReminder.sendTime}
                    onChange={(e) => handleTimeChange(editingReminder.id, e.target.value)}
                  />
                </div>
              </div>

              {/* Use Template Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatePickerDialog({ isOpen: true, reminderId: editingReminder.id })}
                  className="flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  {t("debtReminder.useTemplate")}
                </Button>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>{t("debtReminder.messageTemplate")} <span className="text-destructive">*</span></Label>
                <div className="reminder-editor">
                  <CustomToolbar id="reminder-toolbar" />
                  <ReactQuill
                    ref={reminderQuillRef}
                    theme="snow"
                    value={editingReminder.message}
                    onChange={(val) => setEditingReminder(prev => prev ? { ...prev, message: val } : prev)}
                    modules={reminderEditorModules}
                    formats={QUILL_FORMATS}
                    placeholder="Enter reminder message template"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground">Variables:</span>
                  {["{parent_name}", "{student_name}", "{student_id}", "{year_group}", "{invoice_number}", "{amount}", "{due_date}", "{days_remaining}", "{term}", "{academic_year}", "{school_name}", "{payment_link}"].map(v => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const editor = reminderQuillRef.current?.getEditor()
                        if (editor) {
                          const range = editor.getSelection(true)
                          editor.insertText(range.index, v)
                          editor.setSelection(range.index + v.length, 0)
                        }
                      }}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Live Email Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Email Preview
                </Label>
                <div className="border rounded-lg overflow-hidden bg-white">
                  {/* Email header */}
                  <div className="bg-gray-50 border-b px-4 py-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Subject: <span className="font-medium text-foreground">{editingReminder.subject || "—"}</span></p>
                  </div>
                  {/* Email body */}
                  <div className="p-4">
                    {editingReminder.emailTitle && (
                      <h2 className="text-lg font-bold text-center mb-4 pb-3 border-b">{editingReminder.emailTitle}</h2>
                    )}
                    <div className="text-sm leading-relaxed min-h-[80px]">
                      {(() => {
                        const msg = editingReminder.message || ""
                        const sampleVars: Record<string, string> = {
                          "{parent_name}": "John Smith",
                          "{student_name}": "Emma Smith",
                          "{student_id}": "STU-2025-001",
                          "{year_group}": "Year 10",
                          "{invoice_number}": "INV-2025-00001",
                          "{amount}": "฿45,000",
                          "{due_date}": "15 Jan 2025",
                          "{days_remaining}": "7",
                          "{term}": "Term 1",
                          "{academic_year}": "2025/2026",
                          "{school_name}": "King College",
                          "{payment_link}": "https://pay.example.com/inv001"
                        }
                        if (!msg || msg === "<p><br></p>") return <span className="text-gray-300 italic">Message preview will appear here as you type...</span>
                        return renderFormattedPreview(msg, sampleVars) || <span className="text-gray-300 italic">Message preview will appear here as you type...</span>
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4 flex-col gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground mr-auto">Fill Send Date & Time to schedule, or use Save & Send to send immediately.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingReminder(null) }}>
                {t("common.cancel")}
              </Button>
              <Button variant="outline" onClick={() => {
                if (editingReminder && (!editingReminder.sendDate || !editingReminder.sendTime)) {
                  toast.error("Send Date and Send Time are required for scheduling")
                  return
                }
                saveEditingReminder()
              }} disabled={!userCanEdit}>
                <Save className="w-4 h-4 mr-2" />
                Save & Schedule
              </Button>
              <Button
                onClick={() => {
                  const saved = saveEditingReminder()
                  if (saved) {
                    if (!saved.academicYear || !saved.term || !saved.subject || !saved.message) {
                      toast.error("Please fill in all required fields before sending")
                      return
                    }
                    openSendModal(saved)
                  }
                }}
                disabled={!userCanEdit}
              >
                <Send className="w-4 h-4 mr-2" />
                Save & Send
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview & Schedule Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Reminder - {previewReminder?.name}
            </DialogTitle>
          </DialogHeader>

          {previewReminder && (
            <div className="space-y-4 py-2">
              {/* Recipient + Schedule row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-blue-300 bg-blue-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-blue-600 font-medium">Recipients</p>
                        <p className="text-2xl font-bold text-blue-900 leading-tight">
                          {(previewReminder.recipientCount || 0).toLocaleString()}
                          <span className="text-xs font-normal text-blue-600 ml-1">parents</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={previewReminder.sendDate ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                        previewReminder.sendDate ? "bg-green-600" : "bg-gray-400"
                      )}>
                        <CalendarIcon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs uppercase tracking-wide font-medium",
                          previewReminder.sendDate ? "text-green-600" : "text-gray-400"
                        )}>Scheduled</p>
                        <p className={cn(
                          "text-base font-bold leading-tight",
                          previewReminder.sendDate ? "text-green-900" : "text-gray-400 italic font-normal"
                        )}>
                          {previewReminder.sendDate
                            ? `${formatDisplayDate(previewReminder.sendDate)} · ${previewReminder.sendTime || "—"}`
                            : "Not scheduled yet"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Email Preview */}
              <div className="rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
                {/* Email header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  {/* Subject line (prominent) */}
                  <div className="text-lg font-semibold text-gray-900 mb-3">
                    {previewReminder.subject || <span className="text-gray-300 italic font-normal">(No subject)</span>}
                  </div>
                  {/* Sender row */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">KC</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">King's College International School</span>
                        <span className="text-xs text-gray-400">&lt;finance@kingscollege.ac.th&gt;</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        to <span className="text-gray-700">Mr. John Smith</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email body */}
                <div className="px-6 py-6">
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {(() => {
                      const sampleVars: Record<string, string> = {
                        "{parent_name}": "Mr. John Smith",
                        "{student_name}": "James Smith",
                        "{student_id}": "STU-2025-001",
                        "{year_group}": "Year 10",
                        "{invoice_number}": "INV-2025-00001",
                        "{amount}": "฿45,000",
                        "{due_date}": "31 Mar 2026",
                        "{days_remaining}": "15",
                        "{term}": "Term 1",
                        "{academic_year}": "2025/2026",
                        "{school_name}": "King College",
                        "{payment_link}": "https://pay.example.com/inv001"
                      }
                      const msg = previewReminder.message || ""
                      if (!msg) return <span className="text-gray-300 italic">No message content</span>
                      return renderFormattedPreview(msg, sampleVars) || <span className="text-gray-300 italic">No message content</span>
                    })()}
                  </div>
                </div>

                {/* Email footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  <div className="text-center text-xs text-gray-400 leading-5">
                    <div className="font-medium text-gray-500">King's College International School</div>
                    <div>999 Rama 9 Road, Huai Khwang, Bangkok 10310</div>
                    <div>Tel: +66 2 123 4567 | finance@kingscollege.ac.th</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remind History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="w-full flex flex-col p-0 gap-0" style={{ maxWidth: "90vw", width: "820px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t("debtReminder.sentReminders")}</h2>
                <p className="text-xs text-muted-foreground">{t("debtReminder.sentReminders")}</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {reminderHistory.length} record{reminderHistory.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Body */}
          <div className="px-8 py-4">
            {reminderHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Mail className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">No reminder history yet</p>
                <p className="text-xs mt-1">Sent reminders will appear here</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 border-b sticky top-0">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Date Sent</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Academic Year</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Term</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipients</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(() => {
                        const sorted = [...reminderHistory].reverse()
                        const start = (historyPage - 1) * historyPageSize
                        return sorted.slice(start, start + historyPageSize).map((entry, idx) => (
                          <tr key={entry.id ?? idx} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-sm">
                              {entry.sentDate ? formatDisplayDate(entry.sentDate) : "-"}
                            </td>
                            <td className="py-3 px-4 font-medium text-sm whitespace-nowrap">{entry.subject}</td>
                            <td className="py-3 px-4 text-muted-foreground text-sm whitespace-nowrap">{formatAcademicYear(entry.academicYear) || "-"}</td>
                            <td className="py-3 px-4 text-muted-foreground text-sm whitespace-nowrap">{entry.term || "-"}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <span className="font-semibold text-sm">{entry.recipients?.toLocaleString() ?? "-"}</span>
                              <span className="text-xs text-muted-foreground ml-1">recipients</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Sent
                              </span>
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Pagination */}
          <div className="flex items-center justify-between px-8 py-4 border-t bg-muted/20">
            {reminderHistory.length > historyPageSize ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {(historyPage - 1) * historyPageSize + 1}-{Math.min(historyPage * historyPageSize, reminderHistory.length)} of {reminderHistory.length} | Page {historyPage} of {Math.ceil(reminderHistory.length / historyPageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage(p => Math.min(Math.ceil(reminderHistory.length / historyPageSize), p + 1))}
                  disabled={historyPage >= Math.ceil(reminderHistory.length / historyPageSize)}
                >
                  Next
                </Button>
              </div>
            ) : <div />}
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Template Dialog -- with live preview */}
      <Dialog open={templateManageDialog.isOpen} onOpenChange={(open) => !open && setTemplateManageDialog({ isOpen: false, editing: null })}>
        <DialogContent className="p-0 gap-0 overflow-hidden" style={{ maxWidth: "95vw", width: "1500px", minHeight: "80vh" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[75vh]">
            {/* Left Panel: Form */}
            <div className="p-6 border-r border-gray-200 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <Edit className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold">{templateManageDialog.editing ? t("debtReminder.editTemplate") : t("debtReminder.addTemplate")}</h3>
              </div>
              <div className="flex flex-col gap-4 flex-1">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Template Name <span className="text-destructive">*</span></Label>
                  <Input className="h-11" value={templateForm.name} onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. First Reminder" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email Title</Label>
                  <Input className="h-11" value={templateForm.emailTitle} onChange={(e) => setTemplateForm(f => ({ ...f, emailTitle: e.target.value }))} placeholder="e.g. Friendly Payment Reminder" />
                </div>
                <div className="flex flex-col flex-1">
                  <Label className="text-sm font-medium mb-1.5">Message <span className="text-destructive">*</span></Label>
                  <div className="reminder-editor flex-1">
                    <CustomToolbar id="template-toolbar" />
                    <ReactQuill
                      ref={templateQuillRef}
                      theme="snow"
                      value={templateForm.message}
                      onChange={(val) => setTemplateForm(f => ({ ...f, message: val }))}
                      modules={templateEditorModules}
                      formats={QUILL_FORMATS}
                      placeholder="Enter message template..."
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground">Variables:</span>
                    {["{parent_name}", "{student_name}", "{student_id}", "{year_group}", "{invoice_number}", "{amount}", "{due_date}", "{days_remaining}", "{term}", "{academic_year}", "{school_name}", "{payment_link}"].map(v => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const editor = templateQuillRef.current?.getEditor()
                          if (editor) {
                            const range = editor.getSelection(true)
                            editor.insertText(range.index, v)
                            editor.setSelection(range.index + v.length, 0)
                          }
                        }}
                      >
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-5 mt-4">
                <Button variant="outline" onClick={() => setTemplateManageDialog({ isOpen: false, editing: null })}>{t("common.cancel")}</Button>
                <Button onClick={saveTemplateForm}><Save className="w-4 h-4 mr-2" />{templateManageDialog.editing ? t("common.saveChanges") : t("debtReminder.addTemplate")}</Button>
              </div>
            </div>

            {/* Right Panel: Live Email Preview */}
            <div className="p-6 bg-white flex flex-col overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold">Email Preview</h3>
              </div>

              {/* Email client frame */}
              <div className="rounded-lg border border-gray-300 bg-white shadow-md flex-1 flex flex-col overflow-hidden">
                {/* Email meta */}
                <div className="px-6 py-4 border-b border-gray-100 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">KC</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm text-gray-900">King's College International School</span>
                          <span className="text-xs text-gray-400 ml-2">&lt;finance@kingscollege.ac.th&gt;</span>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">just now</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">to parent_email@example.com</div>
                    </div>
                  </div>
                  <div className="font-semibold text-base text-gray-900 mt-2">
                    {templateForm.emailTitle || <span className="text-gray-300 italic font-normal">Subject: (Email Title)</span>}
                  </div>
                </div>

                {/* Email body */}
                <div className="flex-1 px-6 py-5 overflow-y-auto">
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {(() => {
                      const sampleVars: Record<string,string> = {
                        "{parent_name}": "John Smith",
                        "{student_name}": "Oliver Smith",
                        "{student_id}": "STU-2025-001",
                        "{year_group}": "Year 10",
                        "{invoice_number}": "INV-2025-00001",
                        "{amount}": "125,000 THB",
                        "{due_date}": "30 April 2026",
                        "{days_remaining}": "14",
                        "{term}": "Term 1",
                        "{academic_year}": "2025/2026",
                        "{school_name}": "King College",
                        "{payment_link}": "https://pay.example.com/inv001"
                      }
                      const msg = templateForm.message || ""
                      if (!msg || msg === "<p><br></p>") return <span className="text-gray-300 italic">Message preview will appear here as you type...</span>
                      return renderFormattedPreview(msg, sampleVars) || <span className="text-gray-300 italic">Message preview will appear here as you type...</span>
                    })()}
                  </div>
                </div>

                {/* Email footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  <div className="text-center text-xs text-gray-400 leading-5">
                    <div className="font-medium text-gray-500">King's College International School</div>
                    <div>999 Rama 9 Road, Huai Khwang, Bangkok 10310</div>
                    <div>Tel: +66 2 123 4567 | finance@kingscollege.ac.th</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Picker Dialog */}
      <Dialog open={templatePickerDialog.isOpen} onOpenChange={(open) => !open && setTemplatePickerDialog({ isOpen: false, reminderId: null })}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("debtReminder.selectTemplate")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Select a template to auto-fill the subject, title, and message. You can edit the content after applying.
          </p>
          <div className="grid gap-2 mt-2 overflow-y-auto pr-1" style={{ maxHeight: "400px" }}>
            {(reminderTemplates || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No templates available. Create one in the Email Templates section.</p>
            )}
            {(reminderTemplates || []).map((template) => (
              <button
                key={template.id}
                onClick={() => templatePickerDialog.reminderId && applyTemplate(templatePickerDialog.reminderId, template)}
                className="text-left p-3 border rounded-lg hover:border-primary hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-0.5 group-hover:text-primary">{template.name}</div>
                    <div className="text-xs text-muted-foreground mb-1">{template.description}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Subject:</span> {template.subject}
                    </div>
                  </div>
                  <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap pt-0.5">Use this</span>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setTemplatePickerDialog({ isOpen: false, reminderId: null })}>
              {t("common.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template List Dialog */}
      <Dialog open={isTemplateListOpen} onOpenChange={setIsTemplateListOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Templates Debt Reminder
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Create and manage email templates for debt reminders. Templates can be applied when creating or editing a reminder.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => { openNewTemplate() }} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead align="left">Name</TableHead>
                  <TableHead align="left">Email Title</TableHead>
                  <TableHead align="left">Description</TableHead>
                  <TableHead align="center" className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reminderTemplates || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No templates yet. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  (reminderTemplates || []).map((template) => (
                    <TableRow key={template.id}>
                      <TableCell align="left" className="font-medium">{template.name}</TableCell>
                      <TableCell align="left">{template.emailTitle || "-"}</TableCell>
                      <TableCell align="left" className="text-sm text-muted-foreground max-w-[200px] truncate">{template.description || "-"}</TableCell>
                      <TableCell align="center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { openEditTemplate(template) }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTemplate(template.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsTemplateListOpen(false)}>
              {t("common.close") || "Close"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelConfirm.isOpen}
        onOpenChange={cancelConfirm.setIsOpen}
        onConfirm={cancelConfirm.handleConfirm}
        titleKey="Cancel Schedule"
        descriptionKey="Are you sure you want to cancel this scheduled reminder? It will be moved back to scheduled status."
        confirmTextKey="common.confirm"
        variant="destructive"
      />

      {/* Send Email Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent style={{ maxWidth: "640px" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {t("debtReminder.sendEmail") || "Send Email"}
            </DialogTitle>
            {sendModalReminder && (
              <DialogDescription>{sendModalReminder.subject}</DialogDescription>
            )}
          </DialogHeader>

          <Tabs value={sendModalTab} onValueChange={setSendModalTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="confirm">{t("debtReminder.sendConfirm") || "Send Now"}</TabsTrigger>
              <TabsTrigger value="test">{t("debtReminder.testSend") || "Send Verification Email"}</TabsTrigger>
            </TabsList>

            {/* Tab 1: Send Now — shows subject & message preview */}
            <TabsContent value="confirm" className="space-y-4 mt-4">
              {sendModalReminder && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("debtReminder.subject") || "Subject"}</span>
                      <p className="text-sm font-medium mt-1">{sendModalReminder.subject}</p>
                    </div>
                    <div className="border-t pt-3">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("debtReminder.messagePreview") || "Message Preview"}</span>
                      <div className="text-sm mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sendModalReminder.message || "" }} />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
                      {t("common.cancel") || "Cancel"}
                    </Button>
                    <Button
                      onClick={() => setIsFinalConfirmOpen(true)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {t("debtReminder.confirmSend") || "Send Now"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Test Send — shows invoice list */}
            <TabsContent value="test" className="space-y-3 mt-4">
              {sendModalReminder && (() => {
                const ay = academicYears.find(y => y.id === sendModalReminder.academicYear)
                const tm = ay?.terms.find(t => t.id === sendModalReminder.term)
                const allSelected = sendMatchingInvoices.length > 0 && sendSelectedIds.size === sendMatchingInvoices.length
                return (
                  <div className="space-y-3">
                    {/* Test Email Address */}
                    <div className="space-y-2">
                      <Label>{t("debtReminder.testEmailAddress") || "Email Address (for Testing)"}</Label>
                      <Input
                        type="email"
                        placeholder="test@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                      />
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ay?.name || sendModalReminder.academicYear} · {tm?.name || sendModalReminder.term}</span>
                      <span className="font-medium">{t("debtReminder.selected") || "Selected"}: {sendSelectedIds.size}/{sendMatchingInvoices.length}</span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or invoice number..."
                        value={sendInvoiceSearch}
                        onChange={(e) => setSendInvoiceSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>

                    {/* Select All */}
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSendSelectedIds(new Set(sendMatchingInvoices.map((inv: any) => inv.id)))
                          } else {
                            setSendSelectedIds(new Set())
                          }
                        }}
                      />
                      <span className="text-sm font-medium">{t("common.selectAll") || "Select All"}</span>
                    </div>

                    {/* Invoice List */}
                    <div className="overflow-y-auto space-y-1" style={{ maxHeight: "350px" }}>
                      {(() => {
                        const q = sendInvoiceSearch.toLowerCase().trim()
                        const filtered = q
                          ? sendMatchingInvoices.filter((inv: any) =>
                              (inv.studentName || "").toLowerCase().includes(q) ||
                              (inv.invoiceNumber || inv.id || "").toLowerCase().includes(q) ||
                              (inv.studentId || "").toLowerCase().includes(q)
                            )
                          : sendMatchingInvoices
                        if (filtered.length === 0) return (
                          <p className="text-sm text-muted-foreground text-center py-6">{q ? "No matching results" : (t("debtReminder.noMatchingInvoices") || "No matching invoices found")}</p>
                        )
                        return filtered.map((inv: any) => (
                          <div
                            key={inv.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                              sendSelectedIds.has(inv.id) && "bg-muted/50 border-primary/30"
                            )}
                            onClick={() => {
                              setSendSelectedIds(prev => {
                                const next = new Set(prev)
                                if (next.has(inv.id)) next.delete(inv.id)
                                else next.add(inv.id)
                                return next
                              })
                            }}
                          >
                            <Checkbox
                              checked={sendSelectedIds.has(inv.id)}
                              onCheckedChange={() => {
                                setSendSelectedIds(prev => {
                                  const next = new Set(prev)
                                  if (next.has(inv.id)) next.delete(inv.id)
                                  else next.add(inv.id)
                                  return next
                                })
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{inv.studentName || inv.studentId || "-"}</p>
                              <p className="text-xs text-muted-foreground truncate">{inv.invoiceNumber || inv.id}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-medium">฿{(inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0).toLocaleString()}</p>
                              <Badge variant="outline" className={cn("text-xs",
                                inv.status === "overdue" ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700"
                              )}>
                                {inv.status || "unpaid"}
                              </Badge>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
                        {t("common.cancel") || "Cancel"}
                      </Button>
                      <Button
                        disabled={sendSelectedIds.size === 0 || !testEmailAddress || !testEmailAddress.includes("@")}
                        onClick={() => setIsTestConfirmOpen(true)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {t("debtReminder.sendTest") || "Send Test"} ({sendSelectedIds.size})
                      </Button>
                    </DialogFooter>
                  </div>
                )
              })()}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Final Confirm Modal */}
      <Dialog open={isFinalConfirmOpen} onOpenChange={setIsFinalConfirmOpen}>
        <DialogContent style={{ maxWidth: "400px" }}>
          <DialogHeader>
            <DialogTitle>{t("debtReminder.confirmSend") || "Send Now"}</DialogTitle>
            <DialogDescription>
              {t("debtReminder.finalConfirm") || "Confirm sending reminder email to all recipients?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinalConfirmOpen(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={() => {
              if (sendModalReminder) {
                handleSendNow(sendModalReminder)
              }
              setIsFinalConfirmOpen(false)
              setIsSendModalOpen(false)
            }}>
              <Send className="w-4 h-4 mr-2" />
              {t("common.confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Send Confirm Modal */}
      <Dialog open={isTestConfirmOpen} onOpenChange={setIsTestConfirmOpen}>
        <DialogContent style={{ maxWidth: "400px" }}>
          <DialogHeader>
            <DialogTitle>{t("debtReminder.sendTest") || "Send Test"}</DialogTitle>
            <DialogDescription>
              Send test email to <span className="font-medium">{testEmailAddress}</span> with {sendSelectedIds.size} selected invoice(s)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestConfirmOpen(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={() => {
              toast.success(t("debtReminder.testSent") || "Test email sent", {
                description: `${t("debtReminder.sentTo") || "Sent to"}: ${testEmailAddress} (${sendSelectedIds.size} invoices)`
              })
              logActivity({ action: "Send Test Email", module: "Debt Reminders", detail: `Test email sent to ${testEmailAddress}, ${sendSelectedIds.size} invoices selected` })
              setIsTestConfirmOpen(false)
            }}>
              <Send className="w-4 h-4 mr-2" />
              {t("common.confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
