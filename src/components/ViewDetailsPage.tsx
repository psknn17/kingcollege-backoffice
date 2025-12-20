import { useState } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  FileText, 
  GraduationCap, 
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  Eye,
  Edit,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Search
} from "lucide-react"
import { toast } from "sonner@2.0.3"

interface ViewDetailsPageProps {
  type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template"
  data: any
  onEdit?: (data: any) => void
  onDownload?: (data: any) => void
  onPrint?: (data: any) => void
  onBack: () => void
}

const formatCurrency = (amount: number): string => {
  return `฿${amount.toLocaleString()}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    'paid': { variant: 'default' as const, color: 'bg-green-100 text-green-700 border-green-300' },
    'pending': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    'overdue': { variant: 'destructive' as const, color: 'bg-red-100 text-red-700 border-red-300' },
    'cancelled': { variant: 'outline' as const, color: 'bg-gray-100 text-gray-700 border-gray-300' },
    'active': { variant: 'default' as const, color: 'bg-green-100 text-green-700 border-green-300' },
    'inactive': { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700 border-gray-300' },
    'draft': { variant: 'outline' as const, color: 'bg-blue-100 text-blue-700 border-blue-300' }
  }
  
  const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.pending
  
  return (
    <Badge variant={config.variant} className={config.color}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

// Available items for selection
const availableItems = [
  {
    id: "tuition-term1",
    name: "Term 1 Tuition Fee",
    description: "First term tuition payment",
    category: "Tuition",
    amount: 150000,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "registration-fee",
    name: "Registration Fee",
    description: "Annual registration fee",
    category: "Fee",
    amount: 25000,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "activity-fee",
    name: "Activity Fee",
    description: "Extracurricular activities fee",
    category: "Activity",
    amount: 15000,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "uniform-fee",
    name: "Uniform Fee",
    description: "School uniform and equipment",
    category: "Equipment",
    amount: 8000,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"]
  },
  {
    id: "transport-fee",
    name: "Transport Fee",
    description: "School bus transportation",
    category: "Transport",
    amount: 12000,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "lunch-fee",
    name: "Lunch Program Fee",
    description: "School lunch program",
    category: "Meal",
    amount: 6000,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8"]
  },
  {
    id: "exam-fee",
    name: "Examination Fee",
    description: "International examination fee",
    category: "Examination",
    amount: 20000,
    applicableGrades: ["Year 10", "Year 11", "Year 12"]
  },
  {
    id: "library-fee",
    name: "Library Fee",
    description: "Library resources and books",
    category: "Resource",
    amount: 3000,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  }
]

export function ViewDetailsPage({ type, data, onEdit, onDownload, onPrint, onBack }: ViewDetailsPageProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [isEditMode, setIsEditMode] = useState(false)
  const [editData, setEditData] = useState(data)
  const [isItemSelectionOpen, setIsItemSelectionOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </div>
    )
  }

  const addSelectedItem = (selectedItem: any) => {
    const newItem = {
      name: selectedItem.name,
      description: selectedItem.description,
      quantity: 1,
      amount: selectedItem.amount
    }
    setEditData({
      ...editData,
      items: [...(editData.items || []), newItem]
    })
    setIsItemSelectionOpen(false)
    toast.success(`Added ${selectedItem.name} to invoice`)
  }

  const addNewItem = () => {
    const newItem = {
      name: "",
      description: "",
      quantity: 1,
      amount: 0
    }
    setEditData({
      ...editData,
      items: [...(editData.items || []), newItem]
    })
  }

  const removeItem = (index: number) => {
    const updatedItems = editData.items.filter((_: any, i: number) => i !== index)
    setEditData({
      ...editData,
      items: updatedItems
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = editData.items.map((item: any, i: number) => 
      i === index ? { ...item, [field]: value } : item
    )
    setEditData({
      ...editData,
      items: updatedItems
    })
  }

  const calculateTotal = () => {
    return editData.items?.reduce((total: number, item: any) => 
      total + (item.amount * (item.quantity || 1)), 0) || 0
  }

  const handleSave = () => {
    const updatedData = {
      ...editData,
      total: calculateTotal()
    }
    onEdit?.(updatedData)
    setIsEditMode(false)
    toast.success("Changes saved successfully!")
  }

  const handleCancel = () => {
    setEditData(data)
    setIsEditMode(false)
    setIsItemSelectionOpen(false)
    toast.info("Changes discarded")
  }

  // Filter available items based on search and category
  const filteredItems = availableItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories for filter
  const categories = ["all", ...Array.from(new Set(availableItems.map(item => item.category)))]

  const renderItemSelectionDialog = () => (
    <Dialog open={isItemSelectionOpen} onOpenChange={setIsItemSelectionOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Item to Add</DialogTitle>
          <DialogDescription>
            Choose from available items or create a custom item for this invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search and Filter */}
          <div className="flex gap-3">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer transition-all hover:bg-muted/50"
                  onClick={() => addSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                              item.category === "Fee" ? "border-green-300 text-green-700" :
                              item.category === "Activity" ? "border-purple-300 text-purple-700" :
                              item.category === "Equipment" ? "border-orange-300 text-orange-700" :
                              item.category === "Transport" ? "border-yellow-300 text-yellow-700" :
                              item.category === "Meal" ? "border-pink-300 text-pink-700" :
                              "border-gray-300 text-gray-700"
                            }`}
                          >
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex items-center gap-4">
                          <p className="font-medium text-lg">{formatCurrency(item.amount)}</p>
                          <Badge variant="secondary" className="text-xs">
                            {item.applicableGrades.length} grades
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No items found matching your criteria.</p>
              </div>
            )}
          </div>

          {/* Add Custom Item Option */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                addNewItem()
                setIsItemSelectionOpen(false)
                toast.success("Added custom item")
              }}
              className="w-full border-dashed border-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  const renderInvoiceView = () => (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">Invoice #{data.invoiceNumber || data.id}</h3>
          <p className="text-muted-foreground">{data.description || "Invoice Details"}</p>
        </div>
        <div className="text-right">
          {getStatusBadge(data.status)}
          <p className="text-2xl font-bold mt-2">{formatCurrency(data.amount || data.total || 0)}</p>
        </div>
      </div>

      {/* Student & Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Student Name</label>
              <p className="font-medium">{data.studentName || data.student?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Student ID</label>
              <p className="font-medium">{data.studentId || data.student?.id || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Grade</label>
              <p className="font-medium">{data.grade || data.student?.grade || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Parent Email</label>
              <p className="font-medium">{data.parentEmail || data.student?.parentEmail || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Issue Date</label>
              <p className="font-medium">{formatDate(data.issueDate || data.createdAt || new Date().toISOString())}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Due Date</label>
              <p className="font-medium">{formatDate(data.dueDate || new Date().toISOString())}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Category</label>
              <Badge variant="outline">{data.category || "General"}</Badge>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Academic Year</label>
              <p className="font-medium">{data.academicYear || "2024-2025"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      {((isEditMode ? editData.items : data.items) && (isEditMode ? editData.items : data.items).length > 0) || isEditMode ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Items</CardTitle>
              {isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsItemSelectionOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <div className="space-y-4">
                {editData.items?.map((item: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Item #{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">Item Name</label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          placeholder="Enter item name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Enter item description"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Amount (฿)</label>
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">
                        Subtotal: {formatCurrency((item.amount || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  </div>
                ))}
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.description}</TableCell>
                        <TableCell>{item.quantity || 1}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold">{formatCurrency(data.total || data.amount || 0)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )

  const renderStudentView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{data.name}</h3>
          <p className="text-muted-foreground">Student ID: {data.id}</p>
        </div>
        <div className="text-right">
          {getStatusBadge(data.status || "active")}
          <Badge variant="outline" className="ml-2">{data.grade}</Badge>
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Full Name</label>
              <p className="font-medium">{data.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Student ID</label>
              <p className="font-medium">{data.id}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Grade Level</label>
              <p className="font-medium">{data.grade}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Date of Birth</label>
              <p className="font-medium">{data.dateOfBirth || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Parent Name</label>
              <p className="font-medium">{data.parentName}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Parent Email</label>
              <p className="font-medium">{data.email || data.parentEmail}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Phone Number</label>
              <p className="font-medium">{data.phone || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Address</label>
              <p className="font-medium">{data.address || "N/A"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses */}
      {data.courses && data.courses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Enrolled Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.courses.map((course: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{course.name}</p>
                    <p className="text-sm text-muted-foreground">{course.description}</p>
                  </div>
                  <Badge variant="outline">{course.status || "Active"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderItemView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{data.name}</h3>
          <p className="text-muted-foreground">{data.description}</p>
        </div>
        <div className="text-right">
          {getStatusBadge(data.isActive ? "active" : "inactive")}
          <p className="text-2xl font-bold mt-2">{formatCurrency(data.amount)}</p>
        </div>
      </div>

      {/* Item Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Item Name</label>
              <p className="font-medium">{data.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Category</label>
              <Badge variant="outline">{data.category}</Badge>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Amount</label>
              <p className="font-medium text-lg">{formatCurrency(data.amount)}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <p className="font-medium">{data.isActive ? "Active" : "Inactive"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applicable Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.applicableGrades?.map((grade: string, index: number) => (
                <Badge key={index} variant="secondary">{grade}</Badge>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-sm text-muted-foreground">Total Grades</label>
              <p className="font-medium">{data.applicableGrades?.length || 0} grades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {data.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{data.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderReceiptView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">Receipt #{data.receiptNumber || data.id}</h3>
          <p className="text-muted-foreground">Payment Receipt</p>
        </div>
        <div className="text-right">
          {getStatusBadge(data.status || "paid")}
          <p className="text-2xl font-bold mt-2">{formatCurrency(data.amount || data.total || 0)}</p>
        </div>
      </div>

      {/* Payment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Payment Date</label>
              <p className="font-medium">{formatDate(data.paymentDate || data.createdAt || new Date().toISOString())}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Payment Method</label>
              <p className="font-medium">{data.paymentMethod || "Bank Transfer"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Reference Number</label>
              <p className="font-medium">{data.referenceNumber || data.transactionId || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Amount Paid</label>
              <p className="font-medium text-lg">{formatCurrency(data.amount || data.total || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Student Name</label>
              <p className="font-medium">{data.studentName || data.student?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Student ID</label>
              <p className="font-medium">{data.studentId || data.student?.id || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Grade</label>
              <p className="font-medium">{data.grade || data.student?.grade || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Academic Term</label>
              <p className="font-medium">{data.academicTerm || "Term 1 2024"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (type) {
      case "invoice":
        return renderInvoiceView()
      case "student":
        return renderStudentView()
      case "item":
        return renderItemView()
      case "receipt":
        return renderReceiptView()
      case "payment":
        return renderReceiptView() // Same as receipt
      case "course":
        return renderItemView() // Similar structure
      case "template":
        return renderItemView() // Similar structure
      default:
        return <div>Content not available</div>
    }
  }

  const getPageTitle = () => {
    switch (type) {
      case "invoice":
        return "Invoice Details"
      case "student":
        return "Student Profile"
      case "item":
        return "Item Details"
      case "receipt":
        return "Receipt Details"
      case "payment":
        return "Payment Details"
      case "course":
        return "Course Details"
      case "template":
        return "Template Details"
      default:
        return "Details"
    }
  }

  const handleAction = (action: string) => {
    switch (action) {
      case "edit":
        onEdit?.(data)
        toast.success("Opening edit mode...")
        break
      case "download":
        onDownload?.(data)
        toast.success("Downloading...")
        break
      case "print":
        onPrint?.(data)
        toast.success("Preparing for print...")
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons (Header is rendered by App.tsx) */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {onEdit && (type === "invoice" || type === "item" || type === "template") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("download")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-background">
        {renderContent()}
      </div>

      {/* Item Selection Dialog */}
      {renderItemSelectionDialog()}
    </div>
  )
}