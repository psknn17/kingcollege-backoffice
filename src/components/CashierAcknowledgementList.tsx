import { useState, useMemo } from "react"
import * as XLSX from "xlsx"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { CalendarIcon, Search, Check, FileDown, Download, Loader2 } from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { format, endOfDay } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { generatePdfBlob, type StudentReceiptItem, type PaymentInfo } from "@/components/CashierReceiptPage"

type StudentEntry = {
  sid: string; name: string; guardian: string; grade: string; subtotal: number; invoices: any[]
}

type AckRecord = {
  id: string
  acknowledgeNo?: string
  status: "pending" | "issued"
  receiptNos: Record<string, string>
  paymentDate: string
  officialDate?: string
  paymentId: string
  studentData: StudentEntry[]
  paymentInfo: { bank: string; paymentMethod: string; chargeAmount: number; edcAmount: number; cardFee: number; remark: string }
  schoolYear: string
  createdAt: string
}

type FlatRow = { rec: AckRecord; inv: any | null; invIdx: number }

function fmt(n: number) {
  return `฿${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function assignAcknowledgeNo(): string {
  const year = new Date().getFullYear()
  const key = `ack_running_no_${year}`
  const next = parseInt(localStorage.getItem(key) || "0", 10) + 1
  localStorage.setItem(key, next.toString())
  return `R-CC-${year}-${String(next).padStart(5, "0")}`
}

function loadRecords(): AckRecord[] {
  try {
    const raw: any[] = JSON.parse(localStorage.getItem("cashier_acknowledgements") || "[]")
    let dirty = false
    const migrated = raw.map(r => {
      if (!r.acknowledgeNo) { dirty = true; return { ...r, acknowledgeNo: assignAcknowledgeNo() } }
      return r
    })
    if (dirty) localStorage.setItem("cashier_acknowledgements", JSON.stringify(migrated))
    return migrated
  } catch { return [] }
}

function grandTotal(rec: AckRecord) {
  return rec.studentData.reduce((s, st) => s + st.subtotal, 0) + rec.paymentInfo.cardFee
}

function studentNames(rec: AckRecord) {
  return rec.studentData.map(s => s.name).join(", ")
}

function getInvTerm(inv: any): string {
  return inv?.term ? (inv.term.match(/Term\s*\d+/i)?.[0] ?? inv.term) : "-"
}

const GRADE_ORDER = ["nursery", "pre-nursery", "reception"]

function formatGrade(g: string): string {
  const lower = g.toLowerCase()
  if (lower === "nursery") return "Nursery"
  if (lower === "pre-nursery") return "Pre-Nursery"
  if (lower === "reception") return "Reception"
  const num = lower.replace(/[^0-9]/g, "")
  return num ? `Year ${num}` : g.charAt(0).toUpperCase() + g.slice(1)
}

function sortGrades(grades: string[]): string[] {
  return [...grades].sort((a, b) => {
    const al = a.toLowerCase(); const bl = b.toLowerCase()
    const ai = GRADE_ORDER.indexOf(al); const bi = GRADE_ORDER.indexOf(bl)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    const an = parseInt(al.replace(/[^0-9]/g, ""), 10)
    const bn = parseInt(bl.replace(/[^0-9]/g, ""), 10)
    if (!isNaN(an) && !isNaN(bn)) return an - bn
    return al.localeCompare(bl)
  })
}

export function CashierAcknowledgementList() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [records, setRecords] = useState<AckRecord[]>(loadRecords)
  const [search, setSearch] = useState("")
  const [filterYearGroup, setFilterYearGroup] = useState("")
  const [filterAcademicYear, setFilterAcademicYear] = useState("")
  const [filterTerm, setFilterTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [calOpen, setCalOpen] = useState(false)

  // ── Flatten all records into per-invoice rows ──────────────────────────────
  const allFlatRows = useMemo<FlatRow[]>(() => {
    return records.flatMap(rec => {
      const invList: any[] = rec.studentData[0]?.invoices ?? []
      const rows = invList.length > 0 ? invList : [null]
      return rows.map((inv, invIdx) => ({ rec, inv, invIdx }))
    })
  }, [records])

  // ── Filter option values ───────────────────────────────────────────────────
  const ALL_YEAR_GROUPS = ["nursery", "pre-nursery", "reception",
    "year1","year2","year3","year4","year5","year6","year7",
    "year8","year9","year10","year11","year12","year13"]

  const uniqueAcademicYears = useMemo(() =>
    [...new Set(records.map(r => r.schoolYear).filter(Boolean))].sort().reverse()
  , [records])

  const uniqueTerms = useMemo(() => {
    const terms = new Set<string>()
    records.forEach(r => r.studentData.forEach(st => (st.invoices ?? []).forEach((inv: any) => {
      const term = inv.term ? (inv.term.match(/Term\s*\d+/i)?.[0] ?? inv.term) : null
      if (term) terms.add(term)
    })))
    return [...terms].sort()
  }, [records])

  // ── Apply all filters ──────────────────────────────────────────────────────
  const filteredRows = useMemo<FlatRow[]>(() => {
    return allFlatRows.filter(({ rec, inv }) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const ackNo = (rec.acknowledgeNo || rec.paymentId || "").toLowerCase()
        const names = studentNames(rec).toLowerCase()
        const sid = (rec.studentData[0]?.sid ?? "").toLowerCase()
        const invNo = inv ? (inv.invoiceNumber || inv.id || "").toLowerCase() : ""
        const receiptNos = Object.values(rec.receiptNos).join(" ").toLowerCase()
        if (!ackNo.includes(q) && !names.includes(q) && !sid.includes(q) && !invNo.includes(q) && !receiptNos.includes(q)) return false
      }
      if (filterYearGroup && rec.studentData[0]?.grade !== filterYearGroup) return false
      if (filterAcademicYear && rec.schoolYear !== filterAcademicYear) return false
      if (filterTerm) {
        if (!inv || getInvTerm(inv) !== filterTerm) return false
      }
      if (filterStatus && rec.status !== filterStatus) return false
      return true
    })
  }, [allFlatRows, search, filterYearGroup, filterAcademicYear, filterTerm, filterStatus])

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // First occurrence index of each record on the current page (for checkbox/status display)
  const firstOnPageSet = useMemo(() => {
    const seen = new Set<string>()
    const result = new Set<number>()
    pageRows.forEach(({ rec }, idx) => {
      if (!seen.has(rec.id)) { seen.add(rec.id); result.add(idx) }
    })
    return result
  }, [pageRows])

  const pageRecordIds = useMemo(() => [...new Set(pageRows.map(r => r.rec.id))], [pageRows])
  const selectedPendingIds = [...selected].filter(id => records.find(r => r.id === id)?.status === "pending")
  const allPageSelected = pageRecordIds.length > 0 && pageRecordIds.every(id => selected.has(id))
  const hasActiveFilter = !!(search || filterYearGroup || filterAcademicYear || filterTerm || filterStatus)

  function toggleAll() {
    const next = new Set(selected)
    if (allPageSelected) { pageRecordIds.forEach(id => next.delete(id)) }
    else { pageRecordIds.forEach(id => next.add(id)) }
    setSelected(next)
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  function clearFilters() {
    setSearch(""); setFilterYearGroup(""); setFilterAcademicYear(""); setFilterTerm(""); setFilterStatus(""); setPage(1)
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  function exportExcel() {
    const headers = [
      t("cashier.ackColAckNo"), t("cashier.ackColReceiptNo"),
      t("cashier.ackColStudent"), "Student ID", "Invoice No.",
      t("cashier.ackColYearGroup"), t("cashier.ackColAcademicYear"), t("cashier.ackColTerm"),
      t("cashier.ackColAmount"), t("cashier.paymentMethod"),
      t("cashier.ackColDate"), t("cashier.ackColStatus"),
    ]
    const dataRows = filteredRows.map(({ rec, inv }) => {
      const ackNo = rec.acknowledgeNo || rec.paymentId || rec.id
      const invReceiptNo = inv
        ? (rec.status === "issued" ? (rec.receiptNos[inv.id] ?? "-") : "-")
        : (rec.status === "issued" ? (Object.values(rec.receiptNos)[0] ?? "-") : "-")
      const invAmt = inv
        ? (inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0)
        : grandTotal(rec)
      const paymentMethodLabel = rec.paymentInfo.paymentMethod === "full" ? t("cashier.paymentFull")
        : rec.paymentInfo.paymentMethod === "installment" ? t("cashier.paymentInstallment")
        : rec.paymentInfo.paymentMethod
      return [
        ackNo,
        invReceiptNo,
        studentNames(rec),
        rec.studentData[0]?.sid || "",
        inv ? (inv.invoiceNumber || inv.id || "") : "",
        rec.studentData[0]?.grade || "-",
        rec.schoolYear,
        getInvTerm(inv),
        invAmt,
        paymentMethodLabel,
        format(new Date(rec.paymentDate), "dd/MM/yyyy"),
        rec.status === "pending" ? t("cashier.ackStatusPending") : t("cashier.ackStatusIssued"),
      ]
    })
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
    ws["!cols"] = headers.map((h: string) => ({ wch: Math.min(Math.max(String(h).length + 2, 14), 40) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Acknowledgements")
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    saveAs(blob, `Acknowledgements_${format(new Date(), "yyyyMMdd")}.xlsx`)
  }

  // ── Bulk Issue Date ────────────────────────────────────────────────────────
  function handleBulkIssue() {
    const targetIds = new Set(selectedPendingIds)
    if (targetIds.size === 0) return
    const targets = records.filter(r => targetIds.has(r.id))

    const newReceiptRecords = targets.flatMap(issueTarget => {
      const totalSubtotal = issueTarget.studentData.reduce((s, st) => s + st.subtotal, 0)
      const cardFeeTotal = issueTarget.paymentInfo.cardFee
      return issueTarget.studentData.flatMap(student => {
        const studentFee = totalSubtotal > 0
          ? Number((cardFeeTotal * student.subtotal / totalSubtotal).toFixed(2))
          : 0
        const invList: any[] = student.invoices ?? []
        let allocatedInvFee = 0
        return invList.map((inv: any, invIdx: number) => {
          const invAmt = inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
          const isLastInv = invIdx === invList.length - 1
          const invFee = student.subtotal > 0
            ? isLastInv
              ? Number((studentFee - allocatedInvFee).toFixed(2))
              : Number((studentFee * invAmt / student.subtotal).toFixed(2))
            : 0
          allocatedInvFee += invFee
          const received = invAmt + invFee
          return {
            id: crypto.randomUUID(),
            acknowledgeNo: issueTarget.acknowledgeNo || issueTarget.paymentId || issueTarget.id,
            receiptNo: issueTarget.receiptNos[inv.id] ?? "-",
            receiptDate: issueDate.toISOString(),
            clientType: "internal",
            clientNo: student.sid,
            clientName: student.name,
            contactName: student.guardian,
            yearGroup: student.grade,
            schoolYear: issueTarget.schoolYear,
            totalAmount: received,
            receivedAmount: received,
            creditNoteTotal: 0,
            netPayableAmount: received,
            overpaymentAmount: 0,
            paymentMethod: issueTarget.paymentInfo.paymentMethod,
            bankName: issueTarget.paymentInfo.bank,
            cardType: "",
            transactionFeeAmount: invFee,
            status: "generated",
            createdAt: new Date().toISOString(),
            invoices: [{
              id: inv.id,
              invoiceNo: inv.invoiceNumber || inv.id,
              invoiceDate: inv.issueDate ?? new Date().toISOString(),
              invoiceAmount: invAmt,
              receivedAmount: received,
              outstandingAmount: 0,
            }],
          }
        })
      })
    })

    const existing = JSON.parse(localStorage.getItem("receiptRecords_tuition") || "[]")
    localStorage.setItem("receiptRecords_tuition", JSON.stringify([...newReceiptRecords, ...existing]))

    const updated = records.map(r =>
      targetIds.has(r.id) ? { ...r, status: "issued" as const, officialDate: issueDate.toISOString() } : r
    )
    localStorage.setItem("cashier_acknowledgements", JSON.stringify(updated))
    setRecords(updated)
    setSelected(new Set())
    toast.success(t("cashier.ackIssuedBulkSuccess", { count: targets.length }))
    setIssueDialogOpen(false)
  }

  // ── Download PDF ───────────────────────────────────────────────────────────
  async function handleDownloadPdf(recs: AckRecord[]) {
    if (recs.length === 0) return
    setIsGeneratingPdf(true)
    const cashierName = user?.name ?? "Cashier"
    const pdfBlobs: { name: string; blob: Blob }[] = []
    try {
      for (const rec of recs) {
        const totalSubtotal = rec.studentData.reduce((s, st) => s + st.subtotal, 0)
        const totalFee = rec.paymentInfo.cardFee
        const globalOverpayment = Math.max(0, (rec.paymentInfo.chargeAmount ?? 0) - totalSubtotal)
        const paymentInfo: PaymentInfo = {
          bank: rec.paymentInfo.bank,
          cardType: "",
          paymentMethod: rec.paymentInfo.paymentMethod,
          chargeAmount: rec.paymentInfo.chargeAmount,
          edcAmount: rec.paymentInfo.edcAmount,
          remark: rec.paymentInfo.remark,
        }
        let allocatedFee = 0
        const studentItems: StudentReceiptItem[] = rec.studentData.map((st, sIdx) => {
          const isLastStudent = sIdx === rec.studentData.length - 1
          const stFee = totalSubtotal > 0
            ? isLastStudent
              ? Number((totalFee - allocatedFee).toFixed(2))
              : Number((totalFee * st.subtotal / totalSubtotal).toFixed(2))
            : 0
          allocatedFee += stFee
          const invList: any[] = st.invoices ?? []
          return {
            sid: st.sid,
            name: st.name,
            guardian: st.guardian,
            grade: st.grade ?? "-",
            receiptNo: rec.acknowledgeNo ?? Object.values(rec.receiptNos)[0] ?? "-",
            invoices: invList.length > 0
              ? invList.map((inv: any) => ({
                  invoiceId: inv.id,
                  invoiceNumber: inv.invoiceNumber || inv.id || "-",
                  invoiceAmount: inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0,
                }))
              : [{ invoiceId: rec.id, invoiceNumber: rec.acknowledgeNo ?? "-", invoiceAmount: st.subtotal }],
            totalAmount: st.subtotal,
            cardFee: stFee,
            overpaymentAmount: sIdx === 0 ? globalOverpayment : 0,
          }
        })
        for (const item of studentItems) {
          const blob = await generatePdfBlob(item, cashierName, paymentInfo)
          pdfBlobs.push({ name: `${rec.acknowledgeNo || rec.id}.pdf`, blob })
        }
      }
      if (pdfBlobs.length === 1) {
        saveAs(pdfBlobs[0].blob, pdfBlobs[0].name)
      } else {
        const zip = new JSZip()
        for (const { name, blob } of pdfBlobs) zip.file(name, blob)
        const zipBlob = await zip.generateAsync({ type: "blob" })
        saveAs(zipBlob, `Acknowledgements_${format(new Date(), "yyyyMMdd")}.zip`)
      }
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.ackTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("cashier.ackDesc")}</p>
        </div>
      </div>

      {/* Search + filters + bulk actions + export — one row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("cashier.ackSearchPlaceholder")}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 w-64"
          />
        </div>

        <Select value={filterYearGroup} onValueChange={v => { setFilterYearGroup(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Year Group" />
          </SelectTrigger>
          <SelectContent>
            {ALL_YEAR_GROUPS.map(g => <SelectItem key={g} value={g}>{formatGrade(g)}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterAcademicYear} onValueChange={v => { setFilterAcademicYear(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Academic Year" />
          </SelectTrigger>
          <SelectContent>
            {uniqueAcademicYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterTerm} onValueChange={v => { setFilterTerm(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            {uniqueTerms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t("cashier.ackStatusPending")}</SelectItem>
            <SelectItem value="issued">{t("cashier.ackStatusIssued")}</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilter && (
          <Button size="sm" className="h-9 px-3" style={{ backgroundColor: "#000", color: "#fff" }} onClick={clearFilters}>
            Clear
          </Button>
        )}

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("cashier.ackSelectedCount", { count: selected.size })}</span>
            {selectedPendingIds.length > 0 && (
              <Button size="sm" onClick={() => { setIssueDate(new Date()); setCalOpen(false); setIssueDialogOpen(true) }}>
                <CalendarIcon className="h-4 w-4 mr-1.5" />
                {t("cashier.ackIssueDateBtn")}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={isGeneratingPdf}
              onClick={() => handleDownloadPdf(records.filter(r => selected.has(r.id)))}
            >
              {isGeneratingPdf
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <FileDown className="h-4 w-4 mr-1.5" />}
              Download PDF
            </Button>
          </div>
        )}

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={exportExcel}
            className="gap-2 h-9"
            style={{ backgroundColor: "#000", color: "#fff" }}
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead align="center" className="w-10">
                <div
                  onClick={toggleAll}
                  className="w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer mx-auto"
                  style={allPageSelected
                    ? { backgroundColor: "#4f46e5", borderColor: "#4f46e5", color: "#fff" }
                    : { backgroundColor: "#fff", borderColor: "#cbd5e1" }}
                >
                  {allPageSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
              </TableHead>
              <TableHead align="center">{t("cashier.ackColAckNo")}</TableHead>
              <TableHead align="center">{t("cashier.ackColReceiptNo")}</TableHead>
              <TableHead align="center">{t("cashier.ackColStudent")}</TableHead>
              <TableHead align="center">{t("cashier.ackColYearGroup")}</TableHead>
              <TableHead align="center">{t("cashier.ackColAcademicYear")}</TableHead>
              <TableHead align="center">{t("cashier.ackColTerm")}</TableHead>
              <TableHead align="right">{t("cashier.ackColAmount")}</TableHead>
              <TableHead align="center">{t("cashier.paymentMethod")}</TableHead>
              <TableHead align="center">{t("cashier.ackColDate")}</TableHead>
              <TableHead align="center">{t("cashier.ackColStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-12 text-sm">
                  {hasActiveFilter ? t("cashier.ackNoSearchResults") : t("cashier.ackEmptyState")}
                </TableCell>
              </TableRow>
            ) : pageRows.map(({ rec, inv, invIdx }, pageIdx) => {
              const isFirstOnPage = firstOnPageSet.has(pageIdx)
              const ackNo = rec.acknowledgeNo || rec.paymentId || rec.id
              const invAmt = inv
                ? (inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0)
                : grandTotal(rec)
              const invReceiptNo = inv ? rec.receiptNos[inv.id] : Object.values(rec.receiptNos)[0]
              const paymentMethodLabel = rec.paymentInfo.paymentMethod === "full" ? t("cashier.paymentFull")
                : rec.paymentInfo.paymentMethod === "installment" ? t("cashier.paymentInstallment")
                : rec.paymentInfo.paymentMethod
              return (
                <TableRow
                  key={`${rec.id}-${invIdx}`}
                  style={selected.has(rec.id) ? { backgroundColor: "#eff6ff" } : {}}
                >
                  <TableCell align="center">
                    {isFirstOnPage ? (
                      <div
                        onClick={() => toggleOne(rec.id)}
                        className="w-4 h-4 rounded flex items-center justify-center border transition-all cursor-pointer mx-auto"
                        style={selected.has(rec.id)
                          ? { backgroundColor: "#4f46e5", borderColor: "#4f46e5", color: "#fff" }
                          : { backgroundColor: "#fff", borderColor: "#cbd5e1" }}
                      >
                        {selected.has(rec.id) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    ) : <div className="w-4 h-4 mx-auto" />}
                  </TableCell>
                  <TableCell align="center" className="font-mono text-sm">{ackNo}</TableCell>
                  <TableCell align="center" className="font-mono text-sm">
                    {rec.status === "issued" ? (invReceiptNo ?? "-") : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <div>
                      <div className="font-medium text-sm">{studentNames(rec)}</div>
                      <div className="text-sm text-muted-foreground">{rec.studentData[0]?.sid || ""}</div>
                      {inv && <div className="text-xs text-muted-foreground">{inv.invoiceNumber || inv.id}</div>}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <Badge variant="secondary" className="text-sm font-normal">
                      {formatGrade(rec.studentData[0]?.grade || "-")}
                    </Badge>
                  </TableCell>
                  <TableCell align="center" className="text-sm">{rec.schoolYear}</TableCell>
                  <TableCell align="center" className="text-sm">{getInvTerm(inv)}</TableCell>
                  <TableCell align="right" className="text-sm font-medium">{fmt(invAmt)}</TableCell>
                  <TableCell align="center" className="text-sm">{paymentMethodLabel}</TableCell>
                  <TableCell align="center" className="text-sm">
                    {format(new Date(rec.paymentDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell align="center">
                    {isFirstOnPage
                      ? rec.status === "pending"
                        ? <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">{t("cashier.ackStatusPending")}</Badge>
                        : <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">{t("cashier.ackStatusIssued")}</Badge>
                      : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onPageSizeChange={v => { setPageSize(v); setPage(1) }}
      />

      {/* Bulk Issue Date dialog */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("cashier.ackSetIssueDateTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t("cashier.ackSetIssueDateDesc", { count: selectedPendingIds.length })}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("cashier.ackOfficialDate")}</label>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{format(issueDate, "dd MMMM yyyy")}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={d => { if (d) { setIssueDate(d); setCalOpen(false) } }}
                    disabled={date => date > endOfDay(new Date())}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2035}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>{t("cashier.cancelBtn")}</Button>
            <Button onClick={handleBulkIssue}>{t("cashier.ackConfirmBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
