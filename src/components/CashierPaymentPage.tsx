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

// ── Constants ─────────────────────────────────────────────────
const INVOICE_KEYS = [
  "createdInvoices","createdInvoices_eca","createdInvoices_trip",
  "createdInvoices_exam","createdInvoices_bus","createdInvoices_external",
]

const BANKS = [
  { id: "kbank", name: "กสิกรไทย (KBank)" },
  { id: "scb",   name: "ไทยพาณิชย์ (SCB)" },
  { id: "bbl",   name: "กรุงเทพ (BBL)" },
  { id: "ktb",   name: "กรุงไทย (KTB)" },
  { id: "bay",   name: "กรุงศรี (BAY)" },
  { id: "ttb",   name: "ทหารไทยธนชาต (TTB)" },
  { id: "uob",   name: "ยูโอบี (UOB)" },
  { id: "cimb",  name: "ซีไอเอ็มบี (CIMB)" },
]

const CARD_TYPES: Record<string, string[]> = {
  kbank: ["KBank Mastercard", "KBank Visa"],
  scb:   ["SCB Visa", "SCB Mastercard"],
  uob:   ["UOB Card", "UOB Visa Platinum"],
  bbl:   ["BBL Card", "BBL Visa"],
  ktb:   ["KTB Card", "KTB Visa"],
  bay:   ["BAY Card", "BAY Mastercard"],
  ttb:   ["TTB Card", "TTB Visa"],
  cimb:  ["CIMB Card", "CIMB Mastercard"],
}

function getAmount(inv: any): number {
  return inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
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
  const [selectedCardType, setSelectedCardType] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"full" | "installment">("full")
  const [chargeAmount, setChargeAmount] = useState<number>(0)
  const [edcAmount, setEdcAmount] = useState<number>(0)
  const [remark, setRemark] = useState<string>("")

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

  useEffect(() => {
    if (grandTotal > 0) {
      setChargeAmount(grandTotal)
      setEdcAmount(grandTotal)
    }
  }, [grandTotal])

  const overInvoice = Math.max(0, chargeAmount - grandTotal)

  const cardOptions = selectedBank ? (CARD_TYPES[selectedBank] ?? [`${BANKS.find(b => b.id === selectedBank)?.name ?? selectedBank} Card`]) : []

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
                          <TableCell align="right">{getAmount(inv).toLocaleString()} บาท</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                  {/* Grand total footer row */}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={3} className="font-semibold">{t("cashier.totalInvoiceAmt")}</TableCell>
                    <TableCell align="right" className="font-bold">{grandTotal.toLocaleString()} บาท</TableCell>
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

              {/* Bank + Card type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>{t("cashier.bank")}</label>
                  <Select value={selectedBank} onValueChange={val => { setSelectedBank(val); setSelectedCardType("") }}>
                    <SelectTrigger>
                      <SelectValue placeholder={`-- ${t("cashier.bank")} --`} />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>
                    {t("cashier.cardType")} <span className="text-destructive">*</span>
                  </label>
                  <Select value={selectedCardType} onValueChange={setSelectedCardType} disabled={!selectedBank}>
                    <SelectTrigger>
                      <SelectValue placeholder={`-- ${t("cashier.cardType")} --`} />
                    </SelectTrigger>
                    <SelectContent>
                      {cardOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
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
                    className="text-right"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>{t("cashier.overInvoice")}</label>
                  <Input
                    type="number"
                    value={overInvoice.toFixed(2)}
                    readOnly
                    className="text-right bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground" style={{ marginTop: "6px" }}>{t("cashier.overInvoiceNote")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium block" style={{ marginBottom: "8px" }}>
                    {t("cashier.edcAmount")} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={edcAmount}
                    onChange={e => setEdcAmount(parseFloat(e.target.value) || 0)}
                    className="text-right"
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
                <Button onClick={() => toast.info(t("cashier.underDevelopment"))}>
                  {t("cashier.confirmPayment")}
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
              <span style={{ fontWeight: 600, fontSize: "14px" }}>{grandTotal.toLocaleString()} บาท</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>{t("cashier.cardFee")}</span>
              <span style={{ fontSize: "14px" }}>0 บาท</span>
            </div>
            <div style={{ borderTop: "1px solid #334155", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>{t("cashier.grandTotalFinal")}</span>
              <span style={{ fontWeight: 700, fontSize: "20px" }}>{grandTotal.toLocaleString()} บาท</span>
            </div>
          </div>

          {/* Per-student breakdown */}
          {studentData.map(({ sid, student, subtotal }, idx) => (
            <div key={sid} style={{ borderRadius: "12px", border: "1px solid #e2e8f0", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <p style={{ fontWeight: 600, fontSize: "14px" }}>
                  {t("cashier.studentLabel")} {idx + 1}: {student ? `${student.firstName} ${student.lastName}` : sid}
                </p>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">{sid}</Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>{t("cashier.totalInvoiceAmt")}</span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>{subtotal.toLocaleString()} บาท</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>{t("cashier.cardFee")}</span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>0 บาท</span>
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{t("cashier.studentSubtotal")}</span>
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{subtotal.toLocaleString()} บาท</span>
              </div>
            </div>
          ))}

        </CardContent>
        </Card>
      </div>
    </div>
  )
}
