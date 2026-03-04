import { useState, useMemo, useEffect } from "react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Search, Filter, UserCheck, UserX, Eye, Mail, Phone, Calendar, Download, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { PaginationBar } from "./ui/pagination-bar"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"

interface ExternalParent {
  id: string
  parentName: string
  parentEmail: string
  parentPhone: string
  studentName: string
  studentAge: number
  studentGrade: string
  activities: string[]
  applicationDate: Date
  status: "pending" | "approved" | "rejected" | "waitlist"
  paymentStatus: "not_paid" | "pending" | "paid"
  totalAmount: number
  notes: string
  documents: string[]
}

const mockParents: ExternalParent[] = [
  {
    id: "1",
    parentName: "Jennifer Wilson",
    parentEmail: "jennifer.wilson@email.com",
    parentPhone: "+66 87 123 4567",
    studentName: "Emma Wilson",
    studentAge: 8,
    studentGrade: "Year 3",
    activities: ["Swimming - Beginner", "Art & Craft"],
    applicationDate: new Date("2025-08-10"),
    status: "pending",
    paymentStatus: "not_paid",
    totalAmount: 500,
    notes: "Student has previous swimming experience",
    documents: ["Birth Certificate", "Medical Certificate"]
  },
  {
    id: "2",
    parentName: "Michael Chen", 
    parentEmail: "m.chen@email.com",
    parentPhone: "+66 89 876 5432",
    studentName: "Alex Chen",
    studentAge: 10,
    studentGrade: "Year 5",
    activities: ["Football Training", "Piano Lessons"],
    applicationDate: new Date("2025-08-08"),
    status: "approved",
    paymentStatus: "paid",
    totalAmount: 650,
    notes: "",
    documents: ["Birth Certificate", "Medical Certificate", "Previous School Records"]
  },
  {
    id: "3",
    parentName: "Sarah Thompson",
    parentEmail: "sarah.t@email.com", 
    parentPhone: "+66 82 345 6789",
    studentName: "Lily Thompson",
    studentAge: 6,
    studentGrade: "Year 1",
    activities: ["Drama Club"],
    applicationDate: new Date("2025-08-12"),
    status: "waitlist",
    paymentStatus: "not_paid",
    totalAmount: 180,
    notes: "Requesting specific time slot",
    documents: ["Birth Certificate"]
  },
  {
    id: "4",
    parentName: "David Rodriguez",
    parentEmail: "d.rodriguez@email.com",
    parentPhone: "+66 85 987 6543",
    studentName: "Carlos Rodriguez",
    studentAge: 12,
    studentGrade: "Year 7",
    activities: ["Basketball Skills", "Coding Club"],
    applicationDate: new Date("2025-08-05"),
    status: "rejected",
    paymentStatus: "not_paid",
    totalAmount: 420,
    notes: "Age requirement not met for selected activities",
    documents: ["Birth Certificate", "Medical Certificate"]
  },
  {
    id: "5",
    parentName: "Amanda Lee",
    parentEmail: "amanda.lee@email.com",
    parentPhone: "+66 88 234 5678",
    studentName: "Sophie Lee",
    studentAge: 9,
    studentGrade: "Year 4",
    activities: ["Music Theory", "Chess Club"],
    applicationDate: new Date("2025-08-14"),
    status: "approved",
    paymentStatus: "pending",
    totalAmount: 380,
    notes: "Parent is SISB alumni",
    documents: ["Birth Certificate", "Medical Certificate", "Photo ID"]
  }
]

