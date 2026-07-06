import { useState } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Calendar } from "./ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { CalendarIcon, Eye, Loader2 } from "lucide-react"
import { format, endOfDay } from "date-fns"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { generatePdfBlob, PaymentInfo, InvoiceReceiptItem } from "./CashierReceiptPage"

type StudentEntry = {
  sid: string; name: string; guardian: string; grade: string; subtotal: number; invoices: any[]
}

type AckRecord = {
  id: string
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

function loadRecords(): AckRecord[] {
  try { return JSON.parse(localStorage.getItem("cashier_acknowledgements") || "[]") } catch { return [] }
}

export function CashierAcknowledgementList() {
  const { t } = useLanguage()
  const [records, setRecords] = useState<AckRecord[]>(loadRecords)
  const [issueTarget, setIssueTarget] = useState<AckRecord | null>(null)
  const [officialDate, setOfficialDate] = useState<Date>(new Date())
  const [calOpen, setCalOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { user } = useAuth()
  const cashierName = user?.name ?? "Cashier"

  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState<AckRecord | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

  function makeInvoiceItem(rec: AckRecord): InvoiceReceiptItem {
    const student = rec.studentData[0]
    const inv = student?.invoices[0]
    return {
      sid: student?.sid ?? "-",
      name: student?.name ?? "-",
      guardian: student?.guardian ?? "-",
      grade: student?.grade ?? "-",
      invoiceId: inv?.id ?? rec.id,
      invoiceNumber: inv?.invoiceNumber || inv?.id || "-",
      invoiceAmount: student?.subtotal ?? 0,
      receiptNo: Object.values(rec.receiptNos)[0] ?? "-",
      cardFee: rec.paymentInfo.cardFee,
    }
  }

  function makePaymentInfoFromRec(rec: AckRecord): PaymentInfo {
    return {
      bank: rec.paymentInfo.bank,
      cardType: "",
      paymentMethod: rec.paymentInfo.paymentMethod,
      chargeAmount: rec.paymentInfo.chargeAmount,
      edcAmount: rec.paymentInfo.edcAmount,
      remark: rec.paymentInfo.remark,
      overpaymentAmount: Math.max(0, rec.paymentInfo.chargeAmount - (rec.studentData[0]?.subtotal ?? 0)),
    }
  }

  async function openViewDialog(rec: AckRecord) {
    setViewTarget(rec)
    setPreviewUrl(null)
    setViewDialogOpen(true)
    await handlePreview(rec)
  }

  async function handlePreview(rec: AckRecord) {
    const key = `view-${rec.id}`
    setLoadingMap(prev => ({ ...prev, [key]: true }))
    try {
      const item = makeInvoiceItem(rec)
      const blob = await generatePdfBlob(item, cashierName, makePaymentInfoFromRec(rec))
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }))
    }
  }

  const openIssueDialog = (rec: AckRecord) => {
    setIssueTarget(rec)
    setOfficialDate(new Date())
    setCalOpen(false)
    setDialogOpen(true)
  }

  const handleIssue = () => {
    if (!issueTarget) return

    const item = makeInvoiceItem(issueTarget)
    const received = item.invoiceAmount + item.cardFee

    const newReceiptRecord = {
      id: crypto.randomUUID(),
      receiptNo: item.receiptNo,
      receiptDate: officialDate.toISOString(),
      clientType: "internal",
      clientNo: item.sid,
      clientName: item.name,
      contactName: item.guardian,
      yearGroup: item.grade,
      schoolYear: issueTarget.schoolYear,
      totalAmount: received,
      receivedAmount: received,
      creditNoteTotal: 0,
      netPayableAmount: received,
      overpaymentAmount: 0,
      paymentMethod: "Credit Card",
      bankName: issueTarget.paymentInfo.bank,
      cardType: "",
      transactionFeeAmount: item.cardFee,
      status: "generated",
      createdAt: new Date().toISOString(),
      invoices: [{
        id: item.invoiceId,
        invoiceNo: item.invoiceNumber,
        invoiceDate: issueTarget.studentData[0]?.invoices[0]?.issueDate ?? new Date().toISOString(),
        invoiceAmount: item.invoiceAmount,
        receivedAmount: received,
        outstandingAmount: 0,
      }],
    }

    const existing = JSON.parse(localStorage.getItem("receiptRecords_tuition") || "[]")
    localStorage.setItem("receiptRecords_tuition", JSON.stringify([newReceiptRecord, ...existing]))

    const updated = records.map(r =>
      r.id === issueTarget.id
        ? { ...r, status: "issued" as const, officialDate: officialDate.toISOString() }
        : r
    )
    localStorage.setItem("cashier_acknowledgements", JSON.stringify(updated))
    setRecords(updated)
    toast.success(t("cashier.ackIssuedSuccess"))
    setDialogOpen(false)
  }

  const grandTotal = (rec: AckRecord) =>
    rec.studentData.reduce((s, st) => s + st.subtotal, 0) + rec.paymentInfo.cardFee

  const studentNames = (rec: AckRecord) =>
    rec.studentData.map(s => s.name).join(", ")

  const firstReceiptNo = (rec: AckRecord) =>
    Object.values(rec.receiptNos)[0] ?? "-"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("cashier.ackTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("cashier.ackDesc")}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead align="left">{t("cashier.ackColReceiptNo")}</TableHead>
                <TableHead align="left">{t("cashier.ackColStudent")}</TableHead>
                <TableHead align="left">Invoice No.</TableHead>
                <TableHead align="left">{t("cashier.ackColPaymentDate")}</TableHead>
                <TableHead align="left">{t("cashier.ackColOfficialDate")}</TableHead>
                <TableHead align="right">{t("cashier.ackColAmount")}</TableHead>
                <TableHead align="center" className="w-24">Status</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-sm">
                    {t("cashier.ackEmptyState")}
                  </TableCell>
                </TableRow>
              ) : records.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell align="left" className="font-mono text-sm">{firstReceiptNo(rec)}</TableCell>
                  <TableCell align="left" className="text-sm">{studentNames(rec)}</TableCell>
                  <TableCell align="left" className="text-sm font-mono">
                    {rec.studentData[0]?.invoices[0]?.invoiceNumber || rec.studentData[0]?.invoices[0]?.id || "-"}
                  </TableCell>
                  <TableCell align="left" className="text-sm">{format(new Date(rec.paymentDate), "dd/MM/yyyy")}</TableCell>
                  <TableCell align="left" className="text-sm">
                    {rec.officialDate ? format(new Date(rec.officialDate), "dd/MM/yyyy") : "-"}
                  </TableCell>
                  <TableCell align="right" className="text-sm">{fmt(grandTotal(rec))}</TableCell>
                  <TableCell align="center">
                    {rec.status === "pending"
                      ? <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Pending</Badge>
                      : <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Issued</Badge>
                    }
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center gap-1 justify-center">
                      {rec.status === "pending" && (
                        <Button size="sm" onClick={() => openIssueDialog(rec)}>
                          {t("cashier.ackIssueBtn")}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View Document" onClick={() => openViewDialog(rec)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View document dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setPreviewUrl(null) }}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Acknowledgement Document</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="flex items-center justify-center" style={{ minHeight: 500 }}>
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full rounded border"
                  style={{ height: "70vh" }}
                  title="Receipt PDF Preview"
                />
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Generating PDF...</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Issue dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{t("cashier.ackIssueDialogTitle")}</DialogTitle>
          </DialogHeader>
          {issueTarget && (
            <div className="space-y-5 py-1">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("cashier.ackColReceiptNo")}</p>
                  <p className="text-sm font-mono font-medium">{firstReceiptNo(issueTarget)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("cashier.ackColAmount")}</p>
                  <p className="text-sm font-semibold">{fmt(grandTotal(issueTarget))}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("cashier.ackColStudent")}</p>
                  <p className="text-sm font-medium">{studentNames(issueTarget)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1">{t("cashier.ackColPaymentDate")}</p>
                  <p className="text-sm font-medium">{format(new Date(issueTarget.paymentDate), "dd/MM/yyyy")}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t" />

              {/* Date picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("cashier.ackOfficialDate")}</label>
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-3 h-11 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{format(officialDate, "dd MMMM yyyy")}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={officialDate}
                      onSelect={(d) => { if (d) { setOfficialDate(d); setCalOpen(false) } }}
                      disabled={(date) => date > endOfDay(new Date())}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2035}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("cashier.bankFeeCancelBtn")}</Button>
            <Button onClick={handleIssue}>{t("cashier.ackConfirmBtn")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
