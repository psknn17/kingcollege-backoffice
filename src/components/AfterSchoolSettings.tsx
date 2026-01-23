import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Textarea } from "./ui/textarea"
import { CalendarIcon, Save, Plus, Trash2, Settings, Clock } from "lucide-react"
import { format } from "date-fns"
import { useLanguage } from "@/contexts/LanguageContext"

interface RegistrationPeriod {
  id: string
  name: string
  description: string
  openDate: Date | null
  closeDate: Date | null
  isActive: boolean
  allowExternal: boolean
  maxRegistrationsPerStudent: number
  earlyBirdDiscount: number
  earlyBirdDeadline: Date | null
}

const initialPeriods: RegistrationPeriod[] = [
  {
    id: "1",
    name: "Term 1 Registration 2025-2026",
    description: "After school activities registration for Term 1 (August - December 2025)",
    openDate: new Date("2025-07-01"),
    closeDate: new Date("2025-07-31"),
    isActive: true,
    allowExternal: true,
    maxRegistrationsPerStudent: 3,
    earlyBirdDiscount: 10,
    earlyBirdDeadline: new Date("2025-07-15")
  },
  {
    id: "2",
    name: "Term 2 Registration 2025-2026",
    description: "After school activities registration for Term 2 (January - March 2026)",
    openDate: new Date("2025-12-01"),
    closeDate: new Date("2025-12-31"),
    isActive: false,
    allowExternal: true,
    maxRegistrationsPerStudent: 3,
    earlyBirdDiscount: 5,
    earlyBirdDeadline: new Date("2025-12-15")
  }
]

