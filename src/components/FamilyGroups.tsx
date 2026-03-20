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
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { ColumnPresets } from "@/utils/tableAlignment"
import { PaginationBar } from "./ui/pagination-bar"
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
  Download,
  Calendar,
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { useStudents, Family, Student } from "@/contexts/StudentContext"
import { cn } from "./ui/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { gradeLevels } from "@/utils/grades"

// gradeLevels is now imported from @/utils/grades as an array of objects
// We'll create a mapping object for easy lookup in this component
const gradeLevelLabels: Record<string, string> = {}
gradeLevels.forEach(g => {
  gradeLevelLabels[g.id] = g.label
})

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
    updateStudent
  } = useStudents()

  const [searchTerm, setSearchTerm] = useState("")
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([])
  const [yearGroupFilter, setYearGroupFilter] = useState("all")

  // Sorting states
  const [sortColumn, setSortColumn] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
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

  // Get students without family
  const studentsWithoutFamily = useMemo(() => {
    return students.filter((s: Student) => !s.familyId || s.familyId === "")
  }, [students])

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = families.length
    return { total }
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

      // Year Group filter - show family if any student matches
      const matchesYearGroup = yearGroupFilter === "all" || familyStudents.some((s: Student) =>
        (s.gradeLevel || "").toLowerCase() === yearGroupFilter.toLowerCase()
      )

      return matchesSearch && matchesYearGroup
    })
  }, [families, searchTerm, yearGroupFilter, students])

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

  // Most recently added family
  const lastAddedFamily = useMemo(() => {
    if (families.length === 0) return null
    return families.reduce((latest: Family, f: Family) => {
      return new Date(f.createdAt) > new Date(latest.createdAt) ? f : latest
    })
  }, [families])

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
    if (!formData.familyCode || !formData.familyName || !formData.email) {
      toast.error("Please fill in all required fields")
      return
    }
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
    if (!formData.familyCode || !formData.familyName || !formData.email) {
      toast.error("Please fill in all required fields")
      return
    }
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
      "Total Discount"
    ]

    const rows = filteredFamilies.map((family: Family) => {
      const familyStudents = getStudentsByFamily(family.id)
      const totalDiscount = getTotalDiscount(family.id)

      return [
        family.familyCode || "",
        family.familyName,
        family.email || "",
        family.address || "",
        familyStudents.length,
        totalDiscount > 0 ? `${totalDiscount}%` : "0%"
      ]
    })

    downloadAsXlsx(headers, rows, `family_groups_${new Date().toISOString().split('T')[0]}`)

    toast.success(`Exported ${filteredFamilies.length} families to Excel`)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("familyGroups.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("familyGroups.subtitle")}
          </p>
        </div>
        <Button onClick={handleAddFamily} disabled={!userCanEdit} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t("familyGroups.addFamily")}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Families</p>
            <p className="text-2xl font-bold">{stats.totalFamilies}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Students Assigned</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalStudentsInFamilies}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">With Discount</p>
            <p className="text-2xl font-bold text-green-600">{stats.studentsWithDiscount}</p>
          </CardContent>
        </Card>
        <Card className={`rounded-xl ${studentsWithoutFamily.length > 0 ? "border-amber-300 bg-amber-50" : ""}`}>
          <CardContent className="p-4">
            <p className={`text-sm ${studentsWithoutFamily.length > 0 ? "text-amber-700" : "text-muted-foreground"}`}>Unassigned</p>
            <p className={`text-2xl font-bold ${studentsWithoutFamily.length > 0 ? "text-amber-600" : ""}`}>{studentsWithoutFamily.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Last Added</p>
            {lastAddedFamily ? (
              <p className="text-2xl font-bold leading-tight">
                {new Date(lastAddedFamily.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

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
            <div className="flex gap-2 flex-wrap">
              <Select value={yearGroupFilter} onValueChange={(val) => { setYearGroupFilter(val); setCurrentPage(1) }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Year Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Year Groups</SelectItem>
                  {Object.values(gradeLevelLabels).map(label => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
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
                                <TableCell align="left">{gradeLevelLabels[student.gradeLevel] || student.gradeLevel}</TableCell>
                                {/* Discounts - CENTER (badge list) */}
                                <TableCell align="center">
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {(() => {
                                      const badges = []
                                      // Group Discounts Badges
                                      const groupDiscounts = getStudentGroupDiscounts(student.studentId)
                                      groupDiscounts.forEach((d, i) => {
                                        badges.push(
                                          <Badge key={`group-${i}`} className="bg-green-100 text-green-800 text-[10px] py-0 h-5">
                                            {d.name} {d.discountType === 'percentage' ? `${d.discountPercentage}%` : `฿${d.fixedAmount.toLocaleString()}`}
                                          </Badge>
                                        )
                                      })

                                      if (badges.length > 0) return badges
                                      return <span className="text-muted-foreground text-sm">{t("familyGroups.noDiscount")}</span>
                                    })()}
                                  </div>
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

      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={sortedFamilies.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
      />

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
                <Label>{t("familyGroups.familyCode")} <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.familyCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SM2025001"
                  className="font-mono"
                  disabled={!userCanEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("familyGroups.familyName")} <span className="text-destructive">*</span></Label>
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
                <Label>{t("familyGroups.emailForInvoices")} <span className="text-destructive">*</span></Label>
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
                <Label>{t("familyGroups.familyCode")} <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.familyCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SM2025001"
                  className="font-mono"
                  disabled={!userCanEdit}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("familyGroups.familyName")} <span className="text-destructive">*</span></Label>
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
                <Label>{t("familyGroups.emailForInvoices")} <span className="text-destructive">*</span></Label>
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

    </div >
  )
}
