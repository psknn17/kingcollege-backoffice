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
import { CalendarIcon, Search, Download, Filter, Eye, Mail, Receipt, Users, Calendar as CalendarEmoji, MapPin, ArrowUpDown } from "lucide-react"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
import { format } from "date-fns"
import { toast } from "sonner"
import { InternalEmailManagement } from "./InternalEmailManagement"

// Student data matching StudentContext (for internal SISB students)
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

interface EventReceipt {
  id: string
  receiptNumber: string
  eventName: string
  eventType: "educational" | "sports" | "cultural" | "trip"
  eventDate: Date
  location: string
  participantName: string
  participantId: string
  participantGrade: string
  parentName: string
  amount: number
  paymentMethod: string
  transactionDate: Date
  downloadCount: number
  isExternal: boolean
}

const mockReceipts: EventReceipt[] = [
  {
    id: "1",
    receiptNumber: "EVT-RCP-2025-001234",
    eventName: "Science Fair 2025",
    eventType: "educational",
    eventDate: new Date("2025-09-15"),
    location: "Main Auditorium",
    participantName: studentData[2].name,
    participantId: studentData[2].id,
    participantGrade: studentData[2].grade,
    parentName: "Mr. & Mrs. Johnson",
    amount: 350,
    paymentMethod: "Credit Card",
    transactionDate: new Date("2025-08-15"),
    downloadCount: 2,
    isExternal: false
  },
  {
    id: "2",
    receiptNumber: "EVT-RCP-2025-001235",
    eventName: "Football Championship",
    eventType: "sports",
    eventDate: new Date("2025-09-20"),
    location: "Sports Complex",
    participantName: "Alex Chen",
    participantId: "EXT001235",
    participantGrade: "Year 10",
    parentName: "David Chen",
    amount: 450,
    paymentMethod: "PromptPay",
    transactionDate: new Date("2025-08-14"),
    downloadCount: 1,
    isExternal: true
  },
  {
    id: "3",
    receiptNumber: "EVT-RCP-2025-001236",
    eventName: "Cultural Festival",
    eventType: "cultural",
    eventDate: new Date("2025-09-25"),
    location: "School Grounds",
    participantName: studentData[4].name,
    participantId: studentData[4].id,
    participantGrade: studentData[4].grade,
    parentName: "Mr. & Mrs. Williams",
    amount: 250,
    paymentMethod: "Bank Transfer",
    transactionDate: new Date("2025-08-13"),
    downloadCount: 0,
    isExternal: false
  },
  {
    id: "4",
    receiptNumber: "EVT-RCP-2025-001237",
    eventName: "Bangkok Educational Trip",
    eventType: "trip",
    eventDate: new Date("2025-10-05"),
    location: "Bangkok Museums",
    participantName: "Sophie Wilson",
    participantId: "EXT001237",
    participantGrade: "Year 12",
    parentName: "Jennifer Wilson",
    amount: 1200,
    paymentMethod: "WeChat Pay",
    transactionDate: new Date("2025-08-12"),
    downloadCount: 3,
    isExternal: true
  },
  {
    id: "5",
    receiptNumber: "EVT-RCP-2025-001238",
    eventName: "Music Concert",
    eventType: "cultural",
    eventDate: new Date("2025-09-30"),
    location: "Music Hall",
    participantName: studentData[6].name,
    participantId: studentData[6].id,
    participantGrade: studentData[6].grade,
    parentName: "Mr. & Mrs. Brown",
    amount: 180,
    paymentMethod: "Cash",
    transactionDate: new Date("2025-08-11"),
    downloadCount: 0,
    isExternal: false
  }
]

// Add more mock data
for (let i = 6; i <= 40; i++) {
  const isExternal = Math.random() > 0.6
  const student = studentData[i % studentData.length]
  const eventTypes: ("educational" | "sports" | "cultural" | "trip")[] = ["educational", "sports", "cultural", "trip"]
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]

  mockReceipts.push({
    id: i.toString(),
    receiptNumber: `EVT-RCP-2025-${String(1234 + i).padStart(6, '0')}`,
    eventName: `Event ${i}`,
    eventType: eventType,
    eventDate: new Date(2025, Math.floor(Math.random() * 3) + 8, Math.floor(Math.random() * 28) + 1),
    location: `Location ${i}`,
    participantName: isExternal ? `External Participant ${i}` : student.name,
    participantId: isExternal ? `EXT${String(1234 + i).padStart(6, '0')}` : student.id,
    participantGrade: isExternal ? ["Year 7", "Year 8", "Year 9", "Year 10"][Math.floor(Math.random() * 4)] : student.grade,
    parentName: isExternal ? `External Parent ${i}` : `Mr. & Mrs. ${student.name.split(' ')[1]}`,
    amount: Math.floor(Math.random() * 1000) + 200,
    paymentMethod: ["Credit Card", "PromptPay", "Bank Transfer", "WeChat Pay", "Cash"][Math.floor(Math.random() * 5)],
    transactionDate: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    downloadCount: Math.floor(Math.random() * 5),
    isExternal
  })
}

