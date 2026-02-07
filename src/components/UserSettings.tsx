import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Separator } from "./ui/separator"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { Settings, Bell, Globe, Moon, Sun, Monitor, Mail, Smartphone, Save } from "lucide-react"

export function UserSettings() {
  const { language, setLanguage } = useLanguage()
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light")
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    invoiceReminders: true,
    paymentAlerts: true,
    systemUpdates: false,
    weeklyReport: true,
  })

  const handleSaveSettings = () => {
    // Here you would save settings to backend
    toast.success("Settings saved successfully")
  }

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your preferences and application settings</p>
      </div>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Language & Region
          </CardTitle>
          <CardDescription>Choose your preferred language and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Display Language</Label>
            <Select value={language} onValueChange={(value: 'en' | 'th') => setLanguage(value)}>
              <SelectTrigger id="language" className="w-full md:w-64">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <span>🇬🇧</span>
                    <span>English</span>
                  </div>
                </SelectItem>
                <SelectItem value="th">
                  <div className="flex items-center gap-2">
                    <span>🇹🇭</span>
                    <span>ไทย (Thai)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">This will change the language across the entire application</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select defaultValue="asia-bangkok">
              <SelectTrigger id="timezone" className="w-full md:w-64">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asia-bangkok">
                  <span>(GMT+7) Bangkok, Hanoi, Jakarta</span>
                </SelectItem>
                <SelectItem value="asia-tokyo">
                  <span>(GMT+9) Tokyo, Seoul</span>
                </SelectItem>
                <SelectItem value="asia-singapore">
                  <span>(GMT+8) Singapore, Hong Kong</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === "light" ? <Sun className="w-5 h-5" /> : theme === "dark" ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            Appearance
          </CardTitle>
          <CardDescription>Customize how the application looks on your device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}>
              <SelectTrigger id="theme" className="w-full md:w-64">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span>System Default</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Choose between light and dark mode, or sync with your system</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive updates and alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <Label htmlFor="email-notifications" className="text-base font-medium">
                  Email Notifications
                </Label>
              </div>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={notifications.emailNotifications}
              onCheckedChange={() => handleNotificationToggle("emailNotifications")}
            />
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <Label htmlFor="push-notifications" className="text-base font-medium">
                  Push Notifications
                </Label>
              </div>
              <p className="text-sm text-gray-500">Get push notifications on your devices</p>
            </div>
            <Switch
              id="push-notifications"
              checked={notifications.pushNotifications}
              onCheckedChange={() => handleNotificationToggle("pushNotifications")}
            />
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <Label className="text-sm font-semibold text-gray-700">Notification Preferences</Label>

            {/* Invoice Reminders */}
            <div className="flex items-center justify-between pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="invoice-reminders" className="text-sm font-medium">
                  Invoice Reminders
                </Label>
                <p className="text-xs text-gray-500">Get notified about pending invoices</p>
              </div>
              <Switch
                id="invoice-reminders"
                checked={notifications.invoiceReminders}
                onCheckedChange={() => handleNotificationToggle("invoiceReminders")}
              />
            </div>

            {/* Payment Alerts */}
            <div className="flex items-center justify-between pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="payment-alerts" className="text-sm font-medium">
                  Payment Alerts
                </Label>
                <p className="text-xs text-gray-500">Receive alerts for new payments</p>
              </div>
              <Switch
                id="payment-alerts"
                checked={notifications.paymentAlerts}
                onCheckedChange={() => handleNotificationToggle("paymentAlerts")}
              />
            </div>

            {/* System Updates */}
            <div className="flex items-center justify-between pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="system-updates" className="text-sm font-medium">
                  System Updates
                </Label>
                <p className="text-xs text-gray-500">Get notified about system maintenance</p>
              </div>
              <Switch
                id="system-updates"
                checked={notifications.systemUpdates}
                onCheckedChange={() => handleNotificationToggle("systemUpdates")}
              />
            </div>

            {/* Weekly Report */}
            <div className="flex items-center justify-between pl-4">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-report" className="text-sm font-medium">
                  Weekly Summary Report
                </Label>
                <p className="text-xs text-gray-500">Receive weekly activity summaries</p>
              </div>
              <Switch
                id="weekly-report"
                checked={notifications.weeklyReport}
                onCheckedChange={() => handleNotificationToggle("weeklyReport")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Control your privacy and security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="activity-tracking" className="text-base font-medium">
                Activity Tracking
              </Label>
              <p className="text-sm text-gray-500">Allow the system to track your activity for analytics</p>
            </div>
            <Switch id="activity-tracking" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="session-timeout" className="text-base font-medium">
                Auto-logout on Inactivity
              </Label>
              <p className="text-sm text-gray-500">Automatically log out after 30 minutes of inactivity</p>
            </div>
            <Switch id="session-timeout" defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSaveSettings} size="lg" className="gap-2">
          <Save className="w-4 h-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  )
}
