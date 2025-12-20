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
import { toast } from "sonner@2.0.3"

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
      toast.error("Please select a file and term before importing")
      return
    }

    setImportStatus({ status: 'uploading', progress: 20, message: 'Uploading file...' })
    
    // Simulate upload progress
    setTimeout(() => {
      setImportStatus({ status: 'processing', progress: 60, message: 'Processing events data...' })
    }, 1000)

    setTimeout(() => {
      setImportStatus({ 
        status: 'completed', 
        progress: 100, 
        message: 'Import completed successfully!',
        totalRecords: 125,
        successRecords: 123,
        errorRecords: 2
      })
      toast.success("Events imported successfully!")
    }, 3000)
  }

  const downloadTemplate = () => {
    // Simulate template download
    toast.success("Template downloaded successfully")
  }

  const resetImport = () => {
    setSelectedFile(null)
    setImportStatus({ status: 'idle', progress: 0, message: '' })
    setSelectedTerm("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Event Import</h2>
        <p className="text-muted-foreground">
          Import event data from Excel or CSV files. Download the template first to ensure proper formatting.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Events
              </CardTitle>
              <CardDescription>
                Upload your event data file and select the appropriate term
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="term-select">Academic Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-term1">Term 1 2024</SelectItem>
                    <SelectItem value="2024-term2">Term 2 2024</SelectItem>
                    <SelectItem value="2024-term3">Term 3 2024</SelectItem>
                    <SelectItem value="2025-term1">Term 1 2025</SelectItem>
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
                  disabled={!selectedFile || !selectedTerm || importStatus.status === 'uploading' || importStatus.status === 'processing'}
                  className="flex items-center gap-2"
                >
                  {importStatus.status === 'uploading' || importStatus.status === 'processing' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import Events
                </Button>
                
                {importStatus.status === 'completed' && (
                  <Button variant="outline" onClick={resetImport}>
                    Import New File
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                Recently imported events in the system
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
                        Active
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
                Download Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download the Excel template to ensure your data is formatted correctly before importing.
              </p>
              <Button variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Required Fields:</h4>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• Event Name</li>
                  <li>• Event Date</li>
                  <li>• Event Type</li>
                  <li>• Fee Amount</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">File Requirements:</h4>
                <ul className="space-y-1 text-muted-foreground ml-4">
                  <li>• Max file size: 10MB</li>
                  <li>• Formats: .xlsx, .xls, .csv</li>
                  <li>• Max 1000 records per file</li>
                </ul>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Always backup your data before importing large datasets.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}