export function EventReceipts() {
  const [receipts] = useState<EventReceipt[]>(mockReceipts)
  const [filteredReceipts, setFilteredReceipts] = useState<EventReceipt[]>(mockReceipts)
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [participantTypeFilter, setParticipantTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)

  // View receipt detail dialog
  const [selectedReceipt, setSelectedReceipt] = useState<EventReceipt | null>(null)
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

  const getSortedReceipts = (receiptsToSort: EventReceipt[]) => {
    if (!sortColumn) return receiptsToSort

    return [...receiptsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "receiptNumber":
          aVal = a.receiptNumber
          bVal = b.receiptNumber
          break
        case "eventName":
          aVal = a.eventName
          bVal = b.eventName
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
        receipt.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.participantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.eventType === eventTypeFilter)
    }

    if (participantTypeFilter !== "all") {
      filtered = filtered.filter(receipt => 
        participantTypeFilter === "external" ? receipt.isExternal : !receipt.isExternal
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
    setEventTypeFilter("all")
    setParticipantTypeFilter("all")
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

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case "educational":
        return <Badge variant="default" className="bg-blue-500">Educational</Badge>
      case "sports":
        return <Badge variant="default" className="bg-green-500">Sports</Badge>
      case "cultural":
        return <Badge variant="default" className="bg-purple-500">Cultural</Badge>
      case "trip":
        return <Badge variant="default" className="bg-orange-500">Trip</Badge>
      default:
        return <Badge variant="secondary">{eventType}</Badge>
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
    externalParticipants: receipts.filter(r => r.isExternal).length,
    totalRevenue: receipts.reduce((sum, r) => sum + r.amount, 0),
    avgAmount: receipts.reduce((sum, r) => sum + r.amount, 0) / receipts.length
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Event Receipt Management</h2>
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
                View and download event participation payment receipts
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.externalParticipants} external participants
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
                  Avg ₿{summaryStats.avgAmount.toFixed(0)} per event
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">External Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{summaryStats.externalParticipants}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((summaryStats.externalParticipants / summaryStats.total) * 100)}% of total
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
                    placeholder="Receipt, event, participant"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Event Type</label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="trip">Trip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Participant Type</label>
                  <Select value={participantTypeFilter} onValueChange={setParticipantTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Participants</SelectItem>
                      <SelectItem value="internal">SISB Students</SelectItem>
                      <SelectItem value="external">External Participants</SelectItem>
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
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("eventName")}>
                      <div className="flex items-center gap-1">
                        Event Details
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
                        {receipt.isExternal && <Badge variant="secondary" className="ml-2 text-xs">External</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{receipt.eventName}</div>
                          <div className="flex items-center gap-2">
                            {getEventTypeBadge(receipt.eventType)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarEmoji className="w-3 h-3" />
                            {format(receipt.eventDate, "MMM dd, yyyy")}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {receipt.location}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.participantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {receipt.participantId} - {receipt.participantGrade}
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

          {/* Event Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Event Types</CardTitle>
                <p className="text-sm text-muted-foreground">Based on revenue and participation</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: "Trip", count: 2, revenue: 1200, color: "bg-orange-500" },
                    { type: "Educational", count: 3, revenue: 800, color: "bg-blue-500" },
                    { type: "Cultural", count: 4, revenue: 650, color: "bg-purple-500" },
                    { type: "Sports", count: 2, revenue: 450, color: "bg-green-500" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <div>
                          <div className="font-medium">{item.type}</div>
                          <div className="text-sm text-muted-foreground">{item.count} events</div>
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
                <CardTitle>Participation Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">SISB vs External participants</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">SISB Students</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => !r.isExternal).length} participants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ₿{receipts.filter(r => !r.isExternal).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((receipts.filter(r => !r.isExternal).reduce((sum, r) => sum + r.amount, 0) / summaryStats.totalRevenue) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">External Participants</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => r.isExternal).length} participants
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ₿{receipts.filter(r => r.isExternal).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((receipts.filter(r => r.isExternal).reduce((sum, r) => sum + r.amount, 0) / summaryStats.totalRevenue) * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <strong>Insight:</strong> External participants represent {Math.round((summaryStats.externalParticipants / summaryStats.total) * 100)}% of event receipts and contribute significantly to event revenue.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <InternalEmailManagement
            title="Event Receipt Email Whitelist"
            description="Manage internal staff emails who receive event receipt notifications"
          />
        </TabsContent>
      </Tabs>

      {/* View Receipt Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
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
                  {selectedReceipt.isExternal && (
                    <Badge variant="outline">External</Badge>
                  )}
                  {getEventTypeBadge(selectedReceipt.eventType)}
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Event Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Event Name</Label>
                    <p className="font-medium">{selectedReceipt.eventName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Event Date</Label>
                    <p className="font-medium">{format(selectedReceipt.eventDate, "PPP")}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {selectedReceipt.location}
                    </p>
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
                    <Label className="text-xs text-muted-foreground">Student ID</Label>
                    <p className="font-medium font-mono">{selectedReceipt.participantId}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Grade</Label>
                    <p className="font-medium">{selectedReceipt.participantGrade}</p>
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