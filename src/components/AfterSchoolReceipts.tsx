import { useEffect, useState } from "react"
import * as XLSX from "xlsx"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { CalendarIcon, Search, Download, Filter, Eye, Mail, FileText, Receipt, Users, ArrowUpDown, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { InternalEmailManagement } from "./InternalEmailManagement"
import { useLanguage } from "@/contexts/LanguageContext"
import { PaginationBar } from "@/components/ui/pagination-bar"

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

interface AfterSchoolReceipt {
  id: string
  receiptNumber: string
  parentName: string
  studentName: string
  studentId: string
  activities: string[]
  totalAmount: number
  paymentMethod: string
  transactionDate: Date
  paymentType: "single" | "complete"
  status: "issued" | "cancelled"
  downloadCount: number
  isExternal: boolean
}

const mockReceipts: AfterSchoolReceipt[] = [
  {
    id: "1",
    receiptNumber: "AS-RCP-2025-001234",
    parentName: "Jennifer Wilson",
    studentName: "Emma Wilson",
    studentId: "EXT001234",
    activities: ["Swimming - Beginner", "Art & Craft"],
    totalAmount: 500,
    paymentMethod: "Credit Card",
    transactionDate: new Date("2025-08-15"),
    paymentType: "complete",
    status: "issued",
    downloadCount: 2,
    isExternal: true
  },
  {
    id: "2",
    receiptNumber: "AS-RCP-2025-001235",
    parentName: "Mr. & Mrs. Johnson",
    studentName: studentData[2].name,
    studentId: studentData[2].id,
    activities: ["Football Training"],
    totalAmount: 250,
    paymentMethod: "PromptPay",
    transactionDate: new Date("2025-08-14"),
    paymentType: "single",
    status: "issued",
    downloadCount: 1,
    isExternal: false
  },
  {
    id: "3",
    receiptNumber: "AS-RCP-2025-001236",
    parentName: "Sarah Thompson",
    studentName: "Lily Thompson",
    studentId: "EXT001236",
    activities: ["Drama Club", "Music Theory"],
    totalAmount: 480,
    paymentMethod: "Bank Counter",
    transactionDate: new Date("2025-08-13"),
    paymentType: "complete",
    status: "issued",
    downloadCount: 0,
    isExternal: true
  },
  {
    id: "4",
    receiptNumber: "AS-RCP-2025-001237",
    parentName: "Mr. & Mrs. Brown",
    studentName: studentData[6].name,
    studentId: studentData[6].id,
    activities: ["Basketball Skills"],
    totalAmount: 220,
    paymentMethod: "WeChat Pay",
    transactionDate: new Date("2025-08-12"),
    paymentType: "single",
    status: "issued",
    downloadCount: 3,
    isExternal: false
  },
  {
    id: "5",
    receiptNumber: "AS-RCP-2025-001238",
    parentName: "Amanda Lee",
    studentName: "Sophie Lee",
    studentId: "EXT001238",
    activities: ["Piano Lessons", "Chess Club"],
    totalAmount: 620,
    paymentMethod: "Credit Card",
    transactionDate: new Date("2025-08-11"),
    paymentType: "complete",
    status: "issued",
    downloadCount: 0,
    isExternal: true
  }
]

export function AfterSchoolReceipts() {
  const { t, language } = useLanguage()
  const locale = language === "th" ? th : enUS
  const [receipts] = useState<AfterSchoolReceipt[]>(mockReceipts)
  const [filteredReceipts, setFilteredReceipts] = useState<AfterSchoolReceipt[]>(mockReceipts)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all")
  const [parentTypeFilter, setParentTypeFilter] = useState("all")
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

  const getSortedReceipts = (receiptsToSort: AfterSchoolReceipt[]) => {
    if (!sortColumn) return receiptsToSort

    return [...receiptsToSort].sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortColumn) {
        case "receiptNumber":
          aVal = a.receiptNumber
          bVal = b.receiptNumber
          break
        case "parentName":
          aVal = a.parentName
          bVal = b.parentName
          break
        case "studentName":
          aVal = a.studentName
          bVal = b.studentName
          break
        case "totalAmount":
          aVal = a.totalAmount
          bVal = b.totalAmount
          break
        case "paymentMethod":
          aVal = a.paymentMethod
          bVal = b.paymentMethod
          break
        case "paymentType":
          aVal = a.paymentType
          bVal = b.paymentType
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
        receipt.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.activities.some(activity => 
          activity.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter(receipt => receipt.paymentType === paymentTypeFilter)
    }

    if (parentTypeFilter !== "all") {
      filtered = filtered.filter(receipt => 
        parentTypeFilter === "external" ? receipt.isExternal : !receipt.isExternal
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
    setPaymentTypeFilter("all")
    setParentTypeFilter("all")
    setDateFrom(null)
    setDateTo(null)
    setFilteredReceipts(receipts)
  }

  const downloadReceipt = (receiptId: string) => {
    console.log("Downloading receipt", receiptId)
    // In a real app, this would generate and download PDF
  }

  const resendReceipt = (receiptId: string) => {
    console.log("Resending receipt via email", receiptId)
    // In a real app, this would resend receipt email
  }

  const viewReceipt = (receiptId: string) => {
    console.log("Viewing receipt", receiptId)
    // In a real app, this would open receipt in modal or new tab
  }

  const downloadInterfaceFile = () => {
    if (filteredReceipts.length === 0) {
      return
    }

    const mapPaymentMethod = (method: string): string => {
      if (!method) return ""
      const m = method.toLowerCase()
      if (m.includes("bank transfer") || m === "bank") return "BANK"
      if (m.startsWith("edc") || m.includes("pos") || m.includes("qr") || m.includes("credit card")) return "POS (QR/CC)"
      if (m.includes("cheque") || m.includes("check")) return "CHEQUE"
      if (m.includes("cash")) return "CASH"
      return method.toUpperCase()
    }

    const bankAccountsStored = localStorage.getItem("kingscollege_backoffice_bankAccounts")
    const bankAccounts = bankAccountsStored ? JSON.parse(bankAccountsStored) : []

    const getReceiveAccountNo = (paymentMethod: string): string => {
      if (!paymentMethod) return ""
      const m = paymentMethod.toLowerCase()
      let matchedAccount: any = null

      if (m.startsWith("edc")) {
        const edcMatch = paymentMethod.match(/EDC\s*-\s*(.+?)\s*\((.+?)\)/)
        if (edcMatch) {
          const [, bankName, accountNumber] = edcMatch
          matchedAccount = bankAccounts.find((acc: any) =>
            acc.paymentSource === "EDC" &&
            acc.bankName === bankName.trim() &&
            acc.accountNumber === accountNumber.trim() &&
            acc.isActive
          )
        }
        if (!matchedAccount) {
          matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "EDC" && acc.isActive)
        }
      } else if (m.includes("bank transfer") || m.includes("bank")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Bank Transfer" && acc.isActive)
      } else if (m.includes("cheque")) {
        matchedAccount = bankAccounts.find((acc: any) => acc.paymentSource === "Cashier's cheque" && acc.isActive)
      }

      return matchedAccount?.glAccount || matchedAccount?.accountNumber || ""
    }

    const wb = XLSX.utils.book_new()
    const titleRow = ["Interface File - Sales Receipt for school fees"]
    const headerRow = [
      "Receipt no.", "Customer no.", "Type", "RV no. series",
      "Receive date", "Payment method", "Sell-to-customer No.",
      "Receive Account no.", "Year group", "School year", "Invoice no.", "Amount"
    ]

    const dataRows = filteredReceipts.map(r => [
      r.receiptNumber,
      r.studentId,
      "CASHRCPT",
      "AR-RV",
      format(r.transactionDate, "yyyy-MM-dd") + " 00:00:00",
      mapPaymentMethod(r.paymentMethod),
      r.studentId,
      getReceiveAccountNo(r.paymentMethod),
      "",
      "",
      "",
      r.totalAmount
    ])

    const ws = XLSX.utils.aoa_to_sheet([titleRow, [], headerRow, ...dataRows])
    ws["!cols"] = [
      { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 22 }, { wch: 16 }, { wch: 20 },
      { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 12 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Receipts")
    XLSX.writeFile(wb, `interface-receipts-afterschool-${format(new Date(), "dd-MM-yyyy")}.xlsx`)
  }

  const getPaymentTypeBadge = (paymentType: string) => {
    return paymentType === "complete"
      ? <Badge variant="default">{t("receipt.completePackage")}</Badge>
      : <Badge variant="outline">{t("receipt.singleActivity")}</Badge>
  }

  const summaryStats = {
    total: receipts.length,
    totalDownloads: receipts.reduce((sum, r) => sum + r.downloadCount, 0),
    externalParents: receipts.filter(r => r.isExternal).length,
    totalRevenue: receipts.reduce((sum, r) => sum + r.totalAmount, 0)
  }

  useEffect(() => { setCurrentPage(1) }, [filteredReceipts])

  const sortedReceipts = getSortedReceipts(filteredReceipts)
  const totalCount = sortedReceipts.length
  const paginatedReceipts = sortedReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("receipt.afterSchoolTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("receipt.afterSchoolSubtitle")}
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
                {t("receipt.viewAndDownload")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t("receipt.bulkResend")}
              </Button>
              <Button variant="outline" className="flex items-center gap-2" onClick={downloadInterfaceFile}>
                <Download className="w-4 h-4" />
                {t("receipt.downloadInterfaceFile")}
              </Button>
              <Button className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("common.exportCsv")}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("receipt.totalReceipts")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("dashboard.totalRevenue")}</p>
            </div>
            <p className="text-2xl font-bold">฿{summaryStats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-1.5">
              <Download className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("receipt.totalDownloads")}</p>
            </div>
            <p className="text-2xl font-bold">{summaryStats.totalDownloads}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t("invoice.searchFilter")}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={applyFilters} className="h-9">{t("invoice.apply")}</Button>
              <Button variant="outline" onClick={clearFilters} className="h-9">{t("common.clear")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.search")}</label>
              <div className="relative">
                <Input
                  placeholder={t("receipt.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className=""
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("receipt.paymentType")}</label>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("receipt.allTypes")}</SelectItem>
                  <SelectItem value="single">{t("receipt.singleActivity")}</SelectItem>
                  <SelectItem value="complete">{t("receipt.completePackage")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("receipt.parentType")}</label>
              <Select value={parentTypeFilter} onValueChange={setParentTypeFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("receipt.allParents")}</SelectItem>
                  <SelectItem value="internal">{t("receipt.sisbParents")}</SelectItem>
                  <SelectItem value="external">{t("receipt.externalParents")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("invoice.dateRange")}</label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateFrom ? format(dateFrom, "dd/MM", { locale }) : t("invoice.fromDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom || undefined}
                      onSelect={(date) => setDateFrom(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      {dateTo ? format(dateTo, "dd/MM", { locale }) : t("invoice.toDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo || undefined}
                      onSelect={(date) => setDateTo(date ?? null)}
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
          {t("receipt.showingReceipts").replace("{count}", filteredReceipts.length.toString()).replace("{total}", receipts.length.toString())}
        </p>
      </div>

      {/* Receipt Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Receipt Number - LEFT */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("receiptNumber")}>
                  <div className="flex items-center gap-1">
                    {t("receipt.receiptNumber")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Parent & Student - LEFT */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("parentName")}>
                  <div className="flex items-center gap-1">
                    {t("receipt.parentAndStudent")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Activities - LEFT */}
                <TableHead align="left">{t("receipt.activities")}</TableHead>
                {/* Amount - RIGHT */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("totalAmount")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("common.amount")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Payment Method - LEFT */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentMethod")}>
                  <div className="flex items-center gap-1">
                    {t("receipt.paymentMethod")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Type - CENTER */}
                <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("paymentType")}>
                  <div className="flex items-center gap-1 justify-center">
                    {t("common.type")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Date - LEFT */}
                <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("transactionDate")}>
                  <div className="flex items-center gap-1">
                    {t("common.date")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Downloads - RIGHT */}
                <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("downloadCount")}>
                  <div className="flex items-center gap-1 justify-end">
                    {t("receipt.downloads")}
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {/* Actions - CENTER */}
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  {/* Receipt Number - LEFT */}
                  <TableCell align="left" className="font-mono text-sm">
                    {receipt.receiptNumber}
                    {receipt.isExternal && <Badge variant="secondary" className="ml-2 text-xs">External</Badge>}
                  </TableCell>
                  {/* Parent & Student - LEFT */}
                  <TableCell align="left">
                    <div>
                      <div className="font-medium">{receipt.parentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipt.studentName} ({receipt.studentId})
                      </div>
                    </div>
                  </TableCell>
                  {/* Activities - LEFT */}
                  <TableCell align="left">
                    <div className="space-y-1">
                      {receipt.activities.slice(0, 2).map((activity, index) => (
                        <Badge key={index} variant="outline" className="block w-fit text-xs">
                          {activity}
                        </Badge>
                      ))}
                      {receipt.activities.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{receipt.activities.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {/* Amount - RIGHT */}
                  <TableCell align="right">₿{receipt.totalAmount.toLocaleString()}</TableCell>
                  {/* Payment Method - LEFT */}
                  <TableCell align="left">{receipt.paymentMethod}</TableCell>
                  {/* Type - CENTER */}
                  <TableCell align="center">{getPaymentTypeBadge(receipt.paymentType)}</TableCell>
                  {/* Date - LEFT */}
                  <TableCell align="left">{format(receipt.transactionDate, "dd MMM yyyy")}</TableCell>
                  {/* Downloads - RIGHT */}
                  <TableCell align="right">
                    <div className="text-sm">
                      {receipt.downloadCount} times
                    </div>
                  </TableCell>
                  {/* Actions - CENTER */}
                  <TableCell align="center">
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
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("receipt.mostPopularActivities")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("receipt.basedOnVolume")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { activity: "Swimming - Beginner", receipts: 8, revenue: 2400 },
                { activity: "Football Training", receipts: 6, revenue: 1500 },
                { activity: "Art & Craft", receipts: 5, revenue: 1000 },
                { activity: "Piano Lessons", receipts: 4, revenue: 1600 },
                { activity: "Basketball Skills", receipts: 3, revenue: 660 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.activity}</div>
                    <div className="text-sm text-muted-foreground">{item.receipts} {t("receipt.receipts")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">฿{item.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("receipt.externalVsInternal")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("receipt.revenueComparison")}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("receipt.sisbParents")}</div>
                  <div className="text-sm text-muted-foreground">
                    {receipts.filter(r => !r.isExternal).length} {t("receipt.receipts")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ฿{receipts.filter(r => !r.isExternal).reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((receipts.filter(r => !r.isExternal).reduce((sum, r) => sum + r.totalAmount, 0) / summaryStats.totalRevenue) * 100)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("receipt.externalParents")}</div>
                  <div className="text-sm text-muted-foreground">
                    {receipts.filter(r => r.isExternal).length} {t("receipt.receipts")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ฿{receipts.filter(r => r.isExternal).reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((receipts.filter(r => r.isExternal).reduce((sum, r) => sum + r.totalAmount, 0) / summaryStats.totalRevenue) * 100)}%
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong>{t("receipt.insight")}:</strong> {t("receipt.externalInsight").replace("{percent}", Math.round((summaryStats.externalParents / summaryStats.total) * 100).toString())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="whitelist">
          <InternalEmailManagement
            title={t("receipt.afterSchoolWhitelistTitle")}
            description={t("receipt.afterSchoolWhitelistDesc")}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}