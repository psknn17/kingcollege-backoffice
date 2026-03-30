import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Separator } from "./ui/separator"
import { toast } from "sonner"
import { logActivity } from "@/lib/activityLog"
import { useAuth, getRoleDisplayName } from "@/contexts/AuthContext"
import { User, Mail, Phone, Save, Lock, Eye, EyeOff } from "lucide-react"

export function UserProfile() {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "user@example.com",
    phone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter your name")
      return
    }

    if (!formData.email.trim()) {
      toast.error("Please enter your email")
      return
    }

    updateProfile({ name: formData.name, email: formData.email, phone: formData.phone })
    toast.success("Profile updated successfully")
    logActivity({ action: "Update Profile", module: "User Profile", detail: `Updated profile: ${formData.name} (${formData.email})` })
    setIsEditing(false)
  }

  const handlePasswordChange = () => {
    if (!formData.currentPassword) {
      toast.error("Please enter your current password")
      return
    }

    if (!formData.newPassword) {
      toast.error("Please enter a new password")
      return
    }

    if (formData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    toast.success("Password changed successfully")
    logActivity({ action: "Change Password", module: "User Profile", detail: "Password changed successfully" })
    setShowPasswordSection(false)
    setFormData({
      ...formData,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">My Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your personal information and account settings</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar + Name row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-gray-200 shadow">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{getRoleDisplayName(user?.role || "")}</p>
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                placeholder="02-123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-500">Role</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <span className="font-medium text-gray-700">{getRoleDisplayName(user?.role || "")}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Password & Security
          </CardTitle>
          <CardDescription>Change your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordSection ? (
            <Button
              variant="outline"
              onClick={() => setShowPasswordSection(true)}
              className="gap-2"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Enter new password (min. 8 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handlePasswordChange} className="gap-2">
                  <Lock className="w-4 h-4" />
                  Update Password
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordSection(false)
                    setFormData({
                      ...formData,
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
