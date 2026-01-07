import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { Users, DollarSign, Calendar as CalendarIcon, CreditCard, Filter, RotateCcw, GraduationCap } from "lucide-react"
import { format, subDays, startOfYear, endOfYear } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { DateRange } from "react-day-picker"

const paymentData = [
  { month: "Aug", yearly: 45, termly: 30 },
  { month: "Sep", yearly: 52, termly: 28 },
  { month: "Oct", yearly: 38, termly: 35 },
  { month: "Nov", yearly: 41, termly: 42 },
  { month: "Dec", yearly: 35, termly: 38 },
  { month: "Jan", yearly: 48, termly: 45 }
]

const paymentChannelData = [
  { name: "Credit Card", value: 45, color: "#8884d8" },
  { name: "PromptPay", value: 30, color: "#82ca9d" },
  { name: "Bank Counter", value: 15, color: "#ffc658" },
  { name: "WeChat Pay", value: 7, color: "#ff7300" },
  { name: "Alipay", value: 3, color: "#00ff88" }
]

const termRevenueData = [
  { term: "Term 1", amount: 2450000 },
  { term: "Term 2", amount: 2380000 },
  { term: "Term 3", amount: 2520000 }
]

// Generate academic years (current year - 5 to current year + 1)
const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push({
      value: `${i}-${i + 1}`,
      label: `${i}/${i + 1}`
    })
  }
  return years.reverse()
}



