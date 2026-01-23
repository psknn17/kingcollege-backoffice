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
import { Switch } from "./ui/switch"
import { useLanguage } from "@/contexts/LanguageContext"
import { useStudents } from "@/contexts/StudentContext"
import {
  Plus,
  Edit,
  Trash2,
  Users,
  X,
  Eye,
  FileText
} from "lucide-react"
import { toast } from "@/components/ui/sonner"

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
  students: Student[]
  discountType: "percentage" | "fixed"
  discountPercentage: number
  fixedAmount: number
  isActive: boolean
  createdDate: Date
  description: string
}

// LocalStorage key for Summer Discount Groups
const STORAGE_KEY = "summerDiscountGroups"

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
      const parsed = JSON.parse(stored)
      return parsed.map((group: any) => ({
        ...group,
        createdDate: new Date(group.createdDate)
      }))
    }
  } catch (error) {
    console.error("Failed to load summer discount groups from localStorage:", error)
  }
  return []
}

// Save groups to localStorage
const saveGroupsToStorage = (groups: DiscountGroup[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
  } catch (error) {
    console.error("Failed to save summer discount groups to localStorage:", error)
  }
}

export function SummerDiscountGroups() {
  const { t } = useLanguage()
  const { students: contextStudents } = useStudents()

  // Convert students from context to local format
  const availableStudents = useMemo(() =>
    convertStudentsToDiscountFormat(contextStudents),
    [contextStudents]
  )

  const [groups, setGroups] = useState<DiscountGroup[]>(loadGroupsFromStorage())
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<DiscountGroup | null>(null)
  const [viewingGroup, setViewingGroup] = useState<DiscountGroup | null>(null)
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [studentInput, setStudentInput] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [fileParseErrors, setFileParseErrors] = useState<string[]>([])

  const [groupForm, setGroupForm] = useState({
    name: "",
    selectedStudents: [] as Student[],
    discountType: "percentage" as "percentage" | "fixed",
    discountPercentage: 0,
    fixedAmount: 0,
    isActive: true
  })

  const resetGroupForm = () => {
    setGroupForm({
      name: "",
      selectedStudents: [],
      discountType: "percentage",
      discountPercentage: 0,
      fixedAmount: 0,
      isActive: true
    })
    setEditingGroup(null)
    setStudentInput("")
    setUploadedFile(null)
    setFileParseErrors([])
  }

  const handleSaveGroup = () => {
    const hasValidDiscount = groupForm.discountType === "percentage"
      ? groupForm.discountPercentage > 0
      : groupForm.fixedAmount > 0

    if (!groupForm.name || !hasValidDiscount) {
      toast.error("Please fill in all required fields")
      return
    }

    if (editingGroup) {
      // Update existing group
      const updatedGroups = groups.map(g =>
        g.id === editingGroup.id
          ? {
              ...editingGroup,
              name: groupForm.name,
              students: groupForm.selectedStudents,
              discountType: groupForm.discountType,
              discountPercentage: groupForm.discountPercentage,
              fixedAmount: groupForm.fixedAmount,
              isActive: groupForm.isActive
            }
          : g
      )
      setGroups(updatedGroups)
      saveGroupsToStorage(updatedGroups)
      toast.success("Student group updated successfully")
    } else {
      // Create new group
      const newGroup: DiscountGroup = {
        id: `group-${Date.now()}`,
        name: groupForm.name,
        students: groupForm.selectedStudents,
        discountType: groupForm.discountType,
        discountPercentage: groupForm.discountPercentage,
        fixedAmount: groupForm.fixedAmount,
        isActive: groupForm.isActive,
        createdDate: new Date(),
        description: ""
      }
      const updatedGroups = [...groups, newGroup]
      setGroups(updatedGroups)
      saveGroupsToStorage(updatedGroups)
      toast.success("Student group created successfully")
    }

    setIsGroupDialogOpen(false)
    resetGroupForm()
  }

  const handleEditGroup = (group: DiscountGroup) => {
    setEditingGroup(group)
    setGroupForm({
      name: group.name,
      selectedStudents: group.students,
      discountType: group.discountType,
      discountPercentage: group.discountPercentage,
      fixedAmount: group.fixedAmount,
      isActive: group.isActive
    })
    setIsGroupDialogOpen(true)
  }

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter(g => g.id !== groupId)
    setGroups(updatedGroups)
    saveGroupsToStorage(updatedGroups)
    toast.success("Student group deleted successfully")
    setDeleteGroupId(null)
  }

  const handleViewGroup = (group: DiscountGroup) => {
    setViewingGroup(group)
  }

  const removeStudentFromGroup = (studentId: string) => {
    setGroupForm(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.filter(s => s.id !== studentId)
    }))
  }

  const toggleStudentStatus = (studentId: string) => {
    setGroupForm(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.map(s =>
        s.id === studentId ? { ...s, isActive: s.isActive !== false ? false : true } : s
      )
    }))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setIsProcessingFile(true)
    setFileParseErrors([])

    try {
      const text = await file.text()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

      // Skip header row if it looks like a header
      const startIndex = lines[0].toLowerCase().includes('student') || lines[0].toLowerCase().includes('id') ? 1 : 0
      const studentIds = lines.slice(startIndex)

      const errors: string[] = []
      const newStudents: Student[] = []

      studentIds.forEach((id, index) => {
        const student = availableStudents.find(s => s.id === id)
        if (student) {
          // Check if already added
          if (!groupForm.selectedStudents.find(s => s.id === id) && !newStudents.find(s => s.id === id)) {
            newStudents.push(student)
          }
        } else {
          errors.push(`Row ${startIndex + index + 1}: Student ID "${id}" not found`)
        }
      })

      setFileParseErrors(errors)

      if (newStudents.length > 0) {
        setGroupForm(prev => ({
          ...prev,
          selectedStudents: [...prev.selectedStudents, ...newStudents]
        }))
        toast.success(`Added ${newStudents.length} students from CSV`)
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} student IDs could not be found`)
      }
    } catch (error) {
      toast.error("Failed to process CSV file")
      console.error(error)
    } finally {
      setIsProcessingFile(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{t("menu.discountGroups")}</h3>
        </div>

        <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetGroupForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Student Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-6">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Edit Student Group" : "Create Student Group"}</DialogTitle>
              <DialogDescription>
                Create a group of students with specific discount for selected departments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({...groupForm, name: e.target.value})}
                  placeholder="Year 7 Excellence Group"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="group-discount-type">Discount Type</Label>
                  <Select
                    value={groupForm.discountType}
                    onValueChange={(value: "percentage" | "fixed") => setGroupForm({...groupForm, discountType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (฿)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {groupForm.discountType === "percentage" ? (
                  <div className="space-y-2">
                    <Label htmlFor="group-discount">Discount Percentage %</Label>
                    <Input
                      id="group-discount"
                      type="number"
                      value={groupForm.discountPercentage}
                      onChange={(e) => setGroupForm({...groupForm, discountPercentage: Number(e.target.value)})}
                      placeholder="15"
                      min="0"
                      max="100"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="group-fixed-amount">Fixed Amount ฿</Label>
                    <Input
                      id="group-fixed-amount"
                      type="number"
                      value={groupForm.fixedAmount}
                      onChange={(e) => setGroupForm({...groupForm, fixedAmount: Number(e.target.value)})}
                      placeholder="1000"
                      min="0"
                    />
                  </div>
                )}
              </div>

              {/* Student ID Input Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Add Students to Whitelist</Label>
                  <span className="text-sm text-muted-foreground">
                    {groupForm.selectedStudents.length} students added
                  </span>
                </div>

                <Tabs defaultValue="individual" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individual">Individual Input</TabsTrigger>
                    <TabsTrigger value="csv-upload">CSV Upload</TabsTrigger>
                  </TabsList>

                  <TabsContent value="individual" className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="student-input">Search & Add Student</Label>
                      <div className="relative">
                        <div className="relative">
                          <Input
                            id="student-input"
                            value={studentInput}
                            onChange={(e) => setStudentInput(e.target.value)}
                            placeholder="Search by ID or Name (e.g., KC2024001)"
                            className=""
                          />
                        </div>
                        {/* Search Results Dropdown */}
                        {studentInput.length >= 1 && (
                          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {availableStudents
                              .filter(s =>
                                !groupForm.selectedStudents.find(sel => sel.id === s.id) &&
                                (s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                                 s.name.toLowerCase().includes(studentInput.toLowerCase()))
                              )
                              .slice(0, 10)
                              .map(student => (
                                <div
                                  key={student.id}
                                  className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                                  onClick={() => {
                                    setGroupForm(prev => ({
                                      ...prev,
                                      selectedStudents: [...prev.selectedStudents, student]
                                    }))
                                    setStudentInput("")
                                    toast.success(`Added ${student.name} (${student.id})`)
                                  }}
                                >
                                  <div>
                                    <p className="font-medium text-sm">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">{student.id} • {student.yearGroup}</p>
                                  </div>
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                            {availableStudents.filter(s =>
                              !groupForm.selectedStudents.find(sel => sel.id === s.id) &&
                              (s.id.toLowerCase().includes(studentInput.toLowerCase()) ||
                               s.name.toLowerCase().includes(studentInput.toLowerCase()))
                            ).length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                No students found
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Type to search, then click to add student
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="csv-upload" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Upload Student CSV File</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('csv-file-input')?.click()}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                        <input
                          id="csv-file-input"
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>

                      {uploadedFile && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-muted rounded">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{uploadedFile.name}</span>
                            {isProcessingFile && (
                              <div className="ml-auto">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                              </div>
                            )}
                          </div>

                          {fileParseErrors.length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                              <h4 className="text-sm font-medium text-destructive mb-2">
                                File Processing Errors ({fileParseErrors.length}):
                              </h4>
                              <div className="max-h-24 overflow-y-auto text-xs text-destructive space-y-1">
                                {fileParseErrors.slice(0, 10).map((error, index) => (
                                  <div key={index}>{error}</div>
                                ))}
                                {fileParseErrors.length > 10 && (
                                  <div className="font-medium">
                                    ...and {fileParseErrors.length - 10} more errors
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>File format requirements:</strong></p>
                        <p>• CSV file with Student ID in the first column</p>
                        <p>• Optional header row (will be automatically detected)</p>
                        <p>• Student ID format: KC2024001, KC2024002, KC2024003, etc.</p>
                        <p>• One student ID per row</p>
                        <p>• Maximum file size: 5MB</p>
                      </div>

                      <div className="bg-muted/50 p-3 rounded text-xs">
                        <strong>Example CSV content:</strong>
                        <pre className="mt-1 text-muted-foreground">
Student ID{'\n'}KC2024001{'\n'}KC2024002{'\n'}KC2024003
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Selected Students Preview */}
                {groupForm.selectedStudents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Selected Students ({groupForm.selectedStudents.length})</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGroupForm(prev => ({ ...prev, selectedStudents: [] }))}
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {groupForm.selectedStudents.map(student => (
                          <div key={student.id} className={`flex items-center justify-between p-2 rounded text-sm ${student.isActive === false ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${student.isActive === false ? 'bg-gray-200' : 'bg-primary/10'}`}>
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium">{student.name}</span>
                                <span className="text-muted-foreground ml-2">({student.id})</span>
                                <span className="text-muted-foreground ml-2">{student.yearGroup}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={student.isActive !== false}
                                  onCheckedChange={() => toggleStudentStatus(student.id)}
                                />
                                <span className={`text-xs ${student.isActive === false ? 'text-gray-400' : 'text-green-600'}`}>
                                  {student.isActive === false ? 'Inactive' : 'Active'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStudentFromGroup(student.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveGroup}>
                  {editingGroup ? "Update Group" : "Create Group"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Student Groups Display */}
      <div className="space-y-4">
        {groups.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No discount groups created yet</p>
            </CardContent>
          </Card>
        )}
        {groups.map((group) => (
          <Card key={group.id} className={group.isActive === false ? "opacity-60" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{group.name}</h4>
                    <Badge variant={group.isActive === false ? "outline" : "secondary"} className={group.isActive === false ? "text-gray-500" : ""}>
                      {group.discountType === "fixed"
                        ? `฿${group.fixedAmount?.toLocaleString() || 0} Discount`
                        : `${group.discountPercentage}% Discount`
                      }
                    </Badge>
                    <Badge variant="outline" className="text-xs">School Bus</Badge>
                    {group.isActive === false && (
                      <Badge variant="outline" className="text-red-500 border-red-300">Disabled</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Users className="w-4 h-4" />
                    <span>{group.students.length} students in whitelist</span>
                  </div>

                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleViewGroup(group)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEditGroup(group)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteGroupId(group.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Group Dialog */}
      <Dialog open={!!viewingGroup} onOpenChange={() => setViewingGroup(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{viewingGroup?.name}</DialogTitle>
            <DialogDescription>
              {viewingGroup?.students.length} students in this group
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Year Group</TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingGroup?.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.yearGroup}</TableCell>
                    <TableCell>{student.parentName}</TableCell>
                    <TableCell>
                      <Badge variant={student.isActive !== false ? "default" : "secondary"}>
                        {student.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this student group. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGroupId && handleDeleteGroup(deleteGroupId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
