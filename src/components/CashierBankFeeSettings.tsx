import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Trash2, Plus, Pencil } from "lucide-react"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { Badge } from "./ui/badge"

export const ALL_BANKS = [
  { id: "scb", name: "SCB" },
  { id: "kbank", name: "KBank" },
  { id: "bbl", name: "BBL" },
  { id: "ktb", name: "KTB" },
  { id: "bay", name: "BAY" },
  { id: "ttb", name: "TTB" },
  { id: "gsb", name: "GSB" },
  { id: "baac", name: "BAAC" },
]

const BANKS = ALL_BANKS

export type BankFeeEntry = {
  bankId: string
  bankName: string
  accountNumber: string
  feeRate: number
  glAccount?: string
  accountStatus?: boolean
  feeType?: "percent" | "amount"
}

function isBankInUse(bankId: string): boolean {
  try {
    const acks: any[] = JSON.parse(localStorage.getItem("cashier_acknowledgements") || "[]")
    return acks.some(a => a.paymentInfo?.bank === bankId)
  } catch { return false }
}

function loadEntries(): BankFeeEntry[] {
  try {
    const raw = localStorage.getItem("cashier_bank_fees")
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, number>).map(([bankId, feeRate]) => ({
        bankId,
        bankName: BANKS.find(b => b.id === bankId)?.name ?? bankId,
        accountNumber: "",
        feeRate: feeRate as number,
        glAccount: "",
        accountStatus: true,
        feeType: "percent" as const,
      }))
    }
    return parsed.map((e: BankFeeEntry) => ({
      ...e,
      accountStatus: e.accountStatus ?? true,
      feeType: e.feeType ?? "percent",
    }))
  } catch { return [] }
}

const EMPTY_FORM = {
  bankId: "",
  bankName: "",
  accountNumber: "",
  feeRate: "",
  glAccount: "",
  accountStatus: true,
  feeType: "percent" as "percent" | "amount",
}

export function CashierBankFeeSettings() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<BankFeeEntry[]>(() => loadEntries())
  const [open, setOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const deleteDialog = useConfirmDialog()
  const isEditMode = editIndex !== null

  const openAdd = () => {
    setEditIndex(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  const openEdit = (idx: number) => {
    const e = entries[idx]
    setEditIndex(idx)
    setForm({
      bankId: e.bankId,
      bankName: e.bankName,
      accountNumber: e.accountNumber,
      feeRate: String(e.feeRate),
      glAccount: e.glAccount ?? "",
      accountStatus: e.accountStatus ?? true,
      feeType: e.feeType ?? "percent",
    })
    setOpen(true)
  }

  const handleSave = () => {
    const rate = parseFloat(form.feeRate) || 0
    const entry: BankFeeEntry = {
      bankId: form.bankId || form.bankName.trim() || `bank-${Date.now()}`,
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      feeRate: Math.max(0, rate),
      glAccount: form.glAccount.trim(),
      accountStatus: form.accountStatus,
      feeType: form.feeType,
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
    const entry = entries[index]
    if (isBankInUse(entry.bankId)) {
      toast.error(t("cashier.bankFeeInUse"))
      return
    }
    const updated = entries.filter((_, i) => i !== index)
    setEntries(updated)
    localStorage.setItem("cashier_bank_fees", JSON.stringify(updated))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold">{t("cashier.bankFeeTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("cashier.bankFeeDesc")}</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />{t("cashier.bankFeeAddBtn")}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-white">
        <Table style={{ tableLayout: "fixed" }}>
          <TableHeader>
            <TableRow>
              <TableHead align="left" style={{ width: "20%" }}>Bank</TableHead>
              <TableHead align="left" style={{ width: "22%" }}>Account Number</TableHead>
              <TableHead align="left" style={{ width: "18%" }}>GL Account</TableHead>
              <TableHead align="right" style={{ width: "18%" }}>Bank Fee</TableHead>
              <TableHead align="center" style={{ width: "14%" }}>Account Status</TableHead>
              <TableHead style={{ width: "8%" }} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                  {t("cashier.bankFeeEmptyState")}
                </TableCell>
              </TableRow>
            ) : entries.map((entry, idx) => {
              const inUse = isBankInUse(entry.bankId)
              const feeDisplay = entry.feeRate
                ? entry.feeType === "amount"
                  ? `฿${entry.feeRate.toLocaleString()}`
                  : `${entry.feeRate}%`
                : "-"
              return (
                <TableRow key={idx}>
                  <TableCell align="left" className="font-medium">{entry.bankName || "-"}</TableCell>
                  <TableCell align="left" className="text-muted-foreground font-mono text-sm">
                    {entry.accountNumber || "-"}
                  </TableCell>
                  <TableCell align="left" className="text-muted-foreground text-sm">
                    {entry.glAccount || "-"}
                  </TableCell>
                  <TableCell align="right">{feeDisplay}</TableCell>
                  <TableCell align="center">
                    <Badge variant={entry.accountStatus !== false ? "default" : "secondary"}
                      className={entry.accountStatus !== false ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                      {entry.accountStatus !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
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
                        title={inUse ? t("cashier.bankFeeInUse") : undefined}
                        className={`h-8 w-8 p-0 ${inUse ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-destructive"}`}
                        onClick={() => !inUse && deleteDialog.confirm(() => handleDelete(idx))}
                        disabled={inUse}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ width: "480px", maxWidth: "480px" }}>
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isEditMode ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Bank dropdown */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bank</Label>
              <Select
                value={form.bankId}
                onValueChange={v => {
                  const bank = BANKS.find(b => b.id === v)
                  setForm(f => ({ ...f, bankId: v, bankName: bank?.name ?? v }))
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select Bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Account Number</Label>
              <Input
                className="h-11"
                placeholder="xxx-x-xxxxx-x"
                value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
              />
            </div>

            {/* GL Account */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">GL Account</Label>
              <Input
                className="h-11"
                placeholder="e.g., 1010-001"
                value={form.glAccount}
                onChange={e => setForm(f => ({ ...f, glAccount: e.target.value }))}
              />
            </div>

            {/* Bank Fee + Fee Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fee Type</Label>
                <Select
                  value={form.feeType}
                  onValueChange={v => setForm(f => ({ ...f, feeType: v as "percent" | "amount" }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage (%)</SelectItem>
                    <SelectItem value="amount">Fixed Amount (฿)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {form.feeType === "percent" ? "Percentage (%)" : "Amount (฿)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={form.feeRate}
                  onChange={e => setForm(f => ({ ...f, feeRate: e.target.value }))}
                  className="h-11 text-right"
                />
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Account Status</Label>
                <p className="text-xs text-muted-foreground">
                  {form.accountStatus
                    ? "This account is currently active and can be used for payments."
                    : "This account is inactive and cannot be used for payments."}
                </p>
              </div>
              <Switch
                checked={form.accountStatus}
                onCheckedChange={v => setForm(f => ({ ...f, accountStatus: v }))}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                {isEditMode ? "Save" : "Add Account"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.setIsOpen}
        onConfirm={deleteDialog.handleConfirm}
        titleKey="confirmDialog.deleteTitle"
        descriptionKey="confirmDialog.deleteDescription"
        confirmTextKey="common.delete"
        variant="destructive"
      />
    </div>
  )
}