export function ExternalParentManagement() {
  const { t } = useLanguage()
  const [parents] = useState<ExternalParent[]>(mockParents)
  const [filteredParents, setFilteredParents] = useState<ExternalParent[]>(mockParents)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [selectedParent, setSelectedParent] = useState<ExternalParent | null>(null)
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedParents = (parentsToSort: ExternalParent[]) => {
    if (!sortColumn) return parentsToSort

    return [...parentsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "parentName":
          aVal = a.parentName
          bVal = b.parentName
          break
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "studentAge":
          aVal = a.studentAge
          bVal = b.studentAge
          break
        case "totalAmount":
          aVal = a.totalAmount
          bVal = b.totalAmount
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        case "paymentStatus":
          aVal = a.paymentStatus
          bVal = b.paymentStatus
          break
        case "applicationDate":
          aVal = a.applicationDate?.getTime() || 0
          bVal = b.applicationDate?.getTime() || 0
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

  // Pagination logic
  const sortedParents = useMemo(() => getSortedParents(filteredParents), [filteredParents, sortColumn, sortDirection])
  const totalPages = Math.ceil(sortedParents.length / pageSize)
  const paginatedParents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedParents.slice(startIndex, startIndex + pageSize)
  }, [sortedParents, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, paymentStatusFilter, sortColumn, sortDirection])

  const applyFilters = () => {
    let filtered = parents

    if (searchTerm) {
      filtered = filtered.filter(parent => 
        parent.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        parent.activities.some(activity => 
          activity.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(parent => parent.status === statusFilter)
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(parent => parent.paymentStatus === paymentStatusFilter)
    }

    setFilteredParents(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setPaymentStatusFilter("all")
    setFilteredParents(parents)
  }

  const updateStatus = (parentId: string, newStatus: string) => {
    const parent = parents.find(p => p.id === parentId)
    if (parent) {
      toast.success(t("externalParent.toast.applicationStatusUpdated").replace("{studentName}", parent.studentName).replace("{status}", newStatus))
      // In a real app, this would update the backend
    }
  }

  const sendEmail = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId)
    if (parent) {
      toast.success(t("externalParent.toast.emailSent").replace("{parentName}", parent.parentName).replace("{email}", parent.parentEmail))
      // In a real app, this would send email
    }
  }

  const downloadApplication = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId)
    if (parent) {
      // Generate Excel content for the application
      const headers = ["Field", "Value"]
      const rows: (string | number)[][] = [
        ["Parent Name", parent.parentName],
        ["Parent Email", parent.parentEmail],
        ["Parent Phone", parent.parentPhone],
        ["Student Name", parent.studentName],
        ["Student Age", parent.studentAge],
        ["Student Grade", parent.studentGrade],
        ["Activities", parent.activities.join('; ')],
        ["Application Date", format(parent.applicationDate, "dd/MM/yyyy")],
        ["Status", parent.status],
        ["Payment Status", parent.paymentStatus],
        ["Total Amount", parent.totalAmount],
        ["Notes", parent.notes],
        ["Documents", parent.documents.join('; ')],
      ]

      downloadAsXlsx(headers, rows, `${parent.studentName.replace(/[^a-zA-Z0-9]/g, '_')}_application`)

      toast.success(t("externalParent.toast.applicationDownloaded").replace("{studentName}", parent.studentName))
    }
  }

  const resendEmail = (parentId: string) => {
    const parent = parents.find(p => p.id === parentId)
    if (parent) {
      toast.success(t("externalParent.toast.reminderEmailResent").replace("{parentName}", parent.parentName).replace("{email}", parent.parentEmail))
      // In a real app, this would resend email
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">{t("common.status.pending")}</Badge>
      case "approved":
        return <Badge className="bg-green-100 text-green-800">{t("common.status.approved")}</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">{t("common.status.rejected")}</Badge>
      case "waitlist":
        return <Badge className="bg-blue-100 text-blue-800">{t("common.status.waitlist")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">{t("common.paymentStatus.paid")}</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">{t("common.paymentStatus.pending")}</Badge>
      case "not_paid":
        return <Badge className="bg-gray-100 text-gray-800">{t("common.paymentStatus.notPaid")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const summaryStats = {
    total: parents.length,
    pending: parents.filter(p => p.status === "pending").length,
    approved: parents.filter(p => p.status === "approved").length,
    rejected: parents.filter(p => p.status === "rejected").length,
    waitlist: parents.filter(p => p.status === "waitlist").length,
    totalRevenue: parents.filter(p => p.paymentStatus === "paid").reduce((sum, p) => sum + p.totalAmount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("externalParent.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("externalParent.subtitle")}
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          {t("externalParent.sendBulkUpdates")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("externalParent.stats.totalApplications")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("externalParent.stats.pendingReview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pending}</div>
            <p className="text-xs text-muted-foreground">{t("externalParent.stats.requireAction")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.status.approved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("externalParent.stats.onWaitlist")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.waitlist}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("externalParent.stats.revenueFromExternal")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₿{summaryStats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("common.searchAndFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">{t("common.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.search")}</label>
              <div className="relative">
                <Input
                  placeholder={t("externalParent.filter.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("externalParent.filter.applicationStatus")}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("common.status.pending")}</SelectItem>
                  <SelectItem value="approved">{t("common.status.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("common.status.rejected")}</SelectItem>
                  <SelectItem value="waitlist">{t("common.status.waitlist")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("externalParent.filter.paymentStatus")}</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allPaymentStatus")}</SelectItem>
                  <SelectItem value="paid">{t("common.paymentStatus.paid")}</SelectItem>
                  <SelectItem value="pending">{t("common.paymentStatus.pending")}</SelectItem>
                  <SelectItem value="not_paid">{t("common.paymentStatus.notPaid")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {t("externalParent.showingResults").replace("{shown}", filteredParents.length.toString()).replace("{total}", parents.length.toString())}
        </p>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                  <div className="flex items-center gap-1">
                    {t("externalParent.table.parentDetails")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {t("externalParent.table.studentInfo")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("externalParent.table.activities")}</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("totalAmount")}>
                  <div className="flex items-center gap-1">
                    {t("externalParent.table.amount")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    {t("externalParent.filter.applicationStatus")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentStatus")}>
                  <div className="flex items-center gap-1">
                    {t("externalParent.filter.paymentStatus")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("applicationDate")}>
                  <div className="flex items-center gap-1">
                    {t("externalParent.table.appliedDate")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedParents.map((parent) => (
                <TableRow key={parent.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{parent.parentName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {parent.parentEmail}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {parent.parentPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{parent.studentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("externalParent.table.age")} {parent.studentAge} • {parent.studentGrade}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {parent.activities.map((activity, index) => (
                        <Badge key={index} variant="outline" className="block w-fit text-xs">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">₿{parent.totalAmount.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(parent.status)}</TableCell>
                  <TableCell>{getPaymentStatusBadge(parent.paymentStatus)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3" />
                      {format(parent.applicationDate, "dd MMM yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedParent(parent)}
                            title={t("common.viewDetails")}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl p-6">
                          <DialogHeader>
                            <DialogTitle>{t("externalParent.dialog.applicationDetails")} - {parent.studentName}</DialogTitle>
                            <DialogDescription>
                              {t("externalParent.dialog.description")}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>{t("externalParent.dialog.parentName")}</Label>
                                <p className="text-sm">{parent.parentName}</p>
                              </div>
                              <div>
                                <Label>{t("externalParent.dialog.studentName")}</Label>
                                <p className="text-sm">{parent.studentName}</p>
                              </div>
                              <div>
                                <Label>{t("common.email")}</Label>
                                <p className="text-sm">{parent.parentEmail}</p>
                              </div>
                              <div>
                                <Label>{t("common.phone")}</Label>
                                <p className="text-sm">{parent.parentPhone}</p>
                              </div>
                              <div>
                                <Label>{t("externalParent.dialog.studentAge")}</Label>
                                <p className="text-sm">{parent.studentAge} {t("externalParent.dialog.yearsOld")}</p>
                              </div>
                              <div>
                                <Label>{t("externalParent.dialog.yearGroup")}</Label>
                                <p className="text-sm">{parent.studentGrade}</p>
                              </div>
                            </div>
                            
                            <div>
                              <Label>{t("externalParent.dialog.selectedActivities")}</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {parent.activities.map((activity, index) => (
                                  <Badge key={index} variant="outline">{activity}</Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label>{t("externalParent.dialog.documentsSubmitted")}</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {parent.documents.map((doc, index) => (
                                  <Badge key={index} variant="secondary">{doc}</Badge>
                                ))}
                              </div>
                            </div>

                            {parent.notes && (
                              <div>
                                <Label>{t("common.notes")}</Label>
                                <p className="text-sm bg-muted p-2 rounded">{parent.notes}</p>
                              </div>
                            )}

                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={() => updateStatus(parent.id, "approved")}
                                className="flex items-center gap-1"
                              >
                                <UserCheck className="w-4 h-4" />
                                {t("common.approve")}
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => updateStatus(parent.id, "rejected")}
                                className="flex items-center gap-1"
                              >
                                <UserX className="w-4 h-4" />
                                {t("common.reject")}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => sendEmail(parent.id)}
                                className="flex items-center gap-1"
                              >
                                <Mail className="w-4 h-4" />
                                {t("common.sendEmail")}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => downloadApplication(parent.id)}
                        title={t("externalParent.action.downloadApplication")}
                      >
                        <Download className="w-4 h-4 text-blue-600" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => sendEmail(parent.id)}
                        title={t("common.sendEmail")}
                      >
                        <Mail className="w-4 h-4 text-purple-600" />
                      </Button>

                      {parent.status === "pending" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => updateStatus(parent.id, "approved")}
                            title={t("externalParent.action.approveApplication")}
                          >
                            <UserCheck className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => updateStatus(parent.id, "rejected")}
                            title={t("externalParent.action.rejectApplication")}
                          >
                            <UserX className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}

                      {(parent.status === "approved" || parent.status === "waitlist") && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => resendEmail(parent.id)}
                          title={t("externalParent.action.resendEmail")}
                        >
                          <RotateCcw className="w-4 h-4 text-orange-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedParents.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}