import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Users, Edit, Search, UserPlus, Trash2, Mail, Upload, Download, FileSpreadsheet, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"

interface InternalEmail {
  id: string
  name: string
  surname: string
  email: string
  remark: string
  createdAt: Date
}

interface InternalEmailManagementProps {
  title?: string
  description?: string
}

const initialInternalEmails: InternalEmail[] = [
  {
    id: "1",
    name: "Somchai",
    surname: "Jaidee",
    email: "somchai.j@sisb.ac.th",
    remark: "Finance Department Head",
    createdAt: new Date("2024-01-15")
  },
  {
    id: "2",
    name: "Malee",
    surname: "Kaewmanee",
    email: "malee.k@sisb.ac.th",
    remark: "Accounting Manager",
    createdAt: new Date("2024-02-10")
  },
  {
    id: "3",
    name: "Prasert",
    surname: "Suksamran",
    email: "prasert.s@sisb.ac.th",
    remark: "IT Support",
    createdAt: new Date("2024-01-20")
  },
  {
    id: "4",
    name: "Niran",
    surname: "Thanakit",
    email: "niran.t@sisb.ac.th",
    remark: "Academic Director",
    createdAt: new Date("2024-03-05")
  },
  {
    id: "5",
    name: "Siriporn",
    surname: "Wongsiri",
    email: "siriporn.w@sisb.ac.th",
    remark: "Operations Manager",
    createdAt: new Date("2024-02-28")
  }
]

