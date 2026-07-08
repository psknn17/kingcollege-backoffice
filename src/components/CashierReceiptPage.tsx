import { useState } from "react"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import { format } from "date-fns"
import { saveAs } from "file-saver"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"
import { useAuth } from "@/contexts/AuthContext"
import { SCHOOL_INFO, numberToWords } from "@/lib/invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"

const AUTHORISED_NAME = "Porntip Jarusiritrangkul"

interface StudentReceiptData {
  sid: string
  name: string
  guardian: string
  subtotal: number
  invoices: any[]
  grade?: string
}

export interface StudentReceiptItem {
  sid: string
  name: string
  guardian: string
  grade: string
  receiptNo: string
  invoices: Array<{ invoiceId: string; invoiceNumber: string; invoiceAmount: number }>
  totalAmount: number
  cardFee: number
  overpaymentAmount: number
}

/** @deprecated use StudentReceiptItem */
export type InvoiceReceiptItem = StudentReceiptItem

export interface PaymentInfo {
  bank: string
  cardType: string
  paymentMethod: string
  chargeAmount: number
  edcAmount: number
  remark: string
  overpaymentAmount?: number
}

// ── Receipt HTML builder — matches "Acknowledgement of School Fee Payment" template ──
export function buildCashierReceiptHtml(params: {
  item: StudentReceiptItem
  cashierName: string
  paymentInfo: PaymentInfo
  copyType: "Customer" | "Accounting"
}): string {
  const { item, cashierName, paymentInfo, copyType } = params
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const today = format(new Date(), "dd MMMM yyyy")
  const currentYear = new Date().getFullYear()
  const academicYear = `${currentYear - 1}/${currentYear}`
  const rawGrade = item.grade ?? "-"
  const grade = rawGrade.replace(/^year\s*/i, "Year ")

  const overpaymentAmt = item.overpaymentAmount ?? 0
  const totalInvAmount = item.totalAmount
  const cardLabel = [paymentInfo.bank.toUpperCase(), (paymentInfo as any).cardType].filter(Boolean).join(" ")

  // Build invoice rows
  let allocatedFee = 0
  const invoiceRows = item.invoices.map((inv, idx) => {
    const isLast = idx === item.invoices.length - 1
    const invFee = totalInvAmount > 0
      ? isLast
        ? Number((item.cardFee - allocatedFee).toFixed(2))
        : Number((item.cardFee * inv.invoiceAmount / totalInvAmount).toFixed(2))
      : 0
    allocatedFee += invFee
    const received = inv.invoiceAmount + invFee
    return `<tr>
      <td style="border:1px solid black;padding:5px 8px;text-align:center">${idx + 1}</td>
      <td style="border:1px solid black;padding:5px 8px;text-align:center">${inv.invoiceNumber}</td>
      <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(inv.invoiceAmount)}</td>
      <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(invFee)}</td>
      <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(received)}</td>
    </tr>`
  })

  const grandReceived = totalInvAmount + item.cardFee + overpaymentAmt

  return `<div style="font-family:'Times New Roman',serif;font-size:13px;line-height:1.5;padding:40px 52px;width:794px;background:white;color:black">

    <!-- Header -->
    <div style="position:relative;text-align:center;margin-bottom:6px">
      <div style="position:absolute;top:0;right:0;font-size:11px">${copyType}</div>
      <img src="${SchoolLogo}" style="height:100px;display:block;margin:0 auto 6px" crossorigin="anonymous"
        onerror="this.onerror=null;this.style.display='none'" />
      <div style="font-size:14px;font-weight:bold;letter-spacing:2px">KING'S COLLEGE INTERNATIONAL SCHOOL</div>
      <div style="font-size:10px;letter-spacing:3px;margin-bottom:2px">BANGKOK</div>
    </div>

    <!-- Title -->
    <h2 style="text-align:center;font-size:19px;font-weight:bold;margin:18px 0 14px;letter-spacing:0.5px">
      Acknowledgement of School Fee Payment
    </h2>

    <!-- Info table -->
    <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:12px;margin-bottom:14px">
      <tr>
        <td style="border:1px solid black;padding:5px 10px;width:130px">Student ID no.</td>
        <td style="border:1px solid black;padding:5px 8px">${item.sid}</td>
        <td style="border:1px solid black;padding:5px 10px;width:100px">Receipt no.</td>
        <td style="border:1px solid black;padding:5px 10px;text-align:right;width:150px">${item.receiptNo}</td>
      </tr>
      <tr>
        <td style="border:1px solid black;padding:5px 10px">Student name</td>
        <td style="border:1px solid black;padding:5px 8px">${item.name}</td>
        <td style="border:1px solid black;padding:5px 10px">Receipt date</td>
        <td style="border:1px solid black;padding:5px 10px;text-align:right">${today}</td>
      </tr>
      <tr>
        <td style="border:1px solid black;padding:5px 10px">Contact name</td>
        <td style="border:1px solid black;padding:5px 8px">${item.guardian}</td>
        <td style="border:1px solid black;padding:5px 10px">Year group</td>
        <td style="border:1px solid black;padding:5px 10px;text-align:right">${grade}</td>
      </tr>
      <tr>
        <td style="border:1px solid black;padding:5px 10px"></td>
        <td style="border:1px solid black;padding:5px 8px"></td>
        <td style="border:1px solid black;padding:5px 10px">School year</td>
        <td style="border:1px solid black;padding:5px 10px;text-align:right">${academicYear}</td>
      </tr>
    </table>

    <!-- Invoice table (N rows) -->
    <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:12px;margin-bottom:10px">
      <thead>
        <tr>
          <th style="border:1px solid black;padding:6px 8px;text-align:center;width:36px">No.</th>
          <th style="border:1px solid black;padding:6px 8px;text-align:center;width:160px">Invoice no.</th>
          <th style="border:1px solid black;padding:6px 8px;text-align:center">Invoice amount<br/>(THB)</th>
          <th style="border:1px solid black;padding:6px 8px;text-align:center">Credit card fee*<br/>(THB)</th>
          <th style="border:1px solid black;padding:6px 8px;text-align:center">Received amount<br/>(THB)</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceRows.join("")}
        ${overpaymentAmt > 0 ? `<tr>
          <td colspan="2" style="border:1px solid black;padding:5px 8px">Overpayment amount**</td>
          <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(overpaymentAmt)}</td>
          <td style="border:1px solid black;padding:5px 8px;text-align:right"></td>
          <td style="border:1px solid black;padding:5px 8px;text-align:right"></td>
        </tr>` : ""}
        <tr>
          <td colspan="2" style="border:1px solid black;padding:5px 8px"></td>
          <td style="border:1px solid black;padding:5px 8px;text-align:right;font-weight:bold;text-decoration:underline">${fmt(totalInvAmount + overpaymentAmt)}</td>
          <td style="border:1px solid black;padding:5px 8px;text-align:right;font-weight:bold;text-decoration:underline">${fmt(item.cardFee)}</td>
          <td style="border:1px solid black;padding:5px 8px;text-align:right;font-weight:bold;text-decoration:underline">${fmt(grandReceived)}</td>
        </tr>
        <tr style="font-weight:bold">
          <td colspan="2" style="border:1px solid black;padding:5px 8px">GRAND TOTAL</td>
          <td colspan="3" style="border:1px solid black;padding:5px 8px;text-align:center;font-style:italic;text-transform:uppercase;font-size:11px">
            ${numberToWords(grandReceived)}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Notes -->
    <div style="font-size:10px;margin-bottom:10px;line-height:1.9">
      <p>* Credit card processing fee payable to Bank</p>
      ${overpaymentAmt > 0 ? "<p>** Please note that any overpayments amount is non-refundable and will be credited against future school fee invoices.</p>" : ""}
    </div>

    <!-- Credit card info -->
    <div style="font-size:12px;margin-bottom:18px">
      <strong>Credit card:</strong> ${cardLabel}
    </div>

    <!-- Signature -->
    <table style="width:100%;margin-top:12px;font-size:12px">
      <tr>
        <td style="text-align:center;width:50%;padding:0 20px;vertical-align:bottom">
          <div style="margin-bottom:34px">${cashierName}</div>
          <div style="border-top:1px solid black;padding-top:6px;font-weight:bold">Cashier</div>
        </td>
        <td style="text-align:center;width:50%;padding:0 20px;vertical-align:bottom">
          <div style="margin-bottom:34px">${AUTHORISED_NAME}</div>
          <div style="border-top:1px solid black;padding-top:6px;font-weight:bold">Authorised signature</div>
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <div style="text-align:center;font-size:9px;margin-top:22px;border-top:1px solid #999;padding-top:6px">
      <p>${SCHOOL_INFO.name}, ${SCHOOL_INFO.address}</p>
      <p>${SCHOOL_INFO.phone}, ${SCHOOL_INFO.email}, ${SCHOOL_INFO.website}</p>
    </div>
  </div>`
}

