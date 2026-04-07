import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { toast } from "sonner"
import { logActivity } from "@/lib/activityLog"
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
    if (!formData.schoolName.trim() || !formData.phone.trim() || !formData.email.trim()) {
      toast.error("Please fill in all required fields")
      return
    }
    setIsSaving(true)
    try {
      saveSettings(formData)
      window.dispatchEvent(new Event("schoolSettingsUpdated"))
      toast.success("School settings saved successfully")
      logActivity({ action: "Update School Settings", module: "School Settings", detail: `Updated school settings for ${formData.schoolName}` })
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
    <div className="p-3 md:p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">School Settings</h2>
          <p className="text-sm text-muted-foreground">Manage school information and system settings</p>
        </div>
        <Button onClick={handleSaveClick} disabled={!userCanEdit || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School Logo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">School Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {formData.logoUrl ? (
                <div className="w-28 h-28 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                  <img src={formData.logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-28 h-28 border-2 border-dashed rounded-lg bg-muted flex items-center justify-center">
                  <School className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
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
              <div className="text-xs text-muted-foreground space-y-0.5 text-center">
                <p>Support .png, .jpg and .jpeg file</p>
                <p>Recommended 200x200 px (1:1 ratio)</p>
                <p>Maximum file size 3 MB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field("School Name (English)", "schoolName", { placeholder: "School name in English" })}
              {field("School Name (Thai)", "schoolNameThai", { placeholder: "ชื่อโรงเรียนภาษาไทย" })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field("Phone", "phone", { placeholder: "02-xxx-xxxx" })}
              {field("Email", "email", { placeholder: "info@school.com", type: "email" })}
            </div>
          </CardContent>
        </Card>
      </div>

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
