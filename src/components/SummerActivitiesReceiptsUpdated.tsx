import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { CalendarIcon, Search, Download, Filter, Eye, Mail, Receipt, Users, Sun, Clock, Users as UsersIcon, Printer, ArrowUpDown } from "lucide-react"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { format } from "date-fns"
import { toast } from "sonner"
import { InternalEmailManagement } from "./InternalEmailManagement"

// Student data matching StudentContext
const studentData = [
  { id: "KC2024001", name: "James Smith", grade: "Year 4" },
  { id: "KC2024002", name: "Emily Smith", grade: "Reception" },
  { id: "KC2024003", name: "Michael Johnson", grade: "Year 7" },
  { id: "KC2024004", name: "Sophia Williams", grade: "Year 9" },
  { id: "KC2024005", name: "Oliver Williams", grade: "Year 6" },
  { id: "KC2024006", name: "Charlotte Williams", grade: "Year 3" },
  { id: "KC2024007", name: "Lucas Brown", grade: "Year 1" },
  { id: "KC2024008", name: "Mia Brown", grade: "Year 2" },
  { id: "KC2024009", name: "Ethan Davis", grade: "Year 2" },
  { id: "KC2024010", name: "Ava Miller", grade: "Year 1" },
]

interface SummerActivityReceipt {
  id: string
  receiptNumber: string
  activityName: string
  activityType: "camp" | "workshop" | "sports" | "art" | "language" | "stem"
  duration: string
  ageGroup: string
  participantName: string
  participantAge: number
  parentName: string
  amount: number
  paymentMethod: string
  transactionDate: Date
  downloadCount: number
  sessionTimes: string
  isEarlyBird: boolean
}

const mockReceipts: SummerActivityReceipt[] = [
  {
    id: "1",
    receiptNumber: "SUM-RCP-2025-001234",
    activityName: "Creative Arts Camp",
    activityType: "art",
    duration: "2 weeks",
    ageGroup: "8-12 years",
    participantName: studentData[0].name,
    participantAge: 10,
    parentName: "Mr. & Mrs. Smith",
    amount: 2500,
    paymentMethod: "Credit Card",
    transactionDate: new Date("2025-04-15"),
    downloadCount: 2,
    sessionTimes: "09:00-15:00",
    isEarlyBird: true
  },
  {
    id: "2",
    receiptNumber: "SUM-RCP-2025-001235",
    activityName: "Football Skills Training",
    activityType: "sports",
    duration: "1 week",
    ageGroup: "10-16 years",
    participantName: studentData[2].name,
    participantAge: 14,
    parentName: "Mr. & Mrs. Johnson",
    amount: 1800,
    paymentMethod: "PromptPay",
    transactionDate: new Date("2025-04-14"),
    downloadCount: 1,
    sessionTimes: "08:00-12:00",
    isEarlyBird: false
  },
  {
    id: "3",
    receiptNumber: "SUM-RCP-2025-001236",
    activityName: "Science Discovery Workshop",
    activityType: "stem",
    duration: "3 days",
    ageGroup: "12-16 years",
    participantName: studentData[3].name,
    participantAge: 13,
    parentName: "Mr. & Mrs. Williams",
    amount: 1200,
    paymentMethod: "Bank Transfer",
    transactionDate: new Date("2025-04-13"),
    downloadCount: 0,
    sessionTimes: "10:00-16:00",
    isEarlyBird: true
  },
  {
    id: "4",
    receiptNumber: "SUM-RCP-2025-001237",
    activityName: "French Language Immersion",
    activityType: "language",
    duration: "2 weeks",
    ageGroup: "14-18 years",
    participantName: studentData[4].name,
    participantAge: 16,
    parentName: "Mr. & Mrs. Williams",
    amount: 3200,
    paymentMethod: "WeChat Pay",
    transactionDate: new Date("2025-04-12"),
    downloadCount: 3,
    sessionTimes: "09:00-15:00",
    isEarlyBird: false
  },
  {
    id: "5",
    receiptNumber: "SUM-RCP-2025-001238",
    activityName: "Coding Bootcamp",
    activityType: "stem",
    duration: "1 week",
    ageGroup: "12-18 years",
    participantName: studentData[6].name,
    participantAge: 15,
    parentName: "Mr. & Mrs. Brown",
    amount: 2800,
    paymentMethod: "Cash",
    transactionDate: new Date("2025-04-11"),
    downloadCount: 0,
    sessionTimes: "13:00-17:00",
    isEarlyBird: true
  }
]

