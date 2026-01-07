import { useState } from "react"
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
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination"
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { StatusFilter, PaymentStatus, getStatusBadge, PaymentChannelFilter, PaymentChannel, getPaymentChannelLabel } from "./StatusFilter"

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

const paymentMethodData = [
  { name: "Credit Card", value: 156780, color: "#3b82f6" },
  { name: "Bank Transfer", value: 89450, color: "#10b981" },  
  { name: "Cash", value: 34200, color: "#f59e0b" },
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
  const [selectedActivity, setSelectedActivity] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>("all")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all")
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<PaymentChannel>("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
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
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPagePayments = filteredPayments.slice(startIndex, endIndex)

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const getPaymentMethodLabel = (method: PaymentRecord['paymentMethod']) => {
    const labels = {
      credit_card: "Credit Card",
      bank_transfer: "Bank Transfer",
      cash: "Cash",
      cheque: "Cheque"
    }
    return labels[method]
  }

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(`Payment report exported as ${format.toUpperCase()}`)
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
          <h2 className="mb-2">Summer Payment Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive payment analytics and financial reports for summer activities
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => exportReport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Payment Details</TabsTrigger>
          <TabsTrigger value="analytics">Financial Analytics</TabsTrigger>
          <TabsTrigger value="activities">By Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{calculateTotalRevenue().toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +15% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{calculatePendingAmount().toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredPayments.filter(p => p.status === 'unpaid' || p.status === 'partial').length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">92.5%</div>
                <p className="text-xs text-muted-foreground">
                  Payment success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
                <Sun className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  Summer activities
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue and registration trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={[(value: number) => [`฿${value.toLocaleString()}`, 'Revenue']]}
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
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Revenue distribution by payment method</CardDescription>
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
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>Summer activity category performance</CardDescription>
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
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Payment Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-7">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Input
                      placeholder="Student name or ID"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className=""
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Activity</Label>
                  <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activities</SelectItem>
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
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Creative">Creative</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Performance">Performance</SelectItem>
                      <SelectItem value="Academic">Academic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <StatusFilter 
                  selectedStatus={selectedStatus} 
                  onStatusChange={setSelectedStatus}
                />

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start h-9 font-normal">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {dateFrom ? format(dateFrom, "dd/MM/yy") : "From"}
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
                          {dateTo ? format(dateTo, "dd/MM/yy") : "To"}
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

          {/* Results Summary with Display Size Selector */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredPayments.length)} of {filteredPayments.length} payment record(s)
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Show:</label>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
            </div>
          </div>

          {/* Payment Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Showing {currentPagePayments.length} of {filteredPayments.length} payment record(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("studentName")}>
                      <div className="flex items-center gap-1">
                        Student
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("activityName")}>
                      <div className="flex items-center gap-1">
                        Activity
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        Amount
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentDate")}>
                      <div className="flex items-center gap-1">
                        Payment Date
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Transaction ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedPayments(currentPagePayments).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.studentName}</div>
                          <div className="text-sm text-muted-foreground">{payment.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.activityName}</div>
                          <div className="text-sm text-muted-foreground">{payment.category}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">฿{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.transactionId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) setCurrentPage(currentPage - 1)
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage(pageNumber)
                          }}
                          isActive={currentPage === pageNumber}
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
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <h3>Financial Analytics</h3>
            <p className="text-muted-foreground">Advanced analytics charts would go here</p>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <div className="text-center py-12">
            <h3>By Activity</h3>
            <p className="text-muted-foreground">Activity-specific reports would go here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}