// ── Render HTML string → HTMLCanvasElement via hidden iframe ──
export async function renderHtmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none"
  document.body.appendChild(iframe)
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) throw new Error("Cannot access iframe")
    iframeDoc.open()
    iframeDoc.write(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:white}</style></head><body>${html}</body></html>`)
    iframeDoc.close()
    await Promise.all(
      Array.from(iframeDoc.body.querySelectorAll("img")).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r() })
      )
    )
    return await html2canvas(iframeDoc.body, {
      scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
    })
  } finally {
    document.body.removeChild(iframe)
  }
}

// ── Convert HTML template → 2-page jsPDF blob (Customer + Accounting) ──
export async function generatePdfBlob(
  item: StudentReceiptItem,
  cashierName: string,
  paymentInfo: PaymentInfo
): Promise<Blob> {
  const baseParams = { item, cashierName, paymentInfo }

  const canvas1 = await renderHtmlToCanvas(buildCashierReceiptHtml({ ...baseParams, copyType: "Customer" }))
  const canvas2 = await renderHtmlToCanvas(buildCashierReceiptHtml({ ...baseParams, copyType: "Accounting" }))

  const pdf = new jsPDF("p", "mm", "a4")
  const pw = pdf.internal.pageSize.getWidth()

  const ph1 = (canvas1.height * pw) / canvas1.width
  pdf.addImage(canvas1.toDataURL("image/png"), "PNG", 0, 0, pw, ph1)

  pdf.addPage()
  const ph2 = (canvas2.height * pw) / canvas2.width
  pdf.addImage(canvas2.toDataURL("image/png"), "PNG", 0, 0, pw, ph2)

  return pdf.output("blob")
}

// ── Main component ──
export function CashierReceiptPage() {
  const { t } = useLanguage()
  const { subPageParams, navigateToSubPage } = useAppNavigation()
  const { user } = useAuth()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlobUrls, setPreviewBlobUrls] = useState<Record<string, string>>({})
  const [previewItem, setPreviewItem] = useState<StudentReceiptItem | null>(null)
  const receiptNumbers: Record<string, string> = subPageParams?.receiptNos ?? {}
  const acknowledgeNumbers: Record<string, string> = subPageParams?.acknowledgeNos ?? {}
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const paymentId: string = subPageParams?.paymentId ?? "PAY-UNKNOWN"
  const studentData: { sid: string; name: string; guardian: string; grade?: string; subtotal: number; invoices: any[] }[] = subPageParams?.studentData ?? []
  const paymentInfo: PaymentInfo = subPageParams?.paymentInfo ?? {
    bank: "", cardType: "", paymentMethod: "full", chargeAmount: 0, edcAmount: 0, remark: "",
  }

  const grandTotal = studentData.reduce((s, st) => s + st.subtotal, 0)
  const totalFee = Math.max(0, paymentInfo.edcAmount - paymentInfo.chargeAmount)
  const globalOverpayment = Math.max(0, paymentInfo.chargeAmount - grandTotal)
  const cashierName = user?.name ?? "Cashier"

  const studentReceiptItems: StudentReceiptItem[] = (() => {
    let allocated = 0
    return studentData.map((st, idx) => {
      const invList = st.invoices ?? []
      const stTotal = st.subtotal
      const isLast = idx === studentData.length - 1
      const fee = grandTotal > 0
        ? isLast
          ? Number((totalFee - allocated).toFixed(2))
          : Number((totalFee * stTotal / grandTotal).toFixed(2))
        : 0
      allocated += fee
      const receiptNo =
        acknowledgeNumbers[invList[0]?.id] ??
        receiptNumbers[invList[0]?.id] ??
        `R-CC-${new Date().getFullYear()}-00001`
      return {
        sid: st.sid,
        name: st.name,
        guardian: st.guardian,
        grade: st.grade ?? "-",
        receiptNo,
        invoices: invList.map((inv: any) => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || inv.id || "-",
          invoiceAmount: inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0,
        })),
        totalAmount: stTotal,
        cardFee: fee,
        overpaymentAmount: idx === 0 ? globalOverpayment : 0,
      }
    })
  })()

  async function handleViewReceipt(item: StudentReceiptItem) {
    setPreviewItem(item)
    if (previewBlobUrls[item.sid]) {
      setPreviewUrl(previewBlobUrls[item.sid])
      return
    }
    setLoadingStates(prev => ({ ...prev, [item.sid]: true }))
    try {
      const blob = await generatePdfBlob(item, cashierName, paymentInfo)
      const file = new File([blob], `${item.receiptNo}.pdf`, { type: "application/pdf" })
      const url = URL.createObjectURL(file)
      setPreviewBlobUrls(prev => ({ ...prev, [item.sid]: url }))
      setPreviewUrl(url)
    } finally {
      setLoadingStates(prev => ({ ...prev, [item.sid]: false }))
    }
  }

  async function handleDownloadReceipt(item: StudentReceiptItem) {
    setLoadingStates(prev => ({ ...prev, [`dl-${item.sid}`]: true }))
    try {
      const blob = await generatePdfBlob(item, cashierName, paymentInfo)
      saveAs(blob, `${item.receiptNo}.pdf`)
    } finally {
      setLoadingStates(prev => ({ ...prev, [`dl-${item.sid}`]: false }))
    }
  }

  return (
    <div className="space-y-4">
      {/* Acknowledgement pending banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {t("cashier.ackPendingNote")}
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => navigateToSubPage("cashier-dashboard")} className="hover:text-foreground transition-colors">
          {t("menu.cashierDashboard")}
        </button>
        <span>/</span>
        <button onClick={() => navigateToSubPage("cashier-student-search")} className="hover:text-foreground transition-colors">
          {t("cashier.breadcrumbSearch")}
        </button>
        <span>/</span>
        <button onClick={() => navigateToSubPage("cashier-payment")} className="hover:text-foreground transition-colors">
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
          {" "}{t("cashier.paymentRef")}: <span className="font-mono font-semibold">{paymentId}</span>
          {" "}{t("cashier.multiPersonCount")}: {studentData.length} {t("cashier.personUnit")}
        </span>
      </div>

      {/* Create new receipt button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => navigateToSubPage("cashier-student-search")}>
          {t("cashier.createNewReceipt")}
        </Button>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6 items-start">
        {/* Left: receipt cards */}
        <div className="space-y-4" style={{ flex: 1 }}>
          <h3 className="text-base font-semibold">{t("cashier.allReceipts")}</h3>
          {studentReceiptItems.map((item, idx) => (
            <Card key={item.sid}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between bg-slate-100 rounded-t-lg px-4 py-2">
                  <span className="text-sm font-semibold text-slate-600">#{idx + 1}</span>
                  <span className="text-sm font-mono text-slate-500">{item.receiptNo}</span>
                </div>
                <div className="px-4 pt-3 pb-4 space-y-3">
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Invoice: {item.invoices.map(i => i.invoiceNumber).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("cashier.guardianShort")}: {item.guardian}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!!loadingStates[item.sid]}
                    onClick={() => handleViewReceipt(item)}
                  >
                    {loadingStates[item.sid]
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังสร้าง PDF...</>
                      : t("cashier.viewReceipt")}
                  </Button>
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={!!loadingStates[`dl-${item.sid}`]}
                    onClick={() => handleDownloadReceipt(item)}
                  >
                    {loadingStates[`dl-${item.sid}`]
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังดาวน์โหลด...</>
                      : t("cashier.downloadReceipt")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: PDF preview */}
        <Card className="self-start" style={{ flex: 2 }}>
          <CardContent className="p-6 space-y-2">
            <h3 className="text-base font-semibold">{t("cashier.receiptPdfSection")}</h3>
            {previewUrl ? (<>
              <iframe
                src={previewUrl}
                className="w-full rounded border"
                style={{ height: "600px" }}
                title="Receipt PDF"
              />
              {previewItem && (
                <Button
                  className="w-full gap-2"
                  onClick={() => handleDownloadReceipt(previewItem)}
                  disabled={!!loadingStates[`dl-${previewItem.sid}`]}
                >
                  {loadingStates[`dl-${previewItem.sid}`]
                    ? <><Loader2 className="h-4 w-4 animate-spin" />{t("cashier.downloadingPdf")}</>
                    : <>{t("cashier.downloadReceipt")}</>}
                </Button>
              )}
            </>) : (
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
