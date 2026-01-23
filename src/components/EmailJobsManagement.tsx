import { useState, useMemo, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
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
  jobType?: "student" | "external"
}

// Get storage key based on job type
const getEmailJobsStorageKey = (jobType: string): string => {
  switch (jobType) {
    case "external":
      return "externalEmailJobs"
    default:
      return "studentEmailJobs"
  }
}

// Load email jobs from localStorage
const loadEmailJobsFromStorage = (jobType: string): EmailJob[] | null => {
  try {
    const stored = localStorage.getItem(getEmailJobsStorageKey(jobType))
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load email jobs from localStorage:", error)
  }
  return null
}

// Save email jobs to localStorage
const saveEmailJobsToStorage = (jobs: EmailJob[], jobType: string) => {
  try {
    localStorage.setItem(getEmailJobsStorageKey(jobType), JSON.stringify(jobs))
  } catch (error) {
    console.error("Failed to save email jobs to localStorage:", error)
  }
}

// Default mock data for student jobs
const mockStudentEmailJobs: EmailJob[] = [
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
    createdBy: "admin@kingcollege.ac.th",
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
    createdBy: "admin@kingcollege.ac.th",
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
    createdBy: "admin@kingcollege.ac.th",
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
    createdBy: "admin@kingcollege.ac.th",
    description: "Term 2 Tuition Invoice - Reception",
    jobType: "student"
  }
]

// Default mock data for external jobs
const mockExternalEmailJobs: EmailJob[] = [
  {
    id: "EEJ001",
    batchId: "EXT-BATCH-2024-001",
    invoiceType: "trip",
    yearGroup: "External",
    totalEmails: 15,
    sentCount: 15,
    failedCount: 0,
    pendingCount: 0,
    status: "completed",
    createdAt: "2024-01-10T09:00:00Z",
    completedAt: "2024-01-10T09:15:00Z",
    createdBy: "admin@kingcollege.ac.th",
    description: "External Event Invoice - Conference",
    jobType: "external"
  }
]

// Get default mock data based on job type
const getDefaultMockData = (jobType: string): EmailJob[] => {
  return jobType === "external" ? mockExternalEmailJobs : mockStudentEmailJobs
}

interface EmailJobsManagementProps {
  onNavigateToSubPage?: (subPage: string, params?: any) => void
  jobType?: "student" | "external" | "afterschool" | "event" | "summer"
}

export function EmailJobsManagement({ onNavigateToSubPage, jobType = "student" }: EmailJobsManagementProps) {
  const { t } = useLanguage()
  const isExternalView = jobType === "external"
  const isCategoryView = ["afterschool", "event", "summer"].includes(jobType)
  const isSimplifiedView = isExternalView || isCategoryView

  // Load email jobs from localStorage or use default mock data
  const [emailJobs, setEmailJobs] = useState<EmailJob[]>(() => {
    const stored = loadEmailJobsFromStorage(jobType)
    return stored || getDefaultMockData(jobType)
  })

  // Save to localStorage when emailJobs change
  useEffect(() => {
    saveEmailJobsToStorage(emailJobs, jobType)
  }, [emailJobs, jobType])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

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

  // Use emailJobs from state (already filtered by jobType via localStorage)
  const filteredJobs = emailJobs.filter(job => {
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

  const totalPages = Math.ceil(sortedJobs.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + pageSize)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, typeFilter, sortColumn, sortDirection])

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
          <h2>{isExternalView ? t("emailJobs.externalTitle") : isSimplifiedView ? t("emailJobs.activityTitle") : t("emailJobs.title")}</h2>
          <p className="text-muted-foreground">
            {isSimplifiedView ? t("emailJobs.activitySubtitle") : t("emailJobs.subtitle")}
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailJobs.totalJobs")}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailJobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailJobs.completed")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailJobs.filter(j => j.status === "completed").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailJobs.inProgress")}</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailJobs.filter(j => j.status === "in-progress").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("emailJobs.failed")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailJobs.filter(j => j.status === "failed").length}
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
                  placeholder={t("emailJobs.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("emailJobs.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                <SelectItem value="completed">{t("emailJobs.completed")}</SelectItem>
                <SelectItem value="in-progress">{t("emailJobs.inProgress")}</SelectItem>
                <SelectItem value="failed">{t("emailJobs.failed")}</SelectItem>
                <SelectItem value="pending">{t("common.pending")}</SelectItem>
              </SelectContent>
            </Select>

            {!isSimplifiedView && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t("emailJobs.filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allTypes")}</SelectItem>
                  <SelectItem value="tuition">{t("emailJobs.tuition")}</SelectItem>
                  <SelectItem value="eca">{t("emailJobs.eca")}</SelectItem>
                  <SelectItem value="trip">{t("emailJobs.tripActivities")}</SelectItem>
                </SelectContent>
              </Select>
            )}
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
                    {t("emailJobs.batchId")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {!isSimplifiedView && (
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("invoiceType")}>
                    <div className="flex items-center gap-1">
                      {t("common.type")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                )}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("yearGroup")}>
                  <div className="flex items-center gap-1">
                    {isExternalView ? t("emailJobs.recipient") : t("emailJobs.yearGroup")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("description")}>
                  <div className="flex items-center gap-1">
                    {t("common.description")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("totalEmails")}>
                  <div className="flex items-center gap-1">
                    {t("common.total")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("successRate")}>
                  <div className="flex items-center gap-1">
                    {t("emailJobs.successRate")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                  <div className="flex items-center gap-1">
                    {t("emailJobs.created")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono">{job.batchId}</TableCell>
                  {!isSimplifiedView && (
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {job.invoiceType}
                      </Badge>
                    </TableCell>
                  )}
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
                          {t("emailJobs.viewHistory")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportCsv(job)}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          {t("emailJobs.exportCsvLog")}
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
              <h3>{t("emailJobs.noJobsFound")}</h3>
              <p className="text-muted-foreground">
                {t("emailJobs.noJobsMatchFilter")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {sortedJobs.length > 0 && (
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("emailJobs.show")}</span>
            <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>{t("emailJobs.entries")}</span>
          </div>

          <div className="text-sm text-muted-foreground">
            {t("emailJobs.showing")} {((currentPage - 1) * pageSize) + 1} {t("emailJobs.to")} {Math.min(currentPage * pageSize, sortedJobs.length)} {t("emailJobs.of")} {sortedJobs.length} {t("emailJobs.emailJobs")}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              {t("emailJobs.previous")}
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              {t("emailJobs.next")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}