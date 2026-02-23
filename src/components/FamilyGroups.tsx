import { useState, useMemo, useEffect } from "react"
import { usePersistedState } from "@/hooks/usePersistedState"
import { downloadAsXlsx } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Checkbox } from "./ui/checkbox"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { ColumnPresets } from "@/utils/tableAlignment"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  Mail,
  GraduationCap,
  Percent,
  UserPlus,
  ArrowUpDown,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  AlertTriangle
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { useStudents, Family, Student } from "@/contexts/StudentContext"
import { cn } from "./ui/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"

const gradeLevels: Record<string, string> = {
  "pre-nursery": "Pre-Nursery",
  "nursery": "Nursery",
  "reception": "Reception",
  "year1": "Year 1",
  "year2": "Year 2",
  "year3": "Year 3",
  "year4": "Year 4",
  "year5": "Year 5",
  "year6": "Year 6",
  "year7": "Year 7",
  "year8": "Year 8",
  "year9": "Year 9",
  "year10": "Year 10",
  "year11": "Year 11",
  "year12": "Year 12",
  "year13": "Year 13",
}

const emptyFamily: Omit<Family, "id" | "createdAt"> = {
  familyCode: "",
  familyName: "",
  studentIds: [],
  primaryContactId: "",
  address: "",
  email: "",
  invoiceEmails: []
}

