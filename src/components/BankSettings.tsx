import { useState } from "react"
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
import { Building, Plus, Edit, Trash2, Landmark, CheckCircle2, XCircle } from "lucide-react"
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

export function BankSettings() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const userCanEdit = canPerformActions(user?.role)
    const confirmDialog = useConfirmDialog()

    const [accounts, setAccounts] = usePersistedState<BankAccount[]>(STORAGE_KEY, [])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)

    const initialFormData: Omit<BankAccount, "id"> = {
        paymentSource: "",
        bankName: "",
        accountNumber: "",
        glAccount: "",
        isActive: true
    }

    const [formData, setFormData] = useState<Omit<BankAccount, "id">>(initialFormData)

    const handleOpenDialog = (account?: BankAccount) => {
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
        if (!formData.paymentSource || !formData.bankName || !formData.accountNumber) {
            toast.error("Please fill in all required fields")
            return
        }

        if (editingAccount) {
            setAccounts(prev => prev.map(acc =>
                acc.id === editingAccount.id ? { ...formData, id: acc.id } : acc
            ))
            toast.success(t("bankSettings.savedSuccess"))
        } else {
            const newAccount: BankAccount = {
                ...formData,
                id: `BA-${Date.now()}`
            }
            setAccounts(prev => [...prev, newAccount])
            toast.success(t("bankSettings.savedSuccess"))
        }
        setIsDialogOpen(false)
    }

    const handleDelete = (id: string) => {
        confirmDialog.confirm(() => {
            setAccounts(prev => prev.filter(acc => acc.id !== id))
            toast.success(t("bankSettings.deletedSuccess"))
        })
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Landmark className="w-6 h-6 text-primary" />
                        {t("bankSettings.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t("bankSettings.subtitle")}</p>
                </div>
                <Button onClick={() => handleOpenDialog()} disabled={!userCanEdit}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("bankSettings.addAccount")}
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("bankSettings.paymentSource")}</TableHead>
                                <TableHead>{t("bankSettings.bank")}</TableHead>
                                <TableHead>{t("bankSettings.accountNumber")}</TableHead>
                                <TableHead>{t("bankSettings.glAccount")}</TableHead>
                                <TableHead align="center" className="text-center">{t("bankSettings.isActive")}</TableHead>
                                <TableHead align="right" className="text-right">{t("bankSettings.actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        {t("bankSettings.noAccounts")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">{account.paymentSource}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-muted-foreground" />
                                                {account.bankName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">{account.accountNumber}</TableCell>
                                        <TableCell className="font-mono">{account.glAccount || "-"}</TableCell>
                                        <TableCell align="center" className="text-center">
                                            {account.isActive ? (
                                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    {t("common.active")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-muted-foreground">
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    {t("common.inactive")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(account)}
                                                    disabled={!userCanEdit}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDelete(account.id)}
                                                    disabled={!userCanEdit}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg p-8">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl">{editingAccount ? t("bankSettings.editAccount") : t("bankSettings.addAccount")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="paymentSource">{t("bankSettings.paymentSource")} *</Label>
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
                        <div className="grid gap-2">
                            <Label htmlFor="bankName">{t("bankSettings.bank")} *</Label>
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
                            <Label htmlFor="accountNumber">{t("bankSettings.accountNumber")} *</Label>
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
