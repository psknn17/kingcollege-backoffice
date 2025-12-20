import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Save, Bell, Plus, Trash2, Mail, CalendarIcon } from "lucide-react"
import { format } from "date-fns"

interface ReminderConfig {
  id: string
  name: string
  sendDate: string // Date string in YYYY-MM-DD format
  method: "email" | "sms" | "both"
  enabled: boolean
  subject: string
  message: string
}

// Helper function to format date for display
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "Not set"
  try {
    return format(new Date(dateStr), "dd MMMM yyyy")
  } catch {
    return dateStr
  }
}

const initialReminders: ReminderConfig[] = [
  {
    id: "1",
    name: "First Reminder",
    sendDate: "",
    method: "email",
    enabled: true,
    subject: "Tuition Payment Reminder",
    message: "Dear Parent, This is a friendly reminder that your child's tuition payment is due soon. Please make your payment to avoid any late fees."
  },
  {
    id: "2",
    name: "Second Reminder",
    sendDate: "",
    method: "both",
    enabled: true,
    subject: "Urgent: Tuition Payment Reminder",
    message: "Dear Parent, Your child's tuition payment is due soon. Please complete your payment as soon as possible to ensure continuous enrollment."
  },
  {
    id: "3",
    name: "Final Notice",
    sendDate: "",
    method: "both",
    enabled: true,
    subject: "FINAL NOTICE: Tuition Payment Due",
    message: "Dear Parent, This is a final notice that your child's tuition payment is due. Please contact our office immediately if you need assistance with payment arrangements."
  }
]

export function DebtReminderSettings() {
  const [reminders, setReminders] = useState<ReminderConfig[]>(initialReminders)
  const [globalSettings, setGlobalSettings] = useState({
    enableReminders: true,
    fromEmail: "noreply@kingscollege.ac.th"
  })

  const addReminder = () => {
    const newReminder: ReminderConfig = {
      id: Date.now().toString(),
      name: "New Reminder",
      sendDate: "",
      method: "email",
      enabled: true,
      subject: "",
      message: ""
    }
    setReminders([...reminders, newReminder])
  }

  const updateReminder = (id: string, field: keyof ReminderConfig, value: any) => {
    setReminders(reminders.map(reminder => 
      reminder.id === id ? { ...reminder, [field]: value } : reminder
    ))
  }

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(reminder => reminder.id !== id))
  }

  const saveSettings = () => {
    console.log("Saving reminder settings", { reminders, globalSettings })
    // In a real app, this would save to backend
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Debt Reminder Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure up to 3 reminder periods for unpaid tuition
          </p>
        </div>
        <Button onClick={addReminder} disabled={reminders.length >= 3} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Reminder
        </Button>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Global Reminder Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Automatic Reminders</Label>
              <p className="text-sm text-muted-foreground">Turn on/off all reminder notifications</p>
            </div>
            <Switch
              checked={globalSettings.enableReminders}
              onCheckedChange={(checked) => 
                setGlobalSettings({...globalSettings, enableReminders: checked})
              }
            />
          </div>

          <div className="space-y-2">
            <Label>From Email Address</Label>
            <Input
              value={globalSettings.fromEmail}
              onChange={(e) =>
                setGlobalSettings({...globalSettings, fromEmail: e.target.value})
              }
              placeholder="noreply@example.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Configurations */}
      <div className="space-y-4">
        {reminders.map((reminder, index) => (
          <Card key={reminder.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  <Input
                    value={reminder.name}
                    onChange={(e) => updateReminder(reminder.id, "name", e.target.value)}
                    className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={(checked) => updateReminder(reminder.id, "enabled", checked)}
                  />
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => deleteReminder(reminder.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    value={reminder.subject}
                    onChange={(e) => updateReminder(reminder.id, "subject", e.target.value)}
                    placeholder="Enter email subject line"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Send Date
                  </Label>
                  <Input
                    type="date"
                    value={reminder.sendDate}
                    onChange={(e) => updateReminder(reminder.id, "sendDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message Template</Label>
                <Textarea
                  value={reminder.message}
                  onChange={(e) => updateReminder(reminder.id, "message", e.target.value)}
                  placeholder="Enter reminder message template"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{parent_name}"}, {"{student_name}"}, {"{amount}"}, {"{due_date}"}, {"{days_remaining}"}
                </p>
              </div>

              {/* Preview */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Reminder Preview</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Send Date:</strong> {formatDisplayDate(reminder.sendDate)}</p>
                  <p><strong>Status:</strong>
                    <span className={reminder.enabled ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                      {reminder.enabled ? "Active" : "Disabled"}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} size="lg" className="px-8">
          <Save className="w-4 h-4 mr-2" />
          Save All Reminder Settings
        </Button>
      </div>
    </div>
  )
}