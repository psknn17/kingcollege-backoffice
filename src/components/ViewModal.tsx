import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { 
  X, 
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
  Edit
} from "lucide-react"
import { toast } from "sonner@2.0.3"

interface ViewModalProps {
  isOpen: boolean
  onClose: () => void
  type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template"
  data: any
  onEdit?: (data: any) => void
  onDownload?: (data: any) => void
  onPrint?: (data: any) => void
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

export function ViewModal({ isOpen, onClose, type, data, onEdit, onDownload, onPrint }: ViewModalProps) {
  const [activeTab, setActiveTab] = useState("details")

  if (!data) return null

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
      {data.items && data.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
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

  const renderTemplateView = () => (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
                {getStatusBadge(data.isActive ? "active" : "inactive")}
              </div>
              <p className="text-muted-foreground">{data.description || "No description"}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(data.totalAmount || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Template Name</p>
            </div>
            <p className="font-semibold">{data.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Applicable Grades</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.applicableGrades?.map((grade: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">{grade}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Items Count</p>
            </div>
            <p className="font-semibold">{data.itemsList?.length || 0} {(data.itemsList?.length || 0) === 1 ? 'item' : 'items'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Template Items */}
      {data.itemsList && data.itemsList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Items in Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.itemsList.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    <p className="font-semibold text-sm min-w-[80px] text-right">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between items-center px-3">
              <span className="font-semibold text-gray-600">Total Amount</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(data.totalAmount || 0)}</span>
            </div>
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
        return renderTemplateView()
      default:
        return <div>Content not available</div>
    }
  }

  const getModalTitle = () => {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{getModalTitle()}</DialogTitle>
              <DialogDescription>
                View detailed information and perform actions
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("edit")}
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
              {onPrint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("print")}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {renderContent()}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}