import { useState } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Separator } from "./ui/separator"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { School, Upload, Save, Phone, Mail, Globe, CreditCard, Trash2, AlertTriangle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"

interface SchoolInfo {
  schoolName: string
  schoolNameThai: string
  address: string
  addressThai: string
  phone: string
  email: string
  website: string
  taxId: string
  logoUrl: string
  // Bank details
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  bankBranch: string
  swiftCode: string
}

const STORAGE_KEY = "schoolSettings"

const loadSettings = (): SchoolInfo => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load school settings:", error)
  }

  return {
    schoolName: "King's College International School Bangkok",
    schoolNameThai: "โรงเรียนนานาชาติคิงส์คอลเลจ กรุงเทพฯ",
    address: "123 School Road, Bangkok 10110, Thailand",
    addressThai: "123 ถนนโรงเรียน แขวงสาทร เขตสาทร กรุงเทพฯ 10110",
    phone: "02-123-4567",
    email: "info@kingscollege.ac.th",
    website: "www.kingscollege.ac.th",
    taxId: "0-1234-56789-01-2",
    logoUrl: "",
    bankName: "Kasikorn Bank",
    bankAccountName: "King's College International School Bangkok",
    bankAccountNumber: "041-1-12977-2",
    bankBranch: "Sathu Pradit",
    swiftCode: "KASITHBK"
  }
}

const saveSettings = (settings: SchoolInfo) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error("Failed to save school settings:", error)
    throw error
  }
}

export function SchoolSettings() {
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const confirmDialog = useConfirmDialog()
  const [formData, setFormData] = useState<SchoolInfo>(loadSettings())
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    try {
      saveSettings(formData)
      // Dispatch event to notify other components
      window.dispatchEvent(new Event("schoolSettingsUpdated"))
      toast.success("School settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = () => {
    confirmDialog.confirm(() => {
      handleSave()
    })
  }

  const handleResetAllData = () => {
    // Keys to preserve (user management + auth + language)
    const KEEP_KEYS = new Set([
      "authUser", "users", "needsRoleSelection",
      "app-language", "currentUser", "username", "mockIp"
    ])

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !KEEP_KEYS.has(key)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))

    toast.success(`System data cleared (${keysToRemove.length} items removed)`, {
      description: "User accounts have been preserved. Reloading..."
    })
    setTimeout(() => window.location.reload(), 1500)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">School Settings</h1>
            <p className="text-sm text-muted-foreground">Manage school information and system settings</p>
          </div>
        </div>
        <Button onClick={handleSaveClick} disabled={!userCanEdit || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Main Content - Single Card */}
      <Card>
        <CardContent className="p-6">
          {/* Logo Section - Compact */}
          <div className="mb-4 pb-4 border-b">
            <Label className="text-base font-medium mb-2 block">School Logo</Label>
            <div className="flex items-center gap-4">
              {formData.logoUrl ? (
                <div className="w-20 h-20 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  <img src={formData.logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <School className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  disabled={!userCanEdit}
                />
                <label htmlFor="logo-upload">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={!userCanEdit}
                  >
                    <span className="cursor-pointer">
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      Upload Logo
                    </span>
                  </Button>
                </label>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Two Column Layout for Compact View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: School Identity */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-muted-foreground uppercase tracking-wide">
                School Information
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-base">School Name (English) *</Label>
                  <Input
                    value={formData.schoolName}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                    placeholder="School name in English"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base">School Name (Thai) *</Label>
                  <Input
                    value={formData.schoolNameThai}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolNameThai: e.target.value }))}
                    placeholder="ชื่อโรงเรียนภาษาไทย"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base">Tax ID</Label>
                  <Input
                    value={formData.taxId}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                    placeholder="0-xxxx-xxxxx-xx-x"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Phone *
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="02-xxx-xxxx"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Email *
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="info@school.com"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Website
                  </Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="www.school.com"
                    disabled={!userCanEdit}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Addresses & Bank */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-muted-foreground uppercase tracking-wide">
                Address & Banking
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-base">Address (English) *</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="School address in English"
                    rows={2}
                    disabled={!userCanEdit}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base">Address (Thai) *</Label>
                  <Textarea
                    value={formData.addressThai}
                    onChange={(e) => setFormData(prev => ({ ...prev, addressThai: e.target.value }))}
                    placeholder="ที่อยู่โรงเรียนภาษาไทย"
                    rows={2}
                    disabled={!userCanEdit}
                    className="resize-none"
                  />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <h4 className="font-medium text-lg flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Bank Details
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-base">Bank Name *</Label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g., Kasikorn Bank"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base">Account Name *</Label>
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                    placeholder="Account holder name"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-base">Account Number *</Label>
                  <Input
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                    placeholder="xxx-x-xxxxx-x"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-base">Branch</Label>
                    <Input
                      value={formData.bankBranch}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                      placeholder="e.g., Sathu Pradit"
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-base">SWIFT Code</Label>
                    <Input
                      value={formData.swiftCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, swiftCode: e.target.value }))}
                      placeholder="KASITHBK"
                      disabled={!userCanEdit}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-300">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-700 mb-1">Danger Zone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Clear all system data and start fresh. User accounts will be preserved.
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </p>
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
                <div>
                  <p className="text-sm font-medium">Reset All System Data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clears invoices, students, reminders, items, receipts, and all other records
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!userCanEdit} className="gap-2 flex-shrink-0 ml-4">
                      <Trash2 className="w-4 h-4" />
                      Reset System
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        Reset All System Data?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>This will permanently delete all data including:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 mt-2 text-foreground">
                          <li>All invoices and receipts</li>
                          <li>All students and family records</li>
                          <li>All items and templates</li>
                          <li>All reminders and email history</li>
                          <li>All settings (school, terms, discounts)</li>
                          <li>All activity logs and reports</li>
                        </ul>
                        <p className="mt-3 font-medium text-foreground">
                          Only user accounts will be preserved.
                        </p>
                        <p className="text-red-600 font-semibold">This action cannot be undone.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetAllData}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Yes, Reset Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        onConfirm={confirmDialog.handleConfirm}
        titleKey="confirmDialog.saveTitle"
        descriptionKey="confirmDialog.saveDescription"
      />
    </div>
  )
}
