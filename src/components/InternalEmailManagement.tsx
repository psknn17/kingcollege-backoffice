import { useState, useRef, useMemo } from "react"
import { downloadAsXlsx, parseXlsxOrCsvFile, XLSX_ACCEPT } from "@/utils/xlsxUtils"
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
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { useLanguage } from "@/contexts/LanguageContext"
import { PaginationBar } from "./ui/pagination-bar"

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
    email: "somchai.j@kingcollege.ac.th",
    remark: "Finance Department Head",
    createdAt: new Date("2024-01-15")
  },
  {
    id: "2",
    name: "Malee",
    surname: "Kaewmanee",
    email: "malee.k@kingcollege.ac.th",
    remark: "Accounting Manager",
    createdAt: new Date("2024-02-10")
  },
  {
    id: "3",
    name: "Prasert",
    surname: "Suksamran",
    email: "prasert.s@kingcollege.ac.th",
    remark: "IT Support",
    createdAt: new Date("2024-01-20")
  },
  {
    id: "4",
    name: "Niran",
    surname: "Thanakit",
    email: "niran.t@kingcollege.ac.th",
    remark: "Academic Director",
    createdAt: new Date("2024-03-05")
  },
  {
    id: "5",
    name: "Siriporn",
    surname: "Wongsiri",
    email: "siriporn.w@kingcollege.ac.th",
    remark: "Operations Manager",
    createdAt: new Date("2024-02-28")
  }
]

