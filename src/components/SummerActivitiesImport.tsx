import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Progress } from "./ui/progress"
import { Badge } from "./ui/badge"
import { Alert, AlertDescription } from "./ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, RefreshCw, Sun, Calendar } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"

interface ImportStatus {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  message: string
  totalRecords?: number
  successRecords?: number
  errorRecords?: number
}

const mockSummerActivities = [
  { 
    id: 1, 
    name: "Swimming Intensive", 
    category: "Sports", 
    ageGroup: "7-12 years",
    duration: "2 weeks",
    fee: 3500,
    capacity: 20,
    instructor: "Coach Wilson",
    startDate: "2024-06-03"
  },
  { 
    id: 2, 
    name: "Art & Craft Workshop", 
    category: "Creative", 
    ageGroup: "5-10 years",
    duration: "1 week",
    fee: 2800,
    capacity: 15,
    instructor: "Ms. Johnson",
    startDate: "2024-06-10"
  },
  { 
    id: 3, 
    name: "Coding for Kids", 
    category: "Technology", 
    ageGroup: "8-14 years",
    duration: "3 weeks",
    fee: 4500,
    capacity: 12,
    instructor: "Mr. Tech",
    startDate: "2024-06-17"
  },
  { 
    id: 4, 
    name: "Drama Club", 
    category: "Performance", 
    ageGroup: "6-12 years",
    duration: "2 weeks",
    fee: 3200,
    capacity: 18,
    instructor: "Ms. Theater",
    startDate: "2024-06-24"
  },
  { 
    id: 5, 
    name: "Science Laboratory", 
    category: "Academic", 
    ageGroup: "9-15 years",
    duration: "2 weeks",
    fee: 3800,
    capacity: 16,
    instructor: "Dr. Science",
    startDate: "2024-07-01"
  }
]

const importTemplates = [
  {
    name: "Activities Template",
    description: "Template for importing summer activity information",
    fields: ["Activity Name", "Category", "Age Group", "Duration", "Fee", "Capacity", "Instructor", "Start Date"]
  },
  {
    name: "Schedule Template", 
    description: "Template for importing activity schedules and sessions",
    fields: ["Activity ID", "Date", "Start Time", "End Time", "Location", "Notes"]
  },
  {
    name: "Instructor Template",
    description: "Template for importing instructor information",
    fields: ["Name", "Email", "Phone", "Specialization", "Experience", "Certifications"]
  }
]

