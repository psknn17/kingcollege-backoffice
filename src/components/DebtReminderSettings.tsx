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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { Save, Bell, Plus, Trash2, Mail, CalendarIcon, Settings, Send, ChevronDown, Eye, XCircle, CheckCircle2, FileText, Clock as ClockIcon, Edit, Copy } from "lucide-react"
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

type ReminderStatus = "draft" | "scheduled" | "sent" | "cancelled"

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
    status: "draft"
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
    status: "draft"
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
    status: "draft"
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
  const [isScheduledCollapsed, setIsScheduledCollapsed] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [reminderHistory, setReminderHistory] = useState<{ id: string; sentDate: string; subject: string; academicYear: string; term: string; recipients: number; status: string }[]>([])
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null)
  const [templatePickerDialog, setTemplatePickerDialog] = useState<{ isOpen: boolean; reminderId: string | null }>({ isOpen: false, reminderId: null })
  const [reminderTemplates, setReminderTemplates] = usePersistedState<DebtReminderTemplate[]>("debt-reminder:templates", DEFAULT_REMINDER_TEMPLATES)
  const [templateManageDialog, setTemplateManageDialog] = useState<{ isOpen: boolean; editing: DebtReminderTemplate | null }>({ isOpen: false, editing: null })

  // Get unique due dates from invoices filtered by reminder's academicYear, term, invoiceStatuses
  const getAvailableDueDates = (reminder: ReminderConfig): string[] => {
    try {
      const stored = localStorage.getItem("createdInvoices")
      if (!stored) return []
      const invoices: any[] = JSON.parse(stored)
      const dates = new Set<string>()

      // Normalize academic year: "2025/2026" → "2025/2026"
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

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const reminderList = reminders || []

    const totalRecipients = reminderList
      .filter(r => r.enabled && r.status !== "cancelled")
      .reduce((sum, r) => sum + (r.recipientCount || 0), 0)

    const scheduledReminders = reminderList.filter(r => r.status === "scheduled")

    const sentToday = reminderList.filter(r => {
      if (r.status !== "sent" || !r.sentAt) return false
      const sentDate = new Date(r.sentAt)
      return sentDate >= todayStart
    }).length

    const nextScheduled = scheduledReminders
      .filter(r => r.sendDate)
      .sort((a, b) => {
        const dateA = new Date(`${a.sendDate}T${a.sendTime || "00:00"}`)
        const dateB = new Date(`${b.sendDate}T${b.sendTime || "00:00"}`)
        return dateA.getTime() - dateB.getTime()
      })[0]

    return {
      totalRecipients,
      scheduledCount: scheduledReminders.length,
      sentToday,
      nextScheduled
    }
  }, [reminders])

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
      status: "draft"
    }
    setReminders((currentReminders) => [...(currentReminders || []), newReminder])
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
    } else {
      const newTemplate: DebtReminderTemplate = { id: `tpl-${Date.now()}`, ...templateForm }
      setReminderTemplates((current) => [...(current || []), newTemplate])
      toast.success("Template created")
    }
    setTemplateManageDialog({ isOpen: false, editing: null })
  }

  const deleteTemplate = (id: string) => {
    setReminderTemplates((current) => (current || []).filter(t => t.id !== id))
    toast.success("Template deleted")
  }

  const applyTemplate = (reminderId: string, template: DebtReminderTemplate) => {
    setReminders((current) =>
      (current || []).map(r =>
        r.id === reminderId
          ? { ...r, subject: template.subject, emailTitle: template.emailTitle, message: template.message }
          : r
      )
    )
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
      status: "draft",
      sendDate: "",
      sendTime: reminder.sendTime || "09:00",
      scheduledAt: undefined,
      sentAt: undefined,
      recipientCount: undefined,
    }
    setReminders((currentReminders) => [...(currentReminders || []), duplicate])
    toast.success("Reminder duplicated", {
      description: `"${duplicate.name}" created as draft`
    })
  }

  const handleOpenHistory = () => {
    try {
      const stored = localStorage.getItem("emailReminderHistory")
      const history = stored ? JSON.parse(stored) : []
      setReminderHistory(history)
    } catch {
      setReminderHistory([])
    }
    setIsHistoryModalOpen(true)
  }

  const handleDateChange = (id: string, newDate: string) => {
    const reminder = (reminders || []).find(r => r.id === id)
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
    updateReminder(id, "sendDate", newDate)

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
    const reminder = (reminders || []).find(r => r.id === id)
    if (!reminder) return

    // Check if reminder is locked (scheduled)
    if (isReminderLocked(reminder)) {
      toast.error("Cannot edit", {
        description: "Scheduled reminders are locked. Cancel schedule first to edit."
      })
      return
    }

    // Update the time
    updateReminder(id, "sendTime", newTime)

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

  // Helper to check if reminder is locked (scheduled reminders are read-only)
  const isReminderLocked = (reminder: ReminderConfig): boolean => {
    return reminder.status === "scheduled"
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
      status: "sent"
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
    updateReminder(reminder.id, "status", "sent")
    updateReminder(reminder.id, "sentAt", new Date().toISOString())
    updateReminder(reminder.id, "recipientCount", mockRecipientCount)

    toast.success(`Reminder email sent to ${mockRecipientCount} recipients`, {
      description: `Subject: ${reminder.subject}`
    })
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
      updateReminder(reminder.id, "status", "draft")
    }

    // Mock recipient count
    const mockRecipientCount = Math.floor(Math.random() * 150) + 50
    updateReminder(reminder.id, "recipientCount", mockRecipientCount)

    setPreviewReminder(reminder)
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
      // Update to draft status
      updateReminder(reminder.id, "status", "draft")
      updateReminder(reminder.id, "scheduledAt", undefined)

      toast.success("Schedule cancelled", {
        description: `${reminder.name} has been moved back to draft`
      })
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

    // Update to draft status to allow editing
    updateReminder(reminder.id, "status", "draft")
    updateReminder(reminder.id, "scheduledAt", undefined)

    // Close preview modal
    setIsPreviewModalOpen(false)

    toast.success("Moved to draft for editing", {
      description: `${reminder.name} can now be edited`
    })
  }

  const getStatusBadge = (status: ReminderStatus | undefined) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm">
            <ClockIcon className="w-3.5 h-3.5" />
            Scheduled
          </span>
        )
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border-2 border-green-500 bg-green-50 text-green-700 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sent
          </span>
        )
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border-2 border-red-500 bg-red-50 text-red-700 shadow-sm">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        )
      case "draft":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border-2 border-gray-400 bg-white text-gray-700 shadow-sm">
            <FileText className="w-3.5 h-3.5" />
            Draft
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{t("debt.reminderSettings")}</h2>
          <p className="text-base text-muted-foreground mt-1">
            {t("debt.reminderSettingsDesc")}
          </p>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalRecipients}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all active reminders</p>
          </CardContent>
        </Card>

        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-blue-700">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{summaryStats.scheduledCount}</div>
            <p className="text-xs text-blue-600 mt-1">Pending to send</p>
          </CardContent>
        </Card>

        <Card
          className="border-green-300 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={handleOpenHistory}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-green-700 flex items-center gap-1">
              Remind History
              <span className="text-xs font-normal text-green-600 ml-1">(click to view)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{summaryStats.sentToday}</div>
            <p className="text-xs text-green-600 mt-1">Sent today</p>
          </CardContent>
        </Card>

        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-amber-700">Next Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryStats.nextScheduled ? (
              <>
                <div className="text-sm font-bold text-amber-700">
                  {formatDisplayDate(summaryStats.nextScheduled.sendDate)}
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  at {summaryStats.nextScheduled.sendTime} - {summaryStats.nextScheduled.name}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No scheduled reminders</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={addReminder} disabled={!userCanEdit} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("debt.addReminder")}
          </Button>
        </div>

        {/* Email Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl font-semibold">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("debtReminder.templates")}
              </div>
              <Button size="sm" onClick={openNewTemplate} disabled={!userCanEdit} className="flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                {t("debtReminder.addTemplate")}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(reminderTemplates || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No templates yet. Create one to get started.</p>
            ) : (
              <div className="divide-y">
                {(reminderTemplates || []).map((template) => (
                  <div key={template.id} className="flex items-start justify-between py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base">{template.name}</div>
                      {template.description && <div className="text-sm text-muted-foreground mt-0.5">{template.description}</div>}
                      <div className="text-sm text-muted-foreground mt-1 space-x-3">
                        <span><span className="text-foreground font-medium">Subject:</span> {template.subject}</span>
                        <span><span className="text-foreground font-medium">Title:</span> {template.emailTitle}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditTemplate(template)} disabled={!userCanEdit} className="h-7 w-7 p-0">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate(template.id)} disabled={!userCanEdit} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft and Sent Reminders */}
        <div className="space-y-4">
          {(reminders || []).filter(r => r.status !== "scheduled" && r.status !== "sent").map((reminder, index) => (
            <Card key={reminder.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Mail className="w-5 h-5 flex-shrink-0" />
                      <Input
                        value={reminder.name}
                        onChange={(e) => updateReminder(reminder.id, "name", e.target.value)}
                        className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 flex-1"
                        disabled={!userCanEdit || isReminderLocked(reminder)}
                        placeholder={reminder.name || "Enter reminder name"}
                      />
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(reminder.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTemplatePickerDialog({ isOpen: true, reminderId: reminder.id })}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
                      className="flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      {t("debtReminder.useTemplate")}
                    </Button>
                    <Switch
                      checked={reminder.enabled}
                      onCheckedChange={(checked) => updateReminder(reminder.id, "enabled", checked)}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateReminder(reminder)}
                      disabled={!userCanEdit}
                      title="Duplicate reminder"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteReminder(reminder.id)}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Academic Year & Term */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("debtReminder.academicYear")}</Label>
                    <Select
                      value={reminder.academicYear}
                      onValueChange={(value) => updateReminder(reminder.id, "academicYear", value)}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
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
                    <Label>{t("debtReminder.term")}</Label>
                    <Select
                      value={reminder.term}
                      onValueChange={(value) => updateReminder(reminder.id, "term", value)}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("debtReminder.selectTerm")} />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears
                          .find(y => y.id === reminder.academicYear)
                          ?.terms.map(term => (
                            <SelectItem key={term.id} value={term.id}>
                              {term.name}
                            </SelectItem>
                          )) || []}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Email Subject, Invoice Status Filter & Due Date Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t("debtReminder.emailSubject")}</Label>
                    <Select
                      value={reminder.subject}
                      onValueChange={(value) => updateReminder(reminder.id, "subject", value)}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap h-9 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!userCanEdit || isReminderLocked(reminder)}
                        >
                          <span className="truncate">
                            {reminder.invoiceStatuses?.length
                              ? reminder.invoiceStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")
                              : t("debtReminder.selectInvoiceStatuses")}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-2" align="start">
                        <div className="space-y-1">
                          {INVOICE_STATUS_OPTIONS.map(option => (
                            <div key={option.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                              onClick={() => {
                                if (!userCanEdit) return
                                const current = reminder.invoiceStatuses || []
                                const updated = current.includes(option.value)
                                  ? current.filter(s => s !== option.value)
                                  : [...current, option.value]
                                updateReminder(reminder.id, "invoiceStatuses", updated)
                              }}
                            >
                              <Checkbox
                                id={`status-${reminder.id}-${option.value}`}
                                checked={reminder.invoiceStatuses?.includes(option.value) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = reminder.invoiceStatuses || []
                                  const updated = checked
                                    ? [...current, option.value]
                                    : current.filter(s => s !== option.value)
                                  updateReminder(reminder.id, "invoiceStatuses", updated)
                                }}
                                disabled={!userCanEdit}
                              />
                              <Label
                                htmlFor={`status-${reminder.id}-${option.value}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("debtReminder.dueDateFilter")}</Label>
                    <Select
                      value={reminder.dueDateFilter || "all"}
                      onValueChange={(value) => updateReminder(reminder.id, "dueDateFilter", value)}
                      disabled={!userCanEdit || isReminderLocked(reminder)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Due Dates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Due Dates</SelectItem>
                        {getAvailableDueDates(reminder).map(date => (
                          <SelectItem key={date} value={date}>
                            {format(new Date(date), "dd MMM yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Email Title */}
                <div className="space-y-2">
                  <Label>{t("debtReminder.emailSubject")}</Label>
                  <Input
                    value={reminder.emailTitle}
                    onChange={(e) => updateReminder(reminder.id, "emailTitle", e.target.value)}
                    placeholder="Enter custom email title..."
                    disabled={!userCanEdit || isReminderLocked(reminder)}
                  />
                </div>

                {/* Row 4: Send Date & Send Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {t("debtReminder.sendDate")}
                    </Label>
                    <Popover open={openCalendarId === reminder.id} onOpenChange={(open) => setOpenCalendarId(open ? reminder.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-left font-normal", !reminder.sendDate && "text-muted-foreground")}
                          disabled={!userCanEdit}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reminder.sendDate ? format(new Date(reminder.sendDate), "dd/MM/yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reminder.sendDate ? new Date(reminder.sendDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleDateChange(reminder.id, format(date, "yyyy-MM-dd"))
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
                      {t("debtReminder.sendTime")}
                    </Label>
                    <Input
                      type="time"
                      value={reminder.sendTime}
                      onChange={(e) => handleTimeChange(reminder.id, e.target.value)}
                      disabled={!userCanEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("debtReminder.messageTemplate")}</Label>
                  <Textarea
                    value={reminder.message}
                    onChange={(e) => updateReminder(reminder.id, "message", e.target.value)}
                    placeholder="Enter reminder message template"
                    rows={4}
                    disabled={!userCanEdit || isReminderLocked(reminder)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {"{parent_name}"}, {"{student_name}"}, {"{amount}"}, {"{due_date}"}, {"{days_remaining}"}
                  </p>
                </div>

                {/* Preview */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">{t("debtReminder.scheduledReminders")}</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Academic Year:</strong> {formatAcademicYear(reminder.academicYear) || "Not selected"}</p>
                    <p><strong>Term:</strong> {academicYears.find(y => y.id === reminder.academicYear)?.terms.find(t => t.id === reminder.term)?.name || reminder.term || "Not selected"}</p>
                    <p><strong>Send Date:</strong> {formatDisplayDate(reminder.sendDate)} {reminder.sendTime && `at ${reminder.sendTime}`}</p>
                    <p><strong>Invoice Statuses:</strong> {reminder.invoiceStatuses?.length ? reminder.invoiceStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "None selected"}</p>
                    <p><strong>Status:</strong>
                      <span className={reminder.enabled ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                        {reminder.enabled ? "Active" : "Disabled"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  {(!reminder.status || reminder.status === "draft") && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handlePreviewReminder(reminder)}
                        disabled={!userCanEdit || !reminder.enabled || !reminder.subject || !reminder.message}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview & Schedule
                      </Button>
                      <Button
                        onClick={() => handleSendNow(reminder)}
                        disabled={!userCanEdit || !reminder.enabled || !reminder.subject || !reminder.message}
                        className="flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send Now
                      </Button>
                    </>
                  )}
                  {reminder.status === "scheduled" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handlePreviewReminder(reminder)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Preview
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelSchedule(reminder)}
                        disabled={!userCanEdit || !isScheduledInFuture(reminder)}
                        title={!isScheduledInFuture(reminder) ? "Cannot cancel — scheduled time has passed" : "Cancel schedule"}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Schedule
                      </Button>
                    </>
                  )}
                  {reminder.status === "sent" && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Sent on {reminder.sentAt ? new Date(reminder.sentAt).toLocaleString() : "Unknown"}
                      {reminder.recipientCount && ` to ${reminder.recipientCount} recipients`}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Scheduled Reminders - Collapsible */}
        {(reminders || []).filter(r => r.status === "scheduled").length > 0 && (
          <Collapsible open={!isScheduledCollapsed} onOpenChange={(open) => setIsScheduledCollapsed(!open)}>
            <Card className="border-blue-300">
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -m-4 p-4 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-base">
                        {t("debtReminder.scheduledReminders")} ({(reminders || []).filter(r => r.status === "scheduled").length})
                      </CardTitle>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isScheduledCollapsed ? '' : 'rotate-180'}`} />
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Lock Warning */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <ClockIcon className="w-4 h-4 flex-shrink-0" />
                    <p><strong>Locked:</strong> Scheduled reminders are read-only. Click "Cancel Schedule" to edit.</p>
                  </div>

                  {(reminders || []).filter(r => r.status === "scheduled").map((reminder) => (
                    <Card key={reminder.id} className="border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Mail className="w-5 h-5 flex-shrink-0" />
                              <Input
                                value={reminder.name}
                                onChange={(e) => updateReminder(reminder.id, "name", e.target.value)}
                                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 flex-1"
                                disabled={!userCanEdit || isReminderLocked(reminder)}
                                placeholder={reminder.name || "Reminder name"}
                              />
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(reminder.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTemplatePickerDialog({ isOpen: true, reminderId: reminder.id })}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                              className="flex items-center gap-1.5 text-xs"
                            >
                              <FileText className="w-3 h-3" />
                              {t("debtReminder.useTemplate")}
                            </Button>
                            <Switch
                              checked={reminder.enabled}
                              onCheckedChange={(checked) => updateReminder(reminder.id, "enabled", checked)}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicateReminder(reminder)}
                              disabled={!userCanEdit}
                              title="Duplicate reminder"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteReminder(reminder.id)}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                              title={isReminderLocked(reminder) ? "Cancel schedule first to delete" : "Delete reminder"}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Row 1: Academic Year & Term */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("common.academicYear")}</Label>
                            <Select
                              value={reminder.academicYear}
                              onValueChange={(value) => updateReminder(reminder.id, "academicYear", value)}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("common.selectYear")} />
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
                            <Label>{t("common.term")}</Label>
                            <Select
                              value={reminder.term}
                              onValueChange={(value) => updateReminder(reminder.id, "term", value)}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("common.selectTerm")} />
                              </SelectTrigger>
                              <SelectContent>
                                {academicYears
                                  .find(y => y.id === reminder.academicYear)
                                  ?.terms.map(term => (
                                    <SelectItem key={term.id} value={term.id}>
                                      {term.name}
                                    </SelectItem>
                                  )) || []}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 2: Email Subject & Invoice Status Filter */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t("debt.emailSubject")}</Label>
                            <Select
                              value={reminder.subject}
                              onValueChange={(value) => updateReminder(reminder.id, "subject", value)}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("debt.emailSubjectPlaceholder")} />
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
                            <Label>Invoice Status Filter</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap h-9 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={!userCanEdit || isReminderLocked(reminder)}
                                >
                                  <span className="truncate">
                                    {reminder.invoiceStatuses?.length
                                      ? reminder.invoiceStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")
                                      : "Select invoice statuses"}
                                  </span>
                                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[200px] p-2" align="start">
                                <div className="space-y-1">
                                  {INVOICE_STATUS_OPTIONS.map(option => (
                                    <div key={option.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                                      onClick={() => {
                                        if (!userCanEdit) return
                                        const current = reminder.invoiceStatuses || []
                                        const updated = current.includes(option.value)
                                          ? current.filter(s => s !== option.value)
                                          : [...current, option.value]
                                        updateReminder(reminder.id, "invoiceStatuses", updated)
                                      }}
                                    >
                                      <Checkbox
                                        id={`status-${reminder.id}-${option.value}`}
                                        checked={reminder.invoiceStatuses?.includes(option.value) ?? false}
                                        onCheckedChange={(checked) => {
                                          const current = reminder.invoiceStatuses || []
                                          const updated = checked
                                            ? [...current, option.value]
                                            : current.filter(s => s !== option.value)
                                          updateReminder(reminder.id, "invoiceStatuses", updated)
                                        }}
                                        disabled={!userCanEdit || isReminderLocked(reminder)}
                                      />
                                      <Label
                                        htmlFor={`status-${reminder.id}-${option.value}`}
                                        className="text-sm font-normal cursor-pointer flex-1"
                                      >
                                        {option.label}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Row 3: Email Title */}
                        <div className="space-y-2">
                          <Label>Email Title</Label>
                          <Input
                            value={reminder.emailTitle}
                            onChange={(e) => updateReminder(reminder.id, "emailTitle", e.target.value)}
                            placeholder="Enter custom email title..."
                            disabled={!userCanEdit || isReminderLocked(reminder)}
                          />
                        </div>

                        {/* Row 4: Send Date & Send Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4" />
                              {t("debt.sendDate")}
                            </Label>
                            <Popover open={openCalendarId === `scheduled-${reminder.id}`} onOpenChange={(open) => setOpenCalendarId(open ? `scheduled-${reminder.id}` : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn("w-full justify-start text-left font-normal", !reminder.sendDate && "text-muted-foreground")}
                                  disabled={!userCanEdit || isReminderLocked(reminder)}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {reminder.sendDate ? format(new Date(reminder.sendDate), "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={reminder.sendDate ? new Date(reminder.sendDate) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      handleDateChange(reminder.id, format(date, "yyyy-MM-dd"))
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
                              Send Time
                            </Label>
                            <Input
                              type="time"
                              value={reminder.sendTime}
                              onChange={(e) => handleTimeChange(reminder.id, e.target.value)}
                              disabled={!userCanEdit || isReminderLocked(reminder)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{t("debt.messageTemplate")}</Label>
                          <Textarea
                            value={reminder.message}
                            onChange={(e) => updateReminder(reminder.id, "message", e.target.value)}
                            placeholder={t("debt.messageTemplatePlaceholder")}
                            rows={4}
                            disabled={!userCanEdit || isReminderLocked(reminder)}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t("debt.availableVariables")}: {"{parent_name}"}, {"{student_name}"}, {"{amount}"}, {"{due_date}"}, {"{days_remaining}"}
                          </p>
                        </div>

                        {/* Preview */}
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-2">{t("debt.reminderPreview")}</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>{t("common.academicYear")}:</strong> {formatAcademicYear(reminder.academicYear)}</p>
                            <p><strong>{t("common.term")}:</strong> {academicYears.find(y => y.id === reminder.academicYear)?.terms.find(t => t.id === reminder.term)?.name || reminder.term}</p>
                            <p><strong>{t("debt.sendDate")}:</strong> {formatDisplayDate(reminder.sendDate)} {reminder.sendTime && `at ${reminder.sendTime}`}</p>
                            <p><strong>Invoice Statuses:</strong> {reminder.invoiceStatuses?.length ? reminder.invoiceStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ") : "None selected"}</p>
                            <p><strong>{t("common.status")}:</strong>
                              <span className={reminder.enabled ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                                {reminder.enabled ? t("common.active") : t("common.disabled")}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handlePreviewReminder(reminder)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Preview
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleCancelSchedule(reminder)}
                            disabled={!userCanEdit || !isScheduledInFuture(reminder)}
                            title={!isScheduledInFuture(reminder) ? "Cannot cancel — scheduled time has passed" : "Cancel schedule"}
                            className="flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Schedule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>

      {/* Preview & Schedule Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-3xl p-6 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview Reminder - {previewReminder?.name}
            </DialogTitle>
          </DialogHeader>

          {previewReminder && (
            <div className="flex-1 overflow-y-auto space-y-6 py-4">
              {/* Recipient Info */}
              <Card className="border-blue-300 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Recipient Count</h3>
                      <p className="text-sm text-blue-700">This reminder will be sent to approximately</p>
                    </div>
                    <div className="text-3xl font-bold text-blue-700">
                      {previewReminder.recipientCount || 0}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-blue-600 space-y-1">
                    <p>• Academic Year: {formatAcademicYear(previewReminder.academicYear)}</p>
                    <p>• Term: {academicYears.find(y => y.id === previewReminder.academicYear)?.terms.find(t => t.id === previewReminder.term)?.name || previewReminder.term}</p>
                    <p>• Invoice Status Filter: {previewReminder.invoiceStatuses?.join(", ")}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Email Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Email Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Email Title</Label>
                    <div className="p-3 bg-muted rounded border font-semibold text-lg">
                      {previewReminder.emailTitle}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Message Body</Label>
                    <div className="p-4 bg-muted rounded border whitespace-pre-wrap">
                      {previewReminder.message}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="font-medium text-amber-900 mb-1">Variable Placeholders:</p>
                    <p>Variables like {"{parent_name}"}, {"{student_name}"}, {"{amount}"} will be replaced with actual values when sent.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule Info */}
              {previewReminder.sendDate && (
                <Card className="border-green-300 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="w-5 h-5 text-green-700" />
                      <div>
                        <h3 className="font-semibold text-green-900">Scheduled Send Time</h3>
                        <p className="text-sm text-green-700">
                          {formatDisplayDate(previewReminder.sendDate)} at {previewReminder.sendTime}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>{t("common.close")}</Button>
            {(!previewReminder?.status || previewReminder?.status === "draft") && (
              <Button
                onClick={handleScheduleReminder}
                disabled={!userCanEdit || !previewReminder?.sendDate}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save & Schedule
              </Button>
            )}
            {previewReminder?.status === "scheduled" && (
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
        <DialogContent className="max-w-4xl w-full flex flex-col p-0 gap-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
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
          <div className="px-6 py-2">
            {reminderHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Mail className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">No reminder history yet</p>
                <p className="text-xs mt-1">Sent reminders will appear here</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date Sent</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Academic Year</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Term</th>
                      <th className="text-right py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipients</th>
                      <th className="text-center py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                </table>
                <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                  <table className="w-full text-sm">
                    <tbody className="divide-y">
                      {[...reminderHistory].reverse().slice(0, 10).map((entry, idx) => (
                        <tr key={entry.id ?? idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap text-sm">
                            {entry.sentDate ? formatDisplayDate(entry.sentDate) : "-"}
                          </td>
                          <td className="py-3.5 px-5 font-medium text-sm">{entry.subject}</td>
                          <td className="py-3.5 px-5 text-muted-foreground text-sm">{formatAcademicYear(entry.academicYear) || "-"}</td>
                          <td className="py-3.5 px-5 text-muted-foreground text-sm">{entry.term || "-"}</td>
                          <td className="py-3.5 px-5 text-right">
                            <span className="font-semibold text-sm">{entry.recipients?.toLocaleString() ?? "-"}</span>
                            <span className="text-xs text-muted-foreground ml-1">recipients</span>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Sent
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Template Dialog */}
      <Dialog open={templateManageDialog.isOpen} onOpenChange={(open) => !open && setTemplateManageDialog({ isOpen: false, editing: null })}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>{templateManageDialog.editing ? t("debtReminder.editTemplate") : t("debtReminder.addTemplate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name <span className="text-destructive">*</span></Label>
              <Input value={templateForm.name} onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. First Reminder" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={templateForm.description} onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
            </div>
            <div className="space-y-2">
              <Label>Email Title</Label>
              <Input value={templateForm.emailTitle} onChange={(e) => setTemplateForm(f => ({ ...f, emailTitle: e.target.value }))} placeholder="e.g. Friendly Payment Reminder" />
            </div>
            <div className="space-y-2">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Textarea
                ref={templateMessageRef}
                value={templateForm.message}
                onChange={(e) => setTemplateForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Enter message template..."
                rows={4}
              />
              <div className="flex flex-wrap items-center gap-1.5">
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
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setTemplateManageDialog({ isOpen: false, editing: null })}>{t("common.cancel")}</Button>
            <Button onClick={saveTemplateForm}><Save className="w-4 h-4 mr-2" />{templateManageDialog.editing ? t("common.saveChanges") : t("debtReminder.addTemplate")}</Button>
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
                  <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap pt-0.5">Use this →</span>
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

      <ConfirmDialog
        open={cancelConfirm.isOpen}
        onOpenChange={cancelConfirm.setIsOpen}
        onConfirm={cancelConfirm.handleConfirm}
        titleKey="Cancel Schedule"
        descriptionKey="Are you sure you want to cancel this scheduled reminder? It will be moved back to draft status."
        variant="destructive"
      />
    </div>
  )
}