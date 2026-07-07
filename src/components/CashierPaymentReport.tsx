import { useState, useMemo } from "react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download } from "lucide-react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"

interface ReceiptInvoice {
  id: string
  invoiceNo: string
  invoiceDate: string
  invoiceAmount: number
  receivedAmount: number
  outstandingAmount: number
}

interface ReceiptRecord {
  id: string
  receiptNo: string
  receiptDate: string
  clientType: string
  clientNo: string
  clientName: string
  yearGroup: string
  totalAmount: number
  overpaymentAmount?: number
  transactionFeeAmount: number
  bankName: string
  cardType: string
  invoices: ReceiptInvoice[]
}

function fmtDate(iso: string): string {
  try { return format(new Date(iso), "dd/MM/yyyy") } catch { return iso }
}

function fmtTime(iso: string): string {
  try { return format(new Date(iso), "HH:mm:ss") } catch { return "" }
}

export function CashierPaymentReport() {
  const todayStr = format(new Date(), "yyyy-MM-dd")
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [reportType, setReportType] = useState("daily")
  const { t } = useLanguage()

  function setQuickFilter(type: "today" | "week" | "month") {
    const now = new Date()
    if (type === "today") {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (type === "week") {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"))
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"))
    } else {
      setStartDate(format(startOfMonth(now), "yyyy-MM-dd"))
      setEndDate(format(endOfMonth(now), "yyyy-MM-dd"))
    }
  }

  const rows = useMemo(() => buildRows(), [startDate, endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildRows() {
    const ackRecords: any[] = (() => {
      try { return JSON.parse(localStorage.getItem("cashier_acknowledgements") || "[]") } catch { return [] }
    })()
    const start = startDate ? new Date(startDate + "T00:00:00") : null
    const end = endDate ? new Date(endDate + "T23:59:59") : null

    const rows: (string | number)[][] = []
    for (const rec of ackRecords) {
      const recDate = new Date(rec.paymentDate)
      if (start && recDate < start) continue
      if (end && recDate > end) continue

      const totalSubtotal: number = (rec.studentData ?? []).reduce((s: number, st: any) => s + (st.subtotal ?? 0), 0)
      const overAmt = Math.max(0, Number(((rec.paymentInfo?.chargeAmount ?? 0) - totalSubtotal).toFixed(2)))
      let overpaymentAssigned = false
      const rawMethod = rec.paymentInfo?.paymentMethod || ""
      const paymentMethodLabel = rawMethod === "full" ? t("cashier.paymentFull")
        : rawMethod === "installment" ? t("cashier.paymentInstallment")
        : rawMethod

      for (const student of rec.studentData ?? []) {
        const studentCardFee = totalSubtotal > 0
          ? Number((rec.paymentInfo.cardFee * student.subtotal / totalSubtotal).toFixed(2))
          : 0

        const invs: any[] = Array.isArray(student.invoices) ? student.invoices : []

        if (invs.length === 0) {
          // fallback: no invoice detail stored — use student subtotal as single row
          const rowOverpayment = (!overpaymentAssigned && overAmt > 0) ? overAmt : 0
          overpaymentAssigned = true
          const fallbackNet = student.subtotal + rowOverpayment
          rows.push([
            fmtDate(rec.paymentDate),
            fmtTime(rec.paymentDate),
            "",
            rec.acknowledgeNo || "",
            fmtDate(rec.paymentDate),
            student.name || "",
            student.sid || "",
            student.subtotal,
            rowOverpayment,
            fallbackNet,
            studentCardFee,
            studentCardFee > 0 && fallbackNet > 0 ? `${((studentCardFee / fallbackNet) * 100).toFixed(2)}%` : "",
            Number((fallbackNet + studentCardFee).toFixed(2)),
            rec.paymentInfo?.bank || "",
            paymentMethodLabel,
            rec.paymentInfo?.remark || "",
          ])
        } else {
          for (const inv of invs) {
            const candidates = [inv.netAmount, inv.finalAmount, inv.totalAmount, inv.subtotal]
            const invoiceAmt: number = candidates.find((v) => v != null && typeof v === "number" && v > 0) ?? 0
            const invCardFee = student.subtotal > 0
              ? Number((studentCardFee * invoiceAmt / student.subtotal).toFixed(2))
              : 0

            const rowOverpayment = (!overpaymentAssigned && overAmt > 0) ? overAmt : 0
            overpaymentAssigned = true

            const netAmt = invoiceAmt + rowOverpayment
            const rate = netAmt > 0 ? Number(((invCardFee / netAmt) * 100).toFixed(4)) : 0

            rows.push([
              fmtDate(rec.paymentDate),
              fmtTime(rec.paymentDate),
              inv.invoiceNumber || inv.id || "",
              rec.acknowledgeNo || "",
              fmtDate(inv.dueDate || inv.issueDate || rec.paymentDate),
              student.name || "",
              student.sid || "",
              invoiceAmt,
              rowOverpayment,
              netAmt,
              invCardFee,
              invCardFee !== 0 ? `${rate.toFixed(2)}%` : "",
              Number((netAmt + invCardFee).toFixed(2)),
              rec.paymentInfo?.bank || "",
              rec.paymentInfo?.remark || "",
              paymentMethodLabel,
            ])
          }
        }
      }
    }
    return rows
  }

  function exportExcel() {
    const rows = buildRows()
    const startLabel = startDate ? format(new Date(startDate), "dd/MM/yyyy") : "-"
    const endLabel = endDate ? format(new Date(endDate), "dd/MM/yyyy") : "-"
    const title = t("cashier.report.titleFormat", { start: startLabel, end: endLabel })

    const headers = [
      t("cashier.report.col.receiptDate"),
      t("cashier.report.col.time"),
      t("cashier.report.col.invoiceNo"),
      t("cashier.report.col.acknowledgementNo"),
      t("cashier.report.col.dueDate"),
      t("cashier.report.col.studentName"),
      t("cashier.report.col.studentId"),
      t("cashier.report.col.invoiceAmount"),
      t("cashier.report.col.overpayment"),
      t("cashier.report.col.netAmount"),
      t("cashier.report.col.cardFee"),
      t("cashier.report.col.cardFeeRate"),
      t("cashier.report.col.receivedAmount"),
      t("cashier.report.col.bank"),
      t("cashier.report.col.paymentMethod"),
      t("cashier.report.col.remark"),
    ]

    const numRows = rows as (string | number)[][]
    const totalInvoice = numRows.reduce((s, r) => s + (typeof r[7] === "number" ? r[7] : 0), 0)
    const totalOverpayment = numRows.reduce((s, r) => s + (typeof r[8] === "number" ? r[8] : 0), 0)
    const totalNet = numRows.reduce((s, r) => s + (typeof r[9] === "number" ? r[9] : 0), 0)
    const totalFee = numRows.reduce((s, r) => s + (typeof r[10] === "number" ? r[10] : 0), 0)
    const totalReceived = numRows.reduce((s, r) => s + (typeof r[12] === "number" ? r[12] : 0), 0)

    const totalRow: (string | number)[] = [
      t("cashier.report.total"), "", "", "", "", "", "",
      totalInvoice, totalOverpayment, totalNet, totalFee, "", totalReceived, "", "", "",
    ]

    const aoa: (string | number)[][] = [
      [title],
      [],
      headers,
      ...rows,
      [],
      totalRow,
    ]

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 15 } }]
    ws["!cols"] = headers.map((h, i) => ({
      wch: Math.min(
        Math.max(h.length, ...rows.map(r => String(r[i] ?? "").length)) + 2,
        50,
      ),
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t("cashier.report.sheetName"))

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    saveAs(blob, `${t("cashier.report.fileNamePrefix")}_${startLabel.replace(/\//g, "-")}_${t("cashier.report.fileNameSeparator")}_${endLabel.replace(/\//g, "-")}.xlsx`)
  }

  const canExport = !!startDate && !!endDate

  const fieldLabels = [
    t("cashier.report.col.receiptDate"),
    t("cashier.report.col.time"),
    t("cashier.report.col.invoiceNo"),
    t("cashier.report.col.acknowledgementNo"),
    t("cashier.report.col.dueDate"),
    t("cashier.report.col.studentName"),
    t("cashier.report.col.studentId"),
    t("cashier.report.col.invoiceAmount"),
    t("cashier.report.col.overpayment"),
    t("cashier.report.col.netAmount"),
    t("cashier.report.col.cardFee"),
    t("cashier.report.col.cardFeeRate"),
    t("cashier.report.col.receivedAmount"),
    t("cashier.report.col.bank"),
    t("cashier.report.col.remark"),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.report.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("cashier.report.desc")}</p>
        </div>
      </div>

      {/* Filter + Export */}
      <Card className="rounded-xl">
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {/* Quick filters — full width */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setQuickFilter("today")}>{t("cashier.report.today")}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setQuickFilter("week")}>{t("cashier.report.thisWeek")}</Button>
              <Button variant="outline" className="flex-1" onClick={() => setQuickFilter("month")}>{t("cashier.report.thisMonth")}</Button>
            </div>

            {/* Date range + Export in one row */}
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-sm">{t("cashier.report.startDate")}</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full" />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-sm">{t("cashier.report.endDate")}</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full" />
              </div>
              <Button onClick={exportExcel} disabled={!canExport} className="shrink-0 gap-2 h-10" style={{ backgroundColor: "#000", color: "#fff" }}>
                <Download className="w-4 h-4" />
                {t("cashier.report.exportBtn")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
