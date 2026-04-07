import { useState, useEffect } from "react"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Textarea } from "./ui/textarea"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { Search, Filter, ChevronDown, Users, DollarSign, AlertTriangle, CheckCircle, Clock, Edit, Eye, Upload, Plus, Minus, Save, X, FileText, Download, UserCheck, Calendar, CreditCard, ArrowUpDown, BookOpen } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { useLanguage } from "@/contexts/LanguageContext"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"
import { cn } from "./ui/utils"

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
  },
  {
    id: "3",
    name: "Art & Craft Workshop",
    category: "Creative",
    instructor: "Ms. Lisa",
    capacity: 15,
    enrolled: 12,
    waitlist: 0,
    schedule: "Wed 3:00-4:30 PM",
    fee: 200,
    totalRevenue: 2400,
    status: "active",
    location: "Art Studio",
    ageGroup: "5-10 years",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-12-20")
  },
  {
    id: "4",
    name: "Piano Lessons",
    category: "Music",
    instructor: "Mr. James",
    capacity: 12,
    enrolled: 10,
    waitlist: 2,
    schedule: "Mon, Wed 4:00-5:00 PM",
    fee: 400,
    totalRevenue: 4000,
    status: "active",
    location: "Music Room 1",
    ageGroup: "7-15 years",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-12-20")
  },
  {
    id: "5",
    name: "Basketball Skills",
    category: "Sports",
    instructor: "Coach David",
    capacity: 20,
    enrolled: 15,
    waitlist: 0,
    schedule: "Fri 3:30-4:30 PM",
    fee: 220,
    totalRevenue: 3300,
    status: "active",
    location: "Basketball Court",
    ageGroup: "8-12 years",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-12-20")
  },
  {
    id: "6",
    name: "Drama Club",
    category: "Creative",
    instructor: "Ms. Emma",
    capacity: 18,
    enrolled: 8,
    waitlist: 0,
    schedule: "Thu 3:00-4:30 PM",
    fee: 180,
    totalRevenue: 1440,
    status: "active",
    location: "Drama Studio",
    ageGroup: "6-14 years",
    startDate: new Date("2025-08-15"),
    endDate: new Date("2025-12-20")
  }
]

// Mock student registration data
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
      amount: mockCourses.find(c => c.id === courseId)?.fee || 0,
      studentEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@kingcollege.ac.th`,
      parentEmail: `${parentFirstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      parentPhone: `+66 ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`
    })
  }
  
  return students.sort((a, b) => (b.registrationDate?.getTime() || 0) - (a.registrationDate?.getTime() || 0))
}

interface CourseQuotaOverviewProps {
  onNavigateToSubPage?: (subPage: string) => void
}