export function AfterSchoolSettings() {
  const { t } = useLanguage()
  const [periods, setPeriods] = useState<RegistrationPeriod[]>(initialPeriods)
  const [globalSettings, setGlobalSettings] = useState({
    autoCloseRegistration: true,
    sendConfirmationEmails: true,
    requireParentApproval: false,
    allowWaitlist: true,
    maxWaitlistSize: 10,
    paymentDeadlineDays: 7,
    cancellationDeadlineDays: 3
  })

  const addPeriod = () => {
    const newPeriod: RegistrationPeriod = {
      id: Date.now().toString(),
      name: "New Registration Period",
      description: "",
      openDate: null,
      closeDate: null,
      isActive: false,
      allowExternal: false,
      maxRegistrationsPerStudent: 3,
      earlyBirdDiscount: 0,
      earlyBirdDeadline: null
    }
    setPeriods([...periods, newPeriod])
  }

  const updatePeriod = (id: string, field: keyof RegistrationPeriod, value: any) => {
    setPeriods(periods.map(period => 
      period.id === id ? { ...period, [field]: value } : period
    ))
  }

  const deletePeriod = (id: string) => {
    setPeriods(periods.filter(period => period.id !== id))
  }

  const saveSettings = () => {
    console.log("Saving settings", { periods, globalSettings })
    // In a real app, this would save to backend
  }

  const getPeriodStatus = (period: RegistrationPeriod) => {
    const now = new Date()
    if (!period.openDate || !period.closeDate) return "incomplete"
    if (now < period.openDate) return "upcoming"
    if (now > period.closeDate) return "closed"
    return "active"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{t("common.active")}</span>
      case "upcoming":
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{t("settings.upcoming")}</span>
      case "closed":
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{t("settings.closed")}</span>
      case "incomplete":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">{t("settings.incomplete")}</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("settings.afterSchoolTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("settings.afterSchoolDesc")}
          </p>
        </div>
        <Button onClick={addPeriod} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t("settings.addPeriod")}
        </Button>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t("settings.globalSettings")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.autoClose")}</Label>
                  <p className="text-sm text-muted-foreground">{t("settings.autoCloseDesc")}</p>
                </div>
                <Switch
                  checked={globalSettings.autoCloseRegistration}
                  onCheckedChange={(checked) => 
                    setGlobalSettings({...globalSettings, autoCloseRegistration: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.sendConfirmation")}</Label>
                  <p className="text-sm text-muted-foreground">{t("settings.sendConfirmationDesc")}</p>
                </div>
                <Switch
                  checked={globalSettings.sendConfirmationEmails}
                  onCheckedChange={(checked) =>
                    setGlobalSettings({...globalSettings, sendConfirmationEmails: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.requireApproval")}</Label>
                  <p className="text-sm text-muted-foreground">{t("settings.requireApprovalDesc")}</p>
                </div>
                <Switch
                  checked={globalSettings.requireParentApproval}
                  onCheckedChange={(checked) =>
                    setGlobalSettings({...globalSettings, requireParentApproval: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("settings.allowWaitlist")}</Label>
                  <p className="text-sm text-muted-foreground">{t("settings.allowWaitlistDesc")}</p>
                </div>
                <Switch
                  checked={globalSettings.allowWaitlist}
                  onCheckedChange={(checked) =>
                    setGlobalSettings({...globalSettings, allowWaitlist: checked})
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("settings.maxWaitlist")}</Label>
                <Input
                  type="number"
                  value={globalSettings.maxWaitlistSize}
                  onChange={(e) =>
                    setGlobalSettings({...globalSettings, maxWaitlistSize: parseInt(e.target.value)})
                  }
                  disabled={!globalSettings.allowWaitlist}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("settings.paymentDeadline")}</Label>
                <Input
                  type="number"
                  value={globalSettings.paymentDeadlineDays}
                  onChange={(e) =>
                    setGlobalSettings({...globalSettings, paymentDeadlineDays: parseInt(e.target.value)})
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.paymentDeadlineDesc")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t("settings.cancellationDeadline")}</Label>
                <Input
                  type="number"
                  value={globalSettings.cancellationDeadlineDays}
                  onChange={(e) =>
                    setGlobalSettings({...globalSettings, cancellationDeadlineDays: parseInt(e.target.value)})
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.cancellationDeadlineDesc")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Periods */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("settings.registrationPeriods")}</h3>
        
        {periods.map((period) => {
          const status = getPeriodStatus(period)
          
          return (
            <Card key={period.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Input
                      value={period.name}
                      onChange={(e) => updatePeriod(period.id, "name", e.target.value)}
                      className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                    />
                    {getStatusBadge(status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={period.isActive}
                      onCheckedChange={(checked) => updatePeriod(period.id, "isActive", checked)}
                    />
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => deletePeriod(period.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("common.description")}</Label>
                  <Textarea
                    value={period.description}
                    onChange={(e) => updatePeriod(period.id, "description", e.target.value)}
                    placeholder={t("settings.enterDescription")}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("settings.registrationOpens")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {period.openDate ? format(period.openDate, "PPP") : t("settings.pickDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={period.openDate || undefined}
                          onSelect={(date) => updatePeriod(period.id, "openDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("settings.registrationCloses")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {period.closeDate ? format(period.closeDate, "PPP") : t("settings.pickDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={period.closeDate || undefined}
                          onSelect={(date) => updatePeriod(period.id, "closeDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t("settings.maxActivities")}</Label>
                    <Input
                      type="number"
                      value={period.maxRegistrationsPerStudent}
                      onChange={(e) => updatePeriod(period.id, "maxRegistrationsPerStudent", parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("settings.earlyBirdDiscount")}</Label>
                    <Input
                      type="number"
                      value={period.earlyBirdDiscount}
                      onChange={(e) => updatePeriod(period.id, "earlyBirdDiscount", parseInt(e.target.value))}
                      min="0"
                      max="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("settings.earlyBirdDeadline")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {period.earlyBirdDeadline ? format(period.earlyBirdDeadline, "MM/dd") : t("settings.pickDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={period.earlyBirdDeadline || undefined}
                          onSelect={(date) => updatePeriod(period.id, "earlyBirdDeadline", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("settings.allowExternal")}</Label>
                    <p className="text-sm text-muted-foreground">{t("settings.allowExternalDesc")}</p>
                  </div>
                  <Switch
                    checked={period.allowExternal}
                    onCheckedChange={(checked) => updatePeriod(period.id, "allowExternal", checked)}
                  />
                </div>

                {/* Period Summary */}
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("settings.periodSummary")}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("common.status")}:</span>{" "}
                      <span className={
                        status === "active" ? "text-green-600" :
                        status === "upcoming" ? "text-blue-600" :
                        status === "closed" ? "text-gray-600" : "text-red-600"
                      }>
                        {t(`settings.${status}`)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("settings.duration")}:</span>{" "}
                      {period.openDate && period.closeDate
                        ? `${Math.ceil((period.closeDate.getTime() - period.openDate.getTime()) / (1000 * 60 * 60 * 24))} ${t("settings.days")}`
                        : t("settings.notSet")
                      }
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("settings.external")}:</span>{" "}
                      <span className={period.allowExternal ? "text-green-600" : "text-red-600"}>
                        {period.allowExternal ? t("settings.allowed") : t("settings.notAllowed")}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("invoice.discount")}:</span>{" "}
                      {period.earlyBirdDiscount > 0 ? `${period.earlyBirdDiscount}%` : t("settings.none")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} size="lg" className="px-8">
          <Save className="w-4 h-4 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  )
}