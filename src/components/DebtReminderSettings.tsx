import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Save, Bell, Plus, Trash2, Mail, CalendarIcon, History, Settings, TrendingUp, Users, CheckCircle, Eye, Search, MoreVertical, Download, Send, FileText } from "lucide-react"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"

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

// Mock history data
const mockHistory = [
  {
    id: "h1",
    sentDate: "2026-01-20",
    subject: "Tuition Payment Reminder",
    recipients: 145,
    status: "sent",
    academicYear: "2025-2026",
    term: "Term 1"
  },
  {
    id: "h2",
    sentDate: "2026-01-15",
    subject: "ECA Payment Reminder",
    recipients: 89,
    status: "sent",
    academicYear: "2025-2026",
    term: "Term 1"
  },
  {
    id: "h3",
    sentDate: "2026-01-10",
    subject: "School Bus Payment Reminder",
    recipients: 67,
    status: "sent",
    academicYear: "2025-2026",
    term: "Term 1"
  },
  {
    id: "h4",
    sentDate: "2025-12-20",
    subject: "Tuition Payment Reminder",
    recipients: 152,
    status: "sent",
    academicYear: "2025-2026",
    term: "Term 1"
  },
  {
    id: "h5",
    sentDate: "2025-12-15",
    subject: "Exam Payment Reminder",
    recipients: 98,
    status: "sent",
    academicYear: "2025-2026",
    term: "Term 1"
  }
]

export function DebtReminderSettings() {
  const { t } = useLanguage()
  const { academicYears } = useAcademicYears()
  const [reminders, setReminders] = useState<ReminderConfig[]>(initialReminders)
  const [globalSettings, setGlobalSettings] = useState({
    enableReminders: true,
    fromEmail: "noreply@kingscollege.ac.th"
  })
  const [activeTab, setActiveTab] = useState("settings")
  const [historySearch, setHistorySearch] = useState("")

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={addReminder} disabled={reminders.length >= 3} className="flex items-center gap-2">
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
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.enabled}
                        onCheckedChange={(checked) => updateReminder(reminder.id, "enabled", checked)}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteReminder(reminder.id)}
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
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} size="lg" className="px-8">
              <Save className="w-4 h-4 mr-2" />
              {t("debt.saveAllSettings")}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Reminders Sent</p>
                    <p className="text-2xl font-bold">{mockHistory.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Recipients</p>
                    <p className="text-2xl font-bold">
                      {mockHistory.reduce((sum, item) => sum + item.recipients, 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">100%</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by subject, academic year, or term..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Filter by Date
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Reminder History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold text-sm">{t("common.date")}</th>
                      <th className="text-left p-4 font-semibold text-sm">Subject</th>
                      <th className="text-left p-4 font-semibold text-sm">{t("common.academicYear")}</th>
                      <th className="text-left p-4 font-semibold text-sm">{t("common.term")}</th>
                      <th className="text-right p-4 font-semibold text-sm">Recipients</th>
                      <th className="text-center p-4 font-semibold text-sm">{t("common.status")}</th>
                      <th className="text-center p-4 font-semibold text-sm">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockHistory
                      .filter((item) => {
                        if (!historySearch) return true
                        const search = historySearch.toLowerCase()
                        return (
                          item.subject.toLowerCase().includes(search) ||
                          item.academicYear.toLowerCase().includes(search) ||
                          item.term.toLowerCase().includes(search)
                        )
                      })
                      .map((item) => (
                        <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{formatDisplayDate(item.sentDate)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span>{item.subject}</span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{item.academicYear}</td>
                          <td className="p-4 text-muted-foreground">{item.term}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{item.recipients}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3" />
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="w-4 h-4" />
                                  View Recipients
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Send className="w-4 h-4" />
                                  Resend
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="w-4 h-4" />
                                  Download Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Empty State */}
                {mockHistory.filter((item) => {
                  if (!historySearch) return true
                  const search = historySearch.toLowerCase()
                  return (
                    item.subject.toLowerCase().includes(search) ||
                    item.academicYear.toLowerCase().includes(search) ||
                    item.term.toLowerCase().includes(search)
                  )
                }).length === 0 && (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reminders found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}