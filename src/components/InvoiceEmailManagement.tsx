import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Textarea } from "./ui/textarea"
import { Checkbox } from "./ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Progress } from "./ui/progress"
import {
  Search,
  Filter,
  Eye,
  Plus,
  Download,
  Mail,
  Send,
  Users,
  User,
  Globe,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Play,
  Pause,
  Square,
  Loader2,
  Settings,
  Image,
  Languages,
  Zap,
  ArrowUpDown
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"

interface Student {
  id: string
  name: string
  studentId: string
  grade: string
  class: string
  familyCode: string
  parentName: string
  parentEmail: string
  language: "en" | "th" | "zh"
  status: "active" | "inactive" | "graduated"
  hasOutstandingInvoice: boolean
  invoiceAmount: number
}

interface EmailTemplate {
  id: string
  name: string
  language: "en" | "th" | "zh"
  subject: string
  body: string
  footerText: string
  isDefault: boolean
}

interface EmailJob {
  id: string
  type: "send_all" | "batch_send" | "individual_send"
  name: string
  targetCount: number
  sentCount: number
  failedCount: number
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  createdAt: Date
  completedAt?: Date
  createdBy: string
  criteria?: {
    grades?: string[]
    classes?: string[]
    familyCodes?: string[]
    statuses?: string[]
  }
}

// Helper function to convert students from context to local format
const convertStudentsToEmailFormat = (contextStudents: any[], families: any[]): Student[] => {
  return contextStudents.map((student, index) => {
    const primaryParent = student.parents?.find((p: any) => p.isPrimary) || student.parents?.[0]
    const family = families.find(f => f.id === student.familyId)

    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      studentId: student.studentId,
      grade: student.gradeLevel,
      class: `${student.gradeLevel?.replace("Year ", "")}A`,
      familyCode: family?.familyCode || "-",
      parentName: primaryParent?.name || "N/A",
      parentEmail: primaryParent?.email || "N/A",
      language: "en" as "en" | "th" | "zh",
      status: student.status === "active" ? "active" : student.status === "graduated" ? "graduated" : "inactive",
      hasOutstandingInvoice: index % 2 === 0, // Mock for now
      invoiceAmount: index % 2 === 0 ? 42000 + (index * 10000) : 0
    }
  })
}

const mockTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Standard Invoice Email (English)",
    language: "en",
    subject: "Invoice for {studentName} - Grade {grade} | King's College",
    body: `Dear {parentName},

We hope this email finds you well. Please find attached the invoice for {studentName} (Student ID: {studentId}) for the current term.

Invoice Details:
- Student: {studentName}
- Grade: {grade}
- Family Code: {familyCode}
- Amount: ฿{invoiceAmount}

Please ensure payment is made by the due date specified in the invoice. If you have any questions or concerns regarding this invoice, please don't hesitate to contact our finance office.

Thank you for your continued trust in King's College.`,
    footerText: "Best regards,\nKing's College Finance Department\nEmail: finance@kingcollege.ac.th\nPhone: +66 2 xxx xxxx",
    isDefault: true
  },
  {
    id: "2",
    name: "Standard Invoice Email (Thai)",
    language: "th",
    subject: "ใบแจ้งหนี้สำหรับ {studentName} - ชั้น {grade} | King's College",
    body: `เรียน ท่าน{parentName}

ทางโรงเรียนหวังว่าท่านจะมีสุขภาพที่แข็งแรง กรุณาดูใบแจ้งหนี้ที่แนบมาสำหรับนักเรียน {studentName} (รหัสนักเรียน: {studentId}) สำหรับภาคเรียนนี้

รายละเอียดใบแจ้งหนี้:
- นักเรียน: {studentName}
- ชั้น: {grade}
- รหัสครอบครัว: {familyCode}
- จำนวนเงิน: ฿{invoiceAmount}

กรุณาชำระเงินภายในกำหนดที่ระบุในใบแจ้งหนี้ หากท่านมีคำถามหรือข้อสงสัยเกี่ยวกับใบแจ้งหนี้นี้ กรุณาติดต่อแผนกการเงินของโรงเรียน

ขอขอบคุณที่ไว้วางใจในKing's College`,
    footerText: "ด้วยความเคารพ,\nแผนกการเงิน King's College\nอีเมล: finance@kingcollege.ac.th\nโทรศัพท์: +66 2 xxx xxxx",
    isDefault: true
  },
  {
    id: "3",
    name: "Standard Invoice Email (Chinese)",
    language: "zh",
    subject: "{studentName} - {grade}年级账单 | King's College",
    body: `亲爱的{parentName}，

希望您身体健康。请查看附件中{studentName}（学生编号：{studentId}）本学期的账单。

账单详情：
- 学生：{studentName}
- 年级：{grade}
- 家庭代码：{familyCode}
- 金额：฿{invoiceAmount}

请在账单上指定的截止日期前付款。如果您对此账单有任何疑问，请随时联系我们的财务办公室。

感谢您对King's College的持续信任。`,
    footerText: "此致\n敬礼\nKing's College财务部\n邮箱：finance@kingcollege.ac.th\n电话：+66 2 xxx xxxx",
    isDefault: true
  }
]

