import { useState, useMemo, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Search, Users, CreditCard, X } from "lucide-react"
import { cn } from "./ui/utils"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"

const INVOICE_KEYS = [
  "createdInvoices", "createdInvoices_eca", "createdInvoices_trip",
  "createdInvoices_exam", "createdInvoices_bus", "createdInvoices_external",
]
type PaymentStatus = "unpaid" | "partial" | "overdue" | "paid" | "cancelled"

function getPaymentStatus(inv: any): PaymentStatus {
  if (inv.status === "cancelled") return "cancelled"
  if (inv.status === "paid" || inv.paidDate) return "paid"
  if (inv.status === "partial") return "partial"
  if (inv.status === "overdue") return "overdue"
  if (inv.dueDate) {
    const due = new Date(inv.dueDate)
    if (!isNaN(due.getTime()) && due < new Date()) return "overdue"
  }
  return "unpaid"
}

function formatDate(d: any): string {
  if (!d) return "-"
  const date = new Date(d)
  if (isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function getAmount(inv: any): number {
  return inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
}
function loadInvoices(): any[] {
  try {
    const seen = new Set<string>(); const all: any[] = []
    for (const key of INVOICE_KEYS) {
      const raw = localStorage.getItem(key); if (!raw) continue
      for (const inv of JSON.parse(raw)) { if (!seen.has(inv.id)) { seen.add(inv.id); all.push(inv) } }
    }
    return all
  } catch { return [] }
}
function unpaidFor(allInvoices: any[], studentId: string): any[] {
  return allInvoices.filter(inv => {
    if (inv.studentId !== studentId) return false
    if (inv.approvalStatus !== "approved") return false
    const ps = getPaymentStatus(inv)
    return ps !== "paid" && ps !== "cancelled"
  })
}

export function CashierStudentSearch() {
  const { t } = useLanguage()
  const { students } = useStudents()
  const { navigateToSubPage } = useAppNavigation()

  const categoryLabel: Record<string, string> = {
    tuition: t("cashier.categoryTuition"), eca: t("cashier.categoryEca"),
    trip: t("cashier.categoryTrip"), exam: t("cashier.categoryExam"),
    bus: t("cashier.categoryBus"), external: t("cashier.categoryExternal"),
  }

  const [searchInput, setSearchInput] = useState("")
  const [query, setQuery] = useState("")
  const [multiPayMode, setMultiPayMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selInvByStudent, setSelInvByStudent] = useState<Map<string, Set<string>>>(new Map())
  const [allInvoices, setAllInvoices] = useState<any[]>([])

  useEffect(() => {
    setAllInvoices(loadInvoices())
    const onFocus = () => setAllInvoices(loadInvoices())
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase().trim()
    const fullName = (s: any) => `${s.firstName} ${s.lastName}`.toLowerCase()
    const exact = students.some(s => s.firstName.toLowerCase() === q || s.lastName.toLowerCase() === q || fullName(s) === q)
    if (exact) return students.filter(s => s.firstName.toLowerCase() === q || s.lastName.toLowerCase() === q || fullName(s) === q).slice(0, 50)
    return students.filter(s =>
      s.studentId.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) || s.lastName.toLowerCase().includes(q) ||
      fullName(s).includes(q)
    ).slice(0, 50)
  }, [query, students])

  const invoiceMap = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const sid of selectedIds) map.set(sid, unpaidFor(allInvoices, sid))
    return map
  }, [selectedIds, allInvoices])

  useEffect(() => {
    setSelInvByStudent(prev => {
      const next = new Map(prev)
      for (const sid of selectedIds) {
        if (!next.has(sid)) next.set(sid, new Set(unpaidFor(allInvoices, sid).map(i => i.id)))
      }
      for (const sid of next.keys()) { if (!selectedIds.has(sid)) next.delete(sid) }
      return next
    })
  }, [selectedIds, allInvoices])

  const select = (studentId: string) => {
    const student = students.find(s => s.studentId === studentId)
    if (!student) return
    if (!multiPayMode) { setSelectedIds(new Set([studentId])); return }
    if (selectedIds.has(studentId)) {
      const next = new Set(selectedIds); next.delete(studentId)
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds); next.add(studentId)
      setSelectedIds(next)
    }
  }
  const deselect = (sid: string) => {
    const next = new Set(selectedIds); next.delete(sid)
    setSelectedIds(next)
  }
  const toggleInv = (sid: string, invId: string) => {
    setSelInvByStudent(prev => {
      const next = new Map(prev)
      const ids = new Set(next.get(sid) || new Set<string>())
      ids.has(invId) ? ids.delete(invId) : ids.add(invId)
      next.set(sid, ids); return next
    })
  }
  const toggleMultiPay = (checked: boolean) => {
    setMultiPayMode(checked)
    if (!checked && selectedIds.size > 1) {
      setSelectedIds(new Set([Array.from(selectedIds).pop()!]))
    }
  }
  const doSearch = () => { setQuery(searchInput); setSelectedIds(new Set()) }

  const grandTotal = useMemo(() => {
    let total = 0
    for (const [sid, invs] of invoiceMap) {
      const sel = selInvByStudent.get(sid) ?? new Set<string>()
      total += invs.filter(i => sel.has(i.id)).reduce((s, i) => s + getAmount(i), 0)
    }
    return total
  }, [invoiceMap, selInvByStudent])

  const anySelected = useMemo(() => {
    for (const ids of selInvByStudent.values()) if (ids.size > 0) return true
    return false
  }, [selInvByStudent])

  // ── Invoice table ─────────────────────────────────────────────
  const InvoiceTable = ({ sid, totalLabel }: { sid: string; totalLabel?: string }) => {
    const invs = invoiceMap.get(sid) || []
    const sel = selInvByStudent.get(sid) ?? new Set<string>()
    const subtotal = invs.filter(i => sel.has(i.id)).reduce((s, i) => s + getAmount(i), 0)

    if (invs.length === 0) {
      return <p className="text-sm text-muted-foreground py-2">{t("cashier.noUnpaidInvoices")}</p>
    }

    return (
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead align="center" className="w-[5%]">{t("cashier.selectCol")}</TableHead>
            <TableHead align="left" className="w-[25%]">{t("cashier.invoiceNumberCol")}</TableHead>
            <TableHead align="left" className="w-[22%]">{t("cashier.typeCol")}</TableHead>
            <TableHead align="right" className="w-[18%]">{t("cashier.amountCol")}</TableHead>
            <TableHead align="left" className="w-[18%]">{t("cashier.dueDateCol")}</TableHead>
            <TableHead align="center" className="w-[12%]">{t("cashier.statusCol")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invs.map(inv => {
            const checked = sel.has(inv.id)
            const status = (inv.status || "").toLowerCase()
            return (
              <TableRow key={inv.id} onClick={() => toggleInv(sid, inv.id)} className="cursor-pointer">
                <TableCell align="center">
                  <Checkbox checked={checked} onCheckedChange={() => toggleInv(sid, inv.id)} onClick={e => e.stopPropagation()} />
                </TableCell>
                <TableCell align="left" className="font-mono text-sm">{inv.invoiceNumber || inv.id}</TableCell>
                <TableCell align="left">{inv.category ? (categoryLabel[inv.category] || inv.category) : t("cashier.categoryTuition")}</TableCell>
                <TableCell align="right" className="font-medium">{getAmount(inv).toLocaleString()} {t("cashier.bahtUnit")}</TableCell>
                <TableCell align="left">{formatDate(inv.dueDate)}</TableCell>
                <TableCell align="center">
                  {(() => {
                    const ps = getPaymentStatus(inv)
                    const cls =
                      ps === "overdue"   ? "bg-red-100 text-red-800 hover:bg-red-100" :
                      ps === "partial"   ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" :
                      ps === "paid"      ? "bg-green-100 text-green-800 hover:bg-green-100" :
                      ps === "cancelled" ? "bg-gray-100 text-gray-500 hover:bg-gray-100" :
                                           "bg-gray-100 text-gray-600 hover:bg-gray-100"
                    const label = ps.charAt(0).toUpperCase() + ps.slice(1)
                    return <Badge className={cls}>{label}</Badge>
                  })()}
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow>
            <TableCell />
            <TableCell colSpan={2} className="font-medium">{totalLabel ?? t("cashier.totalRow")}</TableCell>
            <TableCell align="right" className="font-bold">{subtotal.toLocaleString()} {t("cashier.bahtUnit")}</TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    )
  }

  // ── Right panel ────────────────────────────────────────────────
  const RightPanel = () => {
    // Single mode
    if (!multiPayMode) {
      const sid = Array.from(selectedIds)[0]
      if (!sid) return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("cashier.selectStudentPrompt")}</p>
        </div>
      )
      const student = students.find(s => s.studentId === sid)
      if (!student) return null
      const invs = invoiceMap.get(sid) || []
      const sel = selInvByStudent.get(sid) ?? new Set<string>()
      return (
        <div className="flex flex-col">
          <div className="mb-5 pb-4 border-b border-gray-100">
            <p className="text-lg font-semibold">{student.firstName} {student.lastName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{t("cashier.studentIdLabel")}: {student.studentId}</p>
          </div>
          <p className="font-semibold mb-3">{t("cashier.unpaidInvoices")}</p>
          <InvoiceTable sid={sid} />
          {invs.length > 0 && (
            <Button disabled={sel.size === 0} className="w-full mt-2 gap-2" onClick={() => {
              const payload = {
                studentIds: Array.from(selectedIds),
                invoiceMap: Array.from(selectedIds).map(sid => ({
                  studentId: sid,
                  invoiceIds: Array.from(selInvByStudent.get(sid) ?? new Set()),
                }))
              }
              navigateToSubPage("cashier-payment", payload)
            }}>
              <CreditCard className="w-4 h-4" />{t("cashier.processPayment")}
            </Button>
          )}
        </div>
      )
    }

    // Multi mode — empty state
    const arr = Array.from(selectedIds)
    if (arr.length === 0) return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Users className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("cashier.selectStudentPrompt")}</p>
      </div>
    )

    // Multi mode — with selections
    return (
      <div className="flex flex-col">
        {/* Header */}
        <p className="font-semibold mb-4">{t("cashier.selectedStudentsHeader")} ({arr.length})</p>

        {/* Student sections — continuous, separated by divider */}
        {arr.map((sid, idx) => {
          const student = students.find(s => s.studentId === sid)
          if (!student) return null
          return (
            <div key={sid} className={cn("flex flex-col", idx > 0 && "mt-6 pt-6 border-t border-gray-100")}>
              {/* Name row + X button */}
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">{idx + 1}. {student.firstName} {student.lastName}</p>
                <Button
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => deselect(sid)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{t("cashier.studentIdLabel")}: {student.studentId}</p>
              <p className="text-sm font-medium mb-3">{t("cashier.selectCol")} Invoice</p>
              <InvoiceTable sid={sid} totalLabel={t("cashier.subtotalSelected")} />
            </div>
          )
        })}

        {/* Grand total + button */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="font-bold">{t("cashier.grandTotal")}: {grandTotal.toLocaleString()} {t("cashier.bahtUnit")}</p>
          <Button
            className="w-full mt-3 gap-2"
            disabled={!anySelected}
            onClick={() => {
              const payload = {
                studentIds: Array.from(selectedIds),
                invoiceMap: Array.from(selectedIds).map(sid => ({
                  studentId: sid,
                  invoiceIds: Array.from(selInvByStudent.get(sid) ?? new Set()),
                }))
              }
              navigateToSubPage("cashier-payment", payload)
            }}
          >
            <CreditCard className="w-4 h-4" />{t("cashier.processMultiPayment")}
          </Button>
        </div>
      </div>
    )
  }

  // ── Page ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 w-full min-w-0 h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.searchStudentTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("cashier.searchStudentDesc")}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Search area */}
        <div className="p-4 md:p-6 space-y-3">
          <div className="flex gap-2">
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder={t("cashier.searchPlaceholder")}
              className="flex-1 h-10"
            />
            <Button onClick={doSearch} className="h-10 px-5 gap-2 shrink-0">
              <Search className="w-4 h-4" />{t("cashier.searchBtn")}
            </Button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <Checkbox checked={multiPayMode} onCheckedChange={checked => toggleMultiPay(!!checked)} id="multi" />
            <span className="text-sm text-muted-foreground select-none">{t("cashier.multiPayMode")}</span>
          </label>
        </div>

        {/* Results */}
        {query.trim() !== "" && (
          <div className="flex flex-1 min-h-0 border-t border-gray-100">

            {/* Left: student list */}
            {(() => {
              const visibleResults = results
              return (
                <div className="w-64 md:w-72 border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-medium text-muted-foreground">{t("cashier.searchResults")} ({visibleResults.length})</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {visibleResults.length === 0
                      ? <p className="text-sm text-muted-foreground text-center py-8">{t("cashier.noStudentFound")}</p>
                      : visibleResults.map(student => {
                          const guardian = student.parents?.find((p: any) => p.isPrimary)?.name || student.parents?.[0]?.name || "-"
                          const isSelected = selectedIds.has(student.studentId)
                          return (
                            <div
                              key={student.id}
                              onClick={() => select(student.studentId)}
                              className={cn(
                                "rounded-lg p-3 cursor-pointer border transition-colors",
                                isSelected
                                  ? "bg-primary/5 border-primary/30"
                                  : "bg-amber-50 border-amber-100 hover:bg-amber-100/70"
                              )}
                            >
                              <p className="font-medium text-sm">{student.firstName} {student.lastName}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{t("cashier.studentIdLabel")}: {student.studentId}</p>
                              <p className="text-sm text-muted-foreground">{t("cashier.guardian")}: {guardian}</p>
                              {isSelected && (
                                <p className="text-sm text-primary mt-1">✓ {t("cashier.alreadySelected")}</p>
                              )}
                            </div>
                          )
                        })
                    }
                  </div>
                </div>
              )
            })()}

            {/* Right: invoice panel */}
            <div className="flex-1 min-w-0 overflow-y-auto p-6">
              <RightPanel />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
