import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Badge } from "./ui/badge"
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
  Phone,
  Mail,
  GraduationCap,
  Percent,
  UserPlus,
  ArrowUpDown
} from "lucide-react"
import { toast } from "sonner"
import { useStudents, Family, Student } from "@/contexts/StudentContext"
import { cn } from "./ui/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"

const gradeLevels: Record<string, string> = {
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
  phone: ""
}

export function FamilyGroups() {
  const {
    students,
    families,
    addFamily,
    updateFamily,
    deleteFamily,
    getStudentsByFamily,
    getSiblingDiscount,
    updateStudent
  } = useStudents()

  const [searchTerm, setSearchTerm] = useState("")
  const [expandedFamilies, setExpandedFamilies] = useState<string[]>([])

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false)

  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null)
  const [formData, setFormData] = useState<Omit<Family, "id" | "createdAt">>(emptyFamily)
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>("")

  // Get students without family
  const studentsWithoutFamily = useMemo(() => {
    return students.filter(s => !s.familyId || s.familyId === "")
  }, [students])

  // Filter families
  const filteredFamilies = useMemo(() => {
    return families.filter(family => {
      const matchesSearch = family.familyName.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [families, searchTerm])

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
          aValue = aStudents.reduce((total, student) => total + getSiblingDiscount(student), 0)
          bValue = bStudents.reduce((total, student) => total + getSiblingDiscount(student), 0)
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
  }, [filteredFamilies, sortColumn, sortDirection, getStudentsByFamily, getSiblingDiscount])

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
    const totalStudentsInFamilies = students.filter(s => s.familyId).length
    const studentsWithDiscount = students.filter(s => getSiblingDiscount(s) > 0).length
    const multiChildFamilies = families.filter(f => getStudentsByFamily(f.id).length > 1).length
    return { totalFamilies, totalStudentsInFamilies, studentsWithDiscount, multiChildFamilies }
  }, [families, students, getStudentsByFamily, getSiblingDiscount])

  const toggleFamilyExpanded = (familyId: string) => {
    setExpandedFamilies(prev =>
      prev.includes(familyId)
        ? prev.filter(id => id !== familyId)
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
      phone: family.phone || ""
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

  const handleSaveNewFamily = () => {
    const newFamily: Family = {
      id: `FAM${Date.now()}`,
      ...formData,
      createdAt: new Date()
    }
    addFamily(newFamily)
    toast.success("Family created successfully")
    setIsAddDialogOpen(false)
    setFormData(emptyFamily)
  }

  const handleSaveEditFamily = () => {
    if (selectedFamily) {
      updateFamily(selectedFamily.id, formData)
      toast.success("Family updated successfully")
      setIsEditDialogOpen(false)
      setSelectedFamily(null)
    }
  }

  const handleConfirmDelete = () => {
    if (selectedFamily) {
      // Remove family reference from all students in this family
      const familyStudents = getStudentsByFamily(selectedFamily.id)
      familyStudents.forEach(student => {
        updateStudent(student.id, { familyId: "", childOrder: 1 })
      })

      deleteFamily(selectedFamily.id)
      toast.success("Family deleted successfully")
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

      toast.success("Student added to family")
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

        toast.success("Student removed from family")
      }
    }
  }

  const getTotalDiscount = (familyId: string): number => {
    const familyStudents = getStudentsByFamily(familyId)
    return familyStudents.reduce((total, student) => total + getSiblingDiscount(student), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Family Groups</h2>
          <p className="text-sm text-muted-foreground">
            Manage family groups and sibling relationships for discount calculation
          </p>
        </div>
        <Button onClick={handleAddFamily}>
          <Plus className="w-4 h-4 mr-2" />
          Add Family
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFamilies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Students in Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudentsInFamilies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Multi-Child Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.multiChildFamilies}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Students with Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.studentsWithDiscount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Input
              placeholder="Search families..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=""
            />
          </div>
        </CardContent>
      </Card>

      {/* Family List */}
      <div className="space-y-4">
        {paginatedFamilies.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No families found. Create a family to group siblings together.
            </CardContent>
          </Card>
        ) : (
          paginatedFamilies.map(family => {
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
                              {family.familyName} Family
                              <Badge variant="outline">{familyStudents.length} children</Badge>
                              {family.familyCode && (
                                <Badge variant="secondary" className="font-mono">{family.familyCode}</Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1 space-y-0.5">
                              <div>{family.address || "No address provided"}</div>
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
                              Total: {totalDiscount}% discount
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
                          No students in this family yet. Add students to calculate sibling discounts.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60px]">Order</TableHead>
                              <TableHead>Student</TableHead>
                              <TableHead>Student ID</TableHead>
                              <TableHead>Year Group</TableHead>
                              <TableHead>Sibling Discount</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {familyStudents.map((student, index) => (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <Badge variant="outline" className="font-bold">
                                    #{student.childOrder}
                                  </Badge>
                                </TableCell>
                                <TableCell>
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
                                <TableCell>{student.studentId}</TableCell>
                                <TableCell>{gradeLevels[student.gradeLevel] || student.gradeLevel}</TableCell>
                                <TableCell>
                                  {getSiblingDiscount(student) > 0 ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      {getSiblingDiscount(student)}% off
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">No discount</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => handleRemoveStudentFromFamily(student)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {/* Discount Summary */}
                      {familyStudents.length > 1 && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h4 className="font-medium text-green-800 mb-2">Sibling Discount Summary</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {familyStudents.map(student => (
                              <div key={student.id}>
                                <p className="text-green-700">{student.firstName}</p>
                                <p className="font-bold text-green-800">
                                  {getSiblingDiscount(student)}% discount
                                </p>
                              </div>
                            ))}
                          </div>
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
      {sortedFamilies.length > 0 && (
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
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
            <span>entries</span>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedFamilies.length)} of {sortedFamilies.length} families
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
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
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Students without family */}
      {studentsWithoutFamily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Students Not Assigned to a Family ({studentsWithoutFamily.length})
            </CardTitle>
            <CardDescription>
              These students are not part of any family group and won't receive sibling discounts
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
                <Badge variant="secondary">+{studentsWithoutFamily.length - 10} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Family Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>Create New Family</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Family Code *</Label>
                <Input
                  value={formData.familyCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SM2025001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Family Name *</Label>
                <Input
                  value={formData.familyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyName: e.target.value }))}
                  placeholder="e.g., Smith"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter family address"
              />
            </div>
            <div className="space-y-2">
              <Label>Email * (for invoices)</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="family@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="081-234-5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewFamily} disabled={!formData.familyCode || !formData.familyName || !formData.email}>
              Create Family
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Family Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>Edit Family</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Family Code *</Label>
                <Input
                  value={formData.familyCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g., SM2025001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Family Name *</Label>
                <Input
                  value={formData.familyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, familyName: e.target.value }))}
                  placeholder="e.g., Smith"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter family address"
              />
            </div>
            <div className="space-y-2">
              <Label>Email * (for invoices)</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="family@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="081-234-5678"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditFamily} disabled={!formData.familyCode || !formData.familyName || !formData.email}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Family Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Family</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete the <strong>{selectedFamily?.familyName}</strong> family?
            </p>
            <p className="text-sm text-amber-600 mt-2">
              All students in this family will be removed from the family group and will lose their sibling discounts.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Family
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Student to Family Dialog */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Add Student to {selectedFamily?.familyName} Family</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {studentsWithoutFamily.length === 0 ? (
              <p className="text-muted-foreground text-center">
                All students are already assigned to a family.
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select value={selectedStudentToAdd} onValueChange={setSelectedStudentToAdd}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsWithoutFamily.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName} ({student.studentId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  The student will be added as child #{(getStudentsByFamily(selectedFamily?.id || "").length || 0) + 1}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddStudent}
              disabled={!selectedStudentToAdd || studentsWithoutFamily.length === 0}
            >
              Add to Family
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
