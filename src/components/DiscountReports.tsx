import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import {
  Search,
  Download,
  Filter,
  Users,
  Percent,
  DollarSign,
  GraduationCap,
  ArrowUpDown
} from "lucide-react"
import { useAcademicYears } from "@/contexts/AcademicYearContext"

// Discount item interface
interface DiscountItem {
  type: "sibling" | "scholarship" | "staff" | "early_bird" | "group" | "campaign"
  name: string
  mode: "percentage" | "fixed"
  value: number  // percentage value or fixed amount
  amount: number // calculated discount amount
  appliedTo: string[]
}

// Sample student discount data
interface StudentDiscount {
  id: string
  studentId: string
  studentName: string
  yearGroup: string
  parentName: string
  discounts: DiscountItem[]
  originalAmount: number
  totalDiscountAmount: number
  finalAmount: number
  status: "active" | "pending" | "expired"
  validFrom: string
  validTo: string
}

const sampleStudentDiscounts: StudentDiscount[] = [
  {
    id: "1",
    studentId: "STU001",
    studentName: "Emma Thompson",
    yearGroup: "Year 7",
    parentName: "John Thompson",
    discounts: [
      { type: "sibling", name: "Third Child Discount", mode: "percentage", value: 5, amount: 22500, appliedTo: ["Tuition"] }
    ],
    originalAmount: 450000,
    totalDiscountAmount: 22500,
    finalAmount: 427500,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "2",
    studentId: "STU002",
    studentName: "Liam Johnson",
    yearGroup: "Year 7",
    parentName: "Sarah Johnson",
    discounts: [
      { type: "scholarship", name: "Academic Excellence", mode: "percentage", value: 15, amount: 67500, appliedTo: ["Tuition"] },
      { type: "early_bird", name: "Early Registration", mode: "fixed", value: 10000, amount: 10000, appliedTo: ["Tuition"] }
    ],
    originalAmount: 450000,
    totalDiscountAmount: 77500,
    finalAmount: 372500,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "3",
    studentId: "STU003",
    studentName: "Olivia Williams",
    yearGroup: "Year 9",
    parentName: "Michael Williams",
    discounts: [
      { type: "staff", name: "Staff Child Discount", mode: "percentage", value: 50, amount: 240000, appliedTo: ["Tuition", "School Bus"] }
    ],
    originalAmount: 480000,
    totalDiscountAmount: 240000,
    finalAmount: 240000,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "4",
    studentId: "STU004",
    studentName: "Noah Brown",
    yearGroup: "Year 10",
    parentName: "Emily Brown",
    discounts: [
      { type: "sibling", name: "Second Child Discount", mode: "percentage", value: 3, amount: 15000, appliedTo: ["Tuition"] },
      { type: "scholarship", name: "Music Excellence", mode: "percentage", value: 10, amount: 50000, appliedTo: ["Tuition"] },
      { type: "campaign", name: "WELCOME2025", mode: "fixed", value: 5000, amount: 5000, appliedTo: ["School Bus"] }
    ],
    originalAmount: 500000,
    totalDiscountAmount: 70000,
    finalAmount: 430000,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "5",
    studentId: "STU005",
    studentName: "Sophia Davis",
    yearGroup: "Year 8",
    parentName: "James Davis",
    discounts: [
      { type: "group", name: "Year 8 Excellence", mode: "percentage", value: 15, amount: 69000, appliedTo: ["Tuition"] }
    ],
    originalAmount: 460000,
    totalDiscountAmount: 69000,
    finalAmount: 391000,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "6",
    studentId: "STU006",
    studentName: "Mason Wilson",
    yearGroup: "Year 11",
    parentName: "Lisa Wilson",
    discounts: [
      { type: "campaign", name: "SIBLING10", mode: "percentage", value: 10, amount: 52000, appliedTo: ["Tuition", "School Bus"] }
    ],
    originalAmount: 520000,
    totalDiscountAmount: 52000,
    finalAmount: 468000,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "7",
    studentId: "STU007",
    studentName: "Isabella Martinez",
    yearGroup: "Year 6",
    parentName: "Carlos Martinez",
    discounts: [
      { type: "sibling", name: "Fourth Child Discount", mode: "percentage", value: 10, amount: 42000, appliedTo: ["Tuition"] },
      { type: "early_bird", name: "Early Registration", mode: "fixed", value: 15000, amount: 15000, appliedTo: ["Tuition"] }
    ],
    originalAmount: 420000,
    totalDiscountAmount: 57000,
    finalAmount: 363000,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "8",
    studentId: "STU008",
    studentName: "Ethan Garcia",
    yearGroup: "Year 12",
    parentName: "Maria Garcia",
    discounts: [
      { type: "scholarship", name: "Sports Excellence", mode: "percentage", value: 25, amount: 135000, appliedTo: ["Tuition"] }
    ],
    originalAmount: 540000,
    totalDiscountAmount: 135000,
    finalAmount: 405000,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "9",
    studentId: "STU009",
    studentName: "Ava Anderson",
    yearGroup: "Year 5",
    parentName: "Robert Anderson",
    discounts: [
      { type: "early_bird", name: "Early Registration", mode: "fixed", value: 20000, amount: 20000, appliedTo: ["Tuition"] },
      { type: "campaign", name: "NEW2025", mode: "fixed", value: 10000, amount: 10000, appliedTo: ["School Bus"] }
    ],
    originalAmount: 400000,
    totalDiscountAmount: 30000,
    finalAmount: 370000,
    status: "pending",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  },
  {
    id: "10",
    studentId: "STU010",
    studentName: "Lucas Taylor",
    yearGroup: "Year 13",
    parentName: "Jennifer Taylor",
    discounts: [
      { type: "sibling", name: "Second Child Discount", mode: "percentage", value: 3, amount: 16800, appliedTo: ["Tuition"] }
    ],
    originalAmount: 560000,
    totalDiscountAmount: 16800,
    finalAmount: 543200,
    status: "active",
    validFrom: "2025-08-01",
    validTo: "2026-07-31"
  }
]

