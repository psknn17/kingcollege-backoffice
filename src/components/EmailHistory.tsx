import { useState, useEffect } from "react"
import { downloadAsXlsx, formatAcademicYear } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { cn } from "./ui/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Mail, CalendarIcon, History, Users, CheckCircle, TrendingUp, Eye, FileText, Send, Download, MoreVertical, Search, X, AlertCircle } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "@/components/ui/sonner"
import { useSchoolSettings } from "@/hooks/useSchoolSettings"
import { usePersistedState } from "@/hooks/usePersistedState"
import { format } from "date-fns"

const mockHistory = [
  {
    id: "h1",
    sentDate: "2026-01-20",
    subject: "Tuition Payment Reminder",
    academicYear: "2025-2026",
    term: "Term 1",
    recipients: 145,
    status: "sent"
  },
  {
    id: "h2",
    sentDate: "2026-01-15",
    subject: "ECA Payment Reminder",
    academicYear: "2025-2026",
    term: "Term 1",
    recipients: 89,
    status: "sent"
  },
  {
    id: "h3",
    sentDate: "2026-01-10",
    subject: "School Bus Payment Reminder",
    academicYear: "2025-2026",
    term: "Term 1",
    recipients: 67,
    status: "sent"
  },
  {
    id: "h4",
    sentDate: "2025-12-20",
    subject: "Tuition Payment Reminder",
    academicYear: "2025-2026",
    term: "Term 1",
    recipients: 152,
    status: "sent"
  },
  {
    id: "h5",
    sentDate: "2025-12-15",
    subject: "Exam Payment Reminder",
    academicYear: "2025-2026",
    term: "Term 1",
    recipients: 98,
    status: "sent"
  }
]

const loadEmailHistoryFromStorage = () => {
  try {
    const stored = localStorage.getItem("emailReminderHistory")
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load email history:", error)
  }
  return []
}

const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString)
  return format(date, 'd MMMM yyyy')
}

const generateMockRecipients = (count: number, subject: string) => {
  const mockNames = [
    "John Smith", "Mary Johnson", "Robert Williams", "Patricia Brown", "Michael Jones",
    "Jennifer Garcia", "William Martinez", "Linda Rodriguez", "David Lee", "Barbara Wilson",
    "Richard Anderson", "Susan Thomas", "Joseph Taylor", "Jessica Moore", "Thomas Jackson"
  ]
  const failureReasons = [
    "Invalid email address",
    "Mailbox full",
    "Email server rejected",
    "Recipient blocked sender",
    "Domain not found",
    "Connection timeout",
    "Spam filter blocked"
  ]
  const recipients = []
  for (let i = 0; i < count; i++) {
    const name = mockNames[i % mockNames.length]
    const status = Math.random() > 0.05 ? "delivered" : "failed"
    const recipient: any = {
      id: `recipient-${i}`,
      name: `${name} (${i + 1})`,
      email: `parent${i + 1}@example.com`,
      studentName: `Student ${i + 1}`,
      status
    }
    if (status === "failed") {
      recipient.failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)]
    }
    recipients.push(recipient)
  }
  return recipients
}

