import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { School, Upload, Save, MapPin, Phone, Mail, Globe, Building2, CreditCard } from "lucide-react"

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
  // Contact person
  contactPersonName: string
  contactPersonPosition: string
  contactPersonPhone: string
  contactPersonEmail: string
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
    swiftCode: "KASITHBK",
    contactPersonName: "John Smith",
    contactPersonPosition: "School Director",
    contactPersonPhone: "02-123-4567",
    contactPersonEmail: "director@kingscollege.ac.th"
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
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
        <Button onClick={handleSave} disabled={!userCanEdit || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* School Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            School Information
          </CardTitle>
          <CardDescription>Basic information about the school</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>School Logo</Label>
            <div className="flex items-center gap-4">
              {formData.logoUrl && (
                <div className="w-24 h-24 border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={formData.logoUrl} alt="School Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload">
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>School Name (English) *</Label>
              <Input
                value={formData.schoolName}
                onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                placeholder="School name in English"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>School Name (Thai) *</Label>
              <Input
                value={formData.schoolNameThai}
                onChange={(e) => setFormData(prev => ({ ...prev, schoolNameThai: e.target.value }))}
                placeholder="ชื่อโรงเรียนภาษาไทย"
                disabled={!userCanEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address (English) *
            </Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="School address in English"
              rows={2}
              disabled={!userCanEdit}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address (Thai) *
            </Label>
            <Textarea
              value={formData.addressThai}
              onChange={(e) => setFormData(prev => ({ ...prev, addressThai: e.target.value }))}
              placeholder="ที่อยู่โรงเรียนภาษาไทย"
              rows={2}
              disabled={!userCanEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone *
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="02-xxx-xxxx"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input
                value={formData.taxId}
                onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                placeholder="0-xxxx-xxxxx-xx-x"
                disabled={!userCanEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
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
        </CardContent>
      </Card>

      {/* Bank Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Bank Information
          </CardTitle>
          <CardDescription>Bank account details for payments and invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bank Name *</Label>
              <Input
                value={formData.bankName}
                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="e.g., Kasikorn Bank"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Branch</Label>
              <Input
                value={formData.bankBranch}
                onChange={(e) => setFormData(prev => ({ ...prev, bankBranch: e.target.value }))}
                placeholder="e.g., Sathu Pradit"
                disabled={!userCanEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account Name *</Label>
            <Input
              value={formData.bankAccountName}
              onChange={(e) => setFormData(prev => ({ ...prev, bankAccountName: e.target.value }))}
              placeholder="Account holder name"
              disabled={!userCanEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Number *</Label>
              <Input
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                placeholder="xxx-x-xxxxx-x"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>SWIFT Code</Label>
              <Input
                value={formData.swiftCode}
                onChange={(e) => setFormData(prev => ({ ...prev, swiftCode: e.target.value }))}
                placeholder="e.g., KASITHBK"
                disabled={!userCanEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Person */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Primary Contact Person
          </CardTitle>
          <CardDescription>Main contact person for school inquiries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.contactPersonName}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPersonName: e.target.value }))}
                placeholder="Full name"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Position *</Label>
              <Input
                value={formData.contactPersonPosition}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPersonPosition: e.target.value }))}
                placeholder="e.g., School Director"
                disabled={!userCanEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.contactPersonPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPersonPhone: e.target.value }))}
                placeholder="02-xxx-xxxx"
                disabled={!userCanEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.contactPersonEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPersonEmail: e.target.value }))}
                placeholder="contact@school.com"
                disabled={!userCanEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!userCanEdit || isSaving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