// Add more mock data
for (let i = 6; i <= 35; i++) {
  const isEarlyBird = Math.random() > 0.6
  const student = studentData[i % studentData.length]
  const activityTypes: ("camp" | "workshop" | "sports" | "art" | "language" | "stem")[] = ["camp", "workshop", "sports", "art", "language", "stem"]
  const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)]
  const age = Math.floor(Math.random() * 12) + 6 // Age between 6-18

  mockReceipts.push({
    id: i.toString(),
    receiptNumber: `SUM-RCP-2025-${String(1234 + i).padStart(6, '0')}`,
    activityName: `Summer Activity ${i}`,
    activityType: activityType,
    duration: ["1 week", "2 weeks", "3 days", "5 days"][Math.floor(Math.random() * 4)],
    ageGroup: `${age}-${age + 6} years`,
    participantName: student.name,
    participantAge: age,
    parentName: `Mr. & Mrs. ${student.name.split(' ')[1]}`,
    amount: Math.floor(Math.random() * 2500) + 800,
    paymentMethod: ["Credit Card", "PromptPay", "Bank Transfer", "WeChat Pay", "Cash"][Math.floor(Math.random() * 5)],
    transactionDate: new Date(2025, 3 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 28) + 1), // April-May
    downloadCount: Math.floor(Math.random() * 5),
    sessionTimes: ["09:00-15:00", "08:00-12:00", "13:00-17:00", "10:00-16:00"][Math.floor(Math.random() * 4)],
    isEarlyBird
  })
}

