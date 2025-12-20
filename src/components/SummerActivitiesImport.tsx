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
import { toast } from "sonner@2.0.3"

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
      toast.error("Please select a file and season before importing")
      return
    }

    setImportStatus({ status: 'uploading', progress: 20, message: 'Uploading file...' })
    
    // Simulate upload progress
    setTimeout(() => {
      setImportStatus({ status: 'processing', progress: 60, message: 'Processing summer activities data...' })
    }, 1000)

    setTimeout(() => {
      const totalRecords = Math.floor(Math.random() * 50) + 50
      const errorRecords = Math.floor(Math.random() * 5)
      const successRecords = totalRecords - errorRecords
      
      setImportStatus({ 
        status: 'completed', 
        progress: 100, 
        message: 'Import completed successfully!',
        totalRecords,
        successRecords,
        errorRecords
      })
      toast.success("Summer activities imported successfully!")
    }, 3000)
  }

  const downloadTemplate = (templateType: string) => {
    toast.success(`${templateType} template downloaded successfully`)
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
      <div>
        <h2 className="mb-2">Summer Activities Import</h2>
        <p className="text-muted-foreground">
          Import summer activity programs, schedules, and instructor information from Excel or CSV files.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="activities">Current Activities</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Import Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Import Summer Activities
                  </CardTitle>
                  <CardDescription>
                    Upload your summer activity data file and configure import settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-type">Import Type</Label>
                    <Select value={importType} onValueChange={setImportType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activities">Summer Activities</SelectItem>
                        <SelectItem value="schedules">Activity Schedules</SelectItem>
                        <SelectItem value="instructors">Instructor Information</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Select File</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      disabled={importStatus.status === 'uploading' || importStatus.status === 'processing'}
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="season-select">Summer Season</Label>
                    <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-summer">Summer 2024</SelectItem>
                        <SelectItem value="2025-summer">Summer 2025</SelectItem>
                        <SelectItem value="2024-winter">Winter Break 2024</SelectItem>
                        <SelectItem value="2025-winter">Winter Break 2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {importStatus.status !== 'idle' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Import Progress</Label>
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
                        Import completed! {importStatus.successRecords} records imported successfully, 
                        {importStatus.errorRecords} records with errors.
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
                      Import Data
                    </Button>
                    
                    {importStatus.status === 'completed' && (
                      <Button variant="outline" onClick={resetImport}>
                        Import New File
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
                    Quick Templates
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
                  <CardTitle>Import Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-medium">45 activities</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Capacity</span>
                    <span className="font-medium">780 students</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Programs</span>
                    <span className="font-medium">12 categories</span>
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
                Current Summer Activities
              </CardTitle>
              <CardDescription>
                Recently imported summer activity programs
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
                        <span>Age: {activity.ageGroup}</span>
                        <span>Duration: {activity.duration}</span>
                        <span>Capacity: {activity.capacity} students</span>
                        <span>Starts: {activity.startDate}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Instructor: {activity.instructor}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">฿{activity.fee.toLocaleString()}</p>
                      <Badge variant="secondary" className="text-xs">
                        Available
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
                    <Label className="text-sm font-medium">Required Fields:</Label>
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
                    Download Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Import Guidelines</CardTitle>
              <CardDescription>Important information for successful data import</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium">File Requirements:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Maximum file size: 15MB</li>
                    <li>• Supported formats: .xlsx, .xls, .csv</li>
                    <li>• Maximum 500 records per file</li>
                    <li>• Use UTF-8 encoding for special characters</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Data Validation:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Dates must be in YYYY-MM-DD format</li>
                    <li>• Fees must be numeric values</li>
                    <li>• Age groups should specify ranges (e.g., "7-12 years")</li>
                    <li>• Capacity must be positive integers</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Important:</strong> Always backup existing data before performing bulk imports. 
                  Review the imported data carefully before making activities available for registration.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}