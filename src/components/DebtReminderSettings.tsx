import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { cn } from "./ui/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { PaginationBar } from "./ui/pagination-bar"
import { Save, Bell, Plus, Trash2, Mail, CalendarIcon, Settings, Send, ChevronDown, Eye, XCircle, CheckCircle2, FileText, Clock as ClockIcon, Edit, Copy, Search, Filter, ArrowUpDown } from "lucide-react"
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

const DEFAULT_REMINDER_TEMPLATES: DebtReminderTemplate[] = [
  {
    id: "tpl-first",
    name: "First Reminder",
    description: "Friendly first reminder for upcoming payment",
    subject: "Tuition Payment Reminder",
    emailTitle: "Friendly Payment Reminder",
    message: "Dear {parent_name},\n\nThis is a friendly reminder that {student_name}'s payment of {amount} is due on {due_date} ({days_remaining} days remaining).\n\nPlease make your payment at your earliest convenience.\n\nBest regards,\nFinance Office"
  },
  {
    id: "tpl-second",
    name: "Second Reminder",
    description: "Follow-up reminder for overdue payment",
    subject: "Tuition Payment Reminder",
    emailTitle: "Second Payment Reminder",
    message: "Dear {parent_name},\n\nThis is our second reminder that {student_name}'s payment of {amount} was due on {due_date}.\n\nWe kindly ask you to settle this payment as soon as possible to avoid any disruption to your child's enrollment.\n\nBest regards,\nFinance Office"
  },
  {
    id: "tpl-final",
    name: "Final Notice",
    description: "Urgent final notice before action is taken",
    subject: "Urgent: Final Payment Notice",
    emailTitle: "Final Payment Notice",
    message: "Dear {parent_name},\n\nThis is a final notice regarding {student_name}'s outstanding payment of {amount} which was due on {due_date}.\n\nPlease contact our Finance Office immediately to make payment arrangements. Failure to do so may affect your child's enrollment status.\n\nBest regards,\nFinance Office"
  },
  {
    id: "tpl-overdue",
    name: "Overdue Notice",
    description: "Notice for payments that are already overdue",
    subject: "Overdue Payment Notice",
    emailTitle: "Overdue Payment Notice",
    message: "Dear {parent_name},\n\nWe wish to inform you that {student_name}'s payment of {amount} is now overdue as of {due_date}.\n\nPlease make immediate payment or contact our Finance Office to discuss payment arrangements.\n\nBest regards,\nFinance Office"
  }
]

// Preset email subject options based on system menus
const PRESET_EMAIL_SUBJECTS = [
  "Tuition Payment Reminder",
  "ECA Payment Reminder",
  "Trip & Activity Payment Reminder",
  "Exam Payment Reminder",
  "School Bus Payment Reminder",
  "External Invoice Payment Reminder"
]

type InvoiceStatus = "unpaid" | "overdue"

const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: "unpaid", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
]

