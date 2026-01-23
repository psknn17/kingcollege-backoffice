import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Separator } from "./ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { useLanguage } from "@/contexts/LanguageContext"
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
import { toast } from "@/components/ui/sonner"
import { SCHOOL_INFO, BANK_DETAILS, numberToWords, formatCurrency as formatCurrencyUtil } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"

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
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("details")

  if (!data) return null

  const renderInvoiceView = () => {
    const total = data.total || data.amount || data.items?.reduce((sum: number, item: any) => sum + (item.discountedAmount || item.amount || 0), 0) || 0
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date()
    const dueDate = data.dueDate ? new Date(data.dueDate) : null

    return (
      <div className="bg-white mx-auto" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '794px', fontSize: '12px' }}>
        {/* School Header */}
        <div className="text-center py-4 border-b border-gray-300 mb-3">
          <img
            src={SchoolLogo}
            alt="King's College International School Bangkok"
            style={{ height: '60px', margin: '0 auto 8px auto', display: 'block' }}
          />
          <p className="text-xs text-gray-600">
            {SCHOOL_INFO.address}
          </p>
          <p className="text-xs text-gray-600">
            {SCHOOL_INFO.phone}, {SCHOOL_INFO.email}, {SCHOOL_INFO.website}
          </p>
          <h1 className="text-xl font-semibold mt-3 tracking-wide">INVOICE</h1>
        </div>

        {/* Student & Invoice Info - Two Column Layout */}
        <div className="px-4 py-3">
          <div className="border border-black p-4" style={{ fontSize: '11px' }}>
            <div className="flex justify-between">
              {/* Left Column - Student Info */}
              <div style={{ width: '45%' }}>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Student name</span>
                  <span>{data.studentName || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Student ID</span>
                  <span>{data.studentId || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Year group</span>
                  <span>{data.grade || data.studentGrade || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Parent name</span>
                  <span>{data.parentName || "N/A"}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '110px' }}>Email</span>
                  <span>{data.parentEmail || "N/A"}</span>
                </div>
              </div>
              {/* Right Column - Invoice Info */}
              <div style={{ width: '45%' }}>
                <div className="flex py-1">
                  <span style={{ width: '90px' }}>Invoice no.</span>
                  <span className="flex-1 text-right">{data.invoiceNumber || data.id}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '90px' }}>Invoice date</span>
                  <span className="flex-1 text-right">{issueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex py-1">
                  <span style={{ width: '90px' }}>Due date</span>
                  <span className="flex-1 text-right">{dueDate ? dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                </div>
                {data.term && (
                  <div className="flex py-1">
                    <span style={{ width: '90px' }}>Term</span>
                    <span className="flex-1 text-right">{data.term}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="px-4 py-2">
          <table className="w-full border border-black" style={{ borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr className="border-b border-black bg-gray-50">
                <th className="py-1.5 px-2 text-left font-semibold" style={{ width: '40px' }}>No.</th>
                <th className="py-1.5 px-2 text-left font-semibold">Description</th>
                <th className="py-1.5 px-2 text-right font-semibold" style={{ width: '100px' }}>Amount (THB)</th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-1.5 px-2 align-top">{index + 1}</td>
                  <td className="py-1.5 px-2" style={{ wordBreak: 'break-word' }}>
                    <div>{item.name || item.description}</div>
                  </td>
                  <td className="py-1.5 px-2 text-right align-top">{formatCurrencyUtil(item.discountedAmount || item.amount || 0)}</td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="border-t border-black bg-gray-100">
                <td colSpan={2} className="py-2 px-2">
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: '10px' }}>{numberToWords(total)}</span>
                    <span className="font-bold ml-4">TOTAL</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-bold">{formatCurrencyUtil(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Late Payment Notice */}
        <div className="px-4 py-2" style={{ fontSize: '11px' }}>
          <p className="text-gray-500 italic text-xs">
            Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.
          </p>
        </div>

        {/* Payment Methods */}
        <div className="px-4 py-2" style={{ fontSize: '11px' }}>
          <h3 className="font-bold mb-3">Payment methods</h3>
          <div className="space-y-3">
            {/* Bank Transfer */}
            <div>
              <span>- </span>
              <span className="font-medium">Bank Transfer:</span>
              <span> Please transfer to the account below and email proof of payment to finance@kingsbangkok.ac.th</span>
              <table className="mt-3 ml-8">
                <tbody>
                  <tr>
                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account name</td>
                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountName}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Account number</td>
                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.accountNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Bank name</td>
                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.bankName}</td>
                  </tr>
                  <tr>
                    <td style={{ width: '150px', paddingTop: '4px', paddingBottom: '4px' }}>Branch</td>
                    <td style={{ paddingTop: '4px', paddingBottom: '4px' }}>{BANK_DETAILS.branch}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="px-4 py-4">
          <div className="flex justify-between px-6">
            <div className="text-center">
              <p className="italic mb-6" style={{ fontSize: '10px' }}>Thananchaya Chalorkpunrattara</p>
              <div className="w-40 border-t border-black mb-1"></div>
              <p style={{ fontSize: '10px' }}>Prepared by</p>
            </div>
            <div className="text-center">
              <p className="italic mb-6" style={{ fontSize: '10px' }}>Porntip Jarusintrangkul</p>
              <div className="w-40 border-t border-black mb-1"></div>
              <p style={{ fontSize: '10px' }}>Authorised officer</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStudentView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{data.name}</h3>
          <p className="text-muted-foreground">{t("viewModal.studentId")}: {data.id}</p>
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
              {t("viewModal.personalInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.fullName")}</label>
              <p className="font-medium">{data.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.studentId")}</label>
              <p className="font-medium">{data.id}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.yearGroup")}</label>
              <p className="font-medium">{data.grade}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.dateOfBirth")}</label>
              <p className="font-medium">{data.dateOfBirth || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t("viewModal.contactInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.parentName")}</label>
              <p className="font-medium">{data.parentName}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.parentEmail")}</label>
              <p className="font-medium">{data.email || data.parentEmail}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.phoneNumber")}</label>
              <p className="font-medium">{data.phone || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.address")}</label>
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
              {t("viewModal.enrolledCourses")}
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
                  <Badge variant="outline">{course.status || t("common.active")}</Badge>
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
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900">{data.name}</h3>
          {data.description && (
            <p className="text-muted-foreground mt-1">{data.description}</p>
          )}
        </div>
        <div className="text-right ml-4">
          {getStatusBadge(data.isActive ? "active" : "inactive")}
          <p className="text-3xl font-bold mt-3 text-gray-900">{formatCurrency(data.amount)}</p>
        </div>
      </div>

      {/* Item Details - Single Card Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>{t("viewModal.itemInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("viewModal.itemName")}</label>
              <p className="font-medium text-gray-900 mt-1">{data.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("viewModal.category")}</label>
              <div className="mt-1">
                <Badge variant="outline">{data.category}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("viewModal.amount")}</label>
              <p className="font-semibold text-xl text-gray-900 mt-1">{formatCurrency(data.amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("viewModal.status")}</label>
              <p className="font-medium text-gray-900 mt-1">{data.isActive ? t("common.active") : t("common.inactive")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTemplateView = () => (
    <div className="px-4">
      {/* Document Header */}
      <div className="text-center py-6 border-b border-gray-200 mb-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">{t("viewModal.invoiceTemplate")}</h2>
      </div>

      {/* Template Info */}
      <div className="px-4 space-y-4 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t("viewModal.templateName")}</p>
            <p className="text-lg font-semibold text-gray-900">{data.name}</p>
          </div>
          {getStatusBadge(data.isActive ? "active" : "inactive")}
        </div>

        {data.description && (
          <p className="text-sm text-gray-600">{data.description}</p>
        )}
      </div>

      {/* Items Section */}
      {data.itemsList && data.itemsList.length > 0 && (
        <div className="px-4">
          <div className="border-t border-gray-200 pt-6 mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">{t("viewModal.items")}</h3>
          </div>

          <div className="space-y-4 mb-6">
            {data.itemsList.map((item: any, index: number) => (
              <div key={index} className="flex items-baseline justify-between py-2">
                <div className="flex items-baseline gap-3 flex-1 min-w-0">
                  <span className="text-gray-400 text-sm w-6 flex-shrink-0">{index + 1}.</span>
                  <span className="text-gray-900">{item.name}</span>
                  <span className="flex-1 border-b border-dotted border-gray-200 mx-3 mb-1"></span>
                </div>
                <span className="font-medium text-gray-900 whitespace-nowrap pl-4">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t-2 border-gray-300 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">{t("viewModal.total")}</span>
              <span className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalAmount || 0)}</span>
            </div>
          </div>
          <div className="border-t-4 border-double border-gray-300 mt-3"></div>
        </div>
      )}
    </div>
  )

  const renderReceiptView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">Receipt #{data.receiptNumber || data.id}</h3>
          <p className="text-muted-foreground">{t("viewModal.paymentReceipt")}</p>
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
              {t("viewModal.paymentDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.paymentDate")}</label>
              <p className="font-medium">{formatDate(data.paymentDate || data.createdAt || new Date().toISOString())}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.paymentMethod")}</label>
              <p className="font-medium">{data.paymentMethod || t("paymentMethod.bankTransfer")}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.referenceNumber")}</label>
              <p className="font-medium">{data.referenceNumber || data.transactionId || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.amountPaid")}</label>
              <p className="font-medium text-lg">{formatCurrency(data.amount || data.total || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("viewModal.studentInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.studentName")}</label>
              <p className="font-medium">{data.studentName || data.student?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.studentId")}</label>
              <p className="font-medium">{data.studentId || data.student?.id || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.yearGroup")}</label>
              <p className="font-medium">{data.grade || data.student?.grade || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("viewModal.academicTerm")}</label>
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
        return <div>{t("viewModal.contentNotAvailable")}</div>
    }
  }

  const getModalTitle = () => {
    switch (type) {
      case "invoice":
        return t("viewModal.invoiceDetails")
      case "student":
        return t("viewModal.studentProfile")
      case "item":
        return t("viewModal.itemDetails")
      case "receipt":
        return t("viewModal.receiptDetails")
      case "payment":
        return t("viewModal.paymentDetails")
      case "course":
        return t("viewModal.courseDetails")
      case "template":
        return t("viewModal.templateDetails")
      default:
        return t("viewModal.details")
    }
  }

  const handleAction = (action: string) => {
    switch (action) {
      case "edit":
        onEdit?.(data)
        toast.success(t("viewModal.openingEditMode"))
        break
      case "download":
        onDownload?.(data)
        toast.success(t("viewModal.downloading"))
        break
      case "print":
        onPrint?.(data)
        toast.success(t("viewModal.preparingPrint"))
        break
      default:
        break
    }
  }

  // Special layout for invoice type
  if (type === "invoice") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[850px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col">
            <div className="flex-1 p-6">
              {renderInvoiceView()}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>{getModalTitle()}</DialogTitle>
              <DialogDescription>
                {t("viewModal.viewDetailedInfo")}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction("download")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t("common.download")}
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
                  {t("common.print")}
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
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}