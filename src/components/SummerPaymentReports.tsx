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
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts"
import {
  DollarSign,
  Download,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Filter,
  Search,
  Sun,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"
import { ColumnPresets } from "@/utils/tableAlignment"

interface PaymentRecord {
  id: number
  studentName: string
  studentId: string
  activityName: string
  category: string
  amount: number
  paymentDate: string
  paymentMethod: 'credit_card' | 'bank_transfer' | 'cash' | 'cheque'
  paymentChannel: 'credit_card' | 'wechat_pay' | 'alipay' | 'qr_payment' | 'counter_bank'
  status: 'paid' | 'partial' | 'unpaid' | 'cancelled' | 'overdue'
  transactionId: string
  parentEmail: string
}

interface PaymentSummary {
  activityName: string
  category: string
  totalRevenue: number
  registrations: number
  averageAmount: number
  pendingPayments: number
  refunds: number
}

// Generate more mock data for pagination testing
const generateMockPaymentRecords = (): PaymentRecord[] => {
  const activities = ["Swimming Intensive", "Art & Craft Workshop", "Coding for Kids", "Drama Club", "Science Laboratory", "Music Workshop", "Football Camp", "Basketball Training"]
  const categories = ["Sports", "Creative", "Technology", "Performance", "Academic"]
  const paymentMethods: ('credit_card' | 'bank_transfer' | 'cash' | 'cheque')[] = ["credit_card", "bank_transfer", "cash", "cheque"]
  const paymentChannels: ('credit_card' | 'wechat_pay' | 'alipay' | 'qr_payment' | 'counter_bank')[] = ["credit_card", "wechat_pay", "alipay", "qr_payment", "counter_bank"]
  const statuses: ('paid' | 'partial' | 'unpaid' | 'cancelled' | 'overdue')[] = ["paid", "paid", "partial", "unpaid", "cancelled", "overdue"]
  const firstNames = ["John", "Emma", "Michael", "Sarah", "David", "Lisa", "James", "Sophia", "William", "Olivia", "Benjamin", "Ava", "Lucas", "Isabella", "Henry", "Mia"]
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

  const payments: PaymentRecord[] = []

  for (let i = 1; i <= 85; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const activity = activities[Math.floor(Math.random() * activities.length)]
    const category = categories[Math.floor(Math.random() * categories.length)]
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]
    const paymentChannel = paymentChannels[Math.floor(Math.random() * paymentChannels.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]

    payments.push({
      id: i,
      studentName: `${firstName} ${lastName}`,
      studentId: `ST${String(i).padStart(3, '0')}`,
      activityName: activity,
      category,
      amount: Math.floor(Math.random() * 4000) + 2000,
      paymentDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      paymentMethod,
      paymentChannel,
      status,
      transactionId: `TXN${String(i).padStart(3, '0')}`,
      parentEmail: `parent${i}@email.com`
    })
  }

  return payments
}

const mockPaymentRecords: PaymentRecord[] = generateMockPaymentRecords()

const paymentSummaryData: PaymentSummary[] = [
  { 
    activityName: "Swimming Intensive", 
    category: "Sports", 
    totalRevenue: 63000, 
    registrations: 18, 
    averageAmount: 3500, 
    pendingPayments: 2, 
    refunds: 0 
  },
  { 
    activityName: "Art & Craft Workshop", 
    category: "Creative", 
    totalRevenue: 33600, 
    registrations: 12, 
    averageAmount: 2800, 
    pendingPayments: 1, 
    refunds: 1 
  },
  { 
    activityName: "Coding for Kids", 
    category: "Technology", 
    totalRevenue: 54000, 
    registrations: 12, 
    averageAmount: 4500, 
    pendingPayments: 3, 
    refunds: 0 
  },
  { 
    activityName: "Drama Club", 
    category: "Performance", 
    totalRevenue: 57600, 
    registrations: 18, 
    averageAmount: 3200, 
    pendingPayments: 1, 
    refunds: 0 
  }
]

const revenueChartData = [
  { month: "Jan", revenue: 45000, registrations: 12 },
  { month: "Feb", revenue: 52000, registrations: 15 },
  { month: "Mar", revenue: 78000, registrations: 22 },
  { month: "Apr", revenue: 65000, registrations: 18 },
  { month: "May", revenue: 89000, registrations: 25 },
  { month: "Jun", revenue: 105000, registrations: 30 },
]

// Payment method data will be generated with translations in the component
const getPaymentMethodData = (t: any) => [
  { name: t("paymentMethod.creditCard"), value: 156780, color: "#3b82f6" },
  { name: t("paymentMethod.bankTransfer"), value: 89450, color: "#10b981" },
  { name: t("paymentMethod.cash"), value: 34200, color: "#f59e0b" },
  { name: "Cheque", value: 12500, color: "#8b5cf6" },
]

const categoryRevenueData = [
  { category: "Sports", revenue: 85000, percentage: 35 },
  { category: "Creative", revenue: 62000, percentage: 26 },
  { category: "Technology", revenue: 54000, percentage: 22 },
  { category: "Performance", revenue: 28000, percentage: 12 },
  { category: "Academic", revenue: 15000, percentage: 5 },
]

export function SummerPaymentReports() {
  const { t } = useLanguage()

  // Get payment method data with translations
  const paymentMethodData = getPaymentMethodData(t)
  const [selectedActivity, setSelectedActivity] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>("all")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all")
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<PaymentChannel>("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [searchTerm, setSearchTerm] = useState("")
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

  const getSortedPayments = (paymentsToSort: PaymentRecord[]) => {
    if (!sortColumn) return paymentsToSort

    return [...paymentsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "activityName":
          aVal = a.activityName
          bVal = b.activityName
          break
        case "amount":
          aVal = a.amount
          bVal = b.amount
          break
        case "paymentDate":
          aVal = a.paymentDate
          bVal = b.paymentDate
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
        return sortDirection === "asc" ? comparison : -comparison
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  const filteredPayments = mockPaymentRecords.filter(payment => {
    if (selectedActivity !== "all" && payment.activityName !== selectedActivity) return false
    if (selectedCategory !== "all" && payment.category !== selectedCategory) return false
    if (selectedStatus !== "all" && payment.status !== selectedStatus) return false
    if (selectedPaymentMethod !== "all" && payment.paymentMethod !== selectedPaymentMethod) return false
    if (searchTerm && !payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !payment.studentId.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (dateFrom && new Date(payment.paymentDate) < dateFrom) return false
    if (dateTo && new Date(payment.paymentDate) > dateTo) return false
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentPagePayments = filteredPayments.slice(startIndex, endIndex)

  const getPaymentMethodLabel = (method: PaymentRecord['paymentMethod']) => {
    const labels = {
      credit_card: t("payment.creditCard"),
      bank_transfer: t("payment.bankTransfer"),
      cash: t("payment.cash"),
      cheque: t("payment.cheque")
    }
    return labels[method]
  }

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(t("summerPayment.exportSuccess").replace("{format}", format.toUpperCase()))
  }

  const calculateTotalRevenue = () => {
    return filteredPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)
  }

  const calculatePendingAmount = () => {
    return filteredPayments
      .filter(p => p.status === 'unpaid' || p.status === 'partial')
      .reduce((sum, p) => sum + p.amount, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">{t("summerPayment.title")}</h2>
          <p className="text-muted-foreground">
            {t("summerPayment.subtitle")}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            {t("common.exportCsv")}
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            {t("summerPayment.exportExcel")}
          </Button>
          <Button onClick={() => exportReport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            {t("summerPayment.exportPdf")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t("summerPayment.overview")}</TabsTrigger>
          <TabsTrigger value="details">{t("summerPayment.paymentDetails")}</TabsTrigger>
          <TabsTrigger value="analytics">{t("summerPayment.financialAnalytics")}</TabsTrigger>
          <TabsTrigger value="activities">{t("summerPayment.byActivity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("common.totalRevenue")}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{calculateTotalRevenue().toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t("summerPayment.fromLastMonth")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summerPayment.pendingPayments")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{calculatePendingAmount().toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredPayments.filter(p => p.status === 'unpaid' || p.status === 'partial').length} {t("summerPayment.transactions")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summerPayment.successRate")}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92.5%</div>
                <p className="text-xs text-muted-foreground">
                  {t("summerPayment.paymentSuccessRate")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summerPayment.activePrograms")}</CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  {t("summerPayment.summerActivities")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t("summerPayment.revenueTrend")}</CardTitle>
              <CardDescription>{t("summerPayment.revenueTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, t("common.revenue")]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Payment Methods Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t("summerPayment.paymentMethods")}</CardTitle>
                <CardDescription>{t("summerPayment.paymentMethodsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `฿${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>{t("summerPayment.revenueByCategory")}</CardTitle>
                <CardDescription>{t("summerPayment.revenueByCategoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryRevenueData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{category.category}</span>
                          <span className="text-sm">฿{category.revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {t("summerPayment.paymentFilters")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => toast.success(t("common.filtersApplied"))} className="h-9">{t("common.apply")}</Button>
                  <Button variant="outline" onClick={() => {
                    setSearchTerm("")
                    setSelectedActivity("all")
                    setSelectedCategory("all")
                    setSelectedStatus("all")
                    setSelectedPaymentMethod("all")
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
                      placeholder={t("summerPayment.searchPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className=""
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("summerPayment.activity")}</Label>
                  <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("summerPayment.allActivities")}</SelectItem>
                      <SelectItem value="Swimming Intensive">Swimming Intensive</SelectItem>
                      <SelectItem value="Art & Craft Workshop">Art & Craft Workshop</SelectItem>
                      <SelectItem value="Coding for Kids">Coding for Kids</SelectItem>
                      <SelectItem value="Drama Club">Drama Club</SelectItem>
                      <SelectItem value="Science Laboratory">Science Laboratory</SelectItem>
                      <SelectItem value="Music Workshop">Music Workshop</SelectItem>
                      <SelectItem value="Football Camp">Football Camp</SelectItem>
                      <SelectItem value="Basketball Training">Basketball Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("common.category")}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allCategories")}</SelectItem>
                      <SelectItem value="Sports">{t("summerPayment.categorySports")}</SelectItem>
                      <SelectItem value="Creative">{t("summerPayment.categoryCreative")}</SelectItem>
                      <SelectItem value="Technology">{t("summerPayment.categoryTechnology")}</SelectItem>
                      <SelectItem value="Performance">{t("summerPayment.categoryPerformance")}</SelectItem>
                      <SelectItem value="Academic">{t("summerPayment.categoryAcademic")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <StatusFilter
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                />

                <div className="space-y-2">
                  <Label>{t("payment.paymentChannel")}</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("summerPayment.allMethods")}</SelectItem>
                      <SelectItem value="credit_card">{t("payment.creditCard")}</SelectItem>
                      <SelectItem value="bank_transfer">{t("payment.bankTransfer")}</SelectItem>
                      <SelectItem value="cash">{t("payment.cash")}</SelectItem>
                      <SelectItem value="cheque">{t("payment.cheque")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("summerPayment.paymentDate")}</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : t("summerPayment.from")}
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
                          {dateTo ? format(dateTo, "dd/MM/yy") : t("summerPayment.to")}
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

          {/* Results Summary */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {t("summerPayment.showingRecords").replace("{from}", String(startIndex + 1)).replace("{to}", String(Math.min(endIndex, filteredPayments.length))).replace("{total}", String(filteredPayments.length))}
            </p>
          </div>

          {/* Payment Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("summerPayment.paymentDetails")}</CardTitle>
              <CardDescription>
                {t("summerPayment.showingOfRecords").replace("{count}", String(currentPagePayments.length)).replace("{total}", String(filteredPayments.length))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Student - text (left aligned) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                      <div className="flex items-center gap-1">
                        {t("payment.student")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Activity - text (left aligned) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("activityName")}>
                      <div className="flex items-center gap-1">
                        {t("summerPayment.activity")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Amount - currency (right aligned) */}
                    <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center justify-end gap-1">
                        {t("common.amount")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Payment Date - date (left aligned) */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentDate")}>
                      <div className="flex items-center gap-1">
                        {t("summerPayment.paymentDate")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Payment Channel - text (left aligned) */}
                    <TableHead align="left">{t("payment.paymentChannel")}</TableHead>
                    {/* Status - badge (center aligned) */}
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      <div className="flex items-center justify-center gap-1">
                        {t("common.status")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Transaction ID - text (left aligned) */}
                    <TableHead align="left">{t("summerPayment.transactionId")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedPayments(currentPagePayments).map((payment) => (
                    <TableRow key={payment.id}>
                      {/* Student - text (left aligned) */}
                      <TableCell align="left">
                        <div>
                          <div className="font-medium">{payment.studentName}</div>
                          <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                        </div>
                      </TableCell>
                      {/* Activity - text (left aligned) */}
                      <TableCell align="left">
                        <div>
                          <div className="font-medium">{payment.activityName}</div>
                          <div className="text-sm text-muted-foreground">{payment.category}</div>
                        </div>
                      </TableCell>
                      {/* Amount - currency (right aligned) */}
                      <TableCell align="right" className="font-medium">฿{payment.amount.toLocaleString()}</TableCell>
                      {/* Payment Date - date (left aligned) */}
                      <TableCell align="left">{payment.paymentDate}</TableCell>
                      {/* Payment Channel - text (left aligned) */}
                      <TableCell align="left">{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                      {/* Status - badge (center aligned) */}
                      <TableCell align="center">{getStatusBadge(payment.status, t)}</TableCell>
                      {/* Transaction ID - text (left aligned) */}
                      <TableCell align="left" className="font-mono text-sm">{payment.transactionId}</TableCell>
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
            totalCount={filteredPayments.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <h3>{t("summerPayment.financialAnalytics")}</h3>
            <p className="text-muted-foreground">{t("summerPayment.analyticsPlaceholder")}</p>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <div className="text-center py-12">
            <h3>{t("summerPayment.byActivity")}</h3>
            <p className="text-muted-foreground">{t("summerPayment.activityPlaceholder")}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}