export function InternalEmailManagement({
  title,
  description
}: InternalEmailManagementProps) {
  const { t } = useLanguage()
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Internal Email Management Functions
  const handleAddEmail = () => {
    if (!emailForm.name || !emailForm.surname || !emailForm.email) {
      toast.error(t("internalEmail.fillRequiredFields"))
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailForm.email)) {
      toast.error(t("internalEmail.invalidEmailFormat"))
      return
    }

    // Check for duplicate email
    if (internalEmails.some(e => e.email === emailForm.email && e.id !== editingEmail?.id)) {
      toast.error(t("internalEmail.emailAlreadyExists"))
      return
    }

    if (editingEmail) {
      // Update existing email
      setInternalEmails(internalEmails.map(email =>
        email.id === editingEmail.id
          ? { ...email, ...emailForm }
          : email
      ))
      toast.success(t("internalEmail.emailUpdatedSuccess"))
      logActivity({ action: "Update Contact", module: "Internal Email", detail: `Updated contact: ${emailForm.name} ${emailForm.surname} (${emailForm.email})` })
    } else {
      // Add new email
      const newEmail: InternalEmail = {
        id: Date.now().toString(),
        ...emailForm,
        createdAt: new Date()
      }
      setInternalEmails([...internalEmails, newEmail])
      toast.success(t("internalEmail.emailAddedSuccess"))
      logActivity({ action: "Add Contact", module: "Internal Email", detail: `Added contact: ${emailForm.name} ${emailForm.surname} (${emailForm.email})` })
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
    const deletedEmail = internalEmails.find(email => email.id === id)
    setInternalEmails(internalEmails.filter(email => email.id !== id))
    toast.success(t("internalEmail.emailRemovedSuccess"))
    logActivity({ action: "Remove Contact", module: "Internal Email", detail: `Removed contact: ${deletedEmail?.name} ${deletedEmail?.surname} (${deletedEmail?.email})` })
  }

  // File Upload Functions
  const downloadCsvTemplate = () => {
    downloadAsXlsx(
      ["name", "surname", "email", "remark"],
      [
        ["John", "Doe", "john.doe@example.com", "Sample remark"],
        ["Jane", "Smith", "jane.smith@example.com", "Another remark"]
      ],
      "internal-email-template"
    )
    toast.success(t("internalEmail.templateDownloadSuccess"))
    logActivity({ action: "Download Template", module: "Internal Email", detail: "Downloaded internal email CSV template" })
  }

  const processCsvFile = async (file: File) => {
    try {
      const rows = await parseXlsxOrCsvFile(file)

      if (rows.length === 0) {
        toast.error(t("internalEmail.csvFileEmpty"))
        return
      }

      const expectedHeaders = ['name', 'surname', 'email', 'remark']
      const fileHeaders = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
      const hasValidHeaders = expectedHeaders.every(h => fileHeaders.includes(h))
      if (!hasValidHeaders) {
        toast.error(t("internalEmail.invalidCsvFormat"))
        return
      }

      const errors: string[] = []
      const validEmails: InternalEmail[] = []

      rows.forEach((row, i) => {
        const name = row['name']?.trim() || ""
        const surname = row['surname']?.trim() || ""
        const email = row['email']?.trim() || ""
        const remark = row['remark']?.trim() || ""

        if (!name || !surname || !email) {
          errors.push(`Row ${i + 2}: Name, surname, and email are required`)
          return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          errors.push(`Row ${i + 2}: Invalid email format`)
          return
        }

        if (validEmails.some(e => e.email === email)) {
          errors.push(`Row ${i + 2}: Duplicate email in file`)
          return
        }

        if (internalEmails.some(e => e.email === email)) {
          errors.push(`Row ${i + 2}: Email already exists in system`)
          return
        }

        validEmails.push({
          id: `temp-${i}`,
          name,
          surname,
          email,
          remark,
          createdAt: new Date()
        })
      })

      setCsvData(validEmails)
      setCsvErrors(errors)

      if (validEmails.length === 0 && errors.length > 0) {
        toast.error(t("internalEmail.noValidRecords"))
      } else {
        toast.success(`${validEmails.length} ${t("internalEmail.validRecordsFound")}${errors.length > 0 ? `, ${errors.length} ${t("internalEmail.errors")}` : ''}`)
      }
    } catch {
      toast.error(t("internalEmail.errorReadingCsv"))
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
      processCsvFile(file)
    }
  }

  const importCsvData = async () => {
    if (csvData.length === 0) {
      toast.error(t("internalEmail.noValidDataToImport"))
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
      toast.success(`${t("internalEmail.successfullyImported")} ${newEmails.length} ${t("internalEmail.emails")}`)
      logActivity({ action: "Import Emails", module: "Internal Email", detail: `Imported ${newEmails.length} emails from file` })

      // Reset CSV upload state
      setIsCsvUploadOpen(false)
      setCsvFile(null)
      setCsvData([])
      setCsvErrors([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      toast.error(t("internalEmail.errorImportingCsv"))
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
        case "createdAt": aVal = a.createdAt?.getTime() || 0; bVal = b.createdAt?.getTime() || 0; break
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

  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredInternalEmails.slice(start, start + pageSize)
  }, [filteredInternalEmails, currentPage, pageSize])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium">{title || t("internalEmail.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {description || t("internalEmail.description")}
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
                {t("internalEmail.addInternalEmail")}
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingEmail ? t("internalEmail.editInternalEmail") : t("internalEmail.addInternalEmail")}
              </DialogTitle>
              <DialogDescription>
                {editingEmail ? t("internalEmail.editDialogDescription") : t("internalEmail.addDialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("common.name")} *</Label>
                  <Input
                    id="name"
                    value={emailForm.name}
                    onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                    placeholder={t("internalEmail.enterFirstName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">{t("internalEmail.surname")} *</Label>
                  <Input
                    id="surname"
                    value={emailForm.surname}
                    onChange={(e) => setEmailForm({ ...emailForm, surname: e.target.value })}
                    placeholder={t("internalEmail.enterLastName")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("internalEmail.emailAddress")} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  placeholder={t("internalEmail.enterEmailAddress")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remark">{t("internalEmail.remark")}</Label>
                <Textarea
                  id="remark"
                  value={emailForm.remark}
                  onChange={(e) => setEmailForm({ ...emailForm, remark: e.target.value })}
                  placeholder={t("internalEmail.enterPositionOrDepartment")}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddEmailOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleAddEmail}>
                  {editingEmail ? t("internalEmail.updateEmail") : t("internalEmail.addEmail")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCsvUploadOpen} onOpenChange={setIsCsvUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {t("internalEmail.batchCsvUpload")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t("internalEmail.batchCsvUpload")}</DialogTitle>
              <DialogDescription>
                {t("internalEmail.batchCsvUploadDescription")}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">{t("internalEmail.uploadCsv")}</TabsTrigger>
                <TabsTrigger value="preview" disabled={csvData.length === 0}>{t("internalEmail.preview")} ({csvData.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <h4 className="text-lg font-medium">{t("internalEmail.uploadCsvFile")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("internalEmail.csvColumnsDescription")}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={XLSX_ACCEPT}
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
                          {t("internalEmail.chooseCsvFile")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={downloadCsvTemplate}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          {t("internalEmail.downloadTemplate")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {csvFile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">{t("internalEmail.selectedFile")}:</span>
                        <span>{csvFile.name}</span>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {t("internalEmail.size")}: {(csvFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  )}

                  {csvErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">{t("internalEmail.validationErrors")}:</h5>
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
                          <h5 className="font-medium text-green-800">{t("internalEmail.readyToImport")}</h5>
                          <p className="text-sm text-green-700">{csvData.length} {t("internalEmail.validEmailsFound")}</p>
                        </div>
                        <Button
                          onClick={importCsvData}
                          disabled={isProcessingCsv}
                          className="flex items-center gap-2"
                        >
                          {isProcessingCsv ? t("internalEmail.processing") : t("internalEmail.importNow")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                {csvData.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-3">{t("internalEmail.previewImportData")}</h5>
                    <div className="border rounded-lg max-h-96 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("common.name")}</TableHead>
                            <TableHead>{t("internalEmail.surname")}</TableHead>
                            <TableHead>{t("common.email")}</TableHead>
                            <TableHead>{t("internalEmail.remark")}</TableHead>
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
                        {t("common.cancel")}
                      </Button>
                      <Button
                        onClick={importCsvData}
                        disabled={isProcessingCsv}
                        className="flex items-center gap-2"
                      >
                        {isProcessingCsv ? t("internalEmail.processing") : t("internalEmail.importAll")}
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
                <p className="text-sm font-medium text-muted-foreground">{t("internalEmail.totalEmails")}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t("internalEmail.emailDomains")}</p>
                <p className="text-2xl font-bold">{new Set(internalEmails.map(email => email.email.split('@')[1])).size}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("internalEmail.uniqueDomains")}</p>
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
                placeholder={t("internalEmail.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className=""
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredInternalEmails.length} {t("internalEmail.of")} {internalEmails.length} {t("internalEmail.emails")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t("internalEmail.internalEmailList")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInternalEmails.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("internalEmail.noEmailsFound")}</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? t("internalEmail.noEmailsMatchSearch") : t("internalEmail.noEmailsAddedYet")}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddEmailOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t("internalEmail.addFirstEmail")}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      {t("common.name")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("email")}>
                    <div className="flex items-center gap-1">
                      {t("common.email")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("remark")}>
                    <div className="flex items-center gap-1">
                      {t("internalEmail.remark")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                    <div className="flex items-center gap-1">
                      {t("internalEmail.added")}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead align="right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmails.map((email) => (
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
                    <TableCell align="right">
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
                              <AlertDialogTitle>{t("internalEmail.deleteInternalEmail")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("internalEmail.deleteConfirmation", { name: `${email.name} ${email.surname}` })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEmail(email.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t("common.delete")}
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
          <PaginationBar
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={filteredInternalEmails.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}