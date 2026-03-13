import { useState, useEffect } from "react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Search, Filter, Download, Users, Calendar, CreditCard, Mail, Phone, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"

interface Course {
  id: string
  name: string
  category: string
  instructor: string
  capacity: number
  enrolled: number
  waitlist: number
  schedule: string
  fee: number
  totalRevenue: number
  status: "active" | "full" | "cancelled" | "upcoming"
  location: string
  ageGroup: string
  startDate: Date
  endDate: Date
}

interface StudentRegistration {
  id: string
  studentName: string
  parentName: string
  parentType: "internal" | "external"
  yearGroup: string
  registrationDate: Date
  paymentDate?: Date
  paymentChannel: "cash" | "bank_transfer" | "credit_card" | "online_banking" | "cheque"
  paymentStatus: "paid" | "pending" | "overdue"
  amount: number
  studentEmail: string
  parentEmail: string
  parentPhone: string
}

interface CourseStudentReportProps {
  courseId?: string
}

// Mock data generation
const generateStudentRegistrations = (courseId: string, enrolledCount: number): StudentRegistration[] => {
  const students: StudentRegistration[] = []
  const firstNames = ["Emma", "Oliver", "Sophia", "James", "Isabella", "William", "Ava", "Benjamin", "Charlotte", "Lucas", "Mia", "Henry", "Amelia", "Alexander", "Harper", "Michael", "Evelyn", "Daniel", "Abigail", "Matthew"]
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee"]
  const yearGroups = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  const paymentChannels: StudentRegistration["paymentChannel"][] = ["bank_transfer", "credit_card", "online_banking", "cash", "cheque"]
  
  for (let i = 0; i < enrolledCount; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const parentFirstName = Math.random() > 0.5 ? firstNames[Math.floor(Math.random() * firstNames.length)] : "Parent"
    
    const registrationDate = new Date(2025, 7, Math.floor(Math.random() * 20) + 1) // August dates
    const hasPayment = Math.random() > 0.1 // 90% have paid
    const fee = Math.floor(Math.random() * 300) + 200 // Random fee between 200-500
    
    students.push({
      id: `${courseId}-student-${i + 1}`,
      studentName: `${firstName} ${lastName}`,
      parentName: `${parentFirstName} ${lastName}`,
      parentType: Math.random() > 0.7 ? "external" : "internal",
      yearGroup: yearGroups[Math.floor(Math.random() * yearGroups.length)],
      registrationDate,
      paymentDate: hasPayment ? new Date(registrationDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined,
      paymentChannel: paymentChannels[Math.floor(Math.random() * paymentChannels.length)],
      paymentStatus: hasPayment ? "paid" : Math.random() > 0.5 ? "pending" : "overdue",
      amount: fee,
      studentEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@kingcollege.ac.th`,
      parentEmail: `${parentFirstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      parentPhone: `+66 ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`
    })
  }
  
  return students.sort((a, b) => (b.registrationDate?.getTime() || 0) - (a.registrationDate?.getTime() || 0))
}

const mockCourses: Course[] = [
  {
    id: "1",
    name: "Swimming - Beginner",
    category: "Sports",
    instructor: "Coach Sarah",
    capacity: 20,
    enrolled: 18,
    waitlist: 5,
    schedule: "Mon, Wed, Fri 3:30-4:30 PM",
    fee: 300,
    totalRevenue: 5400,
    status: "active",
    location: "Swimming Pool",
    ageGroup: "6-8 years",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-12-20")
  },
  {
    id: "2",
    name: "Football Training",
    category: "Sports", 
    instructor: "Coach Mike",
    capacity: 25,
    enrolled: 25,
    waitlist: 8,
    schedule: "Tue, Thu 4:00-5:00 PM",
    fee: 250,
    totalRevenue: 6250,
    status: "full",
    location: "Football Field",
    ageGroup: "9-12 years",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-12-20")
  }
]

export function CourseStudentReport({ courseId = "1" }: CourseStudentReportProps) {
  const { t } = useLanguage()
  const [studentRegistrations, setStudentRegistrations] = useState<StudentRegistration[]>([])
  const [filteredStudents, setFilteredStudents] = useState<StudentRegistration[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [parentTypeFilter, setParentTypeFilter] = useState("all")
  const [yearGroupFilter, setYearGroupFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const course = mockCourses.find(c => c.id === courseId) || mockCourses[0]

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedStudents = (studentsToSort: StudentRegistration[]) => {
    if (!sortColumn) return studentsToSort

    return [...studentsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "parentName":
          aVal = a.parentName
          bVal = b.parentName
          break
        case "yearGroup":
          aVal = a.yearGroup
          bVal = b.yearGroup
          break
        case "registrationDate":
          aVal = a.registrationDate?.getTime() || 0
          bVal = b.registrationDate?.getTime() || 0
          break
        case "paymentStatus":
          aVal = a.paymentStatus
          bVal = b.paymentStatus
          break
        case "amount":
          aVal = a.amount
          bVal = b.amount
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

  useEffect(() => {
    const students = generateStudentRegistrations(courseId, course.enrolled)
    setStudentRegistrations(students)
    setFilteredStudents(students)
  }, [courseId, course.enrolled])

  const applyFilters = () => {
    let filtered = studentRegistrations

    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parentEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(student => student.paymentStatus === paymentStatusFilter)
    }

    if (parentTypeFilter !== "all") {
      filtered = filtered.filter(student => student.parentType === parentTypeFilter)
    }

    if (yearGroupFilter !== "all") {
      filtered = filtered.filter(student => student.yearGroup === yearGroupFilter)
    }

    setFilteredStudents(filtered)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setPaymentStatusFilter("all")
    setParentTypeFilter("all")
    setYearGroupFilter("all")
    setFilteredStudents(studentRegistrations)
    setCurrentPage(1)
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">{t("common.paid")}</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">{t("common.pending")}</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{t("common.overdue")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentChannelIcon = (channel: string) => {
    switch (channel) {
      case "bank_transfer":
        return "🏦"
      case "credit_card":
        return "💳"
      case "online_banking":
        return "💻"
      case "cash":
        return "💵"
      case "cheque":
        return "📝"
      default:
        return "💰"
    }
  }

  const exportStudentReport = () => {
    const headers = ["Student Name", "Parent Name", "Parent Type", "Year Group", "Registration Date", "Payment Date", "Payment Status", "Payment Channel", "Amount", "Student Email", "Parent Email", "Parent Phone"]
    const rows = filteredStudents.map(student => [
      student.studentName,
      student.parentName,
      student.parentType,
      student.yearGroup,
      format(student.registrationDate, "dd/MM/yyyy"),
      student.paymentDate ? format(student.paymentDate, "dd/MM/yyyy") : "",
      student.paymentStatus,
      student.paymentChannel,
      student.amount,
      student.studentEmail,
      student.parentEmail,
      student.parentPhone
    ])

    downloadAsXlsx(headers, rows, `${course.name.replace(/[^a-zA-Z0-9]/g, '_')}_student_report`)

    toast.success(`Student report exported for ${course.name}`)
  }

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageStudents = filteredStudents.slice(startIndex, endIndex)

  const yearGroups = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]

  const summaryStats = {
    totalStudents: filteredStudents.length,
    paidStudents: filteredStudents.filter(s => s.paymentStatus === "paid").length,
    pendingStudents: filteredStudents.filter(s => s.paymentStatus === "pending").length,
    overdueStudents: filteredStudents.filter(s => s.paymentStatus === "overdue").length,
    totalRevenue: filteredStudents.filter(s => s.paymentStatus === "paid").reduce((sum, s) => sum + s.amount, 0),
    externalParents: filteredStudents.filter(s => s.parentType === "external").length
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">{course.name} - {t("course.studentReport")}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.instructor}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{course.schedule}</span>
            </div>
            <div className="flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              <span>₿{course.fee}/{t("course.student")}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {course.location} • {course.ageGroup}
          </p>
        </div>
        <Button onClick={exportStudentReport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t("common.exportCsv")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("course.totalStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.paid")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.paidStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.pending")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.pendingStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.overdue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.overdueStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("common.revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₿{summaryStats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("course.externalParents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.externalParents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {t("course.searchFilterStudents")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.search")}</label>
              <div className="relative">
                <Input
                  placeholder={t("course.studentSearchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.paymentStatus")}</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="paid">{t("common.paid")}</SelectItem>
                  <SelectItem value="pending">{t("common.pending")}</SelectItem>
                  <SelectItem value="overdue">{t("common.overdue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("receipt.parentType")}</label>
              <Select value={parentTypeFilter} onValueChange={setParentTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allTypes")}</SelectItem>
                  <SelectItem value="internal">{t("common.internal")}</SelectItem>
                  <SelectItem value="external">{t("common.external")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("student.yearGroup")}</label>
              <Select value={yearGroupFilter} onValueChange={setYearGroupFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allYears")}</SelectItem>
                  {yearGroups.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium invisible">{t("common.actions")}</label>
              <div className="flex gap-2">
                <Button onClick={applyFilters}>{t("common.apply")}</Button>
                <Button variant="outline" onClick={clearFilters}>{t("common.clear")}</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Student Name - text */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                  <div className="flex items-center gap-1">
                    {t("course.studentDetails")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Parent Name - text */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                  <div className="flex items-center gap-1">
                    {t("course.parentInformation")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Year Group - badge */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("yearGroup")}>
                  <div className="flex items-center gap-1">
                    {t("student.yearGroup")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Registration Date - date */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("registrationDate")}>
                  <div className="flex items-center gap-1">
                    {t("course.registration")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Payment Status & Amount - status badge + currency */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentStatus")}>
                  <div className="flex items-center gap-1">
                    {t("common.payment")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Contact - text */}
                <TableHead align="left">{t("common.contact")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedStudents(currentPageStudents).map((student) => (
                <TableRow key={student.id}>
                  {/* Student Name - text */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{student.studentName}</div>
                      <div className="text-sm text-muted-foreground">{student.studentEmail}</div>
                    </div>
                  </TableCell>
                  {/* Parent Name - text */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{student.parentName}</div>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={student.parentType === "external" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {student.parentType === "external" ? t("common.external") : t("common.internal")}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  {/* Year Group - badge */}
                  <TableCell align="center">
                    <Badge variant="outline">{student.yearGroup}</Badge>
                  </TableCell>
                  {/* Registration Date - date */}
                  <TableCell align="left">
                    <div className="text-sm">
                      <div>{format(student.registrationDate, "dd MMM yyyy")}</div>
                    </div>
                  </TableCell>
                  {/* Payment Status & Amount - status badge + currency */}
                  <TableCell align="center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 justify-center">
                        {getPaymentStatusBadge(student.paymentStatus)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 justify-center">
                          <span>{getPaymentChannelIcon(student.paymentChannel)}</span>
                          <span>₿{student.amount}</span>
                        </div>
                        {student.paymentDate && (
                          <div className="text-xs">
                            Paid: {format(student.paymentDate, "dd MMM yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  {/* Contact - text */}
                  <TableCell align="left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="w-3 h-3" />
                        <span className="text-xs">{student.parentEmail}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">{student.parentPhone}</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={filteredStudents.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />
    </div>
  )
}