export function TuitionDashboard() {
  const { t } = useLanguage()
  // Filter states (for UI selection)
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedTerm, setSelectedTerm] = useState<string>("")
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // Applied filters (actual filters being used)
  const [appliedFilters, setAppliedFilters] = useState<{
    year: string
    term: string
    dateRange: DateRange
  }>({ year: "", term: "", dateRange: { from: undefined } })

  const academicYears = generateAcademicYears()
  const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

  // Filter functions
  const handleYearChange = (year: string) => {
    setSelectedYear(year)
  }

  const handleTermChange = (term: string) => {
    setSelectedTerm(term)
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range || { from: undefined })
  }

  const resetFilters = () => {
    setSelectedYear("")
    setSelectedTerm("")
    setDateRange({ from: undefined })
    setAppliedFilters({ year: "", term: "", dateRange: { from: undefined } })
  }

  const applyFilters = () => {
    // Apply the selected filters
    setAppliedFilters({
      year: selectedYear,
      term: selectedTerm,
      dateRange: dateRange
    })
    setIsDatePickerOpen(false)
  }

  // Get filtered data display text
  const getFilteredDisplay = () => {
    if (!selectedYear && !selectedTerm && !dateRange.from) {
      return t("dashboard.allData")
    }

    let display = t("dashboard.filtered")
    const filters = []

    if (selectedYear) {
      filters.push(academicYears.find(y => y.value === selectedYear)?.label || selectedYear)
    }

    if (selectedTerm) {
      const termDisplay = selectedTerm === "term1" ? t("invoice.term") + " 1" : selectedTerm === "term2" ? t("invoice.term") + " 2" : t("invoice.term") + " 3"
      filters.push(termDisplay)
    }

    if (dateRange.from) {
      if (dateRange.to) {
        filters.push(`${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`)
      } else {
        filters.push(`${t("date.from")} ${format(dateRange.from, "MMM dd")}`)
      }
    }

    return display + filters.join(", ")
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Filter className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("dashboard.dataFilters")}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("dashboard.filterDesc")}
                </p>
              </div>
            </div>
            {(appliedFilters.year || appliedFilters.term || appliedFilters.dateRange.from) && (
              <div className="text-right">
                <p className="text-sm font-medium text-primary">
                  {[appliedFilters.year, appliedFilters.term, appliedFilters.dateRange.from].filter(Boolean).length} {t("common.filter")}(s) {t("common.active")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.filtered")}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Filters Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("dashboard.filterOptions")}</h3>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Academic Year Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("common.academicYear")}</label>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t("invoice.academicYear")} />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Term Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("invoice.term")}</label>
                <Select value={selectedTerm} onValueChange={handleTermChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t("invoice.term")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term1">{t("invoice.term")} 1</SelectItem>
                    <SelectItem value="term2">{t("invoice.term")} 2</SelectItem>
                    <SelectItem value="term3">{t("invoice.term")} 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium text-foreground">{t("invoice.dateRange")}</label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-10 justify-start text-left">
                      <CalendarIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                            </>
                          ) : (
                            format(dateRange.from, "MMM dd, yyyy")
                          )
                        ) : (
                          t("dashboard.pickDateRange")
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{t("dashboard.quickActions")}</h3>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Quick Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    setDateRange({
                      from: subDays(today, 30),
                      to: today
                    })
                  }}
                  className="h-9 text-xs"
                >
                  <CalendarIcon className="w-3 h-3 mr-1.5" />
                  {t("dashboard.last30Days")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    setDateRange({
                      from: startOfYear(today),
                      to: endOfYear(today)
                    })
                  }}
                  className="h-9 text-xs"
                >
                  <CalendarIcon className="w-3 h-3 mr-1.5" />
                  {t("dashboard.thisYear")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedYear(currentYear)
                    setSelectedTerm("")
                  }}
                  className="h-9 text-xs"
                >
                  <GraduationCap className="w-3 h-3 mr-1.5" />
                  {t("dashboard.currentAcademicYear")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedTerm("term1")
                  }}
                  className="h-9 text-xs"
                >
                  {t("dashboard.termOnly").replace("{term}", "1")}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={applyFilters} className="h-9 px-6">
                  {t("dashboard.applyFilters")}
                </Button>
                <Button variant="outline" onClick={resetFilters} className="h-9 px-4">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t("common.reset")}
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(appliedFilters.year || appliedFilters.term || appliedFilters.dateRange.from) && (
            <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-l-primary">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{t("dashboard.activeFilters")}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({[appliedFilters.year, appliedFilters.term, appliedFilters.dateRange.from].filter(Boolean).length} {t("common.filter")})
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {appliedFilters.year && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm">
                      <span className="font-medium">Year:</span>
                      <span>{academicYears.find(y => y.value === appliedFilters.year)?.label}</span>
                      <button
                        onClick={() => {
                          setSelectedYear("")
                          setAppliedFilters(prev => ({ ...prev, year: "" }))
                        }}
                        className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                        aria-label="Remove year filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {appliedFilters.term && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-chart-2 text-white rounded-full text-sm">
                      <span className="font-medium">{t("invoice.term")}:</span>
                      <span>{appliedFilters.term === "term1" ? t("invoice.term") + " 1" : appliedFilters.term === "term2" ? t("invoice.term") + " 2" : t("invoice.term") + " 3"}</span>
                      <button
                        onClick={() => {
                          setSelectedTerm("")
                          setAppliedFilters(prev => ({ ...prev, term: "" }))
                        }}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        aria-label="Remove term filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {appliedFilters.dateRange.from && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-chart-3 text-white rounded-full text-sm">
                      <CalendarIcon className="w-3 h-3" />
                      <span>
                        {appliedFilters.dateRange.to ?
                          `${format(appliedFilters.dateRange.from, "MMM dd")} - ${format(appliedFilters.dateRange.to, "MMM dd")}` :
                          format(appliedFilters.dateRange.from, "MMM dd, yyyy")
                        }
                      </span>
                      <button
                        onClick={() => {
                          setDateRange({ from: undefined })
                          setAppliedFilters(prev => ({ ...prev, dateRange: { from: undefined } }))
                        }}
                        className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                        aria-label="Remove date filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.studentsPaid")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              {(selectedYear || selectedTerm || dateRange.from) ? getFilteredDisplay() : "+12% from last month"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalRevenue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₿7,350,000</div>
            <p className="text-xs text-muted-foreground">
              {(selectedYear || selectedTerm || dateRange.from) ? getFilteredDisplay() : "+8% from last term"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.yearlyPayments")}</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <p className="text-xs text-muted-foreground">
              {(selectedYear || selectedTerm || dateRange.from) ? getFilteredDisplay() : "68% of total payments"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.termlyPayments")}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">582</div>
            <p className="text-xs text-muted-foreground">
              {(selectedYear || selectedTerm || dateRange.from) ? getFilteredDisplay() : "32% of total payments"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.paymentTypeDistribution")}</CardTitle>
            <p className="text-sm text-muted-foreground">{getFilteredDisplay()}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="yearly" fill="#8884d8" name={t("dashboard.yearly")} />
                <Bar dataKey="termly" fill="#82ca9d" name={t("dashboard.termly")} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Channels */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.paymentChannels")}</CardTitle>
            <p className="text-sm text-muted-foreground">{getFilteredDisplay()}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentChannelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentChannelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Term Revenue */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.revenueByTerm")}</CardTitle>
          <p className="text-sm text-muted-foreground">{getFilteredDisplay()}</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={termRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="term" />
              <YAxis />
              <Tooltip formatter={(value) => [`₿${value.toLocaleString()}`, t("invoice.totalRevenue")]} />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
          <p className="text-sm text-muted-foreground">{getFilteredDisplay()}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { student: "John Smith", amount: "₿125,000", type: "Yearly", time: "2 hours ago" },
              { student: "Sarah Wilson", amount: "₿42,000", type: "Termly", time: "4 hours ago" },
              { student: "Mike Johnson", amount: "₿125,000", type: "Yearly", time: "6 hours ago" },
              { student: "Lisa Chen", amount: "₿42,000", type: "Termly", time: "8 hours ago" },
              { student: "David Brown", amount: "₿125,000", type: "Yearly", time: "1 day ago" }
            ].map((payment, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{payment.student}</p>
                  <p className="text-sm text-muted-foreground">{payment.type} Payment</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{payment.amount}</p>
                  <p className="text-sm text-muted-foreground">{payment.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}