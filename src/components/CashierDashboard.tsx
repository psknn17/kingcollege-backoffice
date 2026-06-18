import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "./ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Users, FileText, DollarSign, CheckCircle, Clock, AlertTriangle, Search, BarChart2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAcademicYears } from "@/contexts/AcademicYearContext"
import { useStudents } from "@/contexts/StudentContext"
import { useAuth } from "@/contexts/AuthContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"

const INVOICE_KEYS = [
  "createdInvoices",
  "createdInvoices_eca",
  "createdInvoices_trip",
  "createdInvoices_exam",
  "createdInvoices_bus",
  "createdInvoices_external",
]

const CONFIRMED_STATUSES = ["paid", "sent", "overdue", "approved"]

const STANDARD_YEAR_GROUPS = [
  "Pre-Nursery", "Nursery", "Reception",
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13",
]

interface StoredInvoice {
  id: string
  studentId?: string
  subtotal?: number
  netAmount?: number
  totalDiscount?: number
  totalAmount?: number
  finalAmount?: number
  status?: string
  approvalStatus?: string
  academicYear?: string
  term?: string
  studentGrade?: string
  [key: string]: any
}

function normalizeStatus(status?: string): string {
  if (!status) return "draft"
  if (status === "pending") return "draft"
  return status
}

function getInvoiceAmount(inv: StoredInvoice): number {
  return inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
}

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function matchAcademicYear(inv: StoredInvoice, yearId: string): boolean {
  if (!yearId || yearId === "all") return true
  const withSlash = yearId.replace(/-/g, "/")
  if (inv.academicYear === withSlash || inv.academicYear === yearId) return true
  if (inv.term?.startsWith(yearId)) return true
  return false
}

function BahtIcon({ className }: { className?: string }) {
  return <span className={className} style={{ fontWeight: 600, fontSize: "0.9em", lineHeight: 1 }}>฿</span>
}

export function CashierDashboard() {
  const { t } = useLanguage()
  const { academicYears } = useAcademicYears()
  const { students } = useStudents()
  const { user } = useAuth()
  const { handleMenuItemClick } = useAppNavigation()

  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedYearGroup, setSelectedYearGroup] = useState<string>("all")
  const [invoices, setInvoices] = useState<StoredInvoice[]>([])

  const loadInvoices = useCallback(() => {
    try {
      const seen = new Set<string>()
      const all: StoredInvoice[] = []
      for (const key of INVOICE_KEYS) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed: StoredInvoice[] = JSON.parse(raw)
        for (const inv of parsed) {
          if (!seen.has(inv.id)) {
            seen.add(inv.id)
            all.push(inv)
          }
        }
      }
      setInvoices(all)
    } catch {
      setInvoices([])
    }
  }, [])

  useEffect(() => {
    loadInvoices()
    const handleFocus = () => loadInvoices()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [loadInvoices])

  // Build student grade lookup map
  const studentGradeMap = new Map<string, string>()
  for (const s of students) {
    studentGradeMap.set(s.id, s.gradeLevel)
    studentGradeMap.set(s.studentId, s.gradeLevel)
  }

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (!matchAcademicYear(inv, selectedYear)) return false
    if (selectedYearGroup !== "all") {
      const grade = inv.studentGrade
        || (inv.studentId ? studentGradeMap.get(inv.studentId) : undefined)
        || (inv.id ? studentGradeMap.get(inv.id) : undefined)
      if (grade !== selectedYearGroup) return false
    }
    return true
  })

  // Stat calculations — only confirmed statuses
  const confirmedInvoices = filteredInvoices.filter(inv => {
    const s = normalizeStatus(inv.status)
    return CONFIRMED_STATUSES.includes(s)
  })

  const totalCount = confirmedInvoices.length

  const totalAmount = confirmedInvoices.reduce((sum, inv) => sum + getInvoiceAmount(inv), 0)

  const paidAmount = confirmedInvoices
    .filter(inv => normalizeStatus(inv.status) === "paid")
    .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0)

  const upcomingAmount = confirmedInvoices
    .filter(inv => {
      const s = normalizeStatus(inv.status)
      return s === "sent" || s === "approved"
    })
    .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0)

  const overdueAmount = confirmedInvoices
    .filter(inv => normalizeStatus(inv.status) === "overdue")
    .reduce((sum, inv) => sum + getInvoiceAmount(inv), 0)

  const studentCount = selectedYearGroup === "all"
    ? students.length
    : students.filter(s => s.gradeLevel === selectedYearGroup).length

  const statCards = [
    {
      label: t("cashier.totalStudents"),
      value: studentCount.toLocaleString(),
      icon: Users,
      border: "",
    },
    {
      label: t("cashier.totalInvoices"),
      value: totalCount.toLocaleString(),
      icon: FileText,
      border: "",
    },
    {
      label: t("cashier.totalAmount"),
      value: formatCurrency(totalAmount),
      icon: BahtIcon,
      border: "",
    },
    {
      label: t("cashier.paid"),
      value: formatCurrency(paidAmount),
      icon: CheckCircle,
      border: "border-l-4 border-l-green-500",
    },
    {
      label: t("cashier.upcoming"),
      value: formatCurrency(upcomingAmount),
      icon: Clock,
      border: "border-l-4 border-l-yellow-400",
    },
    {
      label: t("cashier.overdue"),
      value: formatCurrency(overdueAmount),
      icon: AlertTriangle,
      border: "border-l-4 border-l-red-500",
    },
  ]

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
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("cashier.allAcademicYears")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cashier.allAcademicYears")}</SelectItem>
                {academicYears.map(y => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYearGroup} onValueChange={setSelectedYearGroup}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("cashier.allYearGroups")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("cashier.allYearGroups")}</SelectItem>
                {STANDARD_YEAR_GROUPS.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 1: 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {statCards.slice(0, 4).map(card => (
            <Card key={card.label} className={card.border}>
              <CardContent className="p-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: 2 cards (left-aligned) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.slice(4, 6).map(card => (
            <Card key={card.label} className={card.border}>
              <CardContent className="p-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
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
