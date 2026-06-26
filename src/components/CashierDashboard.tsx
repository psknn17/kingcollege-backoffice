import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { DollarSign, Search, BarChart2, CalendarIcon } from "lucide-react"
import { format, isSameDay, endOfDay } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"

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

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CashierDashboard() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { handleMenuItemClick } = useAppNavigation()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calOpen, setCalOpen] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  // Auto-refresh on window focus
  useEffect(() => {
    const onFocus = () => setRefreshTick(n => n + 1)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  const collectedAmount = useMemo(() => {
    let sum = 0
    for (const key of RECEIPT_KEYS) {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const recs: { receiptDate: string; totalAmount?: number }[] = JSON.parse(raw)
        for (const r of recs) {
          try {
            if (isSameDay(new Date(r.receiptDate), selectedDate)) {
              sum += r.totalAmount ?? 0
            }
          } catch {
            // skip malformed date
          }
        }
      } catch {
        // skip malformed JSON
      }
    }
    return sum
  }, [selectedDate, refreshTick])

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t("cashier.welcome")}{user?.name ? `, ${user.name}` : ""}
              </h2>
              <p className="text-muted-foreground text-sm">{t("cashier.subtitle")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">{t("cashier.statsSummary")}</h3>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    setSelectedDate(d)
                    setCalOpen(false)
                  }
                }}
                disabled={(date) => date > endOfDay(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Card>
          <CardContent className="p-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("cashier.collectedOn")} {format(selectedDate, "dd/MM/yyyy")}
              </p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(collectedAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleMenuItemClick("cashier-student-search")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="text-3xl">🔍</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <p className="font-semibold">{t("cashier.searchStudentTitle")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("cashier.searchStudentDesc")}</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleMenuItemClick("cashier-payment-report")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="text-3xl">📊</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                <p className="font-semibold">{t("cashier.reportsTitle")}</p>
              </div>
              <p className="text-sm text-muted-foreground">{t("cashier.reportsDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
