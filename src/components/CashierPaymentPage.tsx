import React, { useMemo, useState, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { ChevronLeft } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useStudents } from "@/contexts/StudentContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"
import { toast } from "@/components/ui/sonner"
import { ALL_BANKS } from "./CashierBankFeeSettings"

// ── Constants ─────────────────────────────────────────────────
const INVOICE_KEYS = [
  "createdInvoices","createdInvoices_eca","createdInvoices_trip",
  "createdInvoices_exam","createdInvoices_bus","createdInvoices_external",
]


function getAmount(inv: any): number {
  return inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function loadAllInvoices(): any[] {
  try {
    const seen = new Set<string>()
    const all: any[] = []
    for (const key of INVOICE_KEYS) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      for (const inv of JSON.parse(raw)) {
        if (!seen.has(inv.id)) { seen.add(inv.id); all.push(inv) }
      }
    }
    return all
  } catch { return [] }
}

export function CashierPaymentPage() {
  const { t } = useLanguage()
  const { students } = useStudents()
  const { subPageParams, navigateBack, navigateToSubPage } = useAppNavigation()

  const [selectedBank, setSelectedBank] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"full" | "installment">("full")
  const [chargeAmount, setChargeAmount] = useState<number>(0)
  const [remark, setRemark] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Parse payload from navigation params
  const studentIds: string[] = subPageParams?.studentIds ?? []
  const invoiceMapRaw: { studentId: string; invoiceIds: string[] }[] = subPageParams?.invoiceMap ?? []
  const invoiceIdsByStudent = new Map(invoiceMapRaw.map(item => [item.studentId, new Set(item.invoiceIds)]))

  const categoryLabel: Record<string, string> = {
    tuition: t("cashier.categoryTuition"), eca: t("cashier.categoryEca"),
    trip: t("cashier.categoryTrip"), exam: t("cashier.categoryExam"),
    bus: t("cashier.categoryBus"), external: t("cashier.categoryExternal"),
  }

  // Load invoices from localStorage
  const allInvoices = useMemo(() => loadAllInvoices(), [])

  // Build per-student data
  const studentData = useMemo(() => {
    return studentIds.map(sid => {
      const student = students.find(s => s.studentId === sid)
      const selectedInvIds = invoiceIdsByStudent.get(sid) ?? new Set<string>()
      const invoices = allInvoices.filter(inv => selectedInvIds.has(inv.id))
      const guardian = student?.parents?.find((p: any) => p.isPrimary)?.name
        || student?.parents?.[0]?.name || "-"
      const subtotal = invoices.reduce((s, inv) => s + getAmount(inv), 0)
      return { sid, student, invoices, guardian, subtotal }
    })
  }, [studentIds, allInvoices, students])

  const grandTotal = useMemo(() => studentData.reduce((s, d) => s + d.subtotal, 0), [studentData])

  const isSameFamily = useMemo(() => {
    if (studentData.length <= 1) return true
    const ids = studentData.map(d => d.student?.familyId ?? d.sid)
    return new Set(ids).size === 1
  }, [studentData])

  type BankFeeEntry = { bankId: string; bankName: string; feeRate: number }

  const configuredBanks: BankFeeEntry[] = useMemo(() => {
    try {
      const raw = localStorage.getItem("cashier_bank_fees")
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch { return [] }
  }, [selectedBank])

  const feeRate = configuredBanks.find(e => e.bankId === selectedBank)?.feeRate ?? 0
  const cardFee = useMemo(() => Number((chargeAmount * feeRate / 100).toFixed(2)), [chargeAmount, feeRate])
  const edcAmountCalc = Number((chargeAmount + cardFee).toFixed(2))

  useEffect(() => {
    if (grandTotal > 0) {
      setChargeAmount(grandTotal)
    }
  }, [grandTotal])

  useEffect(() => {
    if (!isSameFamily) setChargeAmount(grandTotal)
  }, [isSameFamily, grandTotal])

  const overInvoice = Math.max(0, chargeAmount - grandTotal)


  function generatePaymentId(): string {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, "")
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `PAY-${date}-${rand}`
  }

  function generateReceiptNo(): string {
    const year = new Date().getFullYear()
    const runningKey = `receipt_running_no_${year}`
    const current = parseInt(localStorage.getItem(runningKey) || "0", 10)
    const next = current + 1
    localStorage.setItem(runningKey, next.toString())
    return `R-CC-${year}-${String(next).padStart(5, "0")}`
  }

  function markInvoicesAsPaid(selectedIds: Set<string>, paymentId: string, bank: string) {
    for (const key of INVOICE_KEYS) {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const updated = JSON.parse(raw).map((inv: any) =>
        selectedIds.has(inv.id)
          ? { ...inv, status: "paid", paidDate: new Date().toISOString(),
              paymentMethod: "Credit Card", paymentReference: paymentId, bankName: bank }
          : inv
      )
      localStorage.setItem(key, JSON.stringify(updated))
    }
  }

  function savePendingAcknowledgement(
    stdData: { sid: string; student: any; invoices: any[]; guardian: string; subtotal: number }[],
    paymentId: string,
    bank: string,
    paymentMethodVal: string,
    chargeAmountVal: number,
    edcAmountVal: number,
    cardFeeVal: number,
    remark: string
  ): Record<string, string> {
    const receiptNos: Record<string, string> = {}
    stdData.forEach(({ sid }) => { receiptNos[sid] = generateReceiptNo() })

    const now = new Date()
    const month = now.getMonth() + 1
    const acYearStart = month >= 8 ? now.getFullYear() : now.getFullYear() - 1

    const record = {
      id: crypto.randomUUID(),
      status: "pending" as const,
      receiptNos,
      paymentDate: now.toISOString(),
      paymentId,
      studentData: stdData.map(({ sid, student, invoices, guardian, subtotal }) => ({
        sid,
        name: student ? `${student.firstName} ${student.lastName}` : sid,
        guardian,
        grade: student?.gradeLevel ?? "-",
        subtotal,
        invoices,
      })),
      paymentInfo: { bank, paymentMethod: paymentMethodVal, chargeAmount: chargeAmountVal, edcAmount: edcAmountVal, cardFee: cardFeeVal, remark },
      schoolYear: `${acYearStart}/${acYearStart + 1}`,
      createdAt: now.toISOString(),
    }

    const existing = JSON.parse(localStorage.getItem("cashier_acknowledgements") || "[]")
    localStorage.setItem("cashier_acknowledgements", JSON.stringify([record, ...existing]))
    return receiptNos
  }

  function saveOverpaymentCN(amount: number, paymentId: string) {
    const first = studentData[0]
    if (!first) return

    const existing = (() => {
      try {
        const queue = JSON.parse(localStorage.getItem("overpaymentCNQueue") || "[]")
        const main = JSON.parse(localStorage.getItem("creditNotesRecords") || "[]")
        return queue.length + main.filter((cn: any) => cn.noteType === "OP").length
      } catch { return 0 }
    })()
    const seq = existing + 1
    const year = new Date().getFullYear()

    const cn = {
      id: crypto.randomUUID(),
      creditNoteNumber: `OP-${year}-${String(seq).padStart(6, "0")}`,
      noteType: "OP" as const,
      type: "overpayment" as const,
      invoiceNumber: first.invoices[0]?.invoiceNumber || first.invoices[0]?.id || "-",
      studentName: first.student
        ? `${first.student.firstName} ${first.student.lastName}`
        : first.sid,
      studentId: first.sid,
      studentGrade: first.student?.gradeLevel || "-",
      parentName: first.guardian,
      familyCode: first.student?.familyCode || first.student?.familyId || "-",
      originalAmount: amount,
      creditAmount: amount,
      amountIncludingVat: amount,
      remainingBalance: amount,
      remainingAmount: amount,
      reason: "Overpayment from EDC card charge",
      description: `Overpayment from payment ${paymentId}`,
      status: "issued" as const,
      issueDate: new Date().toISOString(),
      issuedBy: "Cashier",
      notes: "",
      paid: false,
      cancelled: false,
      corrective: false,
    }

    const queue = JSON.parse(localStorage.getItem("overpaymentCNQueue") || "[]")
    queue.unshift(cn)
    localStorage.setItem("overpaymentCNQueue", JSON.stringify(queue))
  }

  function handleConfirmPayment() {
    if (!selectedBank) {
      toast.error(t("cashier.bankRequired"))
      return
    }
    setIsProcessing(true)
    setTimeout(() => {
      const paymentId = generatePaymentId()

      // Mark invoices as paid
      const allInvoiceIds = new Set(studentData.flatMap(d => d.invoices.map((i: any) => i.id)))
      markInvoicesAsPaid(allInvoiceIds, paymentId, selectedBank)

      if (overInvoice > 0 && isSameFamily) {
        saveOverpaymentCN(overInvoice, paymentId)
      }

      // Save acknowledgement (pending)
      const receiptNos = savePendingAcknowledgement(
        studentData, paymentId, selectedBank, paymentMethod,
        chargeAmount, edcAmountCalc, cardFee, remark
      )

      navigateToSubPage("cashier-receipt", {
        paymentId,
        receiptNos,
        studentData: studentData.map(({ sid, student, invoices, guardian, subtotal }) => ({
          sid,
          name: student ? `${student.firstName} ${student.lastName}` : sid,
          guardian,
          subtotal,
          invoices,
          grade: student?.gradeLevel ?? "-",
        })),
        paymentInfo: {
          bank: selectedBank,
          cardType: "",
          paymentMethod,
          chargeAmount,
          edcAmount: edcAmountCalc,
          remark,
        },
      })
      setIsProcessing(false)
    }, 1500)
  }

  // If no valid params, navigate back
  if (studentIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">{t("cashier.noPaymentData")}</p>
        <Button variant="outline" onClick={navigateBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />{t("cashier.breadcrumbSearch")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => navigateToSubPage("cashier-dashboard")}
          className="hover:text-foreground transition-colors"
        >
          {t("menu.cashierDashboard")}
        </button>
        <span>/</span>
        <button
          onClick={navigateBack}
          className="hover:text-foreground transition-colors"
        >
          {t("cashier.breadcrumbSearch")}
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{t("cashier.breadcrumbPayment")}</span>
      </nav>

      <h2 className="text-xl font-semibold">{t("cashier.paymentTitle")}</h2>

      <div className="flex gap-6 items-start w-full">
        {/* ── Left panel ── */}
        <div className="min-w-0 space-y-4" style={{ flex: 3 }}>

          {/* Student info table */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-semibold mb-4 pb-3 border-b">
                {t("cashier.studentInfoSection")} ({studentIds.length} {t("cashier.personUnit")})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead align="left">{t("cashier.studentCol")}</TableHead>
                    <TableHead align="left">{t("cashier.invoiceNumberCol")}</TableHead>
                    <TableHead align="left">{t("cashier.typeCol")}</TableHead>
                    <TableHead align="right">{t("cashier.amountCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentData.map(({ sid, student, invoices, guardian }) => (
                    <React.Fragment key={sid}>
                      {invoices.length === 0 ? (
                        <TableRow>
                          <TableCell>
                            <p className="font-bold">{student ? `${student.firstName} ${student.lastName}` : sid}</p>
                            <p className="text-sm text-muted-foreground">{sid}</p>
                            <p className="text-xs text-muted-foreground">{t("cashier.guardianShort")}: {guardian}</p>
                          </TableCell>
                          <TableCell colSpan={3} className="text-muted-foreground text-sm">-</TableCell>
                        </TableRow>
                      ) : invoices.map((inv, invIdx) => (
                        <TableRow key={inv.id}>
                          {invIdx === 0 && (
                            <TableCell rowSpan={invoices.length} className="align-top">
                              <p className="font-bold">{student ? `${student.firstName} ${student.lastName}` : sid}</p>
                              <p className="text-sm text-muted-foreground">{sid}</p>
                              <p className="text-xs text-muted-foreground">{t("cashier.guardianShort")}: {guardian}</p>
                            </TableCell>
                          )}
                          <TableCell align="left" className="text-sm">{inv.invoiceNumber || inv.id}</TableCell>
                          <TableCell align="left">{inv.category ? (categoryLabel[inv.category] || inv.category) : t("cashier.categoryTuition")}</TableCell>
                          <TableCell align="right">{fmt(getAmount(inv))} บาท</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                  {/* Grand total footer row */}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={3} className="font-semibold">{t("cashier.totalInvoiceAmt")}</TableCell>
                    <TableCell align="right" className="font-bold">{fmt(grandTotal)} บาท</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment info */}
          <Card>
            <CardContent style={{ padding: "32px" }}>
              <h3 className="text-base font-semibold" style={{ paddingBottom: "16px", borderBottom: "1px solid #e2e8f0", marginBottom: "28px" }}>
                {t("cashier.paymentInfoSection")}
              </h3>

              {/* Bank */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginBottom: "28px" }}>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>
                    {t("cashier.bank")} <span className="text-destructive">*</span>
                  </label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger>
                      <SelectValue placeholder={`-- ${t("cashier.bank")} --`} />
                    </SelectTrigger>
                    <SelectContent>
                      {configuredBanks.map(e => (
                        <SelectItem key={e.bankId} value={e.bankId}>{e.bankName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* วิธีการชำระ */}
              <div style={{ marginBottom: "28px" }}>
                <label className="text-sm font-medium block" style={{ marginBottom: "12px" }}>
                  {t("cashier.paymentMethod")} <span className="text-destructive">*</span>
                </label>
                <div style={{ display: "flex", gap: "32px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="full"
                      checked={paymentMethod === "full"}
                      onChange={() => setPaymentMethod("full")}
                      className="accent-primary"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span className="text-sm">{t("cashier.paymentFull")}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="installment"
                      checked={paymentMethod === "installment"}
                      onChange={() => setPaymentMethod("installment")}
                      className="accent-primary"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span className="text-sm">{t("cashier.paymentInstallment")}</span>
                  </label>
                </div>
              </div>

              {/* Amount fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "24px", rowGap: "20px", marginBottom: "28px" }}>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>{t("cashier.invoiceTotalBaht")}</label>
                  <Input
                    type="number"
                    value={grandTotal.toFixed(2)}
                    readOnly
                    className="text-right bg-muted/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>
                    {t("cashier.chargeAmount")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={chargeAmount}
                    onChange={e => setChargeAmount(parseFloat(e.target.value) || 0)}
                    className={`text-right ${!isSameFamily && studentData.length > 1 ? "bg-muted/50" : ""}`}
                    readOnly={!isSameFamily && studentData.length > 1}
                  />
                  {!isSameFamily && studentData.length > 1 && (
                    <p className="text-xs text-muted-foreground" style={{ marginTop: "6px" }}>
                      {t("cashier.overpaymentLockedNote")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>{t("cashier.overInvoice")}</label>
                  <Input
                    type="number"
                    value={overInvoice > 0 ? (-overInvoice).toFixed(2) : (0).toFixed(2)}
                    readOnly
                    className="text-right bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground" style={{ marginTop: "6px" }}>{t("cashier.overInvoiceNote")}</p>
                  {isSameFamily && overInvoice > 0 && (
                    <p className="text-xs text-amber-600" style={{ marginTop: "6px" }}>
                      {t("cashier.overpaymentCNNote")}: {studentData[0]?.student
                        ? `${studentData[0].student.firstName} ${studentData[0].student.lastName}`
                        : (studentData[0]?.sid ?? "")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>
                    {t("cashier.edcAmount")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    value={edcAmountCalc.toFixed(2)}
                    readOnly
                    className="text-right bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground" style={{ marginTop: "6px" }}>{t("cashier.edcNote")}</p>
                </div>
              </div>

              {/* หมายเหตุ */}
              <div style={{ marginBottom: "28px" }}>
                <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>{t("cashier.remark")}</label>
                <textarea
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  placeholder={t("cashier.remarkPlaceholder")}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  style={{ padding: "10px 12px" }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <Button variant="outline" onClick={navigateBack}>
                  {t("cashier.cancelBtn")}
                </Button>
                <Button onClick={handleConfirmPayment} disabled={isProcessing}>
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {t("cashier.processingEdc")}
                    </span>
                  ) : t("cashier.confirmPayment")}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Right panel ── */}
        <Card className="min-w-0 self-start" style={{ flex: 2 }}>
        <CardContent className="p-7 space-y-5">

          <h3 className="text-base font-semibold">{t("cashier.grandTotalAll")}</h3>

          {/* Grand total dark box — inline style to guarantee dark bg */}
          <div style={{ backgroundColor: "#1e293b", color: "#ffffff", borderRadius: "14px", padding: "22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>{t("cashier.totalInvoiceAmt")}</span>
              <span style={{ fontWeight: 600, fontSize: "14px" }}>{fmt(grandTotal)} บาท</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: overInvoice > 0 ? "12px" : "20px" }}>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                {t("cashier.cardFee")}{feeRate > 0 && <span style={{ color: "#f97316" }}> ({feeRate}%)</span>}
              </span>
              <span style={{ fontSize: "14px" }}>{fmt(cardFee)} บาท</span>
            </div>
            {overInvoice > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>{t("cashier.overInvoice")}</span>
                <span style={{ fontSize: "14px", color: "#f87171" }}>-{fmt(overInvoice)} บาท</span>
              </div>
            )}
            <div style={{ borderTop: "1px solid #334155", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>{t("cashier.grandTotalFinal")}</span>
              <span style={{ fontWeight: 700, fontSize: "20px" }}>{fmt(grandTotal + cardFee + overInvoice)} บาท</span>
            </div>
          </div>

          {/* Per-student breakdown */}
          {studentData.map(({ sid, student, subtotal }, idx) => {
            const pFee = grandTotal > 0 ? Number((cardFee * subtotal / grandTotal).toFixed(2)) : 0
            const pOver = idx === 0 ? overInvoice : 0
            return (
              <div key={sid} style={{ borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <p style={{ fontWeight: 600, fontSize: "14px" }}>
                    {t("cashier.studentLabel")} {idx + 1}: {student ? `${student.firstName} ${student.lastName}` : sid}
                  </p>
                  <Badge variant="outline" className="text-xs shrink-0 ml-2">{sid}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{t("cashier.totalInvoiceAmt")}</span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{fmt(subtotal)} บาท</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: pOver > 0 ? "8px" : "16px" }}>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    {t("cashier.cardFee")}{feeRate > 0 && <span style={{ color: "#f97316" }}> ({feeRate}%)</span>}
                  </span>
                  <span style={{ fontSize: "13px", color: "#64748b" }}>{fmt(pFee)} บาท</span>
                </div>
                {pOver > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>{t("cashier.overInvoice")}</span>
                    <span style={{ fontSize: "13px", color: "#ef4444" }}>-{fmt(pOver)} บาท</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{t("cashier.studentSubtotal")}</span>
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>{fmt(subtotal + pFee + pOver)} บาท</span>
                </div>
              </div>
            )
          })}

        </CardContent>
        </Card>
      </div>
    </div>
  )
}
