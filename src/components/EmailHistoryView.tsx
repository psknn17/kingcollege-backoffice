import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { Separator } from "./ui/separator"
import {
  Mail,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ArrowLeft,
  User,
  Calendar,
  MessageSquare,
  Send,
  ArrowUpDown
} from "lucide-react"

interface EmailRecord {
  id: string
  recipientEmail: string
  recipientName: string
  studentName: string
  yearGroup: string
  status: "sent" | "delivered" | "opened" | "failed" | "bounced"
  sentAt: string
  deliveredAt?: string
  openedAt?: string
  failureReason?: string
  attempts: number
  lastAttemptAt: string
}

// Mock data for email history
const mockEmailHistory: EmailRecord[] = [
  {
    id: "ER001",
    recipientEmail: "sarah.thompson@email.com",
    recipientName: "Sarah Thompson",
    studentName: "Emma Thompson",
    yearGroup: "Year 7",
    status: "opened",
    sentAt: "2024-01-15T10:30:00Z",
    deliveredAt: "2024-01-15T10:31:00Z",
    openedAt: "2024-01-15T14:20:00Z",
    attempts: 1,
    lastAttemptAt: "2024-01-15T10:30:00Z"
  },
  {
    id: "ER002",
    recipientEmail: "michael.wilson@email.com",
    recipientName: "Michael Wilson",
    studentName: "James Wilson",
    yearGroup: "Year 8",
    status: "delivered",
    sentAt: "2024-01-15T10:30:00Z",
    deliveredAt: "2024-01-15T10:32:00Z",
    attempts: 1,
    lastAttemptAt: "2024-01-15T10:30:00Z"
  },
  {
    id: "ER003",
    recipientEmail: "invalid@nonexistent.com",
    recipientName: "Lisa Chen",
    studentName: "Olivia Chen",
    yearGroup: "Year 10",
    status: "bounced",
    sentAt: "2024-01-15T10:30:00Z",
    failureReason: "Recipient address rejected: User unknown",
    attempts: 3,
    lastAttemptAt: "2024-01-15T11:15:00Z"
  },
  {
    id: "ER004",
    recipientEmail: "david.brown@email.com",
    recipientName: "David Brown",
    studentName: "Alexander Brown",
    yearGroup: "Reception",
    status: "failed",
    sentAt: "2024-01-15T10:30:00Z",
    failureReason: "Connection timeout",
    attempts: 2,
    lastAttemptAt: "2024-01-15T10:45:00Z"
  },
  {
    id: "ER005",
    recipientEmail: "jane.smith@email.com",
    recipientName: "Jane Smith",
    studentName: "Sophie Smith",
    yearGroup: "Year 5",
    status: "sent",
    sentAt: "2024-01-15T10:30:00Z",
    attempts: 1,
    lastAttemptAt: "2024-01-15T10:30:00Z"
  }
]

interface EmailHistoryViewProps {
  jobData?: any
  onBack?: () => void
}

export function EmailHistoryView({ jobData, onBack }: EmailHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedHistory = (historyToSort: EmailRecord[]) => {
    if (!sortColumn) return historyToSort
    return [...historyToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "recipientName":
          aVal = a.recipientName
          bVal = b.recipientName
          break
        case "recipientEmail":
          aVal = a.recipientEmail
          bVal = b.recipientEmail
          break
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "sentAt":
          aVal = new Date(a.sentAt).getTime()
          bVal = new Date(b.sentAt).getTime()
          break
        case "deliveredAt":
          aVal = a.deliveredAt ? new Date(a.deliveredAt).getTime() : 0
          bVal = b.deliveredAt ? new Date(b.deliveredAt).getTime() : 0
          break
        case "openedAt":
          aVal = a.openedAt ? new Date(a.openedAt).getTime() : 0
          bVal = b.openedAt ? new Date(b.openedAt).getTime() : 0
          break
        case "attempts":
          aVal = a.attempts
          bVal = b.attempts
          break
        default:
          return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "sent":
        return "secondary"
      case "delivered":
        return "default"
      case "opened":
        return "default"
      case "failed":
        return "destructive"
      case "bounced":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Mail className="w-4 h-4" />
      case "delivered":
        return <CheckCircle className="w-4 h-4" />
      case "opened":
        return <MessageSquare className="w-4 h-4" />
      case "failed":
        return <XCircle className="w-4 h-4" />
      case "bounced":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const filteredHistory = mockEmailHistory.filter(record => {
    const matchesSearch = record.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const sortedHistory = getSortedHistory(filteredHistory)
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedHistory = sortedHistory.slice(startIndex, startIndex + itemsPerPage)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusCounts = () => {
    return {
      total: mockEmailHistory.length,
      sent: mockEmailHistory.filter(r => r.status === "sent").length,
      delivered: mockEmailHistory.filter(r => r.status === "delivered").length,
      opened: mockEmailHistory.filter(r => r.status === "opened").length,
      failed: mockEmailHistory.filter(r => r.status === "failed").length,
      bounced: mockEmailHistory.filter(r => r.status === "bounced").length
    }
  }

  const stats = getStatusCounts()

  const handleResend = () => {
    console.log("Resending emails for job:", jobData?.batchId)
    // Implementation for resending failed/bounced emails
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>Email Delivery History</h2>
          <p className="text-muted-foreground">
            Detailed delivery status for {jobData?.batchId || "Email Job"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleResend}>
            <Send className="w-4 h-4 mr-2" />
            Resend Failed
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Job Summary */}
      {jobData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Batch ID</label>
              <p className="font-mono">{jobData.batchId}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Invoice Type</label>
              <p className="capitalize">{jobData.invoiceType}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Year Group</label>
              <p>{jobData.yearGroup}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Total Recipients</label>
              <p>{jobData.totalEmails}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Created At</label>
              <p>{formatDate(jobData.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Created By</label>
              <p>{jobData.createdBy}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.opened}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounced</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bounced}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search by recipient email, name, or student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email History Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("recipientName")}>
                  <div className="flex items-center gap-1">
                    Recipient
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    Student
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("sentAt")}>
                  <div className="flex items-center gap-1">
                    Sent At
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("deliveredAt")}>
                  <div className="flex items-center gap-1">
                    Delivered At
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("openedAt")}>
                  <div className="flex items-center gap-1">
                    Opened At
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("attempts")}>
                  <div className="flex items-center gap-1">
                    Attempts
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Failure Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedHistory.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{record.recipientName}</div>
                      <div className="text-sm text-muted-foreground">{record.recipientEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{record.studentName}</div>
                      <div className="text-sm text-muted-foreground">{record.yearGroup}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(record.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(record.status)}
                      <span className="capitalize">{record.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(record.sentAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {record.deliveredAt ? formatDate(record.deliveredAt) : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {record.openedAt ? formatDate(record.openedAt) : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {record.attempts}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-red-600 max-w-[200px]">
                      {record.failureReason || "-"}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredHistory.length === 0 && (
            <div className="text-center py-8">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3>No email records found</h3>
              <p className="text-muted-foreground">
                No email records match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}