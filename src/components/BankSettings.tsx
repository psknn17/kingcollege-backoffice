import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { usePersistedState } from "@/hooks/usePersistedState"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Badge } from "./ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
// Tabs removed — both sections shown on same page
import { Building, Plus, Edit, Trash2, Landmark, CheckCircle2, XCircle, ArrowUpDown } from "lucide-react"
import { logActivity } from "@/lib/activityLog"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { Switch } from "./ui/switch"
import { BANKS, PAYMENT_SOURCES } from "@/constants/paymentConstants"

interface BankAccount {
    id: string
    paymentSource: string
    bankName: string
    accountNumber: string
    glAccount: string
    isActive: boolean
}

const STORAGE_KEY = "bankAccounts"

/** Mask account number: show last 4 chars, replace digits with *. Skip non-numeric strings like "Online" */
export const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber || accountNumber.length <= 4) return accountNumber
    if (!/\d/.test(accountNumber)) return accountNumber
    const visible = accountNumber.slice(-4)
    const masked = accountNumber.slice(0, -4).replace(/[0-9]/g, "*")
    return masked + visible
}

export function BankSettings() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const userCanEdit = user?.role === "super_admin"
    const confirmDialog = useConfirmDialog()

    const [accounts, setAccounts] = usePersistedState<BankAccount[]>(STORAGE_KEY, [
        { id: "BA-OFF-1", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12788-5", glAccount: "111-2101", isActive: true },
        { id: "BA-OFF-2", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12885-7", glAccount: "111-2102", isActive: true },
        { id: "BA-OFF-3", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-365-315-8", glAccount: "111-2105", isActive: true },
        { id: "BA-OFF-4", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-1-06348-7", glAccount: "111-2106", isActive: true },
        { id: "BA-OFF-5", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-6-06112-4", glAccount: "111-2107", isActive: true },
        { id: "BA-OFF-6", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12884-9", glAccount: "111-2202", isActive: true },
        { id: "BA-OFF-7", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-169-492-2", glAccount: "111-2205", isActive: true },
        { id: "BA-OFF-8", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-2-78322-4", glAccount: "111-2206", isActive: true },
        { id: "BA-OFF-9", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-0-20031-9", glAccount: "111-2207", isActive: true },
    ])
    const [onlineAccounts, setOnlineAccounts] = usePersistedState<BankAccount[]>("onlineBankAccounts", [
        { id: "BA-ONLINE-2", paymentSource: "Thai QR", bankName: "Kasikorn Bank", accountNumber: "Online", glAccount: "111-2201", isActive: true },
        { id: "BA-ONLINE-3", paymentSource: "Credit Note", bankName: "Kasikorn Bank", accountNumber: "041-1-12977-2", glAccount: "111-2201", isActive: true }
    ])

    // Migration: replace old seed offline accounts with real bank accounts
    useEffect(() => {
        const hasOldSeed = accounts.some(a => a.id === "bank-001" || a.id === "bank-002" || a.id === "bank-003")
        if (hasOldSeed) {
            const realAccounts = [
                { id: "BA-OFF-1", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12788-5", glAccount: "111-2101", isActive: true },
                { id: "BA-OFF-2", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12885-7", glAccount: "111-2102", isActive: true },
                { id: "BA-OFF-3", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-365-315-8", glAccount: "111-2105", isActive: true },
                { id: "BA-OFF-4", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-1-06348-7", glAccount: "111-2106", isActive: true },
                { id: "BA-OFF-5", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-6-06112-4", glAccount: "111-2107", isActive: true },
                { id: "BA-OFF-6", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12884-9", glAccount: "111-2202", isActive: true },
                { id: "BA-OFF-7", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-169-492-2", glAccount: "111-2205", isActive: true },
                { id: "BA-OFF-8", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-2-78322-4", glAccount: "111-2206", isActive: true },
                { id: "BA-OFF-9", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-0-20031-9", glAccount: "111-2207", isActive: true },
            ]
            setAccounts(realAccounts)
        } else if (accounts.length === 0) {
            // No accounts at all — seed with real data
            setAccounts([
                { id: "BA-OFF-1", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12788-5", glAccount: "111-2101", isActive: true },
                { id: "BA-OFF-2", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12885-7", glAccount: "111-2102", isActive: true },
                { id: "BA-OFF-3", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-365-315-8", glAccount: "111-2105", isActive: true },
                { id: "BA-OFF-4", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-1-06348-7", glAccount: "111-2106", isActive: true },
                { id: "BA-OFF-5", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-6-06112-4", glAccount: "111-2107", isActive: true },
                { id: "BA-OFF-6", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12884-9", glAccount: "111-2202", isActive: true },
                { id: "BA-OFF-7", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-169-492-2", glAccount: "111-2205", isActive: true },
                { id: "BA-OFF-8", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-2-78322-4", glAccount: "111-2206", isActive: true },
                { id: "BA-OFF-9", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-0-20031-9", glAccount: "111-2207", isActive: true },
            ])
        }
    }, [])

    // Migration: force online accounts to exactly Thai QR + Credit Note with correct details
    useEffect(() => {
        const expected = [
            { id: "BA-ONLINE-2", paymentSource: "Thai QR", bankName: "Kasikorn Bank", accountNumber: "Online", glAccount: "111-2201", isActive: true },
            { id: "BA-ONLINE-3", paymentSource: "Credit Note", bankName: "Kasikorn Bank", accountNumber: "041-1-12977-2", glAccount: "111-2201", isActive: true }
        ]
        const hasCreditCard = onlineAccounts.some(a => a.paymentSource === "Credit Card")
        const hasWrongBank = onlineAccounts.some(a => (a.paymentSource === "Thai QR" || a.paymentSource === "Credit Note") && a.bankName !== "Kasikorn Bank")
        const hasWrongThaiQRAccount = onlineAccounts.some(a => a.paymentSource === "Thai QR" && a.accountNumber !== "Online")
        const missingEntries = !onlineAccounts.some(a => a.paymentSource === "Thai QR") || !onlineAccounts.some(a => a.paymentSource === "Credit Note")
        if (hasCreditCard || hasWrongBank || hasWrongThaiQRAccount || missingEntries) {
            setOnlineAccounts(expected)
        }
    }, [])

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
    const [dialogMode, setDialogMode] = useState<'offline' | 'online'>('offline')

    const initialFormData: Omit<BankAccount, "id"> = {
        paymentSource: "",
        bankName: "",
        accountNumber: "",
        glAccount: "",
        isActive: true
    }

    const [formData, setFormData] = useState<Omit<BankAccount, "id">>(initialFormData)

    // Sorting state
    const [offlineSortKey, setOfflineSortKey] = useState<keyof BankAccount>("bankName")
    const [offlineSortDir, setOfflineSortDir] = useState<"asc" | "desc">("asc")
    const [onlineSortKey, setOnlineSortKey] = useState<keyof BankAccount>("paymentSource")
    const [onlineSortDir, setOnlineSortDir] = useState<"asc" | "desc">("asc")

    const handleSortOffline = (key: keyof BankAccount) => {
        if (offlineSortKey === key) {
            setOfflineSortDir(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setOfflineSortKey(key)
            setOfflineSortDir("asc")
        }
    }

    const handleSortOnline = (key: keyof BankAccount) => {
        if (onlineSortKey === key) {
            setOnlineSortDir(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setOnlineSortKey(key)
            setOnlineSortDir("asc")
        }
    }

    const sortedAccounts = [...accounts].sort((a, b) => {
        const aVal = String(a[offlineSortKey] || "").toLowerCase()
        const bVal = String(b[offlineSortKey] || "").toLowerCase()
        return offlineSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

    const sortedOnlineAccounts = [...onlineAccounts].sort((a, b) => {
        const aVal = String(a[onlineSortKey] || "").toLowerCase()
        const bVal = String(b[onlineSortKey] || "").toLowerCase()
        return onlineSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

    const handleOpenDialog = (account?: BankAccount, mode: 'offline' | 'online' = 'offline') => {
        setDialogMode(mode)
        if (account) {
            setEditingAccount(account)
            setFormData({
                paymentSource: account.paymentSource,
                bankName: account.bankName,
                accountNumber: account.accountNumber,
                glAccount: account.glAccount,
                isActive: account.isActive
            })
        } else {
            setEditingAccount(null)
            setFormData(initialFormData)
        }
        setIsDialogOpen(true)
    }

    const handleSave = () => {
        if (dialogMode === 'online' && !formData.paymentSource) {
            toast.error("Please fill in all required fields")
            return
        }
        if (!formData.bankName || !formData.accountNumber) {
            toast.error("Please fill in all required fields")
            return
        }

        if (editingAccount) {
            if (dialogMode === 'online') {
                setOnlineAccounts(prev => prev.map(acc =>
                    acc.id === editingAccount.id ? { ...formData, id: acc.id } : acc
                ))
            } else {
                setAccounts(prev => prev.map(acc =>
                    acc.id === editingAccount.id ? { ...formData, id: acc.id } : acc
                ))
            }
            toast.success(t("bankSettings.savedSuccess"))
            logActivity({
                action: "Updated bank account",
                module: "Settings",
                detail: `${dialogMode.toUpperCase()} | Bank: ${formData.bankName}, Account: ${formData.accountNumber}`
            })
        } else {
            const newAccount: BankAccount = {
                ...formData,
                id: `BA-${Date.now()}`
            }
            if (dialogMode === 'online') {
                setOnlineAccounts(prev => [...prev, newAccount])
            } else {
                setAccounts(prev => [...prev, newAccount])
            }
            toast.success(t("bankSettings.savedSuccess"))
            logActivity({
                action: "Created bank account",
                module: "Settings",
                detail: `${dialogMode.toUpperCase()} | Bank: ${formData.bankName}, Account: ${formData.accountNumber}`
            })
        }
        setIsDialogOpen(false)
    }

    const handleDelete = (id: string) => {
        confirmDialog.confirm(() => {
            setAccounts(prev => prev.filter(acc => acc.id !== id))
            toast.success(t("bankSettings.deletedSuccess"))
            logActivity({
                action: "Deleted bank account",
                module: "Settings",
                detail: `Account ID: ${id}`
            })
        })
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
                <div>
                    <h2 className="text-xl font-semibold">
                        {t("bankSettings.title")}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("bankSettings.subtitle")}</p>
                </div>
            </div>

            {/* ── Offline Payment (Local) ── */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold">{t("bankSettings.offlinePaymentTitle") || "Offline Payment"}</h3>
                        <p className="text-sm text-muted-foreground">Manage bank accounts for offline/counter payments</p>
                    </div>
                    {userCanEdit && (
                    <Button onClick={() => handleOpenDialog(undefined, 'offline')}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("bankSettings.addAccount")}
                    </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOffline("bankName")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.bank")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[30%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOffline("accountNumber")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.accountNumber")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[25%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOffline("glAccount")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.glAccount")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead align="center" className="w-[15%] text-center">{t("bankSettings.actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAccounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                            {t("bankSettings.noAccounts")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedAccounts.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.bankName}</TableCell>
                                            <TableCell className="font-mono">{maskAccountNumber(account.accountNumber)}</TableCell>
                                            <TableCell className="font-mono">{account.glAccount || "-"}</TableCell>
                                            <TableCell align="center" className="text-center">
                                                {userCanEdit && (
                                                <div className="flex gap-1 justify-center">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(account, 'offline')}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* ── Online Payment (Gateway) ── */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold">{t("bankSettings.onlinePaymentTitle") || "Online Payment (Gateway)"}</h3>
                        <p className="text-sm text-muted-foreground">{t("bankSettings.onlinePaymentSubtitle") || "Manage bank accounts and GL account mappings for online payments"}</p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table className="table-fixed">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[20%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOnline("paymentSource")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.paymentSource")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[25%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOnline("bankName")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.bank")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[25%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOnline("accountNumber")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.accountNumber")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-[20%] cursor-pointer hover:bg-muted/50" onClick={() => handleSortOnline("glAccount")}>
                                        <div className="flex items-center gap-1">
                                            {t("bankSettings.glAccount")}
                                            <ArrowUpDown className="h-4 w-4" />
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedOnlineAccounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                            {t("bankSettings.noAccounts")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedOnlineAccounts.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.paymentSource}</TableCell>
                                            <TableCell>{account.bankName}</TableCell>
                                            <TableCell className="font-mono">{maskAccountNumber(account.accountNumber)}</TableCell>
                                            <TableCell className="font-mono">{account.glAccount || "-"}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>


            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg p-8">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl">
                            {editingAccount
                                ? t("bankSettings.editAccount")
                                : dialogMode === 'online'
                                    ? t("bankSettings.addOnlineAccount") || "Add Online Payment Account"
                                    : t("bankSettings.addAccount")
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6">
                        {dialogMode === 'online' && (
                        <div className="grid gap-2">
                            <Label htmlFor="paymentSource">{t("bankSettings.paymentSource")} <span className="text-destructive">*</span></Label>
                            <Select
                                value={formData.paymentSource}
                                onValueChange={(val) => setFormData({ ...formData, paymentSource: val })}
                            >
                                <SelectTrigger id="paymentSource">
                                    <SelectValue placeholder="Select Payment Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_SOURCES.map(source => (
                                        <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="bankName">{t("bankSettings.bank")} <span className="text-destructive">*</span></Label>
                            <Select
                                value={formData.bankName}
                                onValueChange={(val) => setFormData({ ...formData, bankName: val })}
                            >
                                <SelectTrigger id="bankName">
                                    <SelectValue placeholder={t("bankSettings.selectBank")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {BANKS.map(bank => (
                                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="accountNumber">{t("bankSettings.accountNumber")} <span className="text-destructive">*</span></Label>
                            <Input
                                id="accountNumber"
                                value={formData.accountNumber}
                                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                placeholder="xxx-x-xxxxx-x"
                                className="font-mono"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="glAccount">{t("bankSettings.glAccount")}</Label>
                            <Input
                                id="glAccount"
                                value={formData.glAccount}
                                onChange={(e) => setFormData({ ...formData, glAccount: e.target.value })}
                                placeholder="e.g., 1010-001"
                                className="font-mono"
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
                            <div className="space-y-0.5">
                                <Label htmlFor="isActive" className="text-base font-medium cursor-pointer">
                                    {t("bankSettings.status")}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {formData.isActive ? t("bankSettings.activeDesc") : t("bankSettings.inactiveDesc")}
                                </p>
                            </div>
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(val: boolean) => setFormData({ ...formData, isActive: val })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t("common.cancel")}</Button>
                        <Button onClick={handleSave}>{t("common.save")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmDialog.isOpen}
                onOpenChange={confirmDialog.setIsOpen}
                onConfirm={confirmDialog.handleConfirm}
                titleKey="bankSettings.confirmDeleteTitle"
                descriptionKey="bankSettings.confirmDeleteMessage"
            />
        </div>
    )
}