export function SummerActivitiesReceipts() {
  const [receipts] = useState<SummerActivityReceipt[]>(mockReceipts)
  const [filteredReceipts, setFilteredReceipts] = useState<SummerActivityReceipt[]>(mockReceipts)
  const [searchTerm, setSearchTerm] = useState("")
  const [activityTypeFilter, setActivityTypeFilter] = useState("all")
  const [earlyBirdFilter, setEarlyBirdFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  // View receipt detail dialog
  const [selectedReceipt, setSelectedReceipt] = useState<SummerActivityReceipt | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Pagination states
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

  const getSortedReceipts = (receiptsToSort: SummerActivityReceipt[]) => {
    if (!sortColumn) return receiptsToSort

    return [...receiptsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "receiptNumber":
          aVal = a.receiptNumber
          bVal = b.receiptNumber
          break
        case "activityName":
          aVal = a.activityName
          bVal = b.activityName
          break
        case "participantName":
          aVal = a.participantName
          bVal = b.participantName
          break
        case "parentName":
          aVal = a.parentName
          bVal = b.parentName
          break
        case "amount":
          aVal = a.amount
          bVal = b.amount
          break
        case "transactionDate":
          aVal = a.transactionDate.getTime()
          bVal = b.transactionDate.getTime()
          break
        case "downloadCount":
          aVal = a.downloadCount
          bVal = b.downloadCount
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

  const applyFilters = () => {
    let filtered = receipts

    if (searchTerm) {
      filtered = filtered.filter(receipt => 
        receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.activityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.parentName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (activityTypeFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.activityType === activityTypeFilter)
    }

    if (earlyBirdFilter !== "all") {
      filtered = filtered.filter(receipt => 
        earlyBirdFilter === "yes" ? receipt.isEarlyBird : !receipt.isEarlyBird
      )
    }

    if (dateFrom) {
      filtered = filtered.filter(receipt => receipt.transactionDate >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(receipt => receipt.transactionDate <= dateTo)
    }

    setFilteredReceipts(filtered)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setActivityTypeFilter("all")
    setEarlyBirdFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredReceipts(receipts)
    setCurrentPage(1)
  }

  const downloadReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      toast.success(`Receipt ${receipt.receiptNumber} downloaded successfully`)
    }
  }

  const resendReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      toast.success(`Receipt resent to ${receipt.parentName}`)
    }
  }

  const viewReceipt = (receiptId: string) => {
    const receipt = receipts.find(r => r.id === receiptId)
    if (receipt) {
      setSelectedReceipt(receipt)
      setIsViewDialogOpen(true)
    }
  }

  const getActivityTypeBadge = (activityType: string) => {
    switch (activityType) {
      case "camp":
        return <Badge variant="default" className="bg-green-500">Camp</Badge>
      case "workshop":
        return <Badge variant="default" className="bg-blue-500">Workshop</Badge>
      case "sports":
        return <Badge variant="default" className="bg-orange-500">Sports</Badge>
      case "art":
        return <Badge variant="default" className="bg-purple-500">Art</Badge>
      case "language":
        return <Badge variant="default" className="bg-pink-500">Language</Badge>
      case "stem":
        return <Badge variant="default" className="bg-teal-500">STEM</Badge>
      default:
        return <Badge variant="secondary">{activityType}</Badge>
    }
  }

  // Calculate pagination with sorting
  const sortedReceipts = getSortedReceipts(filteredReceipts)
  const totalPages = Math.ceil(sortedReceipts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageReceipts = sortedReceipts.slice(startIndex, endIndex)

  const summaryStats = {
    total: receipts.length,
    totalDownloads: receipts.reduce((sum, r) => sum + r.downloadCount, 0),
    earlyBird: receipts.filter(r => r.isEarlyBird).length,
    totalRevenue: receipts.reduce((sum, r) => sum + r.amount, 0),
    avgAmount: receipts.reduce((sum, r) => sum + r.amount, 0) / receipts.length,
    avgAge: receipts.reduce((sum, r) => sum + r.participantAge, 0) / receipts.length
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Summer Activities Receipt Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage receipts and internal email notifications
          </p>
        </div>
      </div>

      <Tabs defaultValue="receipts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Receipt Management
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Internal Email Whitelist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">Receipt Management</h3>
              <p className="text-sm text-muted-foreground">
                View and download summer activities payment receipts
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Bulk Resend
              </Button>
              <Button className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export All
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.earlyBird} early bird discounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₿{summaryStats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Avg ₿{Math.round(summaryStats.avgAmount).toLocaleString()} per activity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Early Bird Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.earlyBird}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((summaryStats.earlyBird / summaryStats.total) * 100)}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Age</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(summaryStats.avgAge)} years</div>
                <p className="text-xs text-muted-foreground">
                  Participant average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalDownloads}</div>
                <p className="text-xs text-muted-foreground">
                  Avg {(summaryStats.totalDownloads / summaryStats.total).toFixed(1)} per receipt
                </p>
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
                  <Button onClick={applyFilters} className="h-9">Apply</Button>
                  <Button variant="outline" onClick={clearFilters} className="h-9">Clear</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Search</label>
                  <Input
                    placeholder="Receipt, activity, participant"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Activity Type</label>
                  <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="camp">Camp</SelectItem>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="language">Language</SelectItem>
                      <SelectItem value="stem">STEM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Early Bird</label>
                  <Select value={earlyBirdFilter} onValueChange={setEarlyBirdFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Bookings</SelectItem>
                      <SelectItem value="yes">Early Bird</SelectItem>
                      <SelectItem value="no">Regular Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom || undefined}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">→</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "dd/MM/yy") : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo || undefined}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredReceipts.length)} of {filteredReceipts.length} receipts
              {filteredReceipts.length !== receipts.length && (
                <span> (filtered from {receipts.length} total)</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>

          {/* Receipt Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                      <div className="flex items-center gap-1">
                        Receipt Number
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("activityName")}>
                      <div className="flex items-center gap-1">
                        Activity Details
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("participantName")}>
                      <div className="flex items-center gap-1">
                        Participant
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                      <div className="flex items-center gap-1">
                        Parent
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        Amount
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                      <div className="flex items-center gap-1">
                        Date
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("downloadCount")}>
                      <div className="flex items-center gap-1">
                        Downloads
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-sm">
                        {receipt.receiptNumber}
                        {receipt.isEarlyBird && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                            Early Bird
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{receipt.activityName}</div>
                          <div className="flex items-center gap-2">
                            {getActivityTypeBadge(receipt.activityType)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {receipt.duration} - {receipt.sessionTimes}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UsersIcon className="w-3 h-3" />
                            Age: {receipt.ageGroup}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.participantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {receipt.participantAge} years old
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{receipt.parentName}</div>
                      </TableCell>
                      <TableCell>₿{receipt.amount.toLocaleString()}</TableCell>
                      <TableCell>{receipt.paymentMethod}</TableCell>
                      <TableCell>{format(receipt.transactionDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {receipt.downloadCount} times
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => viewReceipt(receipt.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => downloadReceipt(receipt.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => resendReceipt(receipt.id)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => goToPage(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, index) => {
                    const pageNumber = Math.max(1, currentPage - 2) + index
                    if (pageNumber > totalPages) return null
                    
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => goToPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => goToPage(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Activity Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  Popular Activity Types
                </CardTitle>
                <p className="text-sm text-muted-foreground">Revenue by activity category</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: "STEM", count: 2, revenue: 4000, color: "bg-teal-500" },
                    { type: "Language", count: 1, revenue: 3200, color: "bg-pink-500" },
                    { type: "Art", count: 1, revenue: 2500, color: "bg-purple-500" },
                    { type: "Sports", count: 1, revenue: 1800, color: "bg-orange-500" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <div>
                          <div className="font-medium">{item.type}</div>
                          <div className="text-sm text-muted-foreground">{item.count} activities</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₿{item.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">Early bird vs regular bookings</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Early Bird Bookings</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => r.isEarlyBird).length} participants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ₿{receipts.filter(r => r.isEarlyBird).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((receipts.filter(r => r.isEarlyBird).reduce((sum, r) => sum + r.amount, 0) / summaryStats.totalRevenue) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Regular Bookings</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => !r.isEarlyBird).length} participants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ₿{receipts.filter(r => !r.isEarlyBird).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((receipts.filter(r => !r.isEarlyBird).reduce((sum, r) => sum + r.amount, 0) / summaryStats.totalRevenue) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm">
                      <strong>Insight:</strong> Early bird bookings represent {Math.round((summaryStats.earlyBird / summaryStats.total) * 100)}% of total registrations, encouraging advance planning and commitment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <InternalEmailManagement
            title="Summer Activities Receipt Email Whitelist"
            description="Manage internal staff emails who receive summer activities receipt notifications"
          />
        </TabsContent>
      </Tabs>

      {/* View Receipt Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipt Details
            </DialogTitle>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-6">
              {/* Receipt Header */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Receipt Number</p>
                  <p className="text-lg font-bold font-mono">{selectedReceipt.receiptNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedReceipt.isEarlyBird && (
                    <Badge className="bg-amber-100 text-amber-800">Early Bird</Badge>
                  )}
                  {getActivityTypeBadge(selectedReceipt.activityType)}
                </div>
              </div>

              {/* Activity Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Activity Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Activity Name</Label>
                    <p className="font-medium">{selectedReceipt.activityName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="font-medium">{selectedReceipt.duration}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Session Times</Label>
                    <p className="font-medium">{selectedReceipt.sessionTimes}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Age Group</Label>
                    <p className="font-medium">{selectedReceipt.ageGroup}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Participant Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Participant Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Participant Name</Label>
                    <p className="font-medium">{selectedReceipt.participantName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Age</Label>
                    <p className="font-medium">{selectedReceipt.participantAge} years old</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parent/Guardian</Label>
                    <p className="font-medium">{selectedReceipt.parentName}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p className="text-xl font-bold text-green-600">฿{selectedReceipt.amount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Payment Method</Label>
                    <p className="font-medium">{selectedReceipt.paymentMethod}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Transaction Date</Label>
                    <p className="font-medium">{format(selectedReceipt.transactionDate, "PPP")}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Downloads</Label>
                    <p className="font-medium">{selectedReceipt.downloadCount} times</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => downloadReceipt(selectedReceipt.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => resendReceipt(selectedReceipt.id)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}