export function FamilyGroups() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Confirmation dialog hooks
  const saveConfirmDialog = useConfirmDialog()
  const addConfirmDialog = useConfirmDialog()

  const {
    students,
    families,
    addFamily,
    updateFamily,
    deleteFamily,
    getStudentsByFamily,
    checkFeePrivilegeEligibility,
    updateStudent
  } = useStudents()

  const [searchTerm, setSearchTerm] = usePersistedState("family-groups:search", "")
  const [expandedFamilies, setExpandedFamilies] = usePersistedState<string[]>("family-groups:expanded", [])
  const [statusFilter, setStatusFilter] = usePersistedState("family-groups:statusFilter", "all")

  // Sorting states
  const [sortColumn, setSortColumn] = usePersistedState("family-groups:sortColumn", "")
  const [sortDirection, setSortDirection] = usePersistedState<"asc" | "desc">("family-groups:sortDirection", "asc")

  // Pagination states
  const [currentPage, setCurrentPage] = usePersistedState("family-groups:currentPage", 1)
  const [pageSize, setPageSize] = usePersistedState("family-groups:pageSize", 10)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false)

  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [formData, setFormData] = useState<Omit<Family, "id" | "createdAt">>(emptyFamily)
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>("")

  // Helper function to get student group discounts
  const getStudentGroupDiscounts = (studentId: string, category: string = "tuition") => {
    try {
      const storageKey = category === "tuition" ? "studentGroups" : `studentGroups_${category}`
      const stored = localStorage.getItem(storageKey)
      if (!stored) return []

      const groups = JSON.parse(stored)
      const studentGroups: { name: string, discountType: string, discountPercentage: number, fixedAmount: number }[] = []

      groups.forEach((group: any) => {
        if (group.isActive === false) return
        if (group.students && group.students.some((s: any) => s.id === studentId && s.isActive !== false)) {
          studentGroups.push({
            name: group.name,
            discountType: group.discountType || "percentage",
            discountPercentage: group.discountPercentage || 0,
            fixedAmount: group.fixedAmount || 0
          })
        }
      })
      return studentGroups
    } catch (e) {
      console.error("Error loading group discounts:", e)
      return []
    }
  }

  // Bulk selection and invitation states
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([])
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false)
  const [invitationTarget, setInvitationTarget] = useState<"single" | "bulk">("single")
  const [isMarkRegisteredDialogOpen, setIsMarkRegisteredDialogOpen] = useState(false)
  const [emailIssueDialogOpen, setEmailIssueDialogOpen] = useState(false)
  const [emailIssueType, setEmailIssueType] = useState<"without" | "invalid" | "duplicate">("without")

  // Get students without family
  const studentsWithoutFamily = useMemo(() => {
    return students.filter((s: Student) => !s.familyId || s.familyId === "")
  }, [students])

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = families.length
    const notInvited = families.filter((f: Family) => !f.portalStatus || f.portalStatus === "not_invited").length
    const invited = families.filter((f: Family) => f.portalStatus === "invited").length
    const registered = families.filter((f: Family) => f.portalStatus === "registered").length

    return { total, notInvited, invited, registered }
  }, [families])

  // Email validation warnings
  const emailValidation = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const withoutEmail = families.filter((f: Family) => !f.email || f.email.trim() === "")
    const invalidEmail = families.filter((f: Family) => f.email && !emailRegex.test(f.email))

    // Check for duplicate emails
    const emailMap = new Map<string, Family[]>()
    families.forEach((f: Family) => {
      if (f.email) {
        const existing = emailMap.get(f.email) || []
        emailMap.set(f.email, [...existing, f])
      }
    })
    const duplicateEmails = Array.from(emailMap.entries())
      .filter(([_, fams]) => fams.length > 1)
      .map(([email, fams]) => ({ email, families: fams }))

    return {
      withoutEmail,
      invalidEmail,
      duplicateEmails,
      hasWarnings: withoutEmail.length > 0 || invalidEmail.length > 0 || duplicateEmails.length > 0
    }
  }, [families])

  // Filter families - search by familyName, familyCode, and student names + status filter
  const filteredFamilies = useMemo(() => {
    return families.filter(family => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesFamilyName = family.familyName.toLowerCase().includes(searchLower)
      const matchesFamilyCode = family.familyCode?.toLowerCase().includes(searchLower)
      // Also search by student names in the family
      const familyStudents = students.filter((s: Student) => s.familyId === family.id)
      const matchesStudentName = familyStudents.some((s: Student) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchLower) ||
        s.studentId?.toLowerCase().includes(searchLower)
      )
      const matchesSearch = matchesFamilyName || matchesFamilyCode || matchesStudentName

      // Status filter
      const familyStatus = family.portalStatus || "not_invited"
      const matchesStatus = statusFilter === "all" || familyStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [families, searchTerm, statusFilter, students])

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Sort filtered families
  const sortedFamilies = useMemo(() => {
    if (!sortColumn) return filteredFamilies
    return [...filteredFamilies].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case "familyCode":
          aValue = a.familyCode || ""
          bValue = b.familyCode || ""
          break
        case "familyName":
          aValue = a.familyName
          bValue = b.familyName
          break
        case "childrenCount":
          aValue = getStudentsByFamily(a.id).length
          bValue = getStudentsByFamily(b.id).length
          break
        case "totalDiscount":
          const aStudents = getStudentsByFamily(a.id)
          const bStudents = getStudentsByFamily(b.id)
          aValue = aStudents.reduce((total: number, student: Student) => {
            const groupDiscounts = getStudentGroupDiscounts(student.studentId)
            return total + groupDiscounts.reduce((s, d) => s + (d.discountType === 'percentage' ? d.discountPercentage : 0), 0)
          }, 0)
          bValue = bStudents.reduce((total: number, student: Student) => {
            const groupDiscounts = getStudentGroupDiscounts(student.studentId)
            return total + groupDiscounts.reduce((s, d) => s + (d.discountType === 'percentage' ? d.discountPercentage : 0), 0)
          }, 0)
          break
        default:
          return 0
      }

      if (typeof aValue === "string") {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === "asc" ? comparison : -comparison
      } else {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
    })
  }, [filteredFamilies, sortColumn, sortDirection, getStudentsByFamily])

  // Pagination logic
  const totalPages = Math.ceil(sortedFamilies.length / pageSize)
  const paginatedFamilies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedFamilies.slice(startIndex, startIndex + pageSize)
  }, [sortedFamilies, currentPage, pageSize])

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortColumn, sortDirection])

  // Stats
  const stats = useMemo(() => {
    const totalFamilies = families.length
    const totalStudentsInFamilies = students.filter((s: Student) => s.familyId).length
    const studentsWithDiscount = students.filter((s: Student) => getStudentGroupDiscounts(s.studentId).length > 0).length
    const multiChildFamilies = families.filter((f: Family) => getStudentsByFamily(f.id).length > 1).length
    return { totalFamilies, totalStudentsInFamilies, studentsWithDiscount, multiChildFamilies }
  }, [families, students, getStudentsByFamily])

  const toggleFamilyExpanded = (familyId: string) => {
    setExpandedFamilies((prev: string[]) =>
      prev.includes(familyId)
        ? prev.filter((id: string) => id !== familyId)
        : [...prev, familyId]
    )
  }

  const handleAddFamily = () => {
    setFormData(emptyFamily)
    setIsAddDialogOpen(true)
  }

  const handleEditFamily = (family: Family) => {
    setSelectedFamily(family)
    setFormData({
      familyCode: family.familyCode || "",
      familyName: family.familyName,
      studentIds: family.studentIds,
      primaryContactId: family.primaryContactId,
      address: family.address,
      email: family.email || "",
      invoiceEmails: family.invoiceEmails || []
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteFamily = (family: Family) => {
    setSelectedFamily(family)
    setIsDeleteDialogOpen(true)
  }

  const handleAddStudentToFamily = (family: Family) => {
    setSelectedFamily(family)
    setSelectedStudentToAdd("")
    setIsAddStudentDialogOpen(true)
  }

  const performSaveNewFamily = () => {
    const newFamily: Family = {
      id: `FAM${Date.now()}`,
      ...formData,
      createdAt: new Date()
    }
    addFamily(newFamily)
    toast.success(t("familyGroups.familyCreated"))
    setIsAddDialogOpen(false)
    setFormData(emptyFamily)
  }

  const handleSaveNewFamily = () => {
    addConfirmDialog.confirm(() => {
      performSaveNewFamily()
    })
  }

  const performSaveEditFamily = () => {
    if (selectedFamily) {
      updateFamily(selectedFamily.id, formData)
      toast.success(t("familyGroups.familyUpdated"))
      setIsEditDialogOpen(false)
      setSelectedFamily(null)
    }
  }

  const handleSaveEditFamily = () => {
    saveConfirmDialog.confirm(() => {
      performSaveEditFamily()
    })
  }

  const handleConfirmDelete = () => {
    if (selectedFamily) {
      // Remove family reference from all students in this family
      const familyStudents = getStudentsByFamily(selectedFamily.id)
      familyStudents.forEach((student: Student) => {
        updateStudent(student.id, { familyId: "", childOrder: 1 })
      })

      deleteFamily(selectedFamily.id)
      toast.success(t("familyGroups.familyDeleted"))
      setIsDeleteDialogOpen(false)
      setSelectedFamily(null)
    }
  }

  const handleConfirmAddStudent = () => {
    if (selectedFamily && selectedStudentToAdd) {
      const familyStudents = getStudentsByFamily(selectedFamily.id)
      const newChildOrder = familyStudents.length + 1

      // Update student with family info
      updateStudent(selectedStudentToAdd, {
        familyId: selectedFamily.id,
        childOrder: newChildOrder
      })

      // Update family studentIds
      updateFamily(selectedFamily.id, {
        studentIds: [...selectedFamily.studentIds, selectedStudentToAdd]
      })

      toast.success(t("familyGroups.studentAdded"))
      setIsAddStudentDialogOpen(false)
      setSelectedStudentToAdd("")
    }
  }

  const handleRemoveStudentFromFamily = (student: Student) => {
    if (student.familyId) {
      const family = families.find(f => f.id === student.familyId)
      if (family) {
        // Update family
        updateFamily(family.id, {
          studentIds: family.studentIds.filter(id => id !== student.id)
        })

        // Update student
        updateStudent(student.id, { familyId: "", childOrder: 1 })

        // Recalculate child order for remaining students
        const remainingStudents = getStudentsByFamily(family.id).filter(s => s.id !== student.id)
        remainingStudents.forEach((s, index) => {
          updateStudent(s.id, { childOrder: index + 1 })
        })

        toast.success(t("familyGroups.studentRemoved"))
      }
    }
  }

  // Selection handlers
  const handleSelectFamily = (familyId: string, checked: boolean) => {
    if (checked) {
      setSelectedFamilyIds(prev => [...prev, familyId])
    } else {
      setSelectedFamilyIds(prev => prev.filter(id => id !== familyId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedFamilies.map((f: Family) => f.id)
      setSelectedFamilyIds(allIds)
    } else {
      setSelectedFamilyIds([])
    }
  }

  // Invitation handlers
  const handleSendInvitation = (family: Family) => {
    setSelectedFamily(family)
    setInvitationTarget("single")
    setIsInvitationDialogOpen(true)
  }

  const handleBulkInvitation = () => {
    setInvitationTarget("bulk")
    setIsInvitationDialogOpen(true)
  }

  const handleMarkAsRegistered = (family: Family) => {
    setSelectedFamily(family)
    setIsMarkRegisteredDialogOpen(true)
  }

  const performMarkAsRegistered = () => {
    if (selectedFamily) {
      updateFamily(selectedFamily.id, {
        portalStatus: "registered",
        invitationAcceptedAt: new Date()
      })
      toast.success(`${selectedFamily.familyName} marked as registered`)
      setIsMarkRegisteredDialogOpen(false)
      setSelectedFamily(null)
    }
  }

  const performSendInvitation = () => {
    const familiesToInvite = invitationTarget === "single" && selectedFamily
      ? [selectedFamily]
      : families.filter((f: Family) => selectedFamilyIds.includes(f.id))

    let successCount = 0
    familiesToInvite.forEach((family: Family) => {
      if (family.email) {
        // Update family with invitation status
        updateFamily(family.id, {
          portalStatus: "invited",
          invitationSentAt: new Date()
        })
        successCount++

        // TODO: Call API to send actual email invitation
        console.log(`Sending invitation to ${family.email} for family ${family.familyCode}`)
      }
    })

    toast.success(`Sent ${successCount} invitation(s) successfully`)
    setIsInvitationDialogOpen(false)
    setSelectedFamilyIds([])
  }

  const getPortalStatusBadge = (family: Family) => {
    const status = family.portalStatus || "not_invited"

    switch (status) {
      case "invited":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Invited
          </Badge>
        )
      case "registered":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Registered
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Mail className="w-3 h-3 mr-1" />
            Not Invited
          </Badge>
        )
    }
  }

  const getTotalDiscount = (familyId: string): number => {
    const familyStudents = getStudentsByFamily(familyId)
    return familyStudents.reduce((total, student) => {
      const groupDiscounts = getStudentGroupDiscounts(student.studentId)
      return total + groupDiscounts.reduce((s, d) => s + (d.discountType === 'percentage' ? d.discountPercentage : 0), 0)
    }, 0)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Family Code",
      "Family Name",
      "Email",
      "Address",
      "Students Count",
      "Portal Status",
      "Invitation Sent",
      "Invitation Accepted",
      "Total Discount"
    ]

    const rows = filteredFamilies.map((family: Family) => {
      const familyStudents = getStudentsByFamily(family.id)
      const totalDiscount = getTotalDiscount(family.id)
      const status = family.portalStatus || "not_invited"

      return [
        family.familyCode || "",
        family.familyName,
        family.email || "",
        family.address || "",
        familyStudents.length,
        status === "not_invited" ? "Not Invited" :
          status === "invited" ? "Invited" : "Registered",
        family.invitationSentAt ? new Date(family.invitationSentAt).toLocaleDateString() : "",
        family.invitationAcceptedAt ? new Date(family.invitationAcceptedAt).toLocaleDateString() : "",
        totalDiscount > 0 ? `${totalDiscount}%` : "0%"
      ]
    })

    downloadAsXlsx(headers, rows, `family_groups_${new Date().toISOString().split('T')[0]}`)

    toast.success(`Exported ${filteredFamilies.length} families to Excel`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("familyGroups.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("familyGroups.subtitle")}
          </p>
        </div>
        <Button onClick={handleAddFamily} disabled={!userCanEdit}>
          <Plus className="w-4 h-4 mr-2" />
          {t("familyGroups.addFamily")}
        </Button>
      </div>

      {/* Portal Status Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Not Invited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summaryStats.notInvited}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Invited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{summaryStats.invited}</div>
            <p className="text-xs text-yellow-600 mt-1">Waiting registration</p>
          </CardContent>
        </Card>
        <Card className="border-green-300 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{summaryStats.registered}</div>
            <p className="text-xs text-green-600 mt-1">Connected</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Validation Warnings */}
      {emailValidation.hasWarnings && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-amber-900">Email Validation Warnings</h3>
                <div className="space-y-1 text-sm text-amber-800">
                  {emailValidation.withoutEmail.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span>• {emailValidation.withoutEmail.length} familie(s) without email address</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmailIssueType("without")
                          setEmailIssueDialogOpen(true)
                        }}
                        className="text-xs h-7"
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                  {emailValidation.invalidEmail.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span>• {emailValidation.invalidEmail.length} familie(s) with invalid email format</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmailIssueType("invalid")
                          setEmailIssueDialogOpen(true)
                        }}
                        className="text-xs h-7"
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                  {emailValidation.duplicateEmails.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span>• {emailValidation.duplicateEmails.length} duplicate email(s) found</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEmailIssueType("duplicate")
                          setEmailIssueDialogOpen(true)
                        }}
                        className="text-xs h-7"
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("familyGroups.searchFamilies")}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_invited">
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Not Invited
                    </span>
                  </SelectItem>
                  <SelectItem value="invited">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Invited
                    </span>
                  </SelectItem>
                  <SelectItem value="registered">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Registered
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedFamilyIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedFamilyIds.length === paginatedFamilies.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedFamilyIds.length} family(ies) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkInvitation}
                  disabled={!userCanEdit}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Invitations ({selectedFamilyIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFamilyIds([])}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Family List */}
      <div className="space-y-4">
        {paginatedFamilies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t("familyGroups.noFamiliesFound")}
            </CardContent>
          </Card>
        ) : (
          paginatedFamilies.map((family: Family) => {
            const familyStudents = getStudentsByFamily(family.id)
            const isExpanded = expandedFamilies.includes(family.id)
            const totalDiscount = getTotalDiscount(family.id)

            return (
              <Collapsible
                key={family.id}
                open={isExpanded}
                onOpenChange={() => toggleFamilyExpanded(family.id)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedFamilyIds.includes(family.id)}
                            onCheckedChange={(checked) => handleSelectFamily(family.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                            <Home className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {family.familyName} {t("familyGroups.family")}
                              <Badge variant="outline">{familyStudents.length} {t("familyGroups.children")}</Badge>
                              {family.familyCode && (
                                <Badge variant="secondary" className="font-mono">{family.familyCode}</Badge>
                              )}
                              {getPortalStatusBadge(family)}
                            </CardTitle>
                            <CardDescription className="mt-1 space-y-0.5">
                              <div>{family.address || t("familyGroups.noAddressProvided")}</div>
                              {family.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3" /> {family.email}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {totalDiscount > 0 && (
                            <Badge className="bg-green-100 text-green-800">
                              <Percent className="w-3 h-3 mr-1" />
                              {t("familyGroups.totalDiscount").replace("{percent}", String(totalDiscount))}
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            {family.portalStatus !== "registered" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSendInvitation(family)
                                }}
                                disabled={!userCanEdit || !family.email}
                                className="gap-2"
                              >
                                <Send className="w-3 h-3" />
                                {family.portalStatus === "invited" ? "Resend" : "Invite"}
                              </Button>
                            )}
                            {family.portalStatus === "invited" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRegistered(family)
                                }}
                                disabled={!userCanEdit}
                                className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Mark as Registered
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddStudentToFamily(family)
                              }}
                              disabled={!userCanEdit}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditFamily(family)
                              }}
                              disabled={!userCanEdit}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteFamily(family)
                              }}
                              disabled={!userCanEdit}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {familyStudents.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          {t("familyGroups.noStudentsInFamily")}
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {/* Order - CENTER (badge) */}
                              <TableHead align="center" className="w-[60px]">{t("familyGroups.order")}</TableHead>
                              {/* Student Name - LEFT (text) */}
                              <TableHead align="left">{t("familyGroups.student")}</TableHead>
                              {/* Student ID - LEFT (text) */}
                              <TableHead align="left">{t("familyGroups.studentId")}</TableHead>
                              {/* Year Group - LEFT (text) */}
                              <TableHead align="left">{t("familyGroups.yearGroup")}</TableHead>
                              {/* Discounts - CENTER (badge list) */}
                              <TableHead align="center">{t("discountReports.discountsDetail")}</TableHead>
                              {/* Fee Waiver - CENTER (badge) */}
                              <TableHead align="center">{t("familyGroups.feeWaiver")}</TableHead>
                              {/* Actions - CENTER */}
                              <TableHead align="center">{t("familyGroups.actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {familyStudents.map((student, index) => (
                              <TableRow key={student.id}>
                                {/* Order - CENTER (badge) */}
                                <TableCell align="center">
                                  <Badge variant="outline" className="font-bold">
                                    #{student.childOrder}
                                  </Badge>
                                </TableCell>
                                {/* Student Name - LEFT (text) */}
                                <TableCell align="left">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                      <GraduationCap className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        {student.firstName} {student.lastName}
                                      </p>
                                      {student.nickname && (
                                        <p className="text-xs text-muted-foreground">
                                          ({student.nickname})
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                {/* Student ID - LEFT (text) */}
                                <TableCell align="left">{student.studentId}</TableCell>
                                {/* Year Group - LEFT (text) */}
                                <TableCell align="left">{gradeLevels[student.gradeLevel] || student.gradeLevel}</TableCell>
                                {/* Discounts - CENTER (badge list) */}
                                <TableCell align="center">
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {(() => {
                                      const groupDiscounts = getStudentGroupDiscounts(student.studentId)
                                      if (groupDiscounts.length > 0) {
                                        return groupDiscounts.map((d, i) => (
                                          <Badge key={i} className="bg-green-100 text-green-800 text-[10px] py-0 h-5">
                                            {d.name} {d.discountType === 'percentage' ? `${d.discountPercentage}%` : `฿${d.fixedAmount.toLocaleString()}`}
                                          </Badge>
                                        ))
                                      }
                                      return <span className="text-muted-foreground text-sm">{t("familyGroups.noDiscount")}</span>
                                    })()}
                                  </div>
                                </TableCell>
                                {/* Fee Waiver - CENTER (badge) */}
                                <TableCell align="center">
                                  {(() => {
                                    const eligibility = checkFeePrivilegeEligibility(
                                      student,
                                      student.academicYear,
                                      student.enrollmentTerm
                                    )
                                    if (eligibility.eligible) {
                                      return (
                                        <div>
                                          <Badge className="bg-indigo-100 text-indigo-800">
                                            ฿{eligibility.creditPerTerm?.toLocaleString()}{t("familyGroups.perTerm")}
                                          </Badge>
                                          <p className="text-xs text-indigo-600 mt-1">{eligibility.reason}</p>
                                        </div>
                                      )
                                    }
                                    return <span className="text-muted-foreground text-sm">-</span>
                                  })()}
                                </TableCell>
                                {/* Actions - CENTER */}
                                <TableCell align="center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => handleRemoveStudentFromFamily(student)}
                                    disabled={!userCanEdit}
                                  >
                                    {t("familyGroups.remove")}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {/* Discount & Fee Waiver Summary */}
                      {familyStudents.length >= 1 && (
                        <div className="mt-4 space-y-3">
                          {/* Student Discount Summary */}
                          {(() => {
                            const studentsWithDiscounts = familyStudents.filter(s => getStudentGroupDiscounts(s.studentId).length > 0);
                            if (studentsWithDiscounts.length > 0) {
                              return (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                  <h4 className="font-medium text-green-800 mb-2">{t("discountReports.studentDiscountDetails")}</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {studentsWithDiscounts.map(student => {
                                      const groupDiscounts = getStudentGroupDiscounts(student.studentId)
                                      return (
                                        <div key={student.id}>
                                          <p className="font-medium text-green-800">{student.firstName}</p>
                                          {groupDiscounts.map((d, i) => (
                                            <p key={i} className="text-xs text-green-700">
                                              • {d.name}: {d.discountType === 'percentage' ? `${d.discountPercentage}%` : `฿${d.fixedAmount.toLocaleString()}`}
                                            </p>
                                          ))}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Fee Waiver Summary (only show if any student is eligible) */}
                          {(() => {
                            const eligibleStudents = familyStudents.filter(student => {
                              const eligibility = checkFeePrivilegeEligibility(
                                student,
                                student.academicYear,
                                student.enrollmentTerm
                              )
                              return eligibility.eligible
                            })

                            if (eligibleStudents.length > 0) {
                              return (
                                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                  <h4 className="font-medium text-indigo-800 mb-2">{t("familyGroups.registrationFeeWaiverProgram")}</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    {eligibleStudents.map(student => {
                                      const eligibility = checkFeePrivilegeEligibility(
                                        student,
                                        student.academicYear,
                                        student.enrollmentTerm
                                      )
                                      return (
                                        <div key={student.id}>
                                          <p className="text-indigo-700 font-medium">
                                            {student.firstName} ({t("student.child")} #{student.childOrder})
                                          </p>
                                          <p className="font-bold text-indigo-800">
                                            ฿{eligibility.creditPerTerm?.toLocaleString()}{t("familyGroups.perTerm")}
                                          </p>
                                          <p className="text-xs text-indigo-600">{eligibility.reason}</p>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      {
        sortedFamilies.length > 0 && (
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("familyGroups.show")}</span>
              <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))} disabled={!userCanEdit}>
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>{t("familyGroups.entries")}</span>
            </div>

            <div className="text-sm text-muted-foreground">
              {t("familyGroups.showingOf")
                .replace("{from}", String(((currentPage - 1) * pageSize) + 1))
                .replace("{to}", String(Math.min(currentPage * pageSize, sortedFamilies.length)))
                .replace("{total}", String(sortedFamilies.length))}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                {t("familyGroups.previous")}
              </Button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                {t("familyGroups.next")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      }

      {/* Students without family */}
      {
        studentsWithoutFamily.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t("familyGroups.studentsNotAssigned")} ({studentsWithoutFamily.length})
              </CardTitle>
              <CardDescription>
                {t("familyGroups.notAssignedDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {studentsWithoutFamily.slice(0, 10).map(student => (
                  <Badge key={student.id} variant="outline" className="py-1.5">
                    {student.firstName} {student.lastName} ({student.studentId})
                  </Badge>
                ))}
                {studentsWithoutFamily.length > 10 && (
                  <Badge variant="secondary">{t("familyGroups.more").replace("{count}", String(studentsWithoutFamily.length - 10))}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* Add Family Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t("familyGroups.createNewFamily")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("familyGroups.familyCode")} *</Label>
                <Input
                  value={formData.familyCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SM2025001"
                  className="font-mono"
                  disabled={!userCanEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("familyGroups.familyName")} *</Label>
                <Input
                  value={formData.familyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyName: e.target.value }))}
                  placeholder="e.g., Smith"
                  disabled={!userCanEdit}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("familyGroups.address")}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter family address"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("familyGroups.emailForInvoices")} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    invoiceEmails: [...(prev.invoiceEmails || []), ""]
                  }))}
                  disabled={!userCanEdit}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Email
                </Button>
              </div>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="family@email.com"
                disabled={!userCanEdit}
              />
              <p className="text-xs text-muted-foreground">
                Primary email for sending invoices - required
              </p>
              {(formData.invoiceEmails || []).map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...(formData.invoiceEmails || [])]
                      newEmails[index] = e.target.value
                      setFormData(prev => ({ ...prev, invoiceEmails: newEmails }))
                    }}
                    placeholder="additional@email.com"
                    disabled={!userCanEdit}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newEmails = (formData.invoiceEmails || []).filter((_, i) => i !== index)
                      setFormData(prev => ({ ...prev, invoiceEmails: newEmails }))
                    }}
                    disabled={!userCanEdit}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("familyGroups.cancel")}
            </Button>
            <Button onClick={handleSaveNewFamily} disabled={!userCanEdit || !formData.familyCode || !formData.familyName || !formData.email}>
              {t("familyGroups.createFamily")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Family Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{t("familyGroups.editFamily")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("familyGroups.familyCode")} *</Label>
                <Input
                  value={formData.familyCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SM2025001"
                  className="font-mono"
                  disabled={!userCanEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("familyGroups.familyName")} *</Label>
                <Input
                  value={formData.familyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyName: e.target.value }))}
                  placeholder="e.g., Smith"
                  disabled={!userCanEdit}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("familyGroups.address")}</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter family address"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("familyGroups.emailForInvoices")} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    invoiceEmails: [...(prev.invoiceEmails || []), ""]
                  }))}
                  disabled={!userCanEdit}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Email
                </Button>
              </div>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="family@email.com"
                disabled={!userCanEdit}
              />
              <p className="text-xs text-muted-foreground">
                Primary email for sending invoices - required
              </p>
              {(formData.invoiceEmails || []).map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const newEmails = [...(formData.invoiceEmails || [])]
                      newEmails[index] = e.target.value
                      setFormData(prev => ({ ...prev, invoiceEmails: newEmails }))
                    }}
                    placeholder="additional@email.com"
                    disabled={!userCanEdit}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newEmails = (formData.invoiceEmails || []).filter((_, i) => i !== index)
                      setFormData(prev => ({ ...prev, invoiceEmails: newEmails }))
                    }}
                    disabled={!userCanEdit}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t("familyGroups.cancel")}
            </Button>
            <Button onClick={handleSaveEditFamily} disabled={!userCanEdit || !formData.familyCode || !formData.familyName || !formData.email}>
              {t("familyGroups.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Parent Portal Invitation Dialog */}
      <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Parent Portal Invitation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {invitationTarget === "single" && selectedFamily ? (
              <div className="space-y-3">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Family</span>
                    <Badge variant="secondary" className="font-mono">
                      {selectedFamily.familyCode}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedFamily.familyName}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">{selectedFamily.email}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  An invitation email will be sent to the family's primary email address with
                  instructions to access the Parent Portal.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {selectedFamilyIds.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      familie(s) will receive invitations
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Invitation emails will be sent to all selected families with valid email addresses.
                </div>
              </div>
            )}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="flex gap-2">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-900">
                  Parents will receive a secure link to set up their account and access student
                  information, invoices, and payment history.
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsInvitationDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={performSendInvitation}
              disabled={!userCanEdit}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Send Invitation{invitationTarget === "bulk" && `s (${selectedFamilyIds.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Issue Details Dialog */}
      <Dialog open={emailIssueDialogOpen} onOpenChange={setEmailIssueDialogOpen}>
        <DialogContent className="max-w-3xl p-6 max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {emailIssueType === "without" && "Families Without Email Address"}
              {emailIssueType === "invalid" && "Families With Invalid Email Format"}
              {emailIssueType === "duplicate" && "Families With Duplicate Emails"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {emailIssueType === "without" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  These families cannot receive Parent Portal invitations until an email address is added.
                </p>
                {emailValidation.withoutEmail.map((family: Family) => (
                  <div key={family.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {family.familyCode}
                        </Badge>
                        <span className="font-medium">{family.familyName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <XCircle className="w-3 h-3 text-red-500" />
                        <span>No email address</span>
                      </div>
                      {family.address && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {family.address}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmailIssueDialogOpen(false)
                        handleEditFamily(family)
                      }}
                      disabled={!userCanEdit}
                      className="gap-2"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {emailIssueType === "invalid" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  These families have email addresses with invalid format. Please correct them.
                </p>
                {emailValidation.invalidEmail.map((family: Family) => (
                  <div key={family.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {family.familyCode}
                        </Badge>
                        <span className="font-medium">{family.familyName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <XCircle className="w-3 h-3 text-red-500" />
                        <span className="font-mono text-red-600">{family.email}</span>
                        <Badge variant="destructive" className="text-xs">Invalid format</Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEmailIssueDialogOpen(false)
                        handleEditFamily(family)
                      }}
                      disabled={!userCanEdit}
                      className="gap-2"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {emailIssueType === "duplicate" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Multiple families are using the same email address. Each family should have a unique email for Parent Portal access.
                </p>
                {emailValidation.duplicateEmails.map((duplicate, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span className="font-mono font-medium">{duplicate.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {duplicate.families.length} families
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {duplicate.families.map((family: Family) => (
                        <div key={family.id} className="flex items-center justify-between p-3 bg-background rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {family.familyCode}
                            </Badge>
                            <span className="text-sm font-medium">{family.familyName}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEmailIssueDialogOpen(false)
                              handleEditFamily(family)
                            }}
                            disabled={!userCanEdit}
                            className="gap-2"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setEmailIssueDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Family Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("familyGroups.deleteFamily")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              {t("familyGroups.confirmDeleteFamily").replace("{name}", selectedFamily?.familyName || "")}
            </p>
            <p className="text-sm text-amber-600 mt-2">
              {t("familyGroups.deleteWarning")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("familyGroups.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={!userCanEdit}>
              {t("familyGroups.deleteFamily")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student to Family Dialog */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("familyGroups.addStudentTo").replace("{name}", selectedFamily?.familyName || "")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {studentsWithoutFamily.length === 0 ? (
              <p className="text-muted-foreground text-center">
                {t("familyGroups.allStudentsAssigned")}
              </p>
            ) : (
              <div className="space-y-2">
                <Label>{t("familyGroups.selectStudent")}</Label>
                <Select value={selectedStudentToAdd} onValueChange={setSelectedStudentToAdd} disabled={!userCanEdit}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("familyGroups.selectAStudent")} />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsWithoutFamily.map((student: Student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} ({student.studentId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("familyGroups.willBeAddedAsChild").replace("{num}", String((getStudentsByFamily(selectedFamily?.id || "").length || 0) + 1))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)}>
              {t("familyGroups.cancel")}
            </Button>
            <Button
              onClick={handleConfirmAddStudent}
              disabled={!userCanEdit || !selectedStudentToAdd || studentsWithoutFamily.length === 0}
            >
              {t("familyGroups.addToFamily")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Family Confirmation Dialog */}
      <ConfirmDialog
        open={saveConfirmDialog.isOpen}
        onOpenChange={saveConfirmDialog.setIsOpen}
        onConfirm={saveConfirmDialog.handleConfirm}
        titleKey="confirmDialog.editTitle"
        descriptionKey="confirmDialog.editDescription"
        confirmTextKey="common.save"
      />

      {/* Add Family Confirmation Dialog */}
      <ConfirmDialog
        open={addConfirmDialog.isOpen}
        onOpenChange={addConfirmDialog.setIsOpen}
        onConfirm={addConfirmDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />

      {/* Mark as Registered Dialog */}
      <Dialog open={isMarkRegisteredDialogOpen} onOpenChange={setIsMarkRegisteredDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Mark as Registered
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFamily && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">{selectedFamily.familyCode}</Badge>
                  <span className="font-semibold">{selectedFamily.familyName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {selectedFamily.email}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Confirm that this family's parent has successfully registered on the Parent Portal. The status will be updated to <span className="font-medium text-green-700">Registered</span>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarkRegisteredDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={performMarkAsRegistered}
              disabled={!userCanEdit}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Registered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div >
  )
}
