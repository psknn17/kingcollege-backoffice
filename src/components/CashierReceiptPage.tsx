import { useState } from "react"
import { jsPDF } from "jspdf"
import { CheckCircle2 } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"

interface StudentReceiptData {
  sid: string
  name: string
  guardian: string
  subtotal: number
  invoices: any[]
}

interface PaymentInfo {
  bank: string
  cardType: string
  paymentMethod: string
  chargeAmount: number
  edcAmount: number
  remark: string
}

function buildReceiptPdf(
  student: StudentReceiptData,
  paymentId: string,
  paymentInfo: PaymentInfo
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  })

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("King's College International School Bangkok", 20, 20)

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("RECEIPT", 20, 30)
  doc.text(`Payment Ref: ${paymentId}`, 20, 38)
  doc.text(`Date: ${today}`, 20, 46)

  doc.line(20, 50, 190, 50)

  doc.setFont("helvetica", "bold")
  doc.text("Student Information", 20, 58)
  doc.setFont("helvetica", "normal")
  doc.text(`Student: ${student.name}`, 20, 66)
  doc.text(`Student ID: ${student.sid}`, 20, 74)
  doc.text(`Guardian: ${student.guardian}`, 20, 82)

  doc.line(20, 88, 190, 88)

  doc.setFont("helvetica", "bold")
  doc.text("Payment Details", 20, 96)
  doc.setFont("helvetica", "normal")
  doc.text(`Bank: ${paymentInfo.bank.toUpperCase()}`, 20, 104)
  doc.text(`Card Type: ${paymentInfo.cardType}`, 20, 112)
  doc.text(`Payment Method: ${paymentInfo.paymentMethod === "full" ? "Full Payment" : "Installment"}`, 20, 120)

  doc.line(20, 126, 190, 126)

  doc.setFont("helvetica", "bold")
  doc.text("Invoice Summary", 20, 134)
  doc.setFont("helvetica", "normal")

  let y = 142
  for (const inv of student.invoices) {
    const invNo = inv.invoiceNumber || inv.id
    const amt = (inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0).toLocaleString()
    doc.text(`${invNo}`, 20, y)
    doc.text(`${amt} THB`, 150, y, { align: "right" })
    y += 8
  }

  doc.line(20, y, 190, y)
  y += 8
  doc.setFont("helvetica", "bold")
  doc.text("Total Amount", 20, y)
  doc.text(`${student.subtotal.toLocaleString()} THB`, 150, y, { align: "right" })

  if (paymentInfo.remark) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Remark: ${paymentInfo.remark}`, 20, y + 12)
  }

  return doc
}

export function CashierReceiptPage() {
  const { t } = useLanguage()
  const { subPageParams, navigateToSubPage } = useAppNavigation()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlobUrls, setPreviewBlobUrls] = useState<Record<string, string>>({})

  const paymentId: string = subPageParams?.paymentId ?? "PAY-UNKNOWN"
  const studentData: StudentReceiptData[] = subPageParams?.studentData ?? []
  const paymentInfo: PaymentInfo = subPageParams?.paymentInfo ?? {
    bank: "", cardType: "", paymentMethod: "full",
    chargeAmount: 0, edcAmount: 0, remark: "",
  }

  function handleViewReceipt(student: StudentReceiptData) {
    if (previewBlobUrls[student.sid]) {
      setPreviewUrl(previewBlobUrls[student.sid])
      return
    }
    const doc = buildReceiptPdf(student, paymentId, paymentInfo)
    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    setPreviewBlobUrls(prev => ({ ...prev, [student.sid]: url }))
    setPreviewUrl(url)
  }

  function handleDownloadReceipt(student: StudentReceiptData) {
    const doc = buildReceiptPdf(student, paymentId, paymentInfo)
    doc.save(`receipt-${student.sid}-${paymentId}.pdf`)
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => navigateToSubPage("cashier-dashboard")}
          className="hover:text-foreground transition-colors"
        >
          {t("menu.cashierDashboard")}
        </button>
        <span>/</span>
        <button
          onClick={() => navigateToSubPage("cashier-student-search")}
          className="hover:text-foreground transition-colors"
        >
          {t("cashier.breadcrumbSearch")}
        </button>
        <span>/</span>
        <button
          onClick={() => navigateToSubPage("cashier-payment")}
          className="hover:text-foreground transition-colors"
        >
          {t("cashier.breadcrumbPayment")}
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{t("cashier.breadcrumbReceipt")}</span>
      </nav>

      <h2 className="text-xl font-semibold">{t("cashier.receiptTitle")}</h2>

      {/* Success alert */}
      <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <span className="text-sm">
          <span className="font-medium">{t("cashier.receiptSuccess")}</span>
          {" "}
          {t("cashier.paymentRef")}: <span className="font-mono font-semibold">{paymentId}</span>
          {" "}
          {t("cashier.multiPersonCount")}: {studentData.length} {t("cashier.personUnit")}
        </span>
      </div>

      {/* Create new receipt button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => navigateToSubPage("cashier-student-search")}
        >
          {t("cashier.createNewReceipt")}
        </Button>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6 items-start">
        {/* Left: receipt cards */}
        <div className="space-y-4" style={{ flex: 1 }}>
          <h3 className="text-base font-semibold">{t("cashier.allReceipts")}</h3>
          {studentData.map((student, idx) => (
            <Card key={student.sid}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                  <span className="text-sm font-mono text-muted-foreground">{student.sid}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{t("cashier.guardianShort")}: {student.guardian}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewReceipt(student)}
                >
                  {t("cashier.viewReceipt")}
                </Button>
                <Button
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => handleDownloadReceipt(student)}
                >
                  {t("cashier.downloadReceipt")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: PDF preview */}
        <Card className="self-start" style={{ flex: 2 }}>
          <CardContent className="p-6 space-y-2">
            <h3 className="text-base font-semibold">{t("cashier.receiptPdfSection")}</h3>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full rounded border"
                style={{ height: "600px" }}
                title="Receipt PDF"
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("cashier.receiptPdfHint")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
