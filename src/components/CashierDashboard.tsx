import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { format, isSameDay } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"

const RECEIPT_KEYS = [
  "receiptRecords_tuition",
  "receiptRecords_afterschool",
  "receiptRecords_eca",
  "receiptRecords_event",
  "receiptRecords_exam",
  "receiptRecords_trip",
  "receiptRecords_bus",
  "receiptRecords_external",
  "receiptRecords_summer",
]

type BankRow = { bankName: string; netAmount: number; invoiceCount: number }

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDisplay(dateStr: string): string {
  try { return format(new Date(dateStr), "d MMMM yyyy") } catch { return dateStr }
}

export function CashierDashboard() {
  const { t } = useLanguage()
  const { user } = useAuth()
const todayStr = format(new Date(), "yyyy-MM-dd")
  const [fromDate, setFromDate] = useState<string>(todayStr)
  const [toDate, setToDate] = useState<string>(todayStr)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    const onFocus = () => setRefreshTick(n => n + 1)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  function inRange(dateIso: string): boolean {
    try {
      const d = new Date(dateIso)
      const from = new Date(fromDate + "T00:00:00")
      const to = new Date(toDate + "T23:59:59")
      return d >= from && d <= to
    } catch { return false }
  }

  const bankBreakdown = useMemo<BankRow[]>(() => {
    const map = new Map<string, BankRow>()
    for (const key of RECEIPT_KEYS) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const recs: {
          receiptDate: string
          totalAmount?: number
          transactionFeeAmount?: number
          bankName?: string
          invoices?: unknown[]
        }[] = JSON.parse(raw)
        for (const r of recs) {
          try {
            if (!inRange(r.receiptDate)) continue
            const bank = r.bankName?.trim() || "Unknown"
            const net = Math.max(0, (r.totalAmount ?? 0) - (r.transactionFeeAmount ?? 0))
            const count = r.invoices?.length ?? 0
            const existing = map.get(bank)
            if (existing) {
              existing.netAmount += net
              existing.invoiceCount += count
            } else {
              map.set(bank, { bankName: bank, netAmount: net, invoiceCount: count })
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
    return [...map.values()]
      .filter(row => row.netAmount > 0)
      .sort((a, b) => b.netAmount - a.netAmount)
  }, [fromDate, toDate, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalInvoiceCount = bankBreakdown.reduce((s, r) => s + r.invoiceCount, 0)
  const totalNetAmount = bankBreakdown.reduce((s, r) => s + r.netAmount, 0)

  const todayTotal = useMemo(() => {
    const today = new Date()
    let sum = 0
    for (const key of RECEIPT_KEYS) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const recs: { receiptDate: string; totalAmount?: number }[] = JSON.parse(raw)
        for (const r of recs) {
          try {
            if (isSameDay(new Date(r.receiptDate), today)) sum += r.totalAmount ?? 0
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
    return sum
  }, [refreshTick])

  const dateLabel = fromDate === toDate
    ? `Date: ${fmtDisplay(fromDate)}`
    : `${fmtDisplay(fromDate)} – ${fmtDisplay(toDate)}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">
            {t("cashier.welcome")}{user?.name ? `, ${user.name}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("cashier.subtitle")}</p>
        </div>
      </div>

      {/* Today's total card */}
      <Card>
        <CardContent className="p-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("cashier.collectedOn")} {fmtDisplay(todayStr)}
            </p>
          </div>
          <p className="text-2xl font-bold">฿{formatCurrency(todayTotal)}</p>
        </CardContent>
      </Card>

      {/* Bank Breakdown */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">{t("cashier.bankBreakdown")}</h3>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">{t("cashier.dashboard.from")}</Label>
              <Input
                type="date"
                value={fromDate}
                max={todayStr}
                onChange={e => setFromDate(e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("cashier.dashboard.to")}</Label>
              <Input
                type="date"
                value={toDate}
                max={todayStr}
                onChange={e => setToDate(e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 self-end"
              onClick={() => { setFromDate(todayStr); setToDate(todayStr) }}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-1/2">
                    {dateLabel}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-1/4">
                    {t("cashier.dashboard.noOfInvoice")}
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-1/4">
                    {t("cashier.dashboard.amountTHB")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bankBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground py-8 text-sm">
                      No records in selected period.
                    </td>
                  </tr>
                ) : bankBreakdown.map(row => (
                  <tr key={row.bankName} className="border-b border-gray-50">
                    <td className="px-4 py-3 font-medium">{row.bankName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.invoiceCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
              {bankBreakdown.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 font-bold">{t("cashier.dashboard.total")}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{totalInvoiceCount}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatCurrency(totalNetAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