export function SummerActivitiesImport() {
  const { t } = useLanguage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedSeason, setSelectedSeason] = useState("")
  const [importType, setImportType] = useState("activities")
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
    if (!selectedFile || !selectedSeason) {
      toast.error(t("summer.selectFileAndSeason"))
      return
    }

    setImportStatus({ status: 'uploading', progress: 20, message: t("summer.uploadingFile") })
    
    // Simulate upload progress
    setTimeout(() => {
      setImportStatus({ status: 'processing', progress: 60, message: t("summer.processingData") })
    }, 1000)

    setTimeout(() => {
      const totalRecords = Math.floor(Math.random() * 50) + 50
      const errorRecords = Math.floor(Math.random() * 5)
      const successRecords = totalRecords - errorRecords
      
      setImportStatus({
        status: 'completed',
        progress: 100,
        message: t("summer.importCompletedSuccess"),
        totalRecords,
        successRecords,
        errorRecords
      })
      toast.success(t("summer.activitiesImportedSuccess"))
    }, 3000)
  }

  const downloadTemplate = (templateType: string) => {
    toast.success(t("summer.templateDownloadedSuccess").replace("{template}", templateType))
  }

  const resetImport = () => {
    setSelectedFile(null)
    setImportStatus({ status: 'idle', progress: 0, message: '' })
    setSelectedSeason("")
  }

  const getCategoryBadge = (category: string) => {
    const colors = {
      Sports: "bg-blue-100 text-blue-700",
      Creative: "bg-purple-100 text-purple-700", 
      Technology: "bg-green-100 text-green-700",
      Performance: "bg-pink-100 text-pink-700",
      Academic: "bg-orange-100 text-orange-700"
    }
    
    return (
      <Badge className={colors[category as keyof typeof colors] || "bg-gray-100 text-gray-700"}>
        {category}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("summer.importTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("summer.importDescription")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">{t("summer.importData")}</TabsTrigger>
          <TabsTrigger value="activities">{t("summer.currentActivities")}</TabsTrigger>
          <TabsTrigger value="templates">{t("summer.templates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Import Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {t("summer.importSummerActivities")}
                  </CardTitle>
                  <CardDescription>
                    {t("summer.uploadConfigureSettings")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-type">{t("summer.importType")}</Label>
                    <Select value={importType} onValueChange={setImportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activities">{t("summer.summerActivities")}</SelectItem>
                        <SelectItem value="schedules">{t("summer.activitySchedules")}</SelectItem>
                        <SelectItem value="instructors">{t("summer.instructorInformation")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">{t("summer.selectFile")}</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      disabled={importStatus.status === 'uploading' || importStatus.status === 'processing'}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        {t("summer.selected")}: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="season-select">{t("summer.summerSeason")}</Label>
                    <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("summer.selectSeason")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-summer">{t("summer.summer2024")}</SelectItem>
                        <SelectItem value="2025-summer">{t("summer.summer2025")}</SelectItem>
                        <SelectItem value="2024-winter">{t("summer.winterBreak2024")}</SelectItem>
                        <SelectItem value="2025-winter">{t("summer.winterBreak2025")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {importStatus.status !== 'idle' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t("summer.importProgress")}</Label>
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
                        {t("summer.importCompleted")} {importStatus.successRecords} {t("summer.recordsImportedSuccessfully")},
                        {importStatus.errorRecords} {t("summer.recordsWithErrors")}.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={!selectedFile || !selectedSeason || importStatus.status === 'uploading' || importStatus.status === 'processing'}
                      className="flex items-center gap-2"
                    >
                      {importStatus.status === 'uploading' || importStatus.status === 'processing' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {t("summer.importData")}
                    </Button>

                    {importStatus.status === 'completed' && (
                      <Button variant="outline" onClick={resetImport}>
                        {t("summer.importNewFile")}
                      </Button>
                    )}
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
                    {t("summer.quickTemplates")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {importTemplates.map((template, index) => (
                    <div key={index}>
                      <Button 
                        variant="outline" 
                        onClick={() => downloadTemplate(template.name)}
                        className="w-full justify-start"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {template.name}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("summer.importStatistics")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("summer.thisMonth")}</span>
                    <span className="font-medium">45 {t("summer.activities")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("summer.totalCapacity")}</span>
                    <span className="font-medium">780 {t("summer.students")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("summer.activePrograms")}</span>
                    <span className="font-medium">12 {t("summer.categories")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                {t("summer.currentSummerActivities")}
              </CardTitle>
              <CardDescription>
                {t("summer.recentlyImportedPrograms")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSummerActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{activity.name}</h4>
                        {getCategoryBadge(activity.category)}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <span>{t("summer.age")}: {activity.ageGroup}</span>
                        <span>{t("summer.duration")}: {activity.duration}</span>
                        <span>{t("summer.capacity")}: {activity.capacity} {t("summer.students")}</span>
                        <span>{t("summer.starts")}: {activity.startDate}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("summer.instructor")}: {activity.instructor}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">฿{activity.fee.toLocaleString()}</p>
                      <Badge variant="secondary" className="text-xs">
                        {t("summer.available")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {importTemplates.map((template, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("summer.requiredFields")}:</Label>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {template.fields.map((field, fieldIndex) => (
                        <li key={fieldIndex}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate(template.name)}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("summer.downloadTemplate")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("summer.importGuidelines")}</CardTitle>
              <CardDescription>{t("summer.importGuidelinesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium">{t("summer.fileRequirements")}:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• {t("summer.maxFileSize")}</li>
                    <li>• {t("summer.supportedFormats")}</li>
                    <li>• {t("summer.maxRecords")}</li>
                    <li>• {t("summer.useUtf8")}</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">{t("summer.dataValidation")}:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• {t("summer.dateFormat")}</li>
                    <li>• {t("summer.feesNumeric")}</li>
                    <li>• {t("summer.ageGroupsFormat")}</li>
                    <li>• {t("summer.capacityPositive")}</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>{t("summer.important")}:</strong> {t("summer.importWarning")}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}