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
import { CalendarIcon, Search, Download, Filter, Eye, Mail, Receipt, Users, Calendar as CalendarEmoji, MapPin, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
import { InternalEmailManagement } from "./InternalEmailManagement"
import { useLanguage } from "@/contexts/LanguageContext"

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
  status: "issued" | "resent" | "failed"
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
    status: "issued",
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
    status: "issued",
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
    status: "resent",
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
    status: "issued",
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
    status: "failed",
    downloadCount: 0,
    isExternal: false
  }
]

export function EventReceipts() {
  const { t } = useLanguage()
  const [receipts] = useState<EventReceipt[]>(mockReceipts)
  const [filteredReceipts, setFilteredReceipts] = useState<EventReceipt[]>(mockReceipts)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [participantTypeFilter, setParticipantTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
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
          aVal = a.transactionDate?.getTime() || 0
          bVal = b.transactionDate?.getTime() || 0
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

    if (statusFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.status === statusFilter)
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
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setEventTypeFilter("all")
    setParticipantTypeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredReceipts(receipts)
  }

  const downloadReceipt = (receiptId: string) => {
    console.log("Downloading event receipt", receiptId)
    // In a real app, this would generate and download PDF
  }

  const resendReceipt = (receiptId: string) => {
    console.log("Resending event receipt via email", receiptId)
    // In a real app, this would resend receipt email
  }

  const viewReceipt = (receiptId: string) => {
    console.log("Viewing event receipt", receiptId)
    // In a real app, this would open receipt in modal or new tab
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge className="bg-green-100 text-green-800">{t("receipt.issued")}</Badge>
      case "resent":
        return <Badge className="bg-blue-100 text-blue-800">{t("receipt.resent")}</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">{t("receipt.failed")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case "educational":
        return <Badge variant="default" className="bg-blue-500">{t("eventReceipt.educational")}</Badge>
      case "sports":
        return <Badge variant="default" className="bg-green-500">{t("eventReceipt.sports")}</Badge>
      case "cultural":
        return <Badge variant="default" className="bg-purple-500">{t("eventReceipt.cultural")}</Badge>
      case "trip":
        return <Badge variant="default" className="bg-orange-500">{t("eventReceipt.trip")}</Badge>
      default:
        return <Badge variant="secondary">{eventType}</Badge>
    }
  }

  const summaryStats = {
    total: receipts.length,
    issued: receipts.filter(r => r.status === "issued").length,
    resent: receipts.filter(r => r.status === "resent").length,
    failed: receipts.filter(r => r.status === "failed").length,
    totalDownloads: receipts.reduce((sum, r) => sum + r.downloadCount, 0),
    externalParticipants: receipts.filter(r => r.isExternal).length,
    totalRevenue: receipts.reduce((sum, r) => sum + r.amount, 0),
    avgAmount: receipts.reduce((sum, r) => sum + r.amount, 0) / receipts.length
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("eventReceipt.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("eventReceipt.subtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="receipts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            {t("receipt.management")}
          </TabsTrigger>
          <TabsTrigger value="whitelist" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("receipt.internalEmailWhitelist")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">{t("receipt.management")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("eventReceipt.viewAndDownload")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t("receipt.bulkResend")}
              </Button>
              <Button className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("receipt.exportAll")}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("receipt.totalReceipts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.externalParticipants} {t("eventReceipt.externalParticipants")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("receipt.successfullyIssued")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryStats.issued}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((summaryStats.issued / summaryStats.total) * 100)}% {t("receipt.successRate")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("eventReceipt.totalRevenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₿{summaryStats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t("eventReceipt.avgPerEvent", { avg: summaryStats.avgAmount.toLocaleString() })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("receipt.totalDownloads")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalDownloads}</div>
                <p className="text-xs text-muted-foreground">
                  {t("receipt.avgPerReceipt", { avg: (summaryStats.totalDownloads / summaryStats.total).toFixed(1) })}
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
                  {t("eventReceipt.searchAndFilter")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="h-9">{t("eventReceipt.apply")}</Button>
                  <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("common.search")}</label>
                  <div className="relative">
                    <Input
                      placeholder={t("eventReceipt.searchPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className=""
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("common.status")}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("eventReceipt.allStatus")}</SelectItem>
                      <SelectItem value="issued">{t("receipt.issued")}</SelectItem>
                      <SelectItem value="resent">{t("receipt.resent")}</SelectItem>
                      <SelectItem value="failed">{t("receipt.failed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("eventReceipt.eventType")}</label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("receipt.allTypes")}</SelectItem>
                      <SelectItem value="educational">{t("eventReceipt.educational")}</SelectItem>
                      <SelectItem value="sports">{t("eventReceipt.sports")}</SelectItem>
                      <SelectItem value="cultural">{t("eventReceipt.cultural")}</SelectItem>
                      <SelectItem value="trip">{t("eventReceipt.trip")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("eventReceipt.participantType")}</label>
                  <Select value={participantTypeFilter} onValueChange={setParticipantTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("eventReceipt.allParticipants")}</SelectItem>
                      <SelectItem value="internal">{t("eventReceipt.sisbStudents")}</SelectItem>
                      <SelectItem value="external">{t("eventReceipt.externalParticipantsFilter")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("eventReceipt.dateRange")}</label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {dateFrom ? format(dateFrom, "MM/dd") : t("eventReceipt.from")}
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

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {dateTo ? format(dateTo, "MM/dd") : t("eventReceipt.to")}
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
              {t("eventReceipt.showingReceipts", { count: filteredReceipts.length, total: receipts.length })}
            </p>
          </div>

          {/* Receipt Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                      <div className="flex items-center gap-1">
                        {t("receipt.receiptNumber")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("eventName")}>
                      <div className="flex items-center gap-1">
                        {t("eventReceipt.eventDetails")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("participantName")}>
                      <div className="flex items-center gap-1">
                        {t("eventReceipt.participant")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                      <div className="flex items-center gap-1">
                        {t("eventReceipt.parent")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        {t("common.amount")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("receipt.paymentMethod")}</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                      <div className="flex items-center gap-1">
                        {t("common.date")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("downloadCount")}>
                      <div className="flex items-center gap-1">
                        {t("receipt.downloads")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedReceipts(filteredReceipts).map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-sm">
                        {receipt.receiptNumber}
                        {receipt.isExternal && <Badge variant="secondary" className="ml-2 text-xs">{t("eventReceipt.external")}</Badge>}
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
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {receipt.downloadCount} {t("receipt.times")}
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

          {/* Event Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("eventReceipt.popularEventTypes")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("eventReceipt.basedOnRevenue")}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: t("eventReceipt.trip"), count: 2, revenue: 1200, color: "bg-orange-500" },
                    { type: t("eventReceipt.educational"), count: 3, revenue: 800, color: "bg-blue-500" },
                    { type: t("eventReceipt.cultural"), count: 4, revenue: 650, color: "bg-purple-500" },
                    { type: t("eventReceipt.sports"), count: 2, revenue: 450, color: "bg-green-500" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <div>
                          <div className="font-medium">{item.type}</div>
                          <div className="text-sm text-muted-foreground">{item.count} {t("eventReceipt.events")}</div>
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
                <CardTitle>{t("eventReceipt.participationAnalysis")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("eventReceipt.sisbVsExternal")}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t("eventReceipt.sisbStudents")}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => !r.isExternal).length} {t("eventReceipt.participants")}
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
                      <div className="font-medium">{t("eventReceipt.externalParticipantsLabel")}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => r.isExternal).length} {t("eventReceipt.participants")}
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
                      <strong>{t("receipt.insight")}:</strong> {t("eventReceipt.externalInsight", { percent: Math.round((summaryStats.externalParticipants / summaryStats.total) * 100) })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <InternalEmailManagement
            title={t("eventReceipt.whitelistTitle")}
            description={t("eventReceipt.whitelistDesc")}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}