export function EmailHistory() {
  const { t } = useLanguage()
  const schoolSettings = useSchoolSettings()
  const [historySearch, setHistorySearch] = usePersistedState("email-history:search", "")
  const [detailsDialog, setDetailsDialog] = useState<any>(null)
  const [recipientsDialog, setRecipientsDialog] = useState<any>(null)
  const [resendDialog, setResendDialog] = useState<any>(null)
  const [allHistory, setAllHistory] = useState<any[]>([])
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  useEffect(() => {
    const loadHistory = () => {
      const storedHistory = loadEmailHistoryFromStorage()
      setAllHistory([...storedHistory, ...mockHistory])
    }

    loadHistory()

    const interval = setInterval(loadHistory, 2000)

    return () => clearInterval(interval)
  }, [])

  const filterHistory = (item: any) => {
    if (historySearch) {
      const search = historySearch.toLowerCase()
      const matchesSearch = (
        item.subject.toLowerCase().includes(search) ||
        item.academicYear.toLowerCase().includes(search) ||
        item.term.toLowerCase().includes(search)
      )
      if (!matchesSearch) return false
    }

    if (dateRange.from || dateRange.to) {
      const itemDate = new Date(item.sentDate)
      if (dateRange.from && itemDate < dateRange.from) return false
      if (dateRange.to && itemDate > dateRange.to) return false
    }

    return true
  }

  const handleViewDetails = (historyItem: any) => {
    setDetailsDialog(historyItem)
  }

  const handleViewRecipients = (historyItem: any) => {
    const recipients = generateMockRecipients(historyItem.recipients, historyItem.subject)
    setRecipientsDialog({ ...historyItem, recipientList: recipients })
  }

  const handleResendReminder = (historyItem: any) => {
    const recipients = generateMockRecipients(historyItem.recipients, historyItem.subject)
    const failedCount = recipients.filter(r => r.status === "failed").length

    setResendDialog({
      ...historyItem,
      failedCount,
      totalCount: historyItem.recipients
    })
  }

  const executeResend = (historyItem: any, resendType: 'failed' | 'all') => {
    const recipientCount = resendType === 'failed' ? historyItem.failedCount : historyItem.totalCount

    const newEntry = {
      id: `resend-${Date.now()}`,
      sentDate: new Date().toISOString().split('T')[0],
      subject: historyItem.subject,
      academicYear: historyItem.academicYear,
      term: historyItem.term,
      recipients: recipientCount,
      status: "sent"
    }

    try {
      const existingHistory = localStorage.getItem("emailReminderHistory")
      const history = existingHistory ? JSON.parse(existingHistory) : []
      history.unshift(newEntry)
      localStorage.setItem("emailReminderHistory", JSON.stringify(history))

      setAllHistory([newEntry, ...allHistory])
    } catch (error) {
      console.error("Failed to save resend history:", error)
    }

    setResendDialog(null)

    const message = resendType === 'failed'
      ? `Resent to ${recipientCount} failed recipients`
      : `Resent to all ${recipientCount} recipients`

    toast.success(message, {
      description: `Subject: ${historyItem.subject}`
    })
  }

  const handleDownloadReport = (historyItem: any) => {
    const recipients = generateMockRecipients(historyItem.recipients, historyItem.subject)
    const headers = ["No.", "Parent Name", "Email", "Student Name", "Status", "Failure Reason"]
    const rows = recipients.map((r: any, idx: number) => [
      idx + 1,
      r.name,
      r.email,
      r.studentName,
      r.status,
      r.failureReason || ''
    ])

    downloadAsXlsx(headers, rows, `email-report-${historyItem.id}-${new Date().toISOString().split('T')[0]}`)

    toast.success("Report downloaded successfully", {
      description: `${historyItem.recipients} recipients exported to Excel`
    })
  }

  const filteredHistory = allHistory.filter(filterHistory)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Email History</h2>
        <p className="text-muted-foreground">
          View all reminder emails sent to parents and students
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reminders Sent</p>
                <p className="text-2xl font-bold">{allHistory.length}</p>
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
                  {allHistory.reduce((sum, item) => sum + item.recipients, 0)}
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
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(!dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd LLL")} - {format(dateRange.to, "dd LLL y")}
                      </>
                    ) : (
                      format(dateRange.from, "dd LLL y")
                    )
                  ) : (
                    "Filter by Date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange.from ? (dateRange as { from: Date; to?: Date }) : undefined}
                  onSelect={(range) => setDateRange(range || {})}
                  numberOfMonths={2}
                  initialFocus
                />
                <div className="border-t p-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDateRange({})
                      setDateFilterOpen(false)
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => setDateFilterOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

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
                  <th className="text-center p-4 font-semibold text-sm">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
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
                    <td className="p-4 text-muted-foreground">{formatAcademicYear(item.academicYear)}</td>
                    <td className="p-4 text-muted-foreground">{item.term}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{item.recipients}</span>
                      </div>
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
                          <DropdownMenuItem onClick={() => handleViewDetails(item)} className="cursor-pointer">
                            <Eye className="w-4 h-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewRecipients(item)} className="cursor-pointer">
                            <FileText className="w-4 h-4" />
                            View Recipients
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleResendReminder(item)} className="cursor-pointer">
                            <Send className="w-4 h-4" />
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadReport(item)} className="cursor-pointer">
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

            {filteredHistory.length === 0 && (
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

      <Dialog open={!!detailsDialog} onOpenChange={() => setDetailsDialog(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-6 h-6" />
              Email Details
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Complete information about this reminder email
            </DialogDescription>
          </DialogHeader>
          {detailsDialog && (
            <div className="space-y-10 px-6 py-4">
              <div className="border-b pb-4">
                <Label className="text-sm font-medium text-muted-foreground">Subject</Label>
                <p className="text-xl font-semibold mt-1">{detailsDialog.subject}</p>
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sent Date</Label>
                  <p className="text-base font-medium mt-1">{formatDisplayDate(detailsDialog.sentDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Academic Year</Label>
                  <p className="text-base font-medium mt-1">{formatAcademicYear(detailsDialog.academicYear)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Term</Label>
                  <p className="text-base font-medium mt-1">{detailsDialog.term}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Recipients</Label>
                  <p className="text-lg font-semibold mt-1">{detailsDialog.recipients} parents/students</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white">
                      <CheckCircle className="w-4 h-4" />
                      {detailsDialog.status.charAt(0).toUpperCase() + detailsDialog.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Message Preview</Label>
                <div className="mt-2 p-6 bg-muted rounded-lg text-sm leading-relaxed">
                  <p>Dear Parent,</p>
                  <p className="mt-3">
                    This is a reminder regarding your payment for {detailsDialog.subject.toLowerCase()}.
                    Please ensure that your payment is completed on time to avoid any inconvenience.
                  </p>
                  <p className="mt-3">
                    Academic Year: {formatAcademicYear(detailsDialog.academicYear)}<br />
                    Term: {detailsDialog.term}
                  </p>
                  <p className="mt-3">
                    If you have any questions, please contact our office.
                  </p>
                  <p className="mt-3">
                    Best regards,<br />
                    {schoolSettings.schoolName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!recipientsDialog} onOpenChange={() => setRecipientsDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="w-6 h-6" />
              Email Recipients
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {recipientsDialog?.recipients} recipients for "{recipientsDialog?.subject}"
            </DialogDescription>
          </DialogHeader>
          {recipientsDialog && (
            <div className="space-y-4 px-6 py-4">
              <div className="overflow-y-auto max-h-[50vh]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-semibold text-sm">No.</th>
                      <th className="text-left p-3 font-semibold text-sm">Parent Name</th>
                      <th className="text-left p-3 font-semibold text-sm">Email</th>
                      <th className="text-left p-3 font-semibold text-sm">Student Name</th>
                      <th className="text-center p-3 font-semibold text-sm">Status</th>
                      <th className="text-left p-3 font-semibold text-sm">Failure Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientsDialog.recipientList.map((recipient: any, idx: number) => (
                      <tr key={recipient.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm">{idx + 1}</td>
                        <td className="p-3 text-sm font-medium">{recipient.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{recipient.email}</td>
                        <td className="p-3 text-sm">{recipient.studentName}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            recipient.status === "delivered"
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                          }`} style={{ opacity: 1, backgroundColor: recipient.status === "delivered" ? "#16a34a" : "#dc2626" }}>
                            {recipient.status === "delivered" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            {recipient.status?.charAt(0).toUpperCase() + recipient.status?.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {recipient.status === "failed" && recipient.failureReason ? (
                            <span className="text-red-600 text-xs font-medium" style={{ color: "#dc2626" }}>{recipient.failureReason}</span>
                          ) : recipient.status === "delivered" ? (
                            <span className="text-muted-foreground text-xs">-</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Total: {recipientsDialog.recipientList.length} recipients
                  <span className="ml-4">
                    Delivered: {recipientsDialog.recipientList.filter((r: any) => r.status === "delivered").length}
                  </span>
                  <span className="ml-4">
                    Failed: {recipientsDialog.recipientList.filter((r: any) => r.status === "failed").length}
                  </span>
                </div>
                <Button onClick={() => handleDownloadReport(recipientsDialog)} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resendDialog} onOpenChange={() => setResendDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Send className="w-6 h-6" />
              Resend Email
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              Choose who should receive this email
            </DialogDescription>
          </DialogHeader>
          {resendDialog && (
            <div className="px-6 py-4 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">{resendDialog.subject}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatAcademicYear(resendDialog.academicYear)} • {resendDialog.term}
                </p>
              </div>

              {resendDialog.failedCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      {resendDialog.failedCount} recipients did not receive this email
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      You can resend to failed recipients only or to everyone
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {resendDialog.failedCount > 0 && (
                  <Button
                    onClick={() => executeResend(resendDialog, 'failed')}
                    className="w-full justify-start"
                    variant="default"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Resend to Failed Only ({resendDialog.failedCount} recipients)
                  </Button>
                )}
                <Button
                  onClick={() => executeResend(resendDialog, 'all')}
                  className="w-full justify-start"
                  variant={resendDialog.failedCount > 0 ? "outline" : "default"}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Resend to All Recipients ({resendDialog.totalCount} recipients)
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="px-6 pb-6">
            <Button onClick={() => setResendDialog(null)} variant="ghost">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
