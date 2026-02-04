import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { Mail, CalendarIcon, History, Users, CheckCircle, TrendingUp, Eye, FileText, Send, Download, MoreVertical, Search } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "@/components/ui/sonner"

// Mock history data
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

// Load email history from localStorage
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
  const day = date.getDate()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const month = monthNames[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function EmailHistory() {
  const { t } = useLanguage()
  const [historySearch, setHistorySearch] = useState("")

  // Combine localStorage and mock data
  const storedHistory = loadEmailHistoryFromStorage()
  const allHistory = [...storedHistory, ...mockHistory]

  const handleResendReminder = (historyItem: any) => {
    toast.success(`Reminder email resent to ${historyItem.recipients} recipients`, {
      description: `Subject: ${historyItem.subject}`
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Email History</h2>
        <p className="text-muted-foreground">
          View all reminder emails sent to parents and students
        </p>
      </div>

      {/* Summary Cards */}
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
                {allHistory
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
                            <DropdownMenuItem onClick={() => handleResendReminder(item)}>
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
            {allHistory.filter((item) => {
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
    </div>
  )
}
