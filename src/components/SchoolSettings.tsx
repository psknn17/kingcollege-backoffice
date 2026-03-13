import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { School, Upload, Save } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"

interface SchoolInfo {
  schoolName: string
  schoolNameThai: string
  address: string
  addressThai: string
  phone: string
  email: string
  logoUrl: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
}

const STORAGE_KEY = "schoolSettings"

const loadSettings = (): SchoolInfo => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
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
    logoUrl: "",
    bankName: "Kasikorn Bank",
    bankAccountName: "King's College International School Bangkok",
    bankAccountNumber: "041-1-12977-2",
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
      window.dispatchEvent(new Event("schoolSettingsUpdated"))
      toast.success("School settings saved successfully")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveClick = () => {
    confirmDialog.confirm(() => handleSave())
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

  const field = (
    label: string,
    key: keyof SchoolInfo,
    opts?: { placeholder?: string; required?: boolean; type?: string }
  ) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}{opts?.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        type={opts?.type ?? "text"}
        value={formData[key] as string}
        onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        disabled={!userCanEdit}
        className="h-9"
      />
    </div>
  )

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
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

      {/* School Logo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">School Logo</CardTitle>
        </CardHeader>
        <CardContent>
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
                <Button variant="outline" size="sm" asChild disabled={!userCanEdit}>
                  <span className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5 mr-2" />
                    Upload Logo
                  </span>
                </Button>
              </label>
              <p className="text-sm text-muted-foreground">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column: School Info + Address */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {field("School Name (English)", "schoolName", { placeholder: "School name in English", required: true })}
            {field("School Name (Thai)", "schoolNameThai", { placeholder: "ชื่อโรงเรียนภาษาไทย", required: true })}
            {field("Phone", "phone", { placeholder: "02-xxx-xxxx", required: true })}
            {field("Email", "email", { placeholder: "info@school.com", required: true, type: "email" })}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Address (English)<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="School address in English"
                rows={3}
                disabled={!userCanEdit}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Address (Thai)<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Textarea
                value={formData.addressThai}
                onChange={e => setFormData(prev => ({ ...prev, addressThai: e.target.value }))}
                placeholder="ที่อยู่โรงเรียนภาษาไทย"
                rows={3}
                disabled={!userCanEdit}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Bank Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Bank Name", "bankName", { placeholder: "e.g., Kasikorn Bank", required: true })}
            {field("Account Name", "bankAccountName", { placeholder: "Account holder name", required: true })}
            {field("Account Number", "bankAccountNumber", { placeholder: "xxx-x-xxxxx-x", required: true })}
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
