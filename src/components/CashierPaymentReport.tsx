import { useState } from "react"
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
  transactionFeeAmount: number
  bankName: string
  cardType: string
  invoices: ReceiptInvoice[]
}

function fmtDateTime(iso: string): string {
  try { return format(new Date(iso), "dd/MM/yyyy HH:mm:ss") } catch { return iso }
}

function fmtDate(iso: string): string {
  try { return format(new Date(iso), "dd/MM/yyyy") } catch { return iso }
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

  function buildRows() {
    const records: ReceiptRecord[] = JSON.parse(localStorage.getItem("receiptRecords_tuition") || "[]")
    const start = startDate ? new Date(startDate + "T00:00:00") : null
    const end = endDate ? new Date(endDate + "T23:59:59") : null

    const rows: (string | number)[][] = []
    for (const rec of records) {
      const recDate = new Date(rec.receiptDate)
      if (start && recDate < start) continue
      if (end && recDate > end) continue

      for (const inv of rec.invoices ?? []) {
        const invoiceAmt = inv.invoiceAmount ?? 0
        const receivedAmt = inv.receivedAmount ?? 0
        const fee = Number((receivedAmt - invoiceAmt).toFixed(2))
        const rate = invoiceAmt > 0 ? Number(((fee / invoiceAmt) * 100).toFixed(2)) : 0

        rows.push([
          fmtDateTime(rec.receiptDate),
          inv.invoiceNo || "",
          rec.clientType || "tuition",
          fmtDate(inv.invoiceDate || rec.receiptDate),
          rec.clientName || "",
          rec.clientNo || "",
          invoiceAmt,
          receivedAmt,
          `${rate.toFixed(2)}%`,
          fee,
          invoiceAmt,
          rec.bankName || "",
          rec.cardType || "",
          "",
        ])
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
      t("cashier.report.col.invoiceNo"),
      t("cashier.report.col.invoiceType"),
      t("cashier.report.col.dueDate"),
      t("cashier.report.col.studentName"),
      t("cashier.report.col.studentId"),
      t("cashier.report.col.invoiceAmount"),
      t("cashier.report.col.receivedAmount"),
      t("cashier.report.col.cardFeeRate"),
      t("cashier.report.col.cardFee"),
      t("cashier.report.col.netAmount"),
      t("cashier.report.col.bank"),
      t("cashier.report.col.cardType"),
      t("cashier.report.col.remark"),
    ]

    const numRows = rows as (string | number)[][]
    const totalInvoice = numRows.reduce((s, r) => s + (typeof r[6] === "number" ? r[6] : 0), 0)
    const totalReceived = numRows.reduce((s, r) => s + (typeof r[7] === "number" ? r[7] : 0), 0)
    const totalFee = numRows.reduce((s, r) => s + (typeof r[9] === "number" ? r[9] : 0), 0)
    const totalNet = numRows.reduce((s, r) => s + (typeof r[10] === "number" ? r[10] : 0), 0)

    const totalRow: (string | number)[] = [
      t("cashier.report.total"), "", "", "", "", "",
      totalInvoice, totalReceived, "", totalFee, totalNet, "", "", "",
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
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }]
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
    <div className="space-y-6 max-w-3xl w-full mx-auto pt-8">
      <h1 className="text-2xl font-semibold">{t("cashier.report.title")}</h1>

      <Card>
        <CardContent className="pt-8 pb-8 px-8 space-y-6">
          {/* Quick filters */}
          <div>
            <p className="text-base font-medium mb-4">{t("cashier.report.selectPeriod")}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setQuickFilter("today")}>{t("cashier.report.today")}</Button>
              <Button variant="outline" onClick={() => setQuickFilter("week")}>{t("cashier.report.thisWeek")}</Button>
              <Button variant="outline" onClick={() => setQuickFilter("month")}>{t("cashier.report.thisMonth")}</Button>
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <Label>{t("cashier.report.startDate")}</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("cashier.report.endDate")}</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Report type */}
          <div className="space-y-2">
            <Label>{t("cashier.report.reportType")}</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("cashier.report.daily")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export button */}
          <Button onClick={exportExcel} disabled={!canExport} className="w-full flex items-center justify-center gap-2 mt-2">
            <Download className="w-4 h-4" />
            {t("cashier.report.exportBtn")}
          </Button>

          {/* Report field list */}
          <div className="pt-4">
            <p className="font-medium mb-4">{t("cashier.report.fieldsLabel")}</p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>{t("cashier.report.col.receiptDate")}</li>
              <li>{t("cashier.report.col.invoiceNo")}</li>
              <li>{t("cashier.report.col.invoiceType")}</li>
              <li>{t("cashier.report.col.dueDate")}</li>
              <li>{t("cashier.report.col.studentName")}</li>
              <li>{t("cashier.report.col.studentId")}</li>
              <li>{t("cashier.report.col.invoiceAmount")}</li>
              <li>{t("cashier.report.col.receivedAmount")}</li>
              <li>{t("cashier.report.col.cardFeeRate")}</li>
              <li>{t("cashier.report.col.cardFee")}</li>
              <li>{t("cashier.report.col.netAmount")}</li>
              <li>{t("cashier.report.col.bank")}</li>
              <li>{t("cashier.report.col.cardType")}</li>
              <li>{t("cashier.report.col.remark")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
