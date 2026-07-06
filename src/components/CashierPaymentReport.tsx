import { useState, useMemo } from "react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

      for (const student of rec.studentData ?? []) {
        const studentCardFee = totalSubtotal > 0
          ? Number((rec.paymentInfo.cardFee * student.subtotal / totalSubtotal).toFixed(2))
          : 0

        const invs: any[] = Array.isArray(student.invoices) ? student.invoices : []

        if (invs.length === 0) {
          // fallback: no invoice detail stored — use student subtotal as single row
          const rowOverpayment = (!overpaymentAssigned && overAmt > 0) ? overAmt : 0
          overpaymentAssigned = true
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
            student.subtotal,
            studentCardFee,
            studentCardFee > 0 && student.subtotal > 0 ? `${((studentCardFee / student.subtotal) * 100).toFixed(2)}%` : "",
            Number((student.subtotal + studentCardFee).toFixed(2)),
            rec.paymentInfo?.bank || "",
            rec.paymentInfo?.remark || "",
            rec.paymentInfo?.paymentMethod || "",
          ])
        } else {
          for (const inv of invs) {
            const candidates = [inv.netAmount, inv.finalAmount, inv.totalAmount, inv.subtotal]
            const invoiceAmt: number = candidates.find((v) => v != null && typeof v === "number" && v > 0) ?? 0
            const invCardFee = student.subtotal > 0
              ? Number((studentCardFee * invoiceAmt / student.subtotal).toFixed(2))
              : 0
            const netAmt = invoiceAmt
            const rate = netAmt > 0 ? Number(((invCardFee / netAmt) * 100).toFixed(4)) : 0

            const rowOverpayment = (!overpaymentAssigned && overAmt > 0) ? overAmt : 0
            overpaymentAssigned = true

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
              rec.paymentInfo?.paymentMethod || "",
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
      t("cashier.report.col.remark"),
      t("cashier.report.col.paymentMethod"),
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

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.report.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">Export payment report as Excel</p>
        </div>
      </div>

      {/* Filters + Export */}
      <Card>
        <CardContent className="pt-6 pb-6 px-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>{t("cashier.report.startDate")}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("cashier.report.endDate")}</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickFilter("today")}>{t("cashier.report.today")}</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter("week")}>{t("cashier.report.thisWeek")}</Button>
              <Button variant="outline" size="sm" onClick={() => setQuickFilter("month")}>{t("cashier.report.thisMonth")}</Button>
            </div>
            <Button onClick={exportExcel} disabled={!canExport} className="gap-2 ml-auto">
              <Download className="w-4 h-4" />
              {t("cashier.report.exportBtn")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead align="left">{t("cashier.report.col.receiptDate")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.time")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.invoiceNo")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.acknowledgementNo")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.dueDate")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.studentName")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.studentId")}</TableHead>
                <TableHead align="right">{t("cashier.report.col.invoiceAmount")}</TableHead>
                <TableHead align="right">{t("cashier.report.col.cardFee")}</TableHead>
                <TableHead align="right">{t("cashier.report.col.receivedAmount")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.bank")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.remark")}</TableHead>
                <TableHead align="left">{t("cashier.report.col.paymentMethod")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-12 text-sm">
                    No records in selected period.
                  </TableCell>
                </TableRow>
              ) : rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{row[0]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row[1]}</TableCell>
                  <TableCell className="font-mono text-xs">{row[2]}</TableCell>
                  <TableCell className="font-mono text-xs">{row[3]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row[4]}</TableCell>
                  <TableCell className="text-sm font-medium">{row[5]}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row[6]}</TableCell>
                  <TableCell align="right" className="text-sm font-medium">
                    {typeof row[7] === "number" ? `฿${row[7].toLocaleString()}` : row[7]}
                  </TableCell>
                  <TableCell align="right" className="text-sm">
                    {typeof row[10] === "number" ? `฿${row[10].toLocaleString()}` : row[10]}
                  </TableCell>
                  <TableCell align="right" className="text-sm font-semibold">
                    {typeof row[12] === "number" ? `฿${row[12].toLocaleString()}` : row[12]}
                  </TableCell>
                  <TableCell className="text-sm">{row[13]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row[14]}</TableCell>
                  <TableCell className="text-sm">{row[15]}</TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="font-semibold text-sm py-3">{t("cashier.report.total")}</TableCell>
                  <TableCell align="right" className="font-bold text-sm py-3">
                    ฿{rows.reduce((s, r) => s + (typeof r[7] === "number" ? r[7] : 0), 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" className="font-bold text-sm py-3">
                    ฿{rows.reduce((s, r) => s + (typeof r[10] === "number" ? r[10] : 0), 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" className="font-bold text-sm py-3">
                    ฿{rows.reduce((s, r) => s + (typeof r[12] === "number" ? r[12] : 0), 0).toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
