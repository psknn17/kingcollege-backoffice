import { useState, useMemo } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { useLanguage } from "@/contexts/LanguageContext"
import { useStudents } from "@/contexts/StudentContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { ColumnPresets } from "@/utils/tableAlignment"
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Eye,
  Search,
  X
} from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { logActivity } from "@/lib/activityLog"
import { getSortedYearGroups } from "@/utils/gradeLevels"
import { syncInvoiceDiscounts } from "@/utils/discountSync"

interface Student {
  id: string
  name: string
  yearGroup: string
  parentName: string
  isActive?: boolean
}

interface DiscountGroup {
  id: string
  name: string
  financeCode: string
  nominalCode: string
  students: Student[]
  discountType: "percentage" | "fixed"
  discountPercentage: number
  fixedAmount: number
  departments: string[]
  isActive: boolean
}

// LocalStorage key for Tuition Discount Groups
const STORAGE_KEY = "studentGroups"

// Helper function to convert students from context to local format
const convertStudentsToDiscountFormat = (contextStudents: any[]): Student[] => {
  return contextStudents.map(student => {
    const primaryParent = student.parents?.find((p: any) => p.isPrimary) || student.parents?.[0]
    return {
      id: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      yearGroup: student.gradeLevel,
      parentName: primaryParent?.name || "N/A",
      isActive: student.status === "active"
    }
  })
}

// Load groups from localStorage
const loadGroupsFromStorage = (): DiscountGroup[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load tuition discount groups from localStorage:", error)
  }
  return []
}

