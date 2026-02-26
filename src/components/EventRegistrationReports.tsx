import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { usePersistedState } from "@/hooks/usePersistedState"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  FileBarChart,
  Download,
  CalendarDays,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Search,
  ArrowUpDown
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"
import { ColumnPresets } from "@/utils/tableAlignment"

interface EventRegistration {
  id: number
  eventName: string
  studentName: string
  studentId: string
  yearGroup: string
  registrationDate: string
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'cancelled' | 'overdue'
  amount: number
  paymentChannel: "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank"
  parentEmail: string
}

interface EventSummary {
  eventName: string
  totalRegistrations: number
  paidRegistrations: number
  pendingPayments: number
  totalRevenue: number
  registrationTrend: number
}

// Generate more mock data for pagination testing
const generateMockRegistrations = (): EventRegistration[] => {
  const events = ["Sports Day 2024", "Science Fair", "Music Concert", "Field Trip - Zoo", "Art Exhibition", "Drama Performance"]
  const yearGroups = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  const firstNames = ["John", "Emma", "Michael", "Sarah", "David", "Lisa", "James", "Sophia", "William", "Olivia", "Benjamin", "Ava", "Lucas", "Isabella", "Henry", "Mia"]
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
  const statuses: ('paid' | 'partial' | 'unpaid' | 'cancelled' | 'overdue')[] = ["paid", "paid", "partial", "unpaid", "cancelled", "overdue"]
  const paymentChannels: ('credit_card' | 'wechat_pay' | 'alipay' | 'qr_payment' | 'counter_bank')[] = ["credit_card", "wechat_pay", "alipay", "qr_payment", "counter_bank"]

  const registrations: EventRegistration[] = []

  for (let i = 1; i <= 120; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const event = events[Math.floor(Math.random() * events.length)]
    const yearGroup = yearGroups[Math.floor(Math.random() * yearGroups.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const paymentChannel = paymentChannels[Math.floor(Math.random() * paymentChannels.length)]

    registrations.push({
      id: i,
      eventName: event,
      studentName: `${firstName} ${lastName}`,
      studentId: `ST${String(i).padStart(3, '0')}`,
      yearGroup,
      registrationDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      paymentStatus: status,
      amount: Math.floor(Math.random() * 500) + 300,
      paymentChannel,
      parentEmail: `parent${i}@email.com`
    })
  }

  return registrations
}

const mockRegistrations: EventRegistration[] = generateMockRegistrations()

const eventSummaryData: EventSummary[] = [
  { eventName: "Sports Day 2024", totalRegistrations: 245, paidRegistrations: 189, pendingPayments: 56, totalRevenue: 94500, registrationTrend: 12 },
  { eventName: "Science Fair", totalRegistrations: 180, paidRegistrations: 155, pendingPayments: 25, totalRevenue: 46500, registrationTrend: -5 },
  { eventName: "Music Concert", totalRegistrations: 156, paidRegistrations: 142, pendingPayments: 14, totalRevenue: 56800, registrationTrend: 8 },
  { eventName: "Field Trip - Zoo", totalRegistrations: 120, paidRegistrations: 85, pendingPayments: 35, totalRevenue: 68000, registrationTrend: 15 },
]

const registrationChartData = [
  { month: "Jan", registrations: 145 },
  { month: "Feb", registrations: 189 },
  { month: "Mar", registrations: 234 },
  { month: "Apr", registrations: 167 },
  { month: "May", registrations: 278 },
  { month: "Jun", registrations: 201 },
]

const paymentStatusData = [
  { name: "Paid", value: 571, color: "#22c55e" },
  { name: "Partial", value: 87, color: "#f59e0b" },
  { name: "Unpaid", value: 43, color: "#6b7280" },
  { name: "Cancelled", value: 28, color: "#ef4444" },
  { name: "Overdue", value: 42, color: "#fb923c" },
]

export function EventRegistrationReports() {
  const { t } = useLanguage()
  const [selectedEvent, setSelectedEvent] = usePersistedState("event-registration:selectedYear", "all")
  const [selectedYearGroup, setSelectedYearGroup] = useState("all")
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus>("all")
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<PaymentChannel>("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [searchTerm, setSearchTerm] = usePersistedState("event-registration:search", "")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
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

  const getSortedRegistrations = (regsToSort: EventRegistration[]) => {
    if (!sortColumn) return regsToSort

    return [...regsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "eventName":
          aVal = a.eventName
          bVal = b.eventName
          break
        case "yearGroup":
          aVal = a.yearGroup
          bVal = b.yearGroup
          break
        case "registrationDate":
          aVal = a.registrationDate
          bVal = b.registrationDate
          break
        case "amount":
          aVal = a.amount
          bVal = b.amount
          break
        case "paymentStatus":
          aVal = a.paymentStatus
          bVal = b.paymentStatus
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

  const filteredRegistrations = mockRegistrations.filter(reg => {
    if (selectedEvent !== "all" && reg.eventName !== selectedEvent) return false
    if (selectedYearGroup !== "all" && reg.yearGroup !== selectedYearGroup) return false
    if (selectedPaymentStatus !== "all" && reg.paymentStatus !== selectedPaymentStatus) return false
    if (selectedPaymentChannel !== "all" && reg.paymentChannel !== selectedPaymentChannel) return false
    if (searchTerm && !reg.studentName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !reg.studentId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !reg.parentEmail.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Pagination calculations
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPageRegistrations = filteredRegistrations.slice(startIndex, endIndex)

  const exportReport = (format: 'csv' | 'excel') => {
    toast.success(t("eventReports.exportSuccess").replace("{format}", format.toUpperCase()))
  }

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">{t("eventReports.title")}</h2>
          <p className="text-muted-foreground">
            {t("eventReports.subtitle")}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            {t("common.exportCsv")}
          </Button>
          <Button onClick={() => exportReport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            {t("eventReports.exportExcel")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t("eventReports.overview")}</TabsTrigger>
          <TabsTrigger value="details">{t("eventReports.detailedReport")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("eventReports.analytics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("eventReports.totalRegistrations")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">743</div>
                <p className="text-xs text-muted-foreground">
                  {t("eventReports.percentFromLastMonth").replace("{percent}", "+12")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("common.totalRevenue")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿265,800</div>
                <p className="text-xs text-muted-foreground">
                  {t("eventReports.percentFromLastMonth").replace("{percent}", "+8")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("eventReports.paymentRate")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">76.8%</div>
                <p className="text-xs text-muted-foreground">
                  {t("eventReports.percentFromLastMonth").replace("{percent}", "+2.1")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("eventReports.activeEvents")}</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  {t("eventReports.endingThisWeek").replace("{count}", "2")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Event Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("eventReports.eventSummary")}</CardTitle>
              <CardDescription>{t("eventReports.eventSummaryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Event Name - text/left */}
                    <TableHead align="left">{t("eventReports.eventName")}</TableHead>
                    {/* Total Registrations - number/right */}
                    <TableHead align="right">{t("eventReports.totalReg")}</TableHead>
                    {/* Paid - number/right */}
                    <TableHead align="right">{t("common.paid")}</TableHead>
                    {/* Pending - number/right */}
                    <TableHead align="right">{t("common.pending")}</TableHead>
                    {/* Revenue - currency/right */}
                    <TableHead align="right">{t("common.revenue")}</TableHead>
                    {/* Trend - center */}
                    <TableHead align="center">{t("eventReports.trend")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventSummaryData.map((event, index) => (
                    <TableRow key={index}>
                      {/* Event Name - text/left */}
                      <TableCell align="left" className="font-medium">{event.eventName}</TableCell>
                      {/* Total Registrations - number/right */}
                      <TableCell align="right">{event.totalRegistrations}</TableCell>
                      {/* Paid - number/right */}
                      <TableCell align="right" className="text-green-600">{event.paidRegistrations}</TableCell>
                      {/* Pending - number/right */}
                      <TableCell align="right" className="text-amber-600">{event.pendingPayments}</TableCell>
                      {/* Revenue - currency/right */}
                      <TableCell align="right">฿{event.totalRevenue.toLocaleString()}</TableCell>
                      {/* Trend - center */}
                      <TableCell align="center">
                        <div className="flex items-center gap-1 justify-center">
                          {getTrendIcon(event.registrationTrend)}
                          <span className={event.registrationTrend > 0 ? "text-green-600" : "text-red-600"}>
                            {Math.abs(event.registrationTrend)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {t("common.filter")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => toast.success(t("common.filtersApplied"))} className="h-9">{t("common.apply")}</Button>
                  <Button variant="outline" onClick={() => {
                    setSearchTerm("")
                    setSelectedEvent("all")
                    setSelectedYearGroup("all")
                    setSelectedPaymentStatus("all")
                    setSelectedPaymentChannel("all")
                    setDateFrom(undefined)
                    setDateTo(undefined)
                    toast.success(t("common.filtersCleared"))
                  }} className="h-9">{t("common.clear")}</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-7">
                <div className="space-y-2">
                  <Label>{t("common.search")}</Label>
                  <div className="relative">
                    <Input
                      placeholder={t("eventReports.studentNameOrId")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className=""
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("eventReports.event")}</Label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("eventReports.allEvents")}</SelectItem>
                      <SelectItem value="Sports Day 2024">Sports Day 2024</SelectItem>
                      <SelectItem value="Science Fair">Science Fair</SelectItem>
                      <SelectItem value="Music Concert">Music Concert</SelectItem>
                      <SelectItem value="Field Trip - Zoo">Field Trip - Zoo</SelectItem>
                      <SelectItem value="Art Exhibition">Art Exhibition</SelectItem>
                      <SelectItem value="Drama Performance">Drama Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("student.yearGroup")}</Label>
                  <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allYears")}</SelectItem>
                      <SelectItem value="Pre-Nursery">Pre-Nursery</SelectItem>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="Reception">Reception</SelectItem>
                      <SelectItem value="Year 1">Year 1</SelectItem>
                      <SelectItem value="Year 2">Year 2</SelectItem>
                      <SelectItem value="Year 3">Year 3</SelectItem>
                      <SelectItem value="Year 4">Year 4</SelectItem>
                      <SelectItem value="Year 5">Year 5</SelectItem>
                      <SelectItem value="Year 6">Year 6</SelectItem>
                      <SelectItem value="Year 7">Year 7</SelectItem>
                      <SelectItem value="Year 8">Year 8</SelectItem>
                      <SelectItem value="Year 9">Year 9</SelectItem>
                      <SelectItem value="Year 10">Year 10</SelectItem>
                      <SelectItem value="Year 11">Year 11</SelectItem>
                      <SelectItem value="Year 12">Year 12</SelectItem>
                      <SelectItem value="Year 13">Year 13</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <StatusFilter 
                  selectedStatus={selectedPaymentStatus} 
                  onStatusChange={setSelectedPaymentStatus}
                />

                <PaymentChannelFilter 
                  selectedChannel={selectedPaymentChannel} 
                  onChannelChange={setSelectedPaymentChannel}
                />

                <div className="space-y-2">
                  <Label>{t("eventReports.dateRange")}</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : t("eventReports.from")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">→</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {dateTo ? format(dateTo, "dd/MM/yy") : t("eventReports.to")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
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

          {/* Detailed Registration Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("eventReports.registrationDetails")}</CardTitle>
              <CardDescription>
                {t("eventReports.showingOfRegistrations")
                  .replace("{count}", String(currentPageRegistrations.length))
                  .replace("{total}", String(filteredRegistrations.length))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Student - text/left */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                      <div className="flex items-center gap-1">
                        {t("eventReports.student")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Event - text/left */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("eventName")}>
                      <div className="flex items-center gap-1">
                        {t("eventReports.event")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Year Group - badge/center */}
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("yearGroup")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("student.yearGroup")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Registration Date - date/left */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("registrationDate")}>
                      <div className="flex items-center gap-1">
                        {t("eventReports.regDate")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Amount - currency/right */}
                    <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1 justify-end">
                        {t("common.amount")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Payment Channel - text/left */}
                    <TableHead align="left">{t("eventReports.channel")}</TableHead>
                    {/* Status - badge/center */}
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentStatus")}>
                      <div className="flex items-center gap-1 justify-center">
                        {t("common.status")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Parent Email - text/left */}
                    <TableHead align="left">{t("eventReports.parentEmail")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedRegistrations(currentPageRegistrations).map((registration) => (
                    <TableRow key={registration.id}>
                      {/* Student - text/left */}
                      <TableCell align="left">
                        <div>
                          <div className="font-medium">{registration.studentName}</div>
                          <div className="text-sm text-muted-foreground">{registration.studentId}</div>
                        </div>
                      </TableCell>
                      {/* Event - text/left */}
                      <TableCell align="left">{registration.eventName}</TableCell>
                      {/* Year Group - badge/center */}
                      <TableCell align="center">{registration.yearGroup}</TableCell>
                      {/* Registration Date - date/left */}
                      <TableCell align="left">{registration.registrationDate}</TableCell>
                      {/* Amount - currency/right */}
                      <TableCell align="right">฿{registration.amount}</TableCell>
                      {/* Payment Channel - text/left */}
                      <TableCell align="left">{getPaymentChannelLabel(registration.paymentChannel, t)}</TableCell>
                      {/* Status - badge/center */}
                      <TableCell align="center">{getStatusBadge(registration.paymentStatus, t)}</TableCell>
                      {/* Parent Email - text/left */}
                      <TableCell align="left">{registration.parentEmail}</TableCell>
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
            totalCount={filteredRegistrations.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Registration Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t("eventReports.registrationTrend")}</CardTitle>
                <CardDescription>{t("eventReports.monthlyRegistrations")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={registrationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="registrations" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("eventReports.paymentStatusDistribution")}</CardTitle>
                <CardDescription>{t("eventReports.paymentStatusBreakdown")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}