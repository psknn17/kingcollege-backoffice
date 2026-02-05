import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Save, Bell, Plus, Trash2, Mail, CalendarIcon, Settings, Send } from "lucide-react"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { toast } from "@/components/ui/sonner"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"

// Preset email subject options based on system menus
const PRESET_EMAIL_SUBJECTS = [
  "Tuition Payment Reminder",
  "ECA Payment Reminder",
  "Trip & Activity Payment Reminder",
  "Exam Payment Reminder",
  "School Bus Payment Reminder",
  "External Invoice Payment Reminder"
]

interface ReminderConfig {
  id: string
  name: string
  academicYear: string // Academic year ID (e.g., "2024-2025")
  term: string // Term ID (e.g., "1", "2", "3")
  sendDate: string // Date string in YYYY-MM-DD format
  method: "email" | "sms" | "both"
  enabled: boolean
  subject: string
  message: string
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

const initialReminders: ReminderConfig[] = [
  {
    id: "1",
    name: "First Reminder",
    academicYear: "2025-2026",
    term: "1",
    sendDate: "",
    method: "email",
    enabled: true,
    subject: "Tuition Payment Reminder",
    message: "Dear Parent, This is a friendly reminder that your child's tuition payment is due soon. Please make your payment to avoid any late fees."
  },
  {
    id: "2",
    name: "Second Reminder",
    academicYear: "2025-2026",
    term: "1",
    sendDate: "",
    method: "both",
    enabled: true,
    subject: "ECA Payment Reminder",
    message: "Dear Parent, Your child's ECA payment is due soon. Please complete your payment as soon as possible to ensure continuous enrollment."
  },
  {
    id: "3",
    name: "Final Notice",
    academicYear: "2025-2026",
    term: "1",
    sendDate: "",
    method: "both",
    enabled: true,
    subject: "School Bus Payment Reminder",
    message: "Dear Parent, This is a reminder that your child's school bus payment is due. Please contact our office immediately if you need assistance with payment arrangements."
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
  const [reminders, setReminders] = useState<ReminderConfig[]>(initialReminders)
  const [globalSettings, setGlobalSettings] = useState({
    enableReminders: true,
    fromEmail: "noreply@kingscollege.ac.th"
  })

  const addReminder = () => {
    const newReminder: ReminderConfig = {
      id: Date.now().toString(),
      name: "New Reminder",
      academicYear: academicYears[0]?.id || "",
      term: "1",
      sendDate: "",
      method: "email",
      enabled: true,
      subject: "",
      message: ""
    }
    setReminders([...reminders, newReminder])
  }

  const updateReminder = (id: string, field: keyof ReminderConfig, value: any) => {
    setReminders(reminders.map(reminder => 
      reminder.id === id ? { ...reminder, [field]: value } : reminder
    ))
  }

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(reminder => reminder.id !== id))
  }

  const saveSettings = () => {
    console.log("Saving reminder settings", { reminders, globalSettings })
    // In a real app, this would save to backend
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

    toast.success(`Reminder email sent to ${mockRecipientCount} recipients`, {
      description: `Subject: ${reminder.subject}`
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("debt.reminderSettings")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("debt.reminderSettingsDesc")}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-end">
            <Button onClick={addReminder} disabled={!userCanEdit || reminders.length >= 3} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t("debt.addReminder")}
            </Button>
          </div>

          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t("debt.globalReminderSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("debt.enableAutoReminders")}</Label>
                  <p className="text-sm text-muted-foreground">{t("debt.enableAutoRemindersDesc")}</p>
                </div>
                <Switch
                  checked={globalSettings.enableReminders}
                  onCheckedChange={(checked) =>
                    setGlobalSettings({...globalSettings, enableReminders: checked})
                  }
                  disabled={!userCanEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("debt.fromEmailAddress")}</Label>
                <Input
                  value={globalSettings.fromEmail}
                  onChange={(e) =>
                    setGlobalSettings({...globalSettings, fromEmail: e.target.value})
                  }
                  placeholder="noreply@example.com"
                  disabled={!userCanEdit}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reminder Configurations */}
          <div className="space-y-4">
            {reminders.map((reminder, index) => (
              <Card key={reminder.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      <Input
                        value={reminder.name}
                        onChange={(e) => updateReminder(reminder.id, "name", e.target.value)}
                        className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                        disabled={!userCanEdit}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.enabled}
                        onCheckedChange={(checked) => updateReminder(reminder.id, "enabled", checked)}
                        disabled={!userCanEdit}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteReminder(reminder.id)}
                        disabled={!userCanEdit}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Academic Year and Term Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("common.academicYear")}</Label>
                      <Select
                        value={reminder.academicYear}
                        onValueChange={(value) => updateReminder(reminder.id, "academicYear", value)}
                        disabled={!userCanEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("common.selectYear")} />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map(year => (
                            <SelectItem key={year.id} value={year.id}>
                              {year.name}
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
                        disabled={!userCanEdit}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("debt.emailSubject")}</Label>
                      <Select
                        value={reminder.subject}
                        onValueChange={(value) => updateReminder(reminder.id, "subject", value)}
                        disabled={!userCanEdit}
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
                      <Label className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {t("debt.sendDate")}
                      </Label>
                      <Input
                        type="date"
                        value={reminder.sendDate}
                        onChange={(e) => updateReminder(reminder.id, "sendDate", e.target.value)}
                        disabled={!userCanEdit}
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
                      disabled={!userCanEdit}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("debt.availableVariables")}: {"{parent_name}"}, {"{student_name}"}, {"{amount}"}, {"{due_date}"}, {"{days_remaining}"}
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">{t("debt.reminderPreview")}</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>{t("common.academicYear")}:</strong> {reminder.academicYear}</p>
                      <p><strong>{t("common.term")}:</strong> {academicYears.find(y => y.id === reminder.academicYear)?.terms.find(t => t.id === reminder.term)?.name || reminder.term}</p>
                      <p><strong>{t("debt.sendDate")}:</strong> {formatDisplayDate(reminder.sendDate)}</p>
                      <p><strong>{t("common.status")}:</strong>
                        <span className={reminder.enabled ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                          {reminder.enabled ? t("common.active") : t("common.disabled")}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Send Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSendNow(reminder)}
                      disabled={!userCanEdit || !reminder.enabled || !reminder.subject || !reminder.message}
                      className="flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} size="lg" className="px-8" disabled={!userCanEdit}>
              <Save className="w-4 h-4 mr-2" />
              {t("debt.saveAllSettings")}
            </Button>
          </div>
      </div>
    </div>
  )
}