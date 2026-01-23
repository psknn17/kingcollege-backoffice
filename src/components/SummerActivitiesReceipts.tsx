import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { CalendarIcon, Search, Download, Filter, Eye, Mail, Receipt, Users, Sun, Clock, Users as UsersIcon, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"
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
  status: "issued" | "resent" | "failed"
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
    status: "issued",
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
    status: "issued",
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
    status: "resent",
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
    status: "issued",
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
    status: "failed",
    downloadCount: 0,
    sessionTimes: "13:00-17:00",
    isEarlyBird: true
  }
]

export function SummerActivitiesReceipts() {
  const { t } = useLanguage()
  const [receipts] = useState<SummerActivityReceipt[]>(mockReceipts)
  const [filteredReceipts, setFilteredReceipts] = useState<SummerActivityReceipt[]>(mockReceipts)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activityTypeFilter, setActivityTypeFilter] = useState("all")
  const [earlyBirdFilter, setEarlyBirdFilter] = useState("all")
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

    if (statusFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.status === statusFilter)
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
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setActivityTypeFilter("all")
    setEarlyBirdFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredReceipts(receipts)
  }

  const downloadReceipt = (receiptId: string) => {
    console.log("Downloading summer activity receipt", receiptId)
    // In a real app, this would generate and download PDF
  }

  const resendReceipt = (receiptId: string) => {
    console.log("Resending summer activity receipt via email", receiptId)
    // In a real app, this would resend receipt email
  }

  const viewReceipt = (receiptId: string) => {
    console.log("Viewing summer activity receipt", receiptId)
    // In a real app, this would open receipt in modal or new tab
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge className="bg-green-100 text-green-800">{t("receipt.status.issued")}</Badge>
      case "resent":
        return <Badge className="bg-blue-100 text-blue-800">{t("receipt.status.resent")}</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">{t("receipt.status.failed")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getActivityTypeBadge = (activityType: string) => {
    switch (activityType) {
      case "camp":
        return <Badge variant="default" className="bg-green-500">{t("summer.activityType.camp")}</Badge>
      case "workshop":
        return <Badge variant="default" className="bg-blue-500">{t("summer.activityType.workshop")}</Badge>
      case "sports":
        return <Badge variant="default" className="bg-orange-500">{t("summer.activityType.sports")}</Badge>
      case "art":
        return <Badge variant="default" className="bg-purple-500">{t("summer.activityType.art")}</Badge>
      case "language":
        return <Badge variant="default" className="bg-pink-500">{t("summer.activityType.language")}</Badge>
      case "stem":
        return <Badge variant="default" className="bg-teal-500">{t("summer.activityType.stem")}</Badge>
      default:
        return <Badge variant="secondary">{activityType}</Badge>
    }
  }

  const summaryStats = {
    total: receipts.length,
    issued: receipts.filter(r => r.status === "issued").length,
    resent: receipts.filter(r => r.status === "resent").length,
    failed: receipts.filter(r => r.status === "failed").length,
    totalDownloads: receipts.reduce((sum, r) => sum + r.downloadCount, 0),
    earlyBird: receipts.filter(r => r.isEarlyBird).length,
    totalRevenue: receipts.reduce((sum, r) => sum + r.amount, 0),
    avgAmount: receipts.reduce((sum, r) => sum + r.amount, 0) / receipts.length,
    avgAge: receipts.reduce((sum, r) => sum + r.participantAge, 0) / receipts.length
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">{t("summer.receipts.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("summer.receipts.description")}
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
            {t("common.internalEmailWhitelist")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium">{t("receipt.management")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("summer.receipts.viewDownload")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t("receipt.bulkResend")}
              </Button>
              <Button className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("common.exportAll")}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("receipt.totalReceipts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.earlyBird} {t("summer.earlyBirdDiscounts")}
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
                  {Math.round((summaryStats.issued / summaryStats.total) * 100)}% {t("common.successRate")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("common.totalRevenue")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₿{summaryStats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t("common.avg")} ₿{Math.round(summaryStats.avgAmount).toLocaleString()} {t("summer.perActivity")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{t("summer.averageAge")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(summaryStats.avgAge)} {t("common.years")}</div>
                <p className="text-xs text-muted-foreground">
                  {t("summer.participantAverage")}
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
                  {t("common.avg")} {(summaryStats.totalDownloads / summaryStats.total).toFixed(1)} {t("receipt.perReceipt")}
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
                  {t("common.searchAndFilter")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="h-9">{t("common.apply")}</Button>
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
                      placeholder={t("summer.receipts.searchPlaceholder")}
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
                      <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                      <SelectItem value="issued">{t("receipt.status.issued")}</SelectItem>
                      <SelectItem value="resent">{t("receipt.status.resent")}</SelectItem>
                      <SelectItem value="failed">{t("receipt.status.failed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("summer.activityType.label")}</label>
                  <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allTypes")}</SelectItem>
                      <SelectItem value="camp">{t("summer.activityType.camp")}</SelectItem>
                      <SelectItem value="workshop">{t("summer.activityType.workshop")}</SelectItem>
                      <SelectItem value="sports">{t("summer.activityType.sports")}</SelectItem>
                      <SelectItem value="art">{t("summer.activityType.art")}</SelectItem>
                      <SelectItem value="language">{t("summer.activityType.language")}</SelectItem>
                      <SelectItem value="stem">{t("summer.activityType.stem")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("summer.earlyBird")}</label>
                  <Select value={earlyBirdFilter} onValueChange={setEarlyBirdFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("summer.allBookings")}</SelectItem>
                      <SelectItem value="yes">{t("summer.earlyBird")}</SelectItem>
                      <SelectItem value="no">{t("summer.regularPrice")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("common.dateRange")}</label>
                  <div className="flex gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {dateFrom ? format(dateFrom, "MM/dd") : t("common.from")}
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
                          {dateTo ? format(dateTo, "MM/dd") : t("common.to")}
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
              {t("common.showing")} {filteredReceipts.length} {t("common.of")} {receipts.length} {t("common.receipts")}
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
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("activityName")}>
                      <div className="flex items-center gap-1">
                        {t("summer.activityDetails")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("participantName")}>
                      <div className="flex items-center gap-1">
                        {t("summer.participant")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                      <div className="flex items-center gap-1">
                        {t("common.parent")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        {t("common.amount")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("common.paymentMethod")}</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                      <div className="flex items-center gap-1">
                        {t("common.date")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("downloadCount")}>
                      <div className="flex items-center gap-1">
                        {t("common.downloads")}
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
                        {receipt.isEarlyBird && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-800">
                            {t("summer.earlyBird")}
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
                            {t("summer.age")}: {receipt.ageGroup}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{receipt.participantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {receipt.participantAge} {t("summer.yearsOld")}
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
                          {receipt.downloadCount} {t("common.times")}
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

          {/* Activity Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" />
                  {t("summer.popularActivityTypes")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("summer.revenueByCategory")}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: t("summer.activityType.stem"), count: 2, revenue: 4000, color: "bg-teal-500" },
                    { type: t("summer.activityType.language"), count: 1, revenue: 3200, color: "bg-pink-500" },
                    { type: t("summer.activityType.art"), count: 1, revenue: 2500, color: "bg-purple-500" },
                    { type: t("summer.activityType.sports"), count: 1, revenue: 1800, color: "bg-orange-500" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <div>
                          <div className="font-medium">{item.type}</div>
                          <div className="text-sm text-muted-foreground">{item.count} {t("summer.activities")}</div>
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
                <CardTitle>{t("summer.bookingAnalysis")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("summer.earlyBirdVsRegular")}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t("summer.earlyBirdBookings")}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => r.isEarlyBird).length} {t("summer.participants")}
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
                      <div className="font-medium">{t("summer.regularBookings")}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipts.filter(r => !r.isEarlyBird).length} {t("summer.participants")}
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
                      <strong>{t("summer.insight")}:</strong> {t("summer.insightText", { percentage: Math.round((summaryStats.earlyBird / summaryStats.total) * 100) })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <InternalEmailManagement
            title={t("summer.receipts.emailWhitelistTitle")}
            description={t("summer.receipts.emailWhitelistDescription")}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}