export function CourseQuotaOverview({ onNavigateToSubPage }: CourseQuotaOverviewProps) {
  const { t } = useLanguage()
  const [courses, setCourses] = useState<Course[]>(mockCourses)
  const [filteredCourses, setFilteredCourses] = useState<Course[]>(mockCourses)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [showFilters, setShowFilters] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isStudentReportModalOpen, setIsStudentReportModalOpen] = useState(false)

  // Course editing states
  const [editingCapacity, setEditingCapacity] = useState<number>(0)
  const [editingFee, setEditingFee] = useState<number>(0)
  const [editNotes, setEditNotes] = useState("")

  // CSV import state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Student registration data
  const [studentRegistrations, setStudentRegistrations] = useState<StudentRegistration[]>([])
  const [studentReportPage, setStudentReportPage] = useState(1)
  const studentReportItemsPerPage = 10
  const [tableSortColumn, setTableSortColumn] = useState("")
  const [tableSortDirection, setTableSortDirection] = useState<"asc" | "desc">("asc")

  const handleTableSort = (column: string) => {
    if (tableSortColumn === column) {
      setTableSortDirection(tableSortDirection === "asc" ? "desc" : "asc")
    } else {
      setTableSortColumn(column)
      setTableSortDirection("asc")
    }
  }

  const getSortedCourses = (coursesToSort: Course[]) => {
    if (!tableSortColumn) return coursesToSort

    return [...coursesToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (tableSortColumn) {
        case "name":
          aVal = a.name
          bVal = b.name
          break
        case "instructor":
          aVal = a.instructor
          bVal = b.instructor
          break
        case "capacity":
          aVal = a.capacity
          bVal = b.capacity
          break
        case "enrolled":
          aVal = a.enrolled
          bVal = b.enrolled
          break
        case "waitlist":
          aVal = a.waitlist
          bVal = b.waitlist
          break
        case "totalRevenue":
          aVal = a.totalRevenue
          bVal = b.totalRevenue
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        default:
          return 0
      }

      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return tableSortDirection === "asc" ? comparison : -comparison
      }

      return tableSortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  // Reactive filtering - runs whenever filter state changes
  useEffect(() => {
    let filtered = courses

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(course => course.category.toLowerCase() === categoryFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(course => course.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "enrollment":
          return b.enrolled - a.enrolled
        case "revenue":
          return b.totalRevenue - a.totalRevenue
        case "capacity":
          return (b.enrolled / b.capacity) - (a.enrolled / a.capacity)
        default:
          return a.name.localeCompare(b.name)
      }
    })

    setFilteredCourses(filtered)
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, statusFilter, sortBy, courses])

  const clearFilters = () => {
    setSearchTerm("")
    setCategoryFilter("all")
    setStatusFilter("all")
    setSortBy("name")
    setFilteredCourses(courses)
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">{t("common.active")}</Badge>
      case "full":
        return <Badge className="bg-red-100 text-red-800">{t("course.full")}</Badge>
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">{t("common.cancelled")}</Badge>
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-800">{t("settings.upcoming")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge style={{ backgroundColor: "#dcfce7", color: "#166534", border: "none" }}>{t("common.paid")}</Badge>
      case "pending":
        return <Badge style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "none" }}>{t("common.pending")}</Badge>
      case "overdue":
        return <Badge style={{ backgroundColor: "#fee2e2", color: "#991b1b", border: "none" }}>{t("common.overdue")}</Badge>
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

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "bg-red-500"
    if (utilization >= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getUtilizationIcon = (utilization: number) => {
    if (utilization >= 95) return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (utilization === 100) return <CheckCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-green-500" />
  }

  const summaryStats = {
    totalCourses: courses.length,
    totalCapacity: courses.reduce((sum, c) => sum + c.capacity, 0),
    totalEnrolled: courses.reduce((sum, c) => sum + c.enrolled, 0),
    totalRevenue: courses.reduce((sum, c) => sum + c.totalRevenue, 0),
    fullCourses: courses.filter(c => c.enrolled === c.capacity).length,
    lowEnrollment: courses.filter(c => (c.enrolled / c.capacity) < 0.5).length
  }

  const categories = [...new Set(courses.map(c => c.category))]

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageCourses = filteredCourses.slice(startIndex, endIndex)

  // Student report pagination
  const totalStudentPages = Math.ceil(studentRegistrations.length / studentReportItemsPerPage)
  const studentStartIndex = (studentReportPage - 1) * studentReportItemsPerPage
  const studentEndIndex = studentStartIndex + studentReportItemsPerPage
  const currentPageStudents = studentRegistrations.slice(studentStartIndex, studentEndIndex)

  // Course detail functions
  const openCourseDetail = (course: Course) => {
    setSelectedCourse(course)
    setEditingCapacity(course.capacity)
    setEditingFee(course.fee)
    setEditNotes("")
    setIsDetailModalOpen(true)
  }

  const closeCourseDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedCourse(null)
  }

  const openStudentReport = (course: Course) => {
    if (onNavigateToSubPage) {
      onNavigateToSubPage("course-student-report")
    }
  }

  const closeStudentReport = () => {
    setIsStudentReportModalOpen(false)
    setSelectedCourse(null)
    setStudentRegistrations([])
  }

  const openManageModal = () => {
    setIsManageModalOpen(true)
  }

  const closeManageModal = () => {
    setIsManageModalOpen(false)
    setCsvFile(null)
  }

  const updateCourse = () => {
    if (!selectedCourse) return
    
    // Validation: cannot set capacity lower than enrolled students
    if (editingCapacity < selectedCourse.enrolled) {
      toast.error(`Cannot set capacity lower than current enrollment (${selectedCourse.enrolled} students)`)
      return
    }

    // Update course
    const updatedCourse = {
      ...selectedCourse,
      capacity: editingCapacity,
      fee: editingFee,
      totalRevenue: selectedCourse.enrolled * editingFee
    }

    setCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c))
    setFilteredCourses(filteredCourses.map(c => c.id === selectedCourse.id ? updatedCourse : c))
    
    toast.success(`Course "${selectedCourse.name}" updated successfully`)
    logActivity({ action: "Update Course", module: "Course Quota", detail: `Updated course "${selectedCourse.name}", Capacity: ${editingCapacity}, Fee: ${editingFee}` })
    closeCourseDetail()
  }

  const exportCourseReport = (course: Course) => {
    const students = generateStudentRegistrations(course.id, course.enrolled)

    const headers = ["Student Name", "Parent Name", "Parent Type", "Year Group", "Registration Date", "Payment Date", "Payment Status", "Payment Channel", "Amount", "Student Email", "Parent Email", "Parent Phone"]
    const rows = students.map(student => [
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
    logActivity({ action: "Export Report", module: "Course Quota", detail: `Exported student report for course "${course.name}", ${course.enrolled} students` })
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
    } else {
      toast.error("Please select a valid file")
    }
  }

  const processCsvImport = async () => {
    if (!csvFile) return

    setIsImporting(true)
    
    // Simulate CSV processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock successful import
    const newCoursesCount = Math.floor(Math.random() * 5) + 1
    toast.success(`Successfully imported ${newCoursesCount} courses from Excel`)
    logActivity({
      action: "Import Courses",
      module: "Course Quota",
      detail: `Imported ${newCoursesCount} courses via Excel from file "${csvFile.name}"`
    })

    setIsImporting(false)
    closeManageModal()
  }

  const downloadCsvTemplate = () => {
    const headers = ["Course Name", "Category", "Instructor", "Capacity", "Fee", "Schedule", "Location", "Age Group", "Start Date", "End Date"]
    const exampleRow = ["Example Course", "Sports", "John Doe", "20", "300", "Mon Wed Fri 3:00-4:00 PM", "Gymnasium", "8-12 years", "2025-09-01", "2025-12-20"]

    downloadAsXlsx(headers, [exampleRow], 'course_import_template')

    toast.success("Excel template downloaded")
    logActivity({ action: "Download Template", module: "Course Quota", detail: "Downloaded course import Excel template" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("course.quotaOverview")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("course.quotaOverviewDesc")}
          </p>
        </div>
        <Button onClick={openManageModal} className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          {t("course.manageCourses")}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("course.totalCourses")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalCourses}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("course.totalEnrollment")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalEnrolled}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("common.totalRevenue")}</p>
            </div>
            <p className="text-2xl font-bold">₿{summaryStats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("course.performanceAlerts")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.lowEnrollment}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("course.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>
          {showFilters && (<>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.category")}</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allCategories")}</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category.toLowerCase()}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.status")}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                    <SelectItem value="active">{t("common.active")}</SelectItem>
                    <SelectItem value="full">{t("course.full")}</SelectItem>
                    <SelectItem value="upcoming">{t("settings.upcoming")}</SelectItem>
                    <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.sortBy")}</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t("course.courseName")}</SelectItem>
                    <SelectItem value="enrollment">{t("course.enrollment")}</SelectItem>
                    <SelectItem value="revenue">{t("common.revenue")}</SelectItem>
                    <SelectItem value="capacity">{t("course.capacityUtilization")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </>)}
        </CardContent>
      </Card>

      {/* Course Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Course Details - text (left aligned) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("name")}>
                  <div className="flex items-center gap-1">
                    {t("course.courseDetails")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Instructor - text (left aligned) */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("instructor")}>
                  <div className="flex items-center gap-1">
                    {t("course.instructor")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Capacity - number (right aligned) */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("capacity")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("course.capacity")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Enrollment - number (right aligned) */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("enrolled")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("course.enrollment")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Waitlist - number (right aligned) */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("waitlist")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("course.waitlist")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Revenue - currency (right aligned) */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("totalRevenue")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("common.revenue")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Status - badge (center aligned) */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleTableSort("status")}>
                  <div className="flex items-center gap-1 justify-center">
                    {t("common.status")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Schedule - text (left aligned) */}
                <TableHead align="left">{t("course.schedule")}</TableHead>
                {/* Actions - buttons (center aligned) */}
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedCourses(currentPageCourses).map((course) => {
                const utilization = (course.enrolled / course.capacity) * 100

                return (
                  <TableRow key={course.id}>
                    {/* Course Details - text (left aligned) */}
                    <TableCell align="left">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {course.name}
                          {getUtilizationIcon(utilization)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {course.category} • {course.ageGroup}
                        </div>
                        <div className="text-xs text-muted-foreground">{course.location}</div>
                      </div>
                    </TableCell>
                    {/* Instructor - text (left aligned) */}
                    <TableCell align="left">{course.instructor}</TableCell>
                    {/* Capacity - number (right aligned) */}
                    <TableCell align="right">
                      <div className="flex items-center gap-2 justify-end">
                        <span>{course.capacity}</span>
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    {/* Enrollment - number (right aligned) */}
                    <TableCell align="right">
                      <div className="space-y-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm">{course.enrolled}/{course.capacity}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(utilization)}%)
                          </span>
                        </div>
                        <Progress
                          value={utilization}
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    {/* Waitlist - number (right aligned) */}
                    <TableCell align="right">
                      {course.waitlist > 0 ? (
                        <Badge variant="outline">{course.waitlist} {t("course.waiting")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    {/* Revenue - currency (right aligned) */}
                    <TableCell align="right">
                      <div>
                        <div className="font-medium">₿{course.totalRevenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          ₿{course.fee}/student
                        </div>
                      </div>
                    </TableCell>
                    {/* Status - badge (center aligned) */}
                    <TableCell align="center">{getStatusBadge(course.status)}</TableCell>
                    {/* Schedule - text (left aligned) */}
                    <TableCell align="left">
                      <div className="text-sm">
                        {course.schedule}
                      </div>
                    </TableCell>
                    {/* Actions - buttons (center aligned) */}
                    <TableCell align="center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openCourseDetail(course)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStudentReport(course)}
                          title="View Student Details"
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => exportCourseReport(course)}
                          title="Export Excel"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        <PaginationBar
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={filteredCourses.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
        />
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("course.highDemandCourses")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("course.highDemandDesc")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses
                .filter(c => (c.enrolled / c.capacity) >= 0.85)
                .sort((a, b) => (b.enrolled / b.capacity) - (a.enrolled / a.capacity))
                .slice(0, 5)
                .map((course) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{course.name}</div>
                      <div className="text-sm text-muted-foreground">{course.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {Math.round((course.enrolled / course.capacity) * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {course.enrolled}/{course.capacity}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("course.revenueLeaders")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("course.revenueLeadersDesc")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courses
                .sort((a, b) => b.totalRevenue - a.totalRevenue)
                .slice(0, 5)
                .map((course) => (
                  <div key={course.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{course.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {course.enrolled} {t("course.students")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₿{course.totalRevenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        ₿{course.fee}/student
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {t("course.detailsManagement")}
            </DialogTitle>
            <DialogDescription>
              {t("course.detailsManagementDesc")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-6">
              {/* Course Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">{selectedCourse.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCourse.category} • {selectedCourse.ageGroup}
                  </p>
                </div>
                <div className="flex gap-2">
                  {getStatusBadge(selectedCourse.status)}
                </div>
              </div>

              <Separator />

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">{t("course.courseInformation")}</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.instructor")}</p>
                      <p className="font-medium">{selectedCourse.instructor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.location")}</p>
                      <p className="font-medium">{selectedCourse.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.schedule")}</p>
                      <p className="font-medium">{selectedCourse.schedule}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("settings.duration")}</p>
                      <p className="font-medium">
                        {format(selectedCourse.startDate, "dd MMM")} - {format(selectedCourse.endDate, "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">{t("course.enrollmentRevenue")}</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.currentCapacity")}</p>
                      <p className="font-medium">{selectedCourse.capacity} {t("course.students")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.enrolled")}</p>
                      <p className="font-medium">{selectedCourse.enrolled} {t("course.students")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.waitlist")}</p>
                      <p className="font-medium">{selectedCourse.waitlist} {t("course.students")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("course.feePerStudent")}</p>
                      <p className="font-medium">₿{selectedCourse.fee}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("common.totalRevenue")}</p>
                      <p className="font-medium">₿{selectedCourse.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Management Section */}
              <div className="space-y-4">
                <h4 className="font-medium">{t("course.courseManagement")}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("course.seatCapacity")}</label>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingCapacity(Math.max(selectedCourse.enrolled, editingCapacity - 1))}
                        disabled={editingCapacity <= selectedCourse.enrolled}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={editingCapacity}
                        onChange={(e) => setEditingCapacity(Math.max(selectedCourse.enrolled, parseInt(e.target.value) || 0))}
                        className="text-center"
                        min={selectedCourse.enrolled}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingCapacity(editingCapacity + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("course.minimumCapacity", { count: selectedCourse.enrolled })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("course.feePerStudent")} (₿)</label>
                    <Input
                      type="number"
                      value={editingFee}
                      onChange={(e) => setEditingFee(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("course.notes")}</label>
                  <Textarea
                    placeholder={t("course.notesPlaceholder")}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeCourseDetail}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={updateCourse}>
                  <Save className="w-4 h-4 mr-2" />
                  {t("common.saveChanges")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Report Modal */}
      <Dialog open={isStudentReportModalOpen} onOpenChange={setIsStudentReportModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              {t("course.studentRegDetails")}
            </DialogTitle>
            <DialogDescription>
              {selectedCourse && t("course.studentRegDetailsDesc", { name: selectedCourse.name })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-6">
              {/* Course Summary */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("course.course")}</p>
                    <p className="font-medium">{selectedCourse.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("course.totalStudents")}</p>
                    <p className="font-medium">{studentRegistrations.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.totalRevenue")}</p>
                    <p className="font-medium">₿{selectedCourse.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.paymentStatus")}</p>
                    <div className="flex gap-1">
                      {getPaymentStatusBadge("paid")} {studentRegistrations.filter(s => s.paymentStatus === "paid").length}
                      {studentRegistrations.filter(s => s.paymentStatus === "pending").length > 0 && (
                        <span className="ml-2">{getPaymentStatusBadge("pending")} {studentRegistrations.filter(s => s.paymentStatus === "pending").length}</span>
                      )}
                      {studentRegistrations.filter(s => s.paymentStatus === "overdue").length > 0 && (
                        <span className="ml-2">{getPaymentStatusBadge("overdue")} {studentRegistrations.filter(s => s.paymentStatus === "overdue").length}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Showing {studentStartIndex + 1}-{Math.min(studentEndIndex, studentRegistrations.length)} of {studentRegistrations.length} students
                  (Page {studentReportPage} of {totalStudentPages})
                </p>
                <Button
                  onClick={() => exportCourseReport(selectedCourse)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t("common.exportCsv")}
                </Button>
              </div>

              {/* Student Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("course.studentInfo")}</TableHead>
                      <TableHead>{t("course.parentInfo")}</TableHead>
                      <TableHead>{t("course.registration")}</TableHead>
                      <TableHead>{t("common.payment")}</TableHead>
                      <TableHead>{t("common.contact")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPageStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.studentName}</div>
                            <div className="text-sm text-muted-foreground">{student.yearGroup}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.parentName}</div>
                            <div className="flex items-center gap-1 text-sm">
                              <Badge variant={student.parentType === "internal" ? "default" : "secondary"}>
                                {student.parentType}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3" />
                              {format(student.registrationDate, "dd MMM yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(student.registrationDate, "HH:mm")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getPaymentStatusBadge(student.paymentStatus)}
                              <span className="text-sm">₿{student.amount}</span>
                            </div>
                            {student.paymentDate && (
                              <div className="text-xs text-muted-foreground">
                                Paid: {format(student.paymentDate, "dd MMM yyyy")}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs">
                              <span>{getPaymentChannelIcon(student.paymentChannel)}</span>
                              <span className="capitalize">{student.paymentChannel.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs">
                              <strong>Student:</strong> {student.studentEmail}
                            </div>
                            <div className="text-xs">
                              <strong>Parent:</strong> {student.parentEmail}
                            </div>
                            <div className="text-xs">
                              <strong>Phone:</strong> {student.parentPhone}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Student Report Pagination */}
              {totalStudentPages > 1 && (
                <div className="flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setStudentReportPage(Math.max(1, studentReportPage - 1))}
                          className={studentReportPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalStudentPages) }, (_, i) => {
                        let pageNumber
                        if (totalStudentPages <= 5) {
                          pageNumber = i + 1
                        } else if (studentReportPage <= 3) {
                          pageNumber = i + 1
                        } else if (studentReportPage >= totalStudentPages - 2) {
                          pageNumber = totalStudentPages - 4 + i
                        } else {
                          pageNumber = studentReportPage - 2 + i
                        }
                        
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => setStudentReportPage(pageNumber)}
                              isActive={studentReportPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setStudentReportPage(Math.min(totalStudentPages, studentReportPage + 1))}
                          className={studentReportPage === totalStudentPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={closeStudentReport}>
                  {t("common.close")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Course Management Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              {t("course.courseManagement")}
            </DialogTitle>
            <DialogDescription>
              {t("course.importOrManage")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">{t("course.importCourses")}</h4>
              
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleCsvUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {csvFile && (
                    <p className="text-sm text-green-600 mt-1">
                      File selected: {csvFile.name}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={processCsvImport}
                    disabled={!csvFile || isImporting}
                    className="flex-1"
                  >
                    {isImporting ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        {t("common.importing")}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t("common.importCsv")}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={downloadCsvTemplate}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t("common.template")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeManageModal}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}