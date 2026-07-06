import { useState, useMemo, useEffect } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { 
  Search, 
  Users, 
  CreditCard, 
  X, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Check, 
  GraduationCap,
  Layers
} from "lucide-react"
import { cn } from "./ui/utils"
import { useStudents } from "@/contexts/StudentContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"
import { toast } from "sonner"

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

function getInitials(firstName: string, lastName: string): string {
  const f = firstName ? firstName.charAt(0).toUpperCase() : ""
  const l = lastName ? lastName.charAt(0).toUpperCase() : ""
  return `${f}${l}` || "ST"
}

function getAvatarGradient(initials: string): string {
  const charCodeSum = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)
  const gradients = [
    "from-blue-500 to-indigo-650",
    "from-indigo-500 to-purple-650",
    "from-violet-500 to-fuchsia-650",
    "from-emerald-500 to-teal-650",
    "from-sky-500 to-blue-650"
  ]
  return gradients[charCodeSum % gradients.length]
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
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
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
    const exact = students.some(s => s.firstName.toLowerCase() === q || s.lastName.toLowerCase() === q)
    if (exact) {
      return students.filter(s => s.firstName.toLowerCase() === q || s.lastName.toLowerCase() === q).slice(0, 50)
    }
    return students.filter(s =>
      s.studentId.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) || 
      s.lastName.toLowerCase().includes(q) ||
      (s.familyCode && s.familyCode.toLowerCase().includes(q)) ||
      (s.familyId && s.familyId.toLowerCase().includes(q))
    ).slice(0, 50)
  }, [query, students])

  // Auto-set first search result as active student
  useEffect(() => {
    if (results.length > 0) {
      if (!activeStudentId || !results.some(s => s.studentId === activeStudentId)) {
        setActiveStudentId(results[0].studentId)
        if (!multiPayMode) {
          setSelectedIds(new Set([results[0].studentId]))
        }
      }
    } else {
      setActiveStudentId(null)
      setSelectedIds(new Set())
    }
  }, [results, multiPayMode])

  const activeStudent = useMemo(() => {
    if (!activeStudentId) return null
    return students.find(s => s.studentId === activeStudentId) || null
  }, [activeStudentId, students])

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

  // Handles clicking the checkbox next to the student's name
  const handleToggleSelect = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation() // Prevent triggering the card click
    const student = students.find(s => s.studentId === studentId)
    if (!student) return
    
    if (!multiPayMode) { 
      setSelectedIds(new Set([studentId]))
      setActiveStudentId(studentId)
      return 
    }

    if (!selectedIds.has(studentId) && selectedIds.size > 0) {
      const firstSelectedId = Array.from(selectedIds)[0]
      const firstSelectedStudent = students.find(s => s.studentId === firstSelectedId)
      if (firstSelectedStudent && firstSelectedStudent.familyId !== student.familyId) {
        toast.error(t("cashier.sameFamilyOnly") || "Can only select students from the same family")
        return
      }
    }

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
        setActiveStudentId(studentId) // Display invoices for the newly selected student
      }
      return next
    })
  }

  // Handles clicking the card (displays details immediately)
  const handleCardClick = (studentId: string) => {
    setActiveStudentId(studentId)
    if (!multiPayMode) {
      setSelectedIds(new Set([studentId]))
    }
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

  const doSearch = () => { 
    setQuery(searchInput)
    setSelectedIds(new Set()) 
    setActiveStudentId(null)
  }

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
      return (
        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">{t("cashier.noUnpaidInvoices")}</p>
        </div>
      )
    }

    return (
      <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="w-12 text-center text-slate-600 font-semibold">{t("cashier.selectCol")}</TableHead>
              <TableHead className="text-left text-slate-600 font-semibold">{t("cashier.invoiceNumberCol")}</TableHead>
              <TableHead className="text-left text-slate-600 font-semibold">{t("cashier.typeCol")}</TableHead>
              <TableHead className="text-right text-slate-600 font-semibold">{t("cashier.amountCol")}</TableHead>
              <TableHead className="text-left pl-8 text-slate-600 font-semibold">{t("cashier.dueDateCol")}</TableHead>
              <TableHead className="text-center text-slate-600 font-semibold">{t("cashier.statusCol")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invs.map(inv => {
              const checked = sel.has(inv.id)
              return (
                <TableRow 
                  key={inv.id} 
                  onClick={() => toggleInv(sid, inv.id)} 
                  className={cn(
                    "cursor-pointer border-b border-slate-100 hover:bg-slate-50/80 transition-colors group",
                    checked && "bg-indigo-50/10"
                  )}
                >
                  <TableCell className="text-center py-3">
                    <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                      <div 
                        onClick={() => toggleInv(sid, inv.id)}
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                          checked 
                            ? "bg-indigo-650 border-indigo-650 text-white shadow-sm" 
                            : "border-slate-300 bg-white hover:border-slate-400"
                        )}
                      >
                        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-left font-mono text-xs font-semibold text-slate-700 py-3">
                    {inv.invoiceNumber || inv.id}
                  </TableCell>
                  <TableCell className="text-left py-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 text-sm">
                      <span className="w-2 h-2 rounded-full bg-indigo-550" />
                      {inv.category ? (categoryLabel[inv.category] || inv.category) : t("cashier.categoryTuition")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-3 font-semibold text-slate-900 text-sm">
                    ฿{getAmount(inv).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-left pl-8 py-3 text-slate-600 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(inv.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center py-3">
                    {(() => {
                      const ps = getPaymentStatus(inv)
                      const cls =
                        ps === "overdue"   ? "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50" :
                        ps === "partial"   ? "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-50" :
                        ps === "paid"      ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50" :
                        ps === "cancelled" ? "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-50" :
                                             "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50"
                      const label = ps.charAt(0).toUpperCase() + ps.slice(1)
                      return (
                        <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full font-semibold text-xs tracking-wide", cls)}>
                          {label}
                        </Badge>
                      )
                    })()}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="bg-slate-50/20 hover:bg-slate-50/20">
              <TableCell />
              <TableCell colSpan={2} className="font-semibold text-slate-800 text-sm py-3.5">
                {totalLabel ?? t("cashier.totalRow")}
              </TableCell>
              <TableCell className="text-right font-bold text-slate-900 text-base py-3.5">
                ฿{subtotal.toLocaleString()}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  // ── Right panel ────────────────────────────────────────────────
  const RightPanel = () => {
    if (!activeStudent) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full text-slate-400">
          <Users className="w-10 h-10 mb-2 stroke-[1.2] text-slate-350" />
          <p className="text-sm font-medium">{t("cashier.selectStudentPrompt")}</p>
        </div>
      )
    }

    const sid = activeStudent.studentId
    const invs = invoiceMap.get(sid) || []
    const sel = selInvByStudent.get(sid) ?? new Set<string>()
    const initials = getInitials(activeStudent.firstName, activeStudent.lastName)
    const gradient = getAvatarGradient(initials)

    return (
      <div className="space-y-6 flex flex-col h-full justify-between">
        <div className="space-y-6">
          {/* Selected Student Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold bg-gradient-to-tr shadow-inner shrink-0", gradient)}>
                {initials}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg md:text-xl tracking-wide truncate">{activeStudent.firstName} {activeStudent.lastName}</h3>
                  <Badge className="bg-white/10 hover:bg-white/15 text-indigo-200 border-none font-semibold text-xs py-0.5 px-2 shrink-0">
                    {activeStudent.gradeLevel} {activeStudent.room && `Room ${activeStudent.room}`}
                  </Badge>
                </div>
                <div className="flex items-center gap-x-4 gap-y-1 text-slate-300 text-xs flex-wrap font-mono">
                  <span>ID: {activeStudent.studentId}</span>
                  {activeStudent.familyCode && <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3" /> Family: {activeStudent.familyCode}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Unpaid Invoices Title */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-base inline-flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-indigo-650 stroke-[1.8]" />
                {t("cashier.unpaidInvoices")}
              </h4>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-750 font-semibold px-2 py-0.5 rounded-md">
                {invs.length}
              </Badge>
            </div>
            
            <InvoiceTable sid={sid} />
          </div>
        </div>

        {/* Grand Total Checkout Footer (rendered if there are students selected for payment) */}
        {selectedIds.size > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-200 bg-gradient-to-br from-indigo-50/20 to-slate-50/20 p-5 rounded-2xl border border-indigo-100/60 space-y-4">
            {multiPayMode && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-550 uppercase tracking-wider block">นักเรียนที่จะชำระเงิน ({selectedIds.size})</span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(selectedIds).map(selectedId => {
                    const s = students.find(stud => stud.studentId === selectedId)
                    if (!s) return null
                    return (
                      <Badge 
                        key={selectedId} 
                        variant="secondary" 
                        onClick={() => setActiveStudentId(selectedId)}
                        className={cn(
                          "cursor-pointer text-xs font-semibold px-2 py-1 rounded-lg border transition-all",
                          selectedId === activeStudentId
                            ? "bg-indigo-655 text-white border-indigo-650 shadow-sm"
                            : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                        )}
                      >
                        {s.firstName} {s.lastName}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm tracking-wide">
                {multiPayMode ? t("cashier.grandTotal") : t("cashier.subtotalSelected") || "ยอดรวมชำระ"}
              </span>
              <span className="font-extrabold text-slate-900 text-2xl tracking-tight">
                ฿{grandTotal.toLocaleString()}
              </span>
            </div>
            
            <Button
              className="w-full h-12 gap-2 text-white bg-gradient-to-r from-indigo-655 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md font-semibold text-base rounded-xl transition-all duration-300 transform active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
              disabled={!anySelected}
              onClick={() => {
                const payload = {
                  studentIds: Array.from(selectedIds),
                  invoiceMap: Array.from(selectedIds).map(selectedId => ({
                    studentId: selectedId,
                    invoiceIds: Array.from(selInvByStudent.get(selectedId) ?? new Set()),
                  }))
                }
                navigateToSubPage("cashier-payment", payload)
              }}
            >
              <CreditCard className="w-5 h-5" />
              {multiPayMode ? t("cashier.processMultiPayment") : t("cashier.processPayment")}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── Page ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full min-w-0 h-full p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 tracking-tight leading-none inline-flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-650" />
            {t("cashier.searchStudentTitle")}
          </h2>
          <p className="text-slate-500 text-sm mt-1.5">
            {t("cashier.searchStudentDesc") || "ค้นหารายชื่อนักเรียน เรียกดูใบแจ้งหนี้ และดำเนินการชำระเงินที่เคาน์เตอร์"}
          </p>
        </div>
      </div>

      {/* Search area Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder={t("cashier.searchPlaceholder")}
              className="pl-10 h-11 border-slate-200 focus-visible:ring-indigo-650 focus-visible:border-indigo-650 rounded-xl"
            />
            {searchInput && (
              <button 
                onClick={() => setSearchInput("")} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button onClick={doSearch} className="h-11 px-6 gap-2 text-sm font-semibold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all shrink-0">
            <Search className="w-4 h-4" />
            {t("cashier.searchBtn")}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-Pay Mode Toggle Button */}
          <button 
            onClick={() => toggleMultiPay(!multiPayMode)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold select-none transition-all duration-200",
              multiPayMode 
                ? "bg-indigo-50 border-indigo-200 text-indigo-750 shadow-sm" 
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded flex items-center justify-center border transition-all",
              multiPayMode ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-350 bg-white"
            )}>
              {multiPayMode && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            {t("cashier.multiPayMode")}
          </button>
        </div>
      </div>

      {/* Results Section (only rendered when search query is submitted) */}
      {query.trim() !== "" && (
        <div className="flex flex-col md:flex-row flex-1 min-h-[500px] bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Left Column: Student search results list (1/3 width, using flex layout) */}
          <div className="w-full md:w-1/3 border-r border-slate-100 flex flex-col overflow-hidden bg-slate-50/20">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t("cashier.searchResults") || "ผลการค้นหา"}
              </span>
              <Badge variant="secondary" className="bg-slate-200/60 text-slate-700 font-bold px-2 py-0.5 rounded">
                {results.length}
              </Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[500px] md:max-h-none">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400">
                  <AlertCircle className="w-10 h-10 mb-2 stroke-[1.2] text-rose-350" />
                  <p className="text-sm font-medium text-slate-600">{t("cashier.noStudentFound")}</p>
                  <p className="text-xs text-slate-400 mt-1">กรุณาลองค้นหาใหม่อีกครั้ง</p>
                </div>
              ) : (
                results.map(student => {
                  const guardian = student.parents?.find((p: any) => p.isPrimary)?.name || student.parents?.[0]?.name || "-"
                  const isSelected = selectedIds.has(student.studentId)
                  const isActive = student.studentId === activeStudentId
                  
                  return (
                    <div
                      key={student.id}
                      onClick={() => handleCardClick(student.studentId)}
                      className={cn(
                        "rounded-xl p-3.5 cursor-pointer border transition-all duration-200 relative flex items-center gap-3.5",
                        isActive
                          ? "bg-indigo-50/40 border-indigo-250 shadow-sm"
                          : "bg-white border-slate-100 hover:border-slate-255 hover:bg-slate-50/50"
                      )}
                    >
                      {/* Checkbox for quick selection next to student name */}
                      <div 
                        onClick={(e) => handleToggleSelect(e, student.studentId)}
                        className="shrink-0"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                          isSelected 
                            ? "bg-indigo-650 border-indigo-650 text-white shadow-sm" 
                            : "border-slate-300 bg-white hover:border-slate-400"
                        )}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Student Details (Avatar image has been removed for a clean, non-overlapping design) */}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm truncate">{student.firstName} {student.lastName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-550 font-mono">ID: {student.studentId}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-xs text-indigo-700 bg-indigo-50 font-semibold px-1.5 py-0.2 rounded-md shrink-0">{student.gradeLevel}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          <span className="font-medium text-slate-600">{t("cashier.guardian") || "ผู้ปกครอง"}:</span> {guardian}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Checkout Detail / Unpaid Invoices List (2/3 width) */}
          <div className="w-full md:w-2/3 flex flex-col p-6 overflow-y-auto">
            <RightPanel />
          </div>
        </div>
      )}
    </div>
  )
}
