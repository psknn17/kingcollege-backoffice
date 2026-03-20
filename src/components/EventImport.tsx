import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Progress } from "./ui/progress"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { useLanguage } from "@/contexts/LanguageContext"

interface ImportStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  totalRecords?: number
  successRecords?: number
  errorRecords?: number
}

const mockEvents = [
  { id: 1, name: "Sports Day 2024", date: "2024-10-15", type: "Sports", fee: 500 },
  { id: 2, name: "Science Fair", date: "2024-10-22", type: "Academic", fee: 300 },
  { id: 3, name: "Music Concert", date: "2024-11-05", type: "Performance", fee: 400 },
  { id: 4, name: "Field Trip - Zoo", date: "2024-11-12", type: "Educational", fee: 800 },
  { id: 5, name: "International Day", date: "2024-11-20", type: "Cultural", fee: 350 },
]

export function EventImport() {
  const { t } = useLanguage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTerm, setSelectedTerm] = useState("")
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    status: 'idle',
    progress: 0,
    message: ''
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportStatus({ status: 'idle', progress: 0, message: '' })
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !selectedTerm) {
      toast.error(t("event.selectFileAndTerm"))
      return
    }

    setImportStatus({ status: 'uploading', progress: 20, message: t("event.uploadingFile") })

    // Simulate upload progress
    setTimeout(() => {
      setImportStatus({ status: 'processing', progress: 60, message: t("event.processingEventsData") })
    }, 1000)

    setTimeout(() => {
      setImportStatus({
        status: 'completed',
        progress: 100,
        message: t("event.importCompletedSuccess"),
        totalRecords: 125,
        successRecords: 123,
        errorRecords: 2
      })
      toast.success(t("event.eventsImportedSuccess"))
      logActivity({ action: "Import Events", module: "Event Import", detail: `Imported ${selectedFile.name} for term ${selectedTerm} (123 success, 2 errors)` })
    }, 3000)
  }

  const downloadTemplate = () => {
    // Simulate template download
    toast.success(t("event.templateDownloadedSuccess"))
    logActivity({ action: "Download Template", module: "Event Import", detail: "Downloaded event import template" })
  }

  const resetImport = () => {
    setSelectedFile(null)
    setImportStatus({ status: 'idle', progress: 0, message: '' })
    setSelectedTerm("")
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("event.importTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("event.importDescription")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                {t("event.importEvents")}
              </CardTitle>
              <CardDescription>
                {t("event.uploadEventDataFile")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">{t("event.selectFile")} <span className="text-destructive">*</span></Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={importStatus.status === 'uploading' || importStatus.status === 'processing'}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {t("event.selected")}: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="term-select">{t("event.academicTerm")}</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("event.selectTerm")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-term1">{t("event.term1")} 2024</SelectItem>
                    <SelectItem value="2024-term2">{t("event.term2")} 2024</SelectItem>
                    <SelectItem value="2024-term3">{t("event.term3")} 2024</SelectItem>
                    <SelectItem value="2025-term1">{t("event.term1")} 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {importStatus.status !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("event.importProgress")}</Label>
                    <span className="text-sm text-muted-foreground">
                      {importStatus.progress}%
                    </span>
                  </div>
                  <Progress value={importStatus.progress} />
                  <p className="text-sm text-muted-foreground">{importStatus.message}</p>
                </div>
              )}

              {importStatus.status === 'completed' && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    {t("event.importCompleted")} {importStatus.successRecords} {t("event.recordsImportedSuccess")},
                    {importStatus.errorRecords} {t("event.recordsWithErrors")}.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleImport}
                  disabled={!selectedFile || !selectedTerm || importStatus.status === 'uploading' || importStatus.status === 'processing'}
                  className="flex items-center gap-2"
                >
                  {importStatus.status === 'uploading' || importStatus.status === 'processing' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {t("event.importEvents")}
                </Button>

                {importStatus.status === 'completed' && (
                  <Button variant="outline" onClick={resetImport}>
                    {t("event.importNewFile")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>{t("event.recentEvents")}</CardTitle>
              <CardDescription>
                {t("event.recentEventsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.date} • {event.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">฿{event.fee}</p>
                      <Badge variant="secondary" className="text-xs">
                        {t("common.active")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                {t("event.downloadTemplate")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("event.downloadTemplateDescription")}
              </p>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                {t("event.downloadTemplate")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("event.importGuidelines")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">{t("event.requiredFields")}:</h4>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• {t("event.eventName")}</li>
                  <li>• {t("event.eventDate")}</li>
                  <li>• {t("event.eventType")}</li>
                  <li>• {t("event.feeAmount")}</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">{t("event.fileRequirements")}:</h4>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• {t("event.maxFileSize")}: 10MB</li>
                  <li>• {t("event.formats")}: .xlsx, .xls, .csv</li>
                  <li>• {t("event.maxRecordsPerFile")}: 1000</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  {t("event.backupDataWarning")}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}