import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Checkbox } from "./ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Separator } from "./ui/separator"
import { Label } from "./ui/label"
import {
  FileSpreadsheet,
  Download,
  Calendar as CalendarIcon,
  Filter,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  XCircle
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "./ui/utils"
import { useLanguage } from "@/contexts/LanguageContext"

interface ExportSettings {
  includeColumns: {
    recipientInfo: boolean
    studentInfo: boolean
    deliveryStatus: boolean
    timestamps: boolean
    failureReasons: boolean
    attempts: boolean
  }
  statusFilter: string[]
  dateRange: {
    from?: Date
    to?: Date
  }
  format: "csv" | "xlsx"
}

interface EmailCsvExportProps {
  jobData?: any
  onBack?: () => void
}

export function EmailCsvExport({ jobData, onBack }: EmailCsvExportProps) {
  const { t } = useLanguage()
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    includeColumns: {
      recipientInfo: true,
      studentInfo: true,
      deliveryStatus: true,
      timestamps: true,
      failureReasons: true,
      attempts: true
    },
    statusFilter: ["sent", "delivered", "opened", "failed", "bounced"],
    dateRange: {},
    format: "csv"
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const handleColumnToggle = (column: keyof ExportSettings['includeColumns']) => {
    setExportSettings(prev => ({
      ...prev,
      includeColumns: {
        ...prev.includeColumns,
        [column]: !prev.includeColumns[column]
      }
    }))
  }

  const handleStatusToggle = (status: string) => {
    setExportSettings(prev => ({
      ...prev,
      statusFilter: prev.statusFilter.includes(status)
        ? prev.statusFilter.filter(s => s !== status)
        : [...prev.statusFilter, status]
    }))
  }

  const handleDateRangeChange = (type: 'from' | 'to', date: Date | undefined) => {
    setExportSettings(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: date
      }
    }))
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    // Simulate export progress
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsExporting(false)
          // Trigger actual download here
          downloadFile()
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const downloadFile = () => {
    // Mock CSV content
    const csvContent = generateCsvContent()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `email-export-${jobData?.batchId || 'email-job'}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const generateCsvContent = () => {
    let headers: string[] = []
    
    if (exportSettings.includeColumns.recipientInfo) {
      headers.push("Recipient Name", "Recipient Email")
    }
    if (exportSettings.includeColumns.studentInfo) {
      headers.push("Student Name", "Year Group")
    }
    if (exportSettings.includeColumns.deliveryStatus) {
      headers.push("Status")
    }
    if (exportSettings.includeColumns.timestamps) {
      headers.push("Sent At", "Delivered At", "Opened At")
    }
    if (exportSettings.includeColumns.attempts) {
      headers.push("Attempts", "Last Attempt At")
    }
    if (exportSettings.includeColumns.failureReasons) {
      headers.push("Failure Reason")
    }

    // Mock data rows
    const rows = [
      ["Sarah Thompson", "sarah.thompson@email.com", "Emma Thompson", "Year 7", "opened", "2024-01-15 10:30", "2024-01-15 10:31", "2024-01-15 14:20", "1", "2024-01-15 10:30", ""],
      ["Michael Wilson", "michael.wilson@email.com", "James Wilson", "Year 8", "delivered", "2024-01-15 10:30", "2024-01-15 10:32", "", "1", "2024-01-15 10:30", ""],
      ["Lisa Chen", "invalid@nonexistent.com", "Olivia Chen", "Year 10", "bounced", "2024-01-15 10:30", "", "", "3", "2024-01-15 11:15", "Recipient address rejected: User unknown"],
    ]

    return [headers.join(","), ...rows.map(row => row.join(","))].join("\n")
  }

  const getPreviewCount = () => {
    // Mock calculation based on filters
    return 145 // Example number
  }

  const statusOptions = [
    { value: "sent", label: t("email.status.sent"), icon: Mail, color: "text-blue-600" },
    { value: "delivered", label: t("email.status.delivered"), icon: CheckCircle, color: "text-green-600" },
    { value: "opened", label: t("email.status.opened"), icon: MessageSquare, color: "text-purple-600" },
    { value: "failed", label: t("email.status.failed"), icon: XCircle, color: "text-red-600" },
    { value: "bounced", label: t("email.status.bounced"), icon: AlertCircle, color: "text-orange-600" }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2>{t("email.exportEmailLogs")}</h2>
          <p className="text-muted-foreground">
            {t("email.exportDescription")} {jobData?.batchId || t("email.emailJob")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Information */}
          {jobData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {t("email.jobInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">{t("email.batchId")}</Label>
                  <p className="font-mono">{jobData.batchId}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t("email.invoiceType")}</Label>
                  <p className="capitalize">{jobData.invoiceType}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t("email.yearGroup")}</Label>
                  <p>{jobData.yearGroup}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t("email.totalEmails")}</Label>
                  <p>{jobData.totalEmails}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t("email.columnSelection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recipientInfo"
                    checked={exportSettings.includeColumns.recipientInfo}
                    onCheckedChange={() => handleColumnToggle('recipientInfo')}
                  />
                  <Label htmlFor="recipientInfo">{t("email.recipientInformation")}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="studentInfo"
                    checked={exportSettings.includeColumns.studentInfo}
                    onCheckedChange={() => handleColumnToggle('studentInfo')}
                  />
                  <Label htmlFor="studentInfo">{t("email.studentInformation")}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deliveryStatus"
                    checked={exportSettings.includeColumns.deliveryStatus}
                    onCheckedChange={() => handleColumnToggle('deliveryStatus')}
                  />
                  <Label htmlFor="deliveryStatus">{t("email.deliveryStatus")}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timestamps"
                    checked={exportSettings.includeColumns.timestamps}
                    onCheckedChange={() => handleColumnToggle('timestamps')}
                  />
                  <Label htmlFor="timestamps">{t("email.timestamps")}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="attempts"
                    checked={exportSettings.includeColumns.attempts}
                    onCheckedChange={() => handleColumnToggle('attempts')}
                  />
                  <Label htmlFor="attempts">{t("email.attemptInformation")}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="failureReasons"
                    checked={exportSettings.includeColumns.failureReasons}
                    onCheckedChange={() => handleColumnToggle('failureReasons')}
                  />
                  <Label htmlFor="failureReasons">{t("email.failureReasons")}</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                {t("email.exportFilters")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Filter */}
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("email.statusFilter")}</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {statusOptions.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={status.value}
                        checked={exportSettings.statusFilter.includes(status.value)}
                        onCheckedChange={() => handleStatusToggle(status.value)}
                      />
                      <Label htmlFor={status.value} className="flex items-center gap-2">
                        <status.icon className={`w-4 h-4 ${status.color}`} />
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date Range */}
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("invoice.dateRange")}</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportSettings.dateRange.from ? format(exportSettings.dateRange.from, "dd/MM/yyyy") : t("invoice.fromDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={exportSettings.dateRange.from}
                        onSelect={(date) => handleDateRangeChange('from', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exportSettings.dateRange.to ? format(exportSettings.dateRange.to, "dd/MM/yyyy") : t("invoice.toDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={exportSettings.dateRange.to}
                        onSelect={(date) => handleDateRangeChange('to', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              {/* Export Format */}
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("email.exportFormat")}</Label>
                <Select value={exportSettings.format} onValueChange={(value: "csv" | "xlsx") => setExportSettings(prev => ({ ...prev, format: value }))}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder={t("email.format")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">{t("email.formatCsv")}</SelectItem>
                    <SelectItem value="xlsx">{t("email.formatExcel")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Export */}
        <div className="space-y-6">
          {/* Export Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                {t("email.exportPreview")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-2xl font-bold mb-2">{getPreviewCount()}</div>
                <p className="text-sm text-muted-foreground">
                  {t("email.recordsWillBeExported")}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("email.columns")}:</span>
                  <span>{Object.values(exportSettings.includeColumns).filter(Boolean).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("email.statusFilter")}:</span>
                  <span>{exportSettings.statusFilter.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("email.format")}:</span>
                  <span className="uppercase">{exportSettings.format}</span>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("email.exporting")}</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? t("email.exporting") : t("email.exportEmailLogs")}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t("email.quickExportTemplates")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                {t("email.successfulDeliveriesOnly")}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                {t("email.failedBouncedOnly")}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="w-4 h-4 mr-2 text-blue-600" />
                {t("email.completeLog")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}