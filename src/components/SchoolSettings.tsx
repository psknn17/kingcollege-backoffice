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
import { School, Upload, Save, Phone, Mail, Globe, CreditCard } from "lucide-react"

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
  const [formData, setFormData] = useState<SchoolInfo>(loadSettings())
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    try {
      saveSettings(formData)
      toast.success("School settings saved successfully")
    } catch (error) {
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
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
        <Button onClick={handleSave} disabled={!userCanEdit || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Main Content - Single Card */}
      <Card>
        <CardContent className="p-6">
          {/* Logo Section - Compact */}
          <div className="mb-4 pb-4 border-b">
            <Label className="text-xs font-medium mb-2 block">School Logo</Label>
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
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Two Column Layout for Compact View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: School Identity */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                School Information
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">School Name (English) *</Label>
                  <Input
                    value={formData.schoolName}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                    placeholder="School name in English"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">School Name (Thai) *</Label>
                  <Input
                    value={formData.schoolNameThai}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolNameThai: e.target.value }))}
                    placeholder="ชื่อโรงเรียนภาษาไทย"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tax ID</Label>
                  <Input
                    value={formData.taxId}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                    placeholder="0-xxxx-xxxxx-xx-x"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
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
                  <Label className="text-xs flex items-center gap-1.5">
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
                  <Label className="text-xs flex items-center gap-1.5">
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
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Address & Banking
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Address (English) *</Label>
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
                  <Label className="text-xs">Address (Thai) *</Label>
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
                <h4 className="font-medium text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Bank Details
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs">Bank Name *</Label>
                  <Input
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="e.g., Kasikorn Bank"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Account Name *</Label>
                  <Input
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                    placeholder="Account holder name"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Account Number *</Label>
                  <Input
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                    placeholder="xxx-x-xxxxx-x"
                    disabled={!userCanEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Branch</Label>
                    <Input
                      value={formData.bankBranch}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                      placeholder="e.g., Sathu Pradit"
                      disabled={!userCanEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SWIFT Code</Label>
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
    </div>
  )
}