export function InternalEmailManagement({ 
  title = "Internal Email Whitelist",
  description = "Manage internal staff emails who receive receipt notifications"
}: InternalEmailManagementProps) {
  const [internalEmails, setInternalEmails] = useState<InternalEmail[]>(initialInternalEmails)
  const [isAddEmailOpen, setIsAddEmailOpen] = useState(false)
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState<InternalEmail | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<InternalEmail[]>([])
  const [csvErrors, setCsvErrors] = useState<string[]>([])
  const [isProcessingCsv, setIsProcessingCsv] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [emailForm, setEmailForm] = useState({
    name: "",
    surname: "",
    email: "",
    remark: ""
  })

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Internal Email Management Functions
  const handleAddEmail = () => {
    if (!emailForm.name || !emailForm.surname || !emailForm.email) {
      toast.error("Please fill in all required fields")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailForm.email)) {
      toast.error("Please enter a valid email address")
      return
    }

    // Check for duplicate email
    if (internalEmails.some(e => e.email === emailForm.email && e.id !== editingEmail?.id)) {
      toast.error("This email address already exists")
      return
    }

    if (editingEmail) {
      // Update existing email
      setInternalEmails(internalEmails.map(email => 
        email.id === editingEmail.id 
          ? { ...email, ...emailForm }
          : email
      ))
      toast.success("Internal email updated successfully!")
    } else {
      // Add new email
      const newEmail: InternalEmail = {
        id: Date.now().toString(),
        ...emailForm,
        createdAt: new Date()
      }
      setInternalEmails([...internalEmails, newEmail])
      toast.success("Internal email added successfully!")
    }

    // Reset form
    setEmailForm({ name: "", surname: "", email: "", remark: "" })
    setIsAddEmailOpen(false)
    setEditingEmail(null)
  }

  const handleEditEmail = (email: InternalEmail) => {
    setEditingEmail(email)
    setEmailForm({
      name: email.name,
      surname: email.surname,
      email: email.email,
      remark: email.remark
    })
    setIsAddEmailOpen(true)
  }

  const handleDeleteEmail = (id: string) => {
    setInternalEmails(internalEmails.filter(email => email.id !== id))
    toast.success("Internal email removed successfully!")
  }

  // CSV Upload Functions
  const downloadCsvTemplate = () => {
    const csvContent = "name,surname,email,remark\nJohn,Doe,john.doe@example.com,Sample remark\nJane,Smith,jane.smith@example.com,Another remark"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "internal-email-template.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV template downloaded successfully!")
  }

  const processCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      const lines = csv.split('\n').filter(line => line.trim() !== '')
      
      if (lines.length === 0) {
        toast.error("CSV file is empty")
        return
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim())
      const expectedHeaders = ['name', 'surname', 'email', 'remark']
      
      // Check if headers match expected format
      const hasValidHeaders = expectedHeaders.every(h => header.includes(h))
      if (!hasValidHeaders) {
        toast.error("Invalid CSV format. Expected headers: name, surname, email, remark")
        return
      }

      const errors: string[] = []
      const validEmails: InternalEmail[] = []

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        
        if (values.length < 4) {
          errors.push(`Row ${i + 1}: Missing required fields`)
          continue
        }

        const [name, surname, email, remark] = values
        
        // Validate required fields
        if (!name || !surname || !email) {
          errors.push(`Row ${i + 1}: Name, surname, and email are required`)
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          errors.push(`Row ${i + 1}: Invalid email format`)
          continue
        }

        // Check for duplicate emails in CSV
        if (validEmails.some(e => e.email === email)) {
          errors.push(`Row ${i + 1}: Duplicate email in CSV`)
          continue
        }

        // Check for existing emails in system
        if (internalEmails.some(e => e.email === email)) {
          errors.push(`Row ${i + 1}: Email already exists in system`)
          continue
        }

        validEmails.push({
          id: `temp-${i}`,
          name,
          surname,
          email,
          remark: remark || "",
          createdAt: new Date()
        })
      }

      setCsvData(validEmails)
      setCsvErrors(errors)
      
      if (validEmails.length === 0 && errors.length > 0) {
        toast.error("No valid records found in CSV file")
      } else {
        toast.success(`${validEmails.length} valid records found${errors.length > 0 ? `, ${errors.length} errors` : ''}`)
      }
    }
    
    reader.onerror = () => {
      toast.error("Error reading CSV file")
    }
    
    reader.readAsText(file)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error("Please select a CSV file")
        return
      }
      setCsvFile(file)
      processCsvFile(file)
    }
  }

  const importCsvData = async () => {
    if (csvData.length === 0) {
      toast.error("No valid data to import")
      return
    }

    setIsProcessingCsv(true)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Add CSV data to existing emails
      const newEmails = csvData.map(email => ({
        ...email,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }))
      
      setInternalEmails([...internalEmails, ...newEmails])
      toast.success(`Successfully imported ${newEmails.length} email(s)`)
      
      // Reset CSV upload state
      setIsCsvUploadOpen(false)
      setCsvFile(null)
      setCsvData([])
      setCsvErrors([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast.error("Error importing CSV data")
    } finally {
      setIsProcessingCsv(false)
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortedEmails = (emailsToSort: InternalEmail[]) => {
    if (!sortColumn) return emailsToSort
    return [...emailsToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "name": aVal = `${a.name} ${a.surname}`; bVal = `${b.name} ${b.surname}`; break
        case "email": aVal = a.email; bVal = b.email; break
        case "remark": aVal = a.remark; bVal = b.remark; break
        case "createdAt": aVal = a.createdAt.getTime(); bVal = b.createdAt.getTime(); break
        default: return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  const filteredInternalEmails = getSortedEmails(internalEmails.filter(email =>
    email.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.remark.toLowerCase().includes(searchTerm.toLowerCase())
  ))

  const totalEmails = internalEmails.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddEmailOpen} onOpenChange={setIsAddEmailOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" onClick={() => {
                setEditingEmail(null)
                setEmailForm({ name: "", surname: "", email: "", remark: "" })
              }}>
                <UserPlus className="w-4 h-4" />
                Add Internal Email
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingEmail ? "Edit Internal Email" : "Add Internal Email"}
              </DialogTitle>
              <DialogDescription>
                {editingEmail ? "Update the internal email information below." : "Add a new internal email to the notification whitelist."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={emailForm.name}
                    onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname *</Label>
                  <Input
                    id="surname"
                    value={emailForm.surname}
                    onChange={(e) => setEmailForm({ ...emailForm, surname: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">Remark</Label>
                <Textarea
                  id="remark"
                  value={emailForm.remark}
                  onChange={(e) => setEmailForm({ ...emailForm, remark: e.target.value })}
                  placeholder="Enter position or department"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddEmailOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEmail}>
                  {editingEmail ? "Update" : "Add"} Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCsvUploadOpen} onOpenChange={setIsCsvUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Batch CSV Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Batch CSV Upload</DialogTitle>
              <DialogDescription>
                Upload a CSV file to add multiple internal emails at once.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                <TabsTrigger value="preview" disabled={csvData.length === 0}>Preview ({csvData.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <h4 className="text-lg font-medium">Upload CSV File</h4>
                      <p className="text-sm text-muted-foreground">
                        Select a CSV file with the following columns: name, surname, email, remark
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <div className="flex gap-2 justify-center mt-4">
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Choose CSV File
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={downloadCsvTemplate}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Template
                        </Button>
                      </div>
                    </div>
                  </div>

                  {csvFile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Selected File:</span>
                        <span>{csvFile.name}</span>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Size: {(csvFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  )}

                  {csvErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">Validation Errors:</h5>
                      <ul className="text-sm text-red-700 space-y-1">
                        {csvErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {csvData.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-green-800">Ready to Import</h5>
                          <p className="text-sm text-green-700">{csvData.length} valid email(s) found</p>
                        </div>
                        <Button 
                          onClick={importCsvData}
                          disabled={isProcessingCsv}
                          className="flex items-center gap-2"
                        >
                          {isProcessingCsv ? "Processing..." : "Import Now"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                {csvData.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-3">Preview Import Data</h5>
                    <div className="border rounded-lg max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Surname</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Remark</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvData.map((email, index) => (
                            <TableRow key={index}>
                              <TableCell>{email.name}</TableCell>
                              <TableCell>{email.surname}</TableCell>
                              <TableCell>{email.email}</TableCell>
                              <TableCell>{email.remark || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsCsvUploadOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={importCsvData}
                        disabled={isProcessingCsv}
                        className="flex items-center gap-2"
                      >
                        {isProcessingCsv ? "Processing..." : "Import All"}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-bold">{totalEmails}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Domains</p>
                <p className="text-2xl font-bold">{new Set(internalEmails.map(email => email.email.split('@')[1])).size}</p>
                <p className="text-xs text-muted-foreground mt-1">Unique domains</p>
              </div>
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search by name, email, or remark..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className=""
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredInternalEmails.length} of {internalEmails.length} emails
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Internal Email List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInternalEmails.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No emails found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No emails match your search criteria" : "No internal emails have been added yet"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddEmailOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Email
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("email")}>
                    <div className="flex items-center gap-1">
                      Email
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("remark")}>
                    <div className="flex items-center gap-1">
                      Remark
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1">
                      Added
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInternalEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <div className="font-medium">
                        {email.name} {email.surname}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{email.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {email.remark || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {email.createdAt.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditEmail(email)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Internal Email</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove "{email.name} {email.surname}" from the internal email whitelist?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEmail(email.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}