const mockEmailJobs: EmailJob[] = [
  {
    id: "1",
    type: "send_all",
    name: "All Students - Term 2 Invoices",
    targetCount: 1250,
    sentCount: 1198,
    failedCount: 52,
    status: "completed",
    createdAt: new Date("2025-08-20T09:00:00"),
    completedAt: new Date("2025-08-20T09:45:00"),
    createdBy: "Finance Admin"
  },
  {
    id: "2",
    type: "batch_send",
    name: "Year 10-12 Additional Fees",
    targetCount: 280,
    sentCount: 195,
    failedCount: 5,
    status: "running",
    createdAt: new Date("2025-08-25T14:30:00"),
    createdBy: "Academic Office",
    criteria: {
      grades: ["Year 10", "Year 11", "Year 12", "Year 13"]
    }
  },
  {
    id: "3",
    type: "individual_send",
    name: "Late Payment Reminder - Smith Family",
    targetCount: 1,
    sentCount: 1,
    failedCount: 0,
    status: "completed",
    createdAt: new Date("2025-08-26T16:00:00"),
    completedAt: new Date("2025-08-26T16:01:00"),
    createdBy: "Finance Team"
  }
]

const grades = [
  "Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
  "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
]

export function InvoiceEmailManagement() {
  const { t } = useLanguage()
  const { students: contextStudents, families } = useStudents()

  // Convert students from context to local format
  const allStudents = useMemo(() =>
    convertStudentsToEmailFormat(contextStudents, families),
    [contextStudents, families]
  )

  const [activeTab, setActiveTab] = useState("send-emails")
  const [emailType, setEmailType] = useState<"send_all" | "batch_send" | "individual_send">("send_all")

  // Batch Send state
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["active"])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])

  // Individual Send state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])

  // Email Template state
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(mockTemplates[0])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null)

  // Sending state
  const [isSending, setIsSending] = useState(false)
  const [sendingProgress, setSendingProgress] = useState(0)
  const [currentJob, setCurrentJob] = useState<EmailJob | null>(null)

  // Email Jobs state
  const [emailJobs] = useState<EmailJob[]>(mockEmailJobs)

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Initialize filteredStudents when allStudents changes
  useEffect(() => {
    setFilteredStudents(allStudents)
    if (allStudents.length > 0 && !previewStudent) {
      setPreviewStudent(allStudents[0])
    }
  }, [allStudents])

  const applyBatchFilters = () => {
    let filtered = allStudents

    if (selectedGrades.length > 0) {
      filtered = filtered.filter(s => selectedGrades.includes(s.grade))
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(s => selectedStatuses.includes(s.status))
    }

    setFilteredStudents(filtered)
  }

  const handleGradeToggle = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade) 
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    )
  }

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const searchStudents = () => {
    return allStudents.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.familyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleStudentSelect = (student: Student) => {
    if (!selectedStudents.find(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student])
    }
    setSearchTerm("")
  }

  const handleStudentRemove = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId))
  }

  const getTargetCount = () => {
    switch (emailType) {
      case "send_all":
        return allStudents.length
      case "batch_send":
        return filteredStudents.length
      case "individual_send":
        return selectedStudents.length
      default:
        return 0
    }
  }

  const generatePreview = (student: Student) => {
    let subject = selectedTemplate.subject
    let body = selectedTemplate.body

    const replacements = {
      '{studentName}': student.name,
      '{studentId}': student.studentId,
      '{grade}': student.grade,
      '{familyCode}': student.familyCode,
      '{parentName}': student.parentName,
      '{invoiceAmount}': student.invoiceAmount.toLocaleString()
    }

    Object.entries(replacements).forEach(([key, value]) => {
      subject = subject.replace(new RegExp(key, 'g'), value)
      body = body.replace(new RegExp(key, 'g'), value)
    })

    return { subject, body }
  }

  const handlePreview = () => {
    setIsPreviewOpen(true)
  }

  const handleSendEmails = async () => {
    const targetCount = getTargetCount()
    
    if (targetCount === 0) {
      toast.error(t("invoiceEmail.selectRecipients"))
      return
    }

    setIsSending(true)
    setSendingProgress(0)

    // Create new job
    const newJob: EmailJob = {
      id: Date.now().toString(),
      type: emailType,
      name: `${emailType === "send_all" ? "All Students" : emailType === "batch_send" ? "Batch Send" : "Individual Send"} - ${new Date().toLocaleDateString()}`,
      targetCount,
      sentCount: 0,
      failedCount: 0,
      status: "running",
      createdAt: new Date(),
      createdBy: "Current User",
      criteria: emailType === "batch_send" ? {
        grades: selectedGrades,
        statuses: selectedStatuses
      } : undefined
    }

    setCurrentJob(newJob)

    // Simulate sending process
    for (let i = 0; i <= targetCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 50))
      setSendingProgress((i / targetCount) * 100)
      
      if (newJob) {
        newJob.sentCount = Math.floor(i * 0.95) // 95% success rate
        newJob.failedCount = i - newJob.sentCount
      }
    }

    if (newJob) {
      newJob.status = "completed"
      newJob.completedAt = new Date()
    }

    setIsSending(false)
    toast.success(t("invoiceEmail.emailsSent").replace("{sent}", String(newJob.sentCount)).replace("{failed}", String(newJob.failedCount)))
  }

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />{t("invoiceEmail.pending")}</Badge>
      case "running":
        return <Badge className="bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t("invoiceEmail.running")}</Badge>
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t("invoiceEmail.completed")}</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />{t("invoiceEmail.failed")}</Badge>
      case "cancelled":
        return <Badge variant="outline"><Square className="w-3 h-3 mr-1" />{t("invoiceEmail.cancelled")}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getLanguageFlag = (language: string) => {
    switch (language) {
      case "en":
        return "🇺🇸"
      case "th":
        return "🇹🇭"
      case "zh":
        return "🇨🇳"
      default:
        return "🌐"
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

  const getSortedJobs = (jobsToSort: EmailJob[]) => {
    if (!sortColumn) return jobsToSort
    return [...jobsToSort].sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortColumn) {
        case "name": aVal = a.name; bVal = b.name; break
        case "type": aVal = a.type; bVal = b.type; break
        case "status": aVal = a.status; bVal = b.status; break
        case "progress": aVal = a.sentCount / a.targetCount; bVal = b.sentCount / b.targetCount; break
        case "createdAt": aVal = a.createdAt.getTime(); bVal = b.createdAt.getTime(); break
        case "createdBy": aVal = a.createdBy; bVal = b.createdBy; break
        default: return 0
      }
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal)
        return sortDirection === "asc" ? comparison : -comparison
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("invoiceEmail.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("invoiceEmail.subtitle")}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send-emails">{t("invoiceEmail.sendEmails")}</TabsTrigger>
          <TabsTrigger value="email-jobs">{t("invoiceEmail.emailJobs")}</TabsTrigger>
        </TabsList>

        <TabsContent value="send-emails" className="space-y-6">
          {/* Email Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                {t("invoiceEmail.sendingOptions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`cursor-pointer transition-all ${emailType === "send_all" ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-4" onClick={() => setEmailType("send_all")}>
                    <div className="flex items-center justify-center mb-2">
                      <Globe className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-center">{t("invoiceEmail.sendAll")}</h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      {t("invoiceEmail.sendAllDesc")}
                    </p>
                    <div className="text-center mt-2">
                      <Badge variant="outline">{allStudents.length} {t("invoiceEmail.students")}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-all ${emailType === "batch_send" ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-4" onClick={() => setEmailType("batch_send")}>
                    <div className="flex items-center justify-center mb-2">
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-medium text-center">{t("invoiceEmail.batchSend")}</h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      {t("invoiceEmail.batchSendDesc")}
                    </p>
                    <div className="text-center mt-2">
                      <Badge variant="outline">{filteredStudents.length} {t("invoiceEmail.students")}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-all ${emailType === "individual_send" ? "ring-2 ring-primary" : ""}`}>
                  <CardContent className="p-4" onClick={() => setEmailType("individual_send")}>
                    <div className="flex items-center justify-center mb-2">
                      <User className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-center">{t("invoiceEmail.individualSend")}</h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      {t("invoiceEmail.individualSendDesc")}
                    </p>
                    <div className="text-center mt-2">
                      <Badge variant="outline">{selectedStudents.length} {t("invoiceEmail.selected")}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Batch Send Filters */}
          {emailType === "batch_send" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  {t("invoiceEmail.filterCriteria")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="font-medium">{t("invoiceEmail.grades")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {grades.map(grade => (
                        <div key={grade} className="flex items-center space-x-2">
                          <Checkbox
                            id={grade}
                            checked={selectedGrades.includes(grade)}
                            onCheckedChange={() => handleGradeToggle(grade)}
                          />
                          <label htmlFor={grade} className="text-sm">{grade}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="font-medium">{t("invoiceEmail.studentStatus")}</label>
                    <div className="space-y-2">
                      {["active", "inactive", "graduated"].map(status => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={status}
                            checked={selectedStatuses.includes(status)}
                            onCheckedChange={() => handleStatusToggle(status)}
                          />
                          <label htmlFor={status} className="text-sm capitalize">{status}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button onClick={applyBatchFilters}>{t("invoiceEmail.applyFilters")}</Button>
              </CardContent>
            </Card>
          )}

          {/* Individual Send Student Selection */}
          {emailType === "individual_send" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  {t("invoiceEmail.selectStudents")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder={t("invoiceEmail.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className=""
                  />
                </div>

                {searchTerm && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {searchStudents().map((student) => (
                      <div
                        key={student.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.studentId} • {student.grade} • {student.familyCode}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{getLanguageFlag(student.language)}</span>
                            <Badge variant="outline">{student.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <div className="space-y-2">
                    <label className="font-medium">{t("invoiceEmail.selectedStudents")}</label>
                    <div className="space-y-2">
                      {selectedStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.studentId} • {student.grade} • {student.parentEmail}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStudentRemove(student.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("invoiceEmail.emailTemplate")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {mockTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${selectedTemplate.id === template.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span>{getLanguageFlag(template.language)}</span>
                        {template.isDefault && <Badge variant="outline">{t("invoiceEmail.default")}</Badge>}
                      </div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.subject.substring(0, 50)}...
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t("invoiceEmail.previewEmail")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Send Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {t("invoiceEmail.sendControls")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t("invoiceEmail.recipients")}</p>
                  <p className="text-2xl font-bold">{getTargetCount()}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t("invoiceEmail.template")}</p>
                  <p className="font-medium">{selectedTemplate.name}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t("invoiceEmail.estimatedTime")}</p>
                  <p className="font-medium">{Math.ceil(getTargetCount() / 20)} {t("invoiceEmail.minutes")}</p>
                </div>
              </div>

              {isSending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("invoiceEmail.sendingEmails")}</span>
                    <span>{Math.round(sendingProgress)}%</span>
                  </div>
                  <Progress value={sendingProgress} />
                  {currentJob && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t("invoiceEmail.sent")}: {currentJob.sentCount}</span>
                      <span>{t("invoiceEmail.failed")}: {currentJob.failedCount}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleSendEmails}
                disabled={isSending || getTargetCount() === 0}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("invoiceEmail.sendingEmailsBtn")}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t("invoiceEmail.sendEmails2").replace("{count}", String(getTargetCount()))}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-jobs" className="space-y-6">
          {/* Email Jobs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("invoiceEmail.emailHistory")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        {t("invoiceEmail.jobName")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("type")}>
                      <div className="flex items-center gap-1">
                        {t("invoiceOverview.type")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1">
                        {t("common.status")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("progress")}>
                      <div className="flex items-center gap-1">
                        {t("invoiceEmail.progress")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdAt")}>
                      <div className="flex items-center gap-1">
                        {t("invoiceEmail.created")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("createdBy")}>
                      <div className="flex items-center gap-1">
                        {t("invoiceEmail.createdBy")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentJob && (
                    <TableRow>
                      <TableCell className="font-medium">{currentJob.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {currentJob.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>{getJobStatusBadge(currentJob.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {currentJob.sentCount} / {currentJob.targetCount}
                          </div>
                          <Progress value={(currentJob.sentCount / currentJob.targetCount) * 100} className="h-1" />
                        </div>
                      </TableCell>
                      <TableCell>{currentJob.createdAt.toLocaleString()}</TableCell>
                      <TableCell>{currentJob.createdBy}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                  {getSortedJobs(emailJobs).map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {job.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {job.sentCount} / {job.targetCount}
                          </div>
                          <Progress value={(job.sentCount / job.targetCount) * 100} className="h-1" />
                          {job.failedCount > 0 && (
                            <div className="text-xs text-red-600">
                              {job.failedCount} {t("invoiceEmail.failed")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{job.createdAt.toLocaleString()}</TableCell>
                      <TableCell>{job.createdBy}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {t("invoiceEmail.emailPreview")}
            </DialogTitle>
            <DialogDescription>
              {t("invoiceEmail.previewDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={previewStudent?.id || ""} onValueChange={(id) => {
                const student = allStudents.find(s => s.id === id)
                if (student) setPreviewStudent(student)
              }}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={t("invoiceEmail.selectStudent")} />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>{previewStudent ? getLanguageFlag(previewStudent.language) : ""}</span>
            </div>

            {previewStudent ? (
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("invoiceEmail.to")}:</label>
                    <p className="font-medium">{previewStudent.parentEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("invoiceEmail.subject")}:</label>
                    <p className="font-medium">{generatePreview(previewStudent).subject}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("invoiceEmail.message")}:</label>
                    <div className="mt-2 whitespace-pre-wrap font-mono text-sm bg-white p-4 rounded border">
                      {generatePreview(previewStudent).body}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t("invoiceEmail.footer")}:</label>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedTemplate.footerText}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>{t("invoiceEmail.attachment")}: Invoice_{previewStudent.studentId}.pdf</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {t("invoiceEmail.noStudentsPreview")}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}