const discountTypeLabels: Record<string, { label: string; color: string }> = {
  sibling: { label: "Sibling", color: "bg-blue-100 text-blue-800" },
  scholarship: { label: "Scholarship", color: "bg-purple-100 text-purple-800" },
  staff: { label: "Staff", color: "bg-green-100 text-green-800" },
  early_bird: { label: "Early Bird", color: "bg-orange-100 text-orange-800" },
  group: { label: "Group", color: "bg-pink-100 text-pink-800" },
  campaign: { label: "Campaign", color: "bg-cyan-100 text-cyan-800" }
}

export function DiscountReports() {
  const { academicYears = [] } = useAcademicYears()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterYearGroup, setFilterYearGroup] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>("all")
  const [filterTerm, setFilterTerm] = useState<string>("all")
  const [filterAppliedTo, setFilterAppliedTo] = useState<string>("all")

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Get terms based on selected academic year
  const availableTerms = filterAcademicYear === "all"
    ? [...new Map(academicYears.flatMap(y => y.terms).map(t => [t.name, t])).values()]
    : (academicYears.find(y => y.id === filterAcademicYear)?.terms || [])

  // Reset term filter when academic year changes
  useEffect(() => {
    setFilterTerm("all")
  }, [filterAcademicYear])

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("")
    setFilterType("all")
    setFilterYearGroup("all")
    setFilterStatus("all")
    setFilterAcademicYear("all")
    setFilterTerm("all")
    setFilterAppliedTo("all")
  }

  // Get unique applied to options from all discounts
  const appliedToOptions = [...new Set(sampleStudentDiscounts.flatMap(s => s.discounts.flatMap(d => d.appliedTo)))].sort()

  // Get unique year groups
  const yearGroups = [...new Set(sampleStudentDiscounts.map(s => s.yearGroup))].sort()

  // Filter students
  const filteredStudents = sampleStudentDiscounts.filter(student => {
    const matchesSearch =
      student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === "all" || student.discounts.some(d => d.type === filterType)
    const matchesYearGroup = filterYearGroup === "all" || student.yearGroup === filterYearGroup
    const matchesStatus = filterStatus === "all" || student.status === filterStatus
    const matchesAppliedTo = filterAppliedTo === "all" || student.discounts.some(d => d.appliedTo.includes(filterAppliedTo))

    return matchesSearch && matchesType && matchesYearGroup && matchesStatus && matchesAppliedTo
  })

  // Calculate summary stats
  const totalStudents = filteredStudents.length
  const totalDiscountAmountSum = filteredStudents.reduce((sum, s) => sum + s.totalDiscountAmount, 0)

  // Calculate average discount - consider all individual discounts
  const allDiscounts = filteredStudents.flatMap(s => s.discounts)
  const percentageDiscounts = allDiscounts.filter(d => d.mode === "percentage")
  const averagePercentage = percentageDiscounts.length > 0
    ? Math.round(percentageDiscounts.reduce((sum, d) => sum + d.value, 0) / percentageDiscounts.length)
    : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedStudents = (students: StudentDiscount[]) => {
    if (!sortColumn) return students
    return [...students].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "studentId":
          aValue = a.studentId
          bValue = b.studentId
          break
        case "studentName":
          aValue = a.studentName
          bValue = b.studentName
          break
        case "yearGroup":
          aValue = a.yearGroup
          bValue = b.yearGroup
          break
        case "parentName":
          aValue = a.parentName
          bValue = b.parentName
          break
        case "originalAmount":
          aValue = a.originalAmount
          bValue = b.originalAmount
          break
        case "totalDiscountAmount":
          aValue = a.totalDiscountAmount
          bValue = b.totalDiscountAmount
          break
        case "finalAmount":
          aValue = a.finalAmount
          bValue = b.finalAmount
          break
        case "status":
          aValue = a.status
          bValue = b.status
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
  }

  // Apply sorting to filtered students
  const sortedStudents = getSortedStudents(filteredStudents)

  const handleExport = () => {
    // Create CSV content - each discount gets its own row
    const headers = ["Student ID", "Student Name", "Year Group", "Parent Name", "Discount Type", "Discount Name", "Mode", "Value", "Discount Amount", "Amount", "Discount", "Net", "Applied To", "Status", "Valid From", "Valid To"]
    const rows: (string | number)[][] = []

    filteredStudents.forEach(s => {
      s.discounts.forEach((d, idx) => {
        rows.push([
          s.studentId,
          s.studentName,
          s.yearGroup,
          s.parentName,
          discountTypeLabels[d.type].label,
          d.name,
          d.mode,
          d.mode === "percentage" ? `${d.value}%` : d.value,
          d.amount,
          idx === 0 ? s.originalAmount : "", // Only show on first row
          idx === 0 ? s.totalDiscountAmount : "",
          idx === 0 ? s.finalAmount : "",
          d.appliedTo.join("; "),
          s.status,
          s.validFrom,
          s.validTo
        ])
      })
    })

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `discount-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Discount Reports</h2>
          <p className="text-sm text-muted-foreground">
            View student discount details and generate reports
          </p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">with discounts applied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDiscountAmountSum)}</div>
            <p className="text-xs text-muted-foreground">total savings provided</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Discount</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePercentage}%</div>
            <p className="text-xs text-muted-foreground">avg percentage discount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year Groups</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{yearGroups.length}</div>
            <p className="text-xs text-muted-foreground">with discount students</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Search & Filter
            </CardTitle>
            <div className="flex gap-2">
              <Button className="h-9">Apply</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">Clear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
              <Select value={filterAcademicYear} onValueChange={setFilterAcademicYear}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Term</label>
              <Select value={filterTerm} onValueChange={setFilterTerm}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  {availableTerms.map(term => (
                    <SelectItem key={term.id} value={term.name}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Year Group</label>
              <Select value={filterYearGroup} onValueChange={setFilterYearGroup}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All year groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year Groups</SelectItem>
                  {yearGroups.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Discount Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="early_bird">Early Bird</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Applied To</label>
              <Select value={filterAppliedTo} onValueChange={setFilterAppliedTo}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {appliedToOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Discount Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Discount Details</CardTitle>
          <CardDescription>
            Showing {filteredStudents.length} of {sampleStudentDiscounts.length} students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("studentId")}>
                    <div className="flex items-center gap-1">
                      Student ID
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("studentName")}>
                    <div className="flex items-center gap-1">
                      Student Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("yearGroup")}>
                    <div className="flex items-center gap-1">
                      Year Group
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("parentName")}>
                    <div className="flex items-center gap-1">
                      Parent
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Discount Types</TableHead>
                  <TableHead>Discounts Detail</TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted" onClick={() => handleSort("originalAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      Amount
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted" onClick={() => handleSort("totalDiscountAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      Discount
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:bg-muted" onClick={() => handleSort("finalAmount")}>
                    <div className="flex items-center justify-end gap-1">
                      Net
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Applied To</TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1">
                      Status
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No students found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell>{student.yearGroup}</TableCell>
                      <TableCell className="text-muted-foreground">{student.parentName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap justify-center">
                          {student.discounts.map((d, idx) => (
                            <Badge key={idx} className={discountTypeLabels[d.type].color}>
                              {discountTypeLabels[d.type].label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {student.discounts.map((d, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-muted-foreground">{d.name}: </span>
                              <span className="text-green-600 font-medium">
                                {d.mode === "percentage" ? `${d.value}%` : formatCurrency(d.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(student.originalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {student.totalDiscountAmount > 0 ? `-${formatCurrency(student.totalDiscountAmount)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {formatCurrency(student.finalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap justify-center">
                          {[...new Set(student.discounts.flatMap(d => d.appliedTo))].map(item => (
                            <Badge key={item} variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={student.status === "active" ? "default" : student.status === "pending" ? "secondary" : "outline"}
                          className={student.status === "active" ? "bg-green-100 text-green-800" : ""}
                        >
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Discount Summary by Type */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Discount by Type</CardTitle>
            <CardDescription>Breakdown of discounts by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(discountTypeLabels).map(([type, { label, color }]) => {
                // Count students who have this discount type
                const studentsWithType = sampleStudentDiscounts.filter(s =>
                  s.discounts.some(d => d.type === type)
                )
                // Sum up the discount amounts for this type
                const total = sampleStudentDiscounts.reduce((sum, s) => {
                  const typeDiscounts = s.discounts.filter(d => d.type === type)
                  return sum + typeDiscounts.reduce((dSum, d) => dSum + d.amount, 0)
                }, 0)
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={color}>{label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {studentsWithType.length} students
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discount by Year Group</CardTitle>
            <CardDescription>Breakdown of discounts by year group</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearGroups.map(year => {
                const students = sampleStudentDiscounts.filter(s => s.yearGroup === year)
                const total = students.reduce((sum, s) => sum + s.totalDiscountAmount, 0)
                return (
                  <div key={year} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{year}</span>
                      <span className="text-sm text-muted-foreground">
                        {students.length} students
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