// Save groups to localStorage
const saveGroupsToStorage = (groups: DiscountGroup[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch (error) {
    console.error("Failed to save tuition discount groups to localStorage:", error)
  }
}

export function TuitionDiscountGroups() {
  const { t } = useLanguage()
  const { students: contextStudents } = useStudents()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Convert students from context to local format
  const availableStudents = useMemo(() =>
    convertStudentsToDiscountFormat(contextStudents),
    [contextStudents]
  )

  const [groups, setGroups] = useState<DiscountGroup[]>(loadGroupsFromStorage())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DiscountGroup | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<DiscountGroup | null>(null)
  const [studentInput, setStudentInput] = useState("")

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    financeCode: "",
    nominalCode: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountPercentage: 0,
    fixedAmount: 0,
    selectedStudents: [] as Student[],
    isActive: true
  })

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      financeCode: "",
      nominalCode: "",
      discountType: "percentage",
      discountPercentage: 0,
      fixedAmount: 0,
      selectedStudents: [],
      isActive: true
    })
    setEditingGroup(null)
    setStudentInput("")
  }

  // Handle create/edit group
  const handleSaveGroup = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter group name")
      return
    }

    if (formData.selectedStudents.length === 0) {
      toast.error("Please select at least one student")
      return
    }

    const hasValidDiscount = formData.discountType === "percentage"
      ? formData.discountPercentage > 0
      : formData.fixedAmount > 0

    if (!hasValidDiscount) {
      toast.error("Please enter a valid discount amount")
      return
    }

    if (editingGroup) {
      // Update existing group
      const updatedGroups = groups.map(g =>
        g.id === editingGroup.id
          ? {
            ...g,
            name: formData.name,
            financeCode: formData.financeCode,
            nominalCode: formData.nominalCode,
            discountType: formData.discountType,
            discountPercentage: formData.discountPercentage,
            fixedAmount: formData.fixedAmount,
            students: formData.selectedStudents,
            departments: ["Tuition"],
            isActive: formData.isActive
          }
          : g
      )
      setGroups(updatedGroups)
      saveGroupsToStorage(updatedGroups)
      syncInvoiceDiscounts(STORAGE_KEY, "tuition")
      toast.success("Student group updated successfully")
      logActivity({
        action: "Update Group",
        module: "Student Groups",
        detail: `Updated group "${formData.name}" with ${formData.selectedStudents.length} students: ${formData.selectedStudents.map(s => s.name).slice(0, 10).join(", ")}${formData.selectedStudents.length > 10 ? ` and ${formData.selectedStudents.length - 10} more` : ""}`
      })
    } else {
      // Create new group
      const newGroup: DiscountGroup = {
        id: `GRP${Date.now()}`,
        name: formData.name,
        financeCode: formData.financeCode,
        nominalCode: formData.nominalCode,
        discountType: formData.discountType,
        discountPercentage: formData.discountPercentage,
        fixedAmount: formData.fixedAmount,
        students: formData.selectedStudents,
        departments: ["Tuition"],
        isActive: formData.isActive
      }
      const updatedGroups = [...groups, newGroup]
      setGroups(updatedGroups)
      saveGroupsToStorage(updatedGroups)
      syncInvoiceDiscounts(STORAGE_KEY, "tuition")
      toast.success("Student group created successfully")
      logActivity({
        action: "Create Group",
        module: "Student Groups",
        detail: `Created group "${formData.name}" with ${formData.selectedStudents.length} students: ${formData.selectedStudents.map(s => s.name).slice(0, 10).join(", ")}${formData.selectedStudents.length > 10 ? ` and ${formData.selectedStudents.length - 10} more` : ""}`
      })
    }

    setIsDialogOpen(false)
    resetForm()
  }

  // Handle edit
  const handleEdit = (group: DiscountGroup) => {
    if (!userCanEdit) return // Prevent editing for viewers
    setEditingGroup(group)
    setFormData({
      name: group.name,
      financeCode: group.financeCode || "",
      nominalCode: group.nominalCode || "",
      discountType: group.discountType,
      discountPercentage: group.discountPercentage,
      fixedAmount: group.fixedAmount,
      selectedStudents: group.students,
      isActive: group.isActive
    })
    setIsDialogOpen(true)
  }

  // Handle delete
  const handleDelete = (groupId: string) => {
    if (!userCanEdit) return // Prevent deleting for viewers
    setGroupToDelete(groupId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!userCanEdit) return // Prevent deleting for viewers
    if (groupToDelete) {
      const updatedGroups = groups.filter(g => g.id !== groupToDelete)
      setGroups(updatedGroups)
      saveGroupsToStorage(updatedGroups)
      syncInvoiceDiscounts(STORAGE_KEY, "tuition")
      const deletedGroup = groups.find(g => g.id === groupToDelete)
      toast.success("Student group deleted successfully")
      logActivity({ action: "Delete Group", module: "Student Groups", detail: `Deleted group "${deletedGroup?.name || groupToDelete}"` })
    }
    setDeleteDialogOpen(false)
    setGroupToDelete(null)
  }

  // Handle view
  const handleView = (group: DiscountGroup) => {
    setViewingGroup(group)
    setViewDialogOpen(true)
  }

  // Add student to selection
  const handleAddStudent = (student: Student) => {
    if (!formData.selectedStudents.find(s => s.id === student.id)) {
      setFormData({
        ...formData,
        selectedStudents: [...formData.selectedStudents, student]
      })
      setStudentInput("")
    }
  }

  // Remove student from selection
  const handleRemoveStudent = (studentId: string) => {
    setFormData({
      ...formData,
      selectedStudents: formData.selectedStudents.filter(s => s.id !== studentId)
    })
  }

  const [selectedYearGroup, setSelectedYearGroup] = useState<string>("All")
  const [isInputFocused, setIsInputFocused] = useState(false)

  // Get unique year groups
  const uniqueYearGroups = useMemo(() => {
    const groups = new Set(availableStudents.map(s => s.yearGroup))
    return getSortedYearGroups(["All", ...Array.from(groups)])
  }, [availableStudents])

  // Filtered students for search
  const filteredStudents = availableStudents.filter(student =>
    (selectedYearGroup === "All" || student.yearGroup === selectedYearGroup) &&
    (student.name.toLowerCase().includes(studentInput.toLowerCase()) ||
      student.id.toLowerCase().includes(studentInput.toLowerCase())) &&
    !formData.selectedStudents.find(s => s.id === student.id)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("menu.studentGroups")}</h2>
          <p className="text-sm text-muted-foreground">Manage student discount groups</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!userCanEdit && open) return // Prevent opening dialog for viewers
          setIsDialogOpen(open)
          if (!open) {
            resetForm()
            setSelectedYearGroup("All")
          }
        }}>
          <DialogTrigger asChild>
            <Button disabled={!userCanEdit}>
              <Plus className="w-4 h-4 mr-2" />
              Create Student Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Edit Student Group" : "Create Student Group"}
              </DialogTitle>
              <DialogDescription>
                Create a group of students with specific discount for selected departments
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Group Name */}
              <div className="space-y-2">
                <Label>Group Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Year 7 Excellence Group"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!userCanEdit}
                />
              </div>

              {/* Finance Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Finance Code</Label>
                  <Input
                    placeholder="e.g. SCH-001"
                    value={formData.financeCode}
                    onChange={(e) => setFormData({ ...formData, financeCode: e.target.value })}
                    disabled={!userCanEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nominal Code</Label>
                  <Input
                    placeholder="e.g. 4110001"
                    value={formData.nominalCode}
                    onChange={(e) => setFormData({ ...formData, nominalCode: e.target.value })}
                    disabled={!userCanEdit}
                  />
                </div>
              </div>

              {/* Discount Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setFormData({ ...formData, discountType: value })
                    }
                    disabled={!userCanEdit}
                  >
                    <SelectTrigger disabled={!userCanEdit}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (฿)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.discountType === "percentage" ? (
                  <div className="space-y-2">
                    <Label>Discount Percentage %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discountPercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, discountPercentage: parseInt(e.target.value) || 0 })
                      }
                      placeholder="15"
                      disabled={!userCanEdit}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Fixed Amount ฿</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.fixedAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, fixedAmount: parseInt(e.target.value) || 0 })
                      }
                      placeholder="1000"
                      disabled={!userCanEdit}
                    />
                  </div>
                )}
              </div>

              {/* Student Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Add Students to Whitelist</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.selectedStudents.length} students added
                  </span>
                </div>

                <Tabs defaultValue="individual" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individual">Individual Input</TabsTrigger>
                    <TabsTrigger value="csv-upload">Excel Upload</TabsTrigger>
                  </TabsList>

                  <TabsContent value="individual" className="space-y-3">
                    <div className="space-y-2">
                      <Label>Filter by Year Group</Label>
                      <Select
                        value={selectedYearGroup}
                        onValueChange={setSelectedYearGroup}
                        disabled={!userCanEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Year Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueYearGroups.map(group => (
                            <SelectItem key={group} value={group}>
                              {group === "All" ? "All Year Groups" : group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Search & Add Student</Label>
                      <div className="relative">
                        <Input
                          value={studentInput}
                          onChange={(e) => setStudentInput(e.target.value)}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
                          placeholder="Search by ID or Name (e.g., KC2024001)"
                          className="rounded-none"
                          disabled={!userCanEdit}
                        />
                        {/* Search Results Dropdown */}
                        {isInputFocused && (
                          <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredStudents.length === 0 ? (
                              <div className="px-3 py-4 text-sm text-center text-muted-foreground">No results found</div>
                            ) : (
                              filteredStudents.slice(0, 8).map(student => (
                                <div
                                  key={student.id}
                                  onMouseDown={(e: any) => {
                                    e.preventDefault()
                                    handleAddStudent(student)
                                    toast.success(`Added ${student.name} (${student.id})`)
                                    logActivity({ action: "Add Student", module: "Student Groups", detail: `Added student "${student.name}" (${student.id}) to group` })
                                  }}
                                  className="px-3 py-2 hover:bg-muted cursor-pointer"
                                >
                                  <div className="font-medium text-sm truncate">{student.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {student.id} • Year {student.yearGroup}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select a year group or type to search, then click to add student
                      </p>
                    </div>

                    {/* Selected Students */}
                    {formData.selectedStudents.length > 0 && (
                      <div className="border rounded-lg p-3 max-h-60 overflow-y-auto">
                        <div className="space-y-2">
                          {formData.selectedStudents.map(student => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-2 bg-muted rounded"
                            >
                              <div>
                                <div className="font-medium text-sm">{student.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {student.id} - {student.yearGroup}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStudent(student.id)}
                                disabled={!userCanEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="csv-upload">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <p className="text-muted-foreground">Excel Upload feature coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsDialogOpen(false)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveGroup} disabled={!userCanEdit}>
                {editingGroup ? "Update Group" : "Create Group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No discount groups found. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          groups.map(group => (
            <Card key={group.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-3">{group.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">
                        {group.discountType === "percentage"
                          ? `${group.discountPercentage}% Discount`
                          : `฿${group.fixedAmount.toLocaleString()} Discount`}
                      </Badge>
                      {group.departments.map(dept => (
                        <Badge key={dept} variant="outline">{dept}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {group.students.length} students in whitelist
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(group)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(group)}
                      disabled={!userCanEdit}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group.id)}
                      disabled={!userCanEdit}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingGroup?.name}</DialogTitle>
            <DialogDescription>
              Students in this discount group
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Student ID - left aligned (text/ID) */}
                  <TableHead align="left">Student ID</TableHead>
                  {/* Name - left aligned (text) */}
                  <TableHead align="left">Name</TableHead>
                  {/* Year Group - left aligned (text) */}
                  <TableHead align="left">Year Group</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingGroup?.students.map(student => (
                  <TableRow key={student.id}>
                    {/* Student ID - left aligned (text/ID) */}
                    <TableCell align="left" className="font-mono text-sm">{student.id}</TableCell>
                    {/* Name - left aligned (text) */}
                    <TableCell align="left">{student.name}</TableCell>
                    {/* Year Group - left aligned (text) */}
                    <TableCell align="left" className="capitalize">{student.yearGroup}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the discount group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={!userCanEdit}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
