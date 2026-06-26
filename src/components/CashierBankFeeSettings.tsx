import { useState } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Trash2, Plus, Pencil } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"

export const ALL_BANKS = [
  { id: "kbank", name: "Kasikorn Bank (KBank)" },
  { id: "scb",   name: "Siam Commercial Bank (SCB)" },
  { id: "bbl",   name: "Bangkok Bank (BBL)" },
  { id: "ktb",   name: "Krungthai Bank (KTB)" },
  { id: "bay",   name: "Bank of Ayudhya (BAY)" },
  { id: "ttb",   name: "TTB Bank (TTB)" },
  { id: "uob",   name: "UOB Bank (UOB)" },
  { id: "cimb",  name: "CIMB Bank (CIMB)" },
]

export type BankFeeEntry = { bankId: string; bankName: string; accountNumber: string; feeRate: number }

function loadEntries(): BankFeeEntry[] {
  try {
    const raw = localStorage.getItem("cashier_bank_fees")
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, number>).map(([bankId, feeRate]) => ({
        bankId,
        bankName: ALL_BANKS.find(b => b.id === bankId)?.name ?? bankId,
        accountNumber: "",
        feeRate: feeRate as number,
      }))
    }
    return parsed
  } catch { return [] }
}

const EMPTY_FORM = { bankId: "", accountNumber: "", feeRate: "" }
const EMPTY_ERRORS = { bankId: false, accountNumber: false, feeRate: false }

export function CashierBankFeeSettings() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<BankFeeEntry[]>(() => loadEntries())
  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState(EMPTY_ERRORS)

  const isEditMode = editIndex !== null

  const openAdd = () => {
    setEditIndex(null)
    setForm(EMPTY_FORM)
    setErrors(EMPTY_ERRORS)
    setOpen(true)
  }

  const openEdit = (idx: number) => {
    const e = entries[idx]
    setEditIndex(idx)
    setForm({ bankId: e.bankId, accountNumber: e.accountNumber, feeRate: String(e.feeRate) })
    setErrors(EMPTY_ERRORS)
    setOpen(true)
  }

  const handleSave = () => {
    const newErrors = {
      bankId: !form.bankId,
      accountNumber: !form.accountNumber.trim(),
      feeRate: form.feeRate === "" || isNaN(parseFloat(form.feeRate)),
    }
    setErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    const bank = ALL_BANKS.find(b => b.id === form.bankId)
    if (!bank) return
    const rate = parseFloat(form.feeRate)
    const entry: BankFeeEntry = {
      bankId: bank.id,
      bankName: bank.name,
      accountNumber: form.accountNumber.trim(),
      feeRate: isNaN(rate) ? 0 : Math.max(0, Math.min(100, rate)),
    }
    const updated = isEditMode
      ? entries.map((e, i) => (i === editIndex ? entry : e))
      : [...entries, entry]
    setEntries(updated)
    localStorage.setItem("cashier_bank_fees", JSON.stringify(updated))
    toast.success(t("cashier.bankFeeSaved"))
    setForm(EMPTY_FORM)
    setOpen(false)
  }

  const handleDelete = (index: number) => {
    const updated = entries.filter((_, i) => i !== index)
    setEntries(updated)
    localStorage.setItem("cashier_bank_fees", JSON.stringify(updated))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.bankFeeTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("cashier.bankFeeDesc")}</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />{t("cashier.bankFeeAddBtn")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead align="left">{t("cashier.bankFeeColBank")}</TableHead>
                <TableHead align="left">{t("cashier.bankFeeColAccount")}</TableHead>
                <TableHead align="right" className="w-36">{t("cashier.bankFeeRate")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-sm">
                    {t("cashier.bankFeeEmptyState")}
                  </TableCell>
                </TableRow>
              ) : entries.map((entry, idx) => (
                <TableRow key={idx}>
                  <TableCell align="left" className="font-medium">{entry.bankName}</TableCell>
                  <TableCell align="left" className="text-muted-foreground font-mono text-sm">
                    {entry.accountNumber || "-"}
                  </TableCell>
                  <TableCell align="right">{entry.feeRate}%</TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(idx)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isEditMode ? t("cashier.bankFeeEditDialogTitle") : t("cashier.bankFeeDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Bank — full width */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("cashier.bankFeeColBank")} <span className="text-destructive">*</span>
              </Label>
              <Select value={form.bankId} onValueChange={v => { setForm(f => ({ ...f, bankId: v })); setErrors(e => ({ ...e, bankId: false })) }}>
                <SelectTrigger className={`h-11 ${errors.bankId ? "border-destructive" : ""}`}>
                  <SelectValue placeholder={t("cashier.bankFeeSelectBank")} />
                </SelectTrigger>
                <SelectContent>
                  {ALL_BANKS.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankId && <p className="text-xs text-destructive">{t("cashier.bankFeeSelectBankError")}</p>}
            </div>

            {/* Account No. + Fee Rate side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("cashier.bankFeeAccountNo")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  className={`h-11 ${errors.accountNumber ? "border-destructive" : ""}`}
                  placeholder={t("cashier.bankFeeAccountNoPlaceholder")}
                  value={form.accountNumber}
                  onChange={e => { setForm(f => ({ ...f, accountNumber: e.target.value })); setErrors(er => ({ ...er, accountNumber: false })) }}
                />
                {errors.accountNumber && <p className="text-xs text-destructive">Required</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("cashier.bankFeeFeeLabel")} <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    placeholder="0.00"
                    value={form.feeRate}
                    onChange={e => { setForm(f => ({ ...f, feeRate: e.target.value })); setErrors(er => ({ ...er, feeRate: false })) }}
                    className={`h-11 text-right ${errors.feeRate ? "border-destructive" : ""}`}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">%</span>
                </div>
                {errors.feeRate && <p className="text-xs text-destructive">Required</p>}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("cashier.bankFeeCancelBtn")}</Button>
              <Button onClick={handleSave}>
                {isEditMode ? t("cashier.bankFeeSaveBtn") : t("cashier.bankFeeAddBtn")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
