import React, { useState, useMemo } from "react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Input } from "./ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { CalendarIcon, Search, Check, FileDown, Loader2 } from "lucide-react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { cn } from "./ui/utils"
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

function firstReceiptNo(rec: AckRecord) {
  return Object.values(rec.receiptNos)[0] ?? "-"
}


export function CashierAcknowledgementList() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [records, setRecords] = useState<AckRecord[]>(loadRecords)
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueDate, setIssueDate] = useState<Date>(new Date())
  const [calOpen, setCalOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(rec =>
      (rec.acknowledgeNo || rec.paymentId || "").toLowerCase().includes(q) ||
      studentNames(rec).toLowerCase().includes(q) ||
      Object.values(rec.receiptNos).some(n => n.toLowerCase().includes(q))
    )
  }, [records, search])

  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const pageRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const selectedPendingIds = [...selected].filter(id => records.find(r => r.id === id)?.status === "pending")
  const allPageSelected = pageRecords.length > 0 && pageRecords.every(r => selected.has(r.id))

  function toggleAll() {
    const next = new Set(selected)
    if (allPageSelected) { pageRecords.forEach(r => next.delete(r.id)) }
    else { pageRecords.forEach(r => next.add(r.id)) }
    setSelected(next)
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.ackTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("cashier.ackDesc")}</p>
        </div>
      </div>

      {/* Search + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("cashier.ackSearchPlaceholder")}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 w-72"
          />
        </div>
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
            {pageRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-12 text-sm">
                  {search ? t("cashier.ackNoSearchResults") : t("cashier.ackEmptyState")}
                </TableCell>
              </TableRow>
            ) : pageRecords.flatMap(rec => {
              const invList: any[] = rec.studentData[0]?.invoices ?? []
              const ackNo = rec.acknowledgeNo || rec.paymentId || rec.id
              const rows = invList.length > 0 ? invList : [null]
              const paymentMethodLabel = rec.paymentInfo.paymentMethod === "full" ? t("cashier.paymentFull")
                : rec.paymentInfo.paymentMethod === "installment" ? t("cashier.paymentInstallment")
                : rec.paymentInfo.paymentMethod
              return rows.map((inv: any, invIdx: number) => {
                const isFirst = invIdx === 0
                const invAmt = inv
                  ? (inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0)
                  : grandTotal(rec)
                const invTerm = inv?.term
                  ? (inv.term.match(/Term\s*\d+/i)?.[0] ?? inv.term)
                  : "-"
                const invReceiptNo = inv ? rec.receiptNos[inv.id] : Object.values(rec.receiptNos)[0]
                return (
                  <TableRow
                    key={`${rec.id}-${invIdx}`}
                    style={selected.has(rec.id) ? { backgroundColor: "#eff6ff" } : {}}
                  >
                    <TableCell align="center">
                      {isFirst ? (
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
                      <Badge variant="secondary" className="text-sm font-normal capitalize">
                        {rec.studentData[0]?.grade || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell align="center" className="text-sm">{rec.schoolYear}</TableCell>
                    <TableCell align="center" className="text-sm">{invTerm}</TableCell>
                    <TableCell align="right" className="text-sm font-medium">{fmt(invAmt)}</TableCell>
                    <TableCell align="center" className="text-sm">{paymentMethodLabel}</TableCell>
                    <TableCell align="center" className="text-sm">
                      {format(new Date(rec.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell align="center">
                      {isFirst
                        ? rec.status === "pending"
                          ? <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">{t("cashier.ackStatusPending")}</Badge>
                          : <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">{t("cashier.ackStatusIssued")}</Badge>
                        : null}
                    </TableCell>
                  </TableRow>
                )
              })
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={filtered.length}
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
