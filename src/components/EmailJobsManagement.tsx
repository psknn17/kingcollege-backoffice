import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu"
import {
  Mail,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  AlertCircle,
  History,
  FileSpreadsheet,
  ArrowUpDown
} from "lucide-react"

interface EmailJob {
  id: string
  batchId: string
  invoiceType: "tuition" | "eca" | "trip"
  yearGroup: string
  totalEmails: number
  sentCount: number
  failedCount: number
  pendingCount: number
  status: "completed" | "in-progress" | "failed" | "pending"
  createdAt: string
  completedAt?: string
  createdBy: string
  description: string
}

// Mock data
const mockEmailJobs: EmailJob[] = [
  {
    id: "EJ001",
    batchId: "BATCH-2024-001",
    invoiceType: "tuition",
    yearGroup: "Year 7",
    totalEmails: 45,
    sentCount: 43,
    failedCount: 2,
    pendingCount: 0,
    status: "completed",
    createdAt: "2024-01-15T08:30:00Z",
    completedAt: "2024-01-15T08:45:00Z",
    createdBy: "admin@sisb.ac.th",
    description: "Term 2 Tuition Invoice - Year 7"
  },
  {
    id: "EJ002", 
    batchId: "BATCH-2024-002",
    invoiceType: "eca",
    yearGroup: "Year 8-9",
    totalEmails: 38,
    sentCount: 35,
    failedCount: 0,
    pendingCount: 3,
    status: "in-progress",
    createdAt: "2024-01-15T10:15:00Z",
    createdBy: "admin@sisb.ac.th",
    description: "Football Club Registration - Year 8-9"
  },
  {
    id: "EJ003",
    batchId: "BATCH-2024-003", 
    invoiceType: "trip",
    yearGroup: "Year 10",
    totalEmails: 28,
    sentCount: 0,
    failedCount: 28,
    pendingCount: 0,
    status: "failed",
    createdAt: "2024-01-15T14:20:00Z",
    createdBy: "admin@sisb.ac.th",
    description: "Science Museum Trip - Year 10"
  },
  {
    id: "EJ004",
    batchId: "BATCH-2024-004",
    invoiceType: "tuition", 
    yearGroup: "Reception",
    totalEmails: 22,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 22,
    status: "pending",
    createdAt: "2024-01-15T16:00:00Z",
    createdBy: "admin@sisb.ac.th",
    description: "Term 2 Tuition Invoice - Reception"
  }
]

interface EmailJobsManagementProps {
  onNavigateToSubPage?: (subPage: string, params?: any) => void
}

export function EmailJobsManagement({ onNavigateToSubPage }: EmailJobsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress": 
        return "secondary"
      case "failed":
        return "destructive"
      case "pending":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "in-progress":
        return <Clock className="w-4 h-4" />
      case "failed":
        return <XCircle className="w-4 h-4" />
      case "pending":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const filteredJobs = mockEmailJobs.filter(job => {
    const matchesSearch = job.batchId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.yearGroup.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    const matchesType = typeFilter === "all" || job.invoiceType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!sortColumn) return 0
    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case "batchId":
        aValue = a.batchId
        bValue = b.batchId
        break
      case "invoiceType":
        aValue = a.invoiceType
        bValue = b.invoiceType
        break
      case "yearGroup":
        aValue = a.yearGroup
        bValue = b.yearGroup
        break
      case "description":
        aValue = a.description
        bValue = b.description
        break
      case "totalEmails":
        aValue = a.totalEmails
        bValue = b.totalEmails
        break
      case "successRate":
        aValue = a.totalEmails > 0 ? (a.sentCount / a.totalEmails) : 0
        bValue = b.totalEmails > 0 ? (b.sentCount / b.totalEmails) : 0
        break
      case "status":
        aValue = a.status
        bValue = b.status
        break
      case "createdAt":
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      default:
        return 0
    }

    if (typeof aValue === "string") {
      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    } else {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }
  })

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + itemsPerPage)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  const handleViewHistory = (job: EmailJob) => {
    if (onNavigateToSubPage) {
      onNavigateToSubPage("email-history-view", { jobId: job.id, job })
    }
  }

  const handleExportCsv = (job: EmailJob) => {
    if (onNavigateToSubPage) {
      onNavigateToSubPage("email-csv-export", { jobId: job.id, job })
    }
  }

  const getSuccessRate = (job: EmailJob) => {
    if (job.totalEmails === 0) return 0
    return Math.round((job.sentCount / job.totalEmails) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Email Jobs Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage email delivery status for invoice batches
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockEmailJobs.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockEmailJobs.filter(j => j.status === "completed").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockEmailJobs.filter(j => j.status === "in-progress").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockEmailJobs.filter(j => j.status === "failed").length}
            </div>
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
                  placeholder="Search by batch ID, description, or year group..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="eca">ECA</SelectItem>
                <SelectItem value="trip">Trip & Activities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Jobs Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("batchId")}>
                  <div className="flex items-center gap-1">
                    Batch ID
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceType")}>
                  <div className="flex items-center gap-1">
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("yearGroup")}>
                  <div className="flex items-center gap-1">
                    Year Group
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("description")}>
                  <div className="flex items-center gap-1">
                    Description
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("totalEmails")}>
                  <div className="flex items-center gap-1">
                    Total
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("successRate")}>
                  <div className="flex items-center gap-1">
                    Success Rate
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                  <div className="flex items-center gap-1">
                    Created
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono">{job.batchId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {job.invoiceType}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.yearGroup}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {job.description}
                  </TableCell>
                  <TableCell>{job.totalEmails}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getSuccessRate(job)}%</span>
                      <div className="text-xs text-muted-foreground">
                        ({job.sentCount}/{job.totalEmails})
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(job.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(job.status)}
                      <span className="capitalize">{job.status.replace('-', ' ')}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(job.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewHistory(job)}>
                          <History className="mr-2 h-4 w-4" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportCsv(job)}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export CSV Log
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredJobs.length === 0 && (
            <div className="text-center py-8">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3>No email jobs found</h3>
              <p className="text-muted-foreground">
                No email jobs match your current filters.
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