type ReminderStatus = "new" | "reminded" | "cancelled"

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
    status: "new"
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
    status: "new"
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
    status: "new"
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
  const templateMessageRef = useRef<HTMLTextAreaElement>(null)
  const reminderMessageRef = useRef<HTMLTextAreaElement>(null)

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const reminderList = reminders || []

    const total = reminderList.length

    const scheduledReminders = reminderList.filter(r => r.status === "new")

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
      status: "new"
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
      status: "new",
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

    // Mock recipient count (in real app, this would come from backend based on filters)
    const mockRecipientCount = Math.floor(Math.random() * 150) + 50

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
      updateReminder(reminder.id, "status", "new")
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
    updateReminder(previewReminder.id, "status", "new")
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
    if (reminder.status !== "new") {
      toast.error("Cannot cancel", {
        description: "Only scheduled reminders can be cancelled"
      })
      return
    }

    cancelConfirm.confirm(() => {
      // Update to scheduled status
      updateReminder(reminder.id, "status", "new")
      updateReminder(reminder.id, "scheduledAt", undefined)

      toast.success("Schedule cancelled", {
        description: `${reminder.name} has been moved back to scheduled`
      })
      logActivity({ action: "Cancel Schedule", module: "Debt Reminders", detail: `Cancelled schedule for "${reminder.name}"` })
    })
  }

  const handleEditScheduled = (reminder: ReminderConfig) => {
    // Only allow editing scheduled reminders
    if (reminder.status !== "new") {
      toast.error("Cannot edit", {
        description: "Only scheduled reminders can be edited"
      })
      return
    }

    // Update to scheduled status to allow editing
    updateReminder(reminder.id, "status", "new")
    updateReminder(reminder.id, "scheduledAt", undefined)

    // Close preview modal
    setIsPreviewModalOpen(false)

    toast.success("Moved to scheduled for editing", {
      description: `${reminder.name} can now be edited`
    })
  }

  const getStatusBadge = (status: ReminderStatus | undefined) => {
    switch (status) {
      case "new":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">
            New
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
            New
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
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("debt.reminderSettings")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("debt.reminderSettingsDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Reminders</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{summaryStats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{summaryStats.scheduledCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Send className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{summaryStats.sentCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{summaryStats.cancelledCount}</p>
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
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="new">New</SelectItem>
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
                              handleSendNow(reminder)
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
                            disabled={!userCanEdit || reminder.status !== "new"}
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
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {t("debtReminder.sendDate")} <span className="text-destructive">*</span>
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
                  <Label className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t("debtReminder.sendTime")} <span className="text-destructive">*</span>
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
                <Textarea
                  ref={reminderMessageRef}
                  value={editingReminder.message}
                  onChange={(e) => setEditingReminder(prev => prev ? { ...prev, message: e.target.value } : prev)}
                  placeholder="Enter reminder message template"
                  rows={4}
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground">Variables:</span>
                  {["{parent_name}", "{student_name}", "{amount}", "{due_date}", "{days_remaining}"].map(v => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        const el = reminderMessageRef.current
                        if (el) {
                          const start = el.selectionStart ?? el.value.length
                          const end = el.selectionEnd ?? el.value.length
                          const newVal = el.value.slice(0, start) + v + el.value.slice(end)
                          setEditingReminder(prev => prev ? { ...prev, message: newVal } : prev)
                          requestAnimationFrame(() => {
                            el.focus()
                            el.setSelectionRange(start + v.length, start + v.length)
                          })
                        } else {
                          setEditingReminder(prev => prev ? { ...prev, message: (prev.message || "") + v } : prev)
                        }
                      }}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingReminder(null) }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={saveEditingReminder} disabled={!userCanEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save Reminder
            </Button>
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
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-blue-300 bg-blue-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">Recipient Count</h3>
                        <p className="text-sm text-blue-700">This reminder will be sent to approximately</p>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {previewReminder.recipientCount || 0}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-blue-600 space-y-1">
                      <p>- Academic Year: {formatAcademicYear(previewReminder.academicYear)}</p>
                      <p>- Term: {academicYears.find(y => y.id === previewReminder.academicYear)?.terms.find(t => t.id === previewReminder.term)?.name || previewReminder.term}</p>
                      <p>- Invoice Status Filter: {previewReminder.invoiceStatuses?.join(", ") || "All"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className={previewReminder.sendDate ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className={cn("w-5 h-5", previewReminder.sendDate ? "text-green-700" : "text-gray-400")} />
                      <div>
                        <h3 className={cn("font-semibold", previewReminder.sendDate ? "text-green-900" : "text-gray-500")}>Scheduled Send Time</h3>
                        <p className={cn("text-sm", previewReminder.sendDate ? "text-green-700" : "text-gray-400")}>
                          {previewReminder.sendDate
                            ? `${formatDisplayDate(previewReminder.sendDate)} at ${previewReminder.sendTime || "Not set"}`
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
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">KC</div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-gray-900">King's College International School</span>
                      <span className="text-xs text-gray-400 ml-2">&lt;finance@kingscollege.ac.th&gt;</span>
                      <div className="text-xs text-gray-400 mt-0.5">to: Mr. John Smith &lt;parent@example.com&gt;</div>
                    </div>
                  </div>
                  <div className="font-semibold text-base text-gray-900 mt-3 pl-[52px]">
                    {previewReminder.emailTitle
                      ? previewReminder.emailTitle
                          .replace(/\{parent_name\}/g, "Mr. John Smith")
                          .replace(/\{student_name\}/g, "James Smith")
                          .replace(/\{amount\}/g, "฿45,000")
                          .replace(/\{due_date\}/g, "31 Mar 2026")
                          .replace(/\{days_remaining\}/g, "15")
                      : <span className="text-gray-300 italic font-normal">(No email title)</span>}
                  </div>
                </div>

                {/* Email body */}
                <div className="px-6 py-6">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      const sampleVars: Record<string, string> = {
                        "{parent_name}": "Mr. John Smith",
                        "{student_name}": "James Smith",
                        "{amount}": "฿45,000",
                        "{due_date}": "31 Mar 2026",
                        "{days_remaining}": "15",
                      }
                      const msg = previewReminder.message || ""
                      if (!msg) return <span className="text-gray-300 italic">No message content</span>
                      const parts = msg.split(/(\{[a-z_]+\})/g)
                      return parts.map((part, idx) =>
                        sampleVars[part]
                          ? <span key={idx} className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{sampleVars[part]}</span>
                          : <span key={idx}>{part}</span>
                      )
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
            {(!previewReminder?.status || previewReminder?.status === "new") && (
              <Button
                onClick={handleScheduleReminder}
                disabled={!userCanEdit || !previewReminder?.sendDate}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save & Schedule
              </Button>
            )}
            {previewReminder?.status === "new" && (
              <Button onClick={() => handleEditScheduled(previewReminder)} disabled={!userCanEdit} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
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
          <div className="grid grid-cols-2 min-h-[75vh]">
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

                  <Textarea
                    ref={templateMessageRef}
                    value={templateForm.message}
                    onChange={(e) => setTemplateForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Enter message template..."
                    className="flex-1 resize-none"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground">Variables:</span>
                    {["{parent_name}", "{student_name}", "{amount}", "{due_date}", "{days_remaining}"].map(v => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="cursor-pointer text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          const el = templateMessageRef.current
                          if (el) {
                            const start = el.selectionStart ?? el.value.length
                            const end = el.selectionEnd ?? el.value.length
                            const newVal = el.value.slice(0, start) + v + el.value.slice(end)
                            setTemplateForm(f => ({ ...f, message: newVal }))
                            requestAnimationFrame(() => {
                              el.focus()
                              el.setSelectionRange(start + v.length, start + v.length)
                            })
                          } else {
                            setTemplateForm(f => ({ ...f, message: f.message + v }))
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
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      const sampleVars: Record<string,string> = {
                        "{parent_name}": "John Smith",
                        "{student_name}": "Oliver Smith",
                        "{amount}": "125,000 THB",
                        "{due_date}": "30 April 2026",
                        "{days_remaining}": "14",
                      }
                      const msg = templateForm.message || ""
                      if (!msg) return <span className="text-gray-300 italic">Message preview will appear here as you type...</span>
                      const parts = msg.split(/(\{[a-z_]+\})/g)
                      return parts.map((part, idx) =>
                        sampleVars[part]
                          ? <span key={idx} className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{sampleVars[part]}</span>
                          : <span key={idx}>{part}</span>
                      )
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("debtReminder.selectTemplate")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Select a template to auto-fill the subject, title, and message. You can edit the content after applying.
          </p>
          <div className="grid gap-3 mt-2">
            {(reminderTemplates || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No templates available. Create one in the Email Templates section.</p>
            )}
            {(reminderTemplates || []).map((template) => (
              <button
                key={template.id}
                onClick={() => templatePickerDialog.reminderId && applyTemplate(templatePickerDialog.reminderId, template)}
                className="text-left p-4 border rounded-lg hover:border-primary hover:bg-muted/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-0.5 group-hover:text-primary">{template.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{template.description}</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div><span className="font-medium text-foreground">Subject:</span> {template.subject}</div>
                      <div><span className="font-medium text-foreground">Title:</span> {template.emailTitle}</div>
                      <div className="line-clamp-2"><span className="font-medium text-foreground">Message:</span> {template.message.split("\n")[0]}</div>
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
    </div>
  )
}
