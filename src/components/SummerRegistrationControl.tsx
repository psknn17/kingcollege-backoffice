import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Textarea } from "./ui/textarea"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Progress } from "./ui/progress"
import { 
  Play, 
  Pause, 
  Settings, 
  CalendarDays, 
  Users, 
  Clock, 
  Edit, 
  Trash2, 
  Plus,
  AlertTriangle,
  CheckCircle,
  Sun,
  Target,
  DollarSign,
  Percent,
  Tag
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/components/ui/sonner"

interface PricingSettings {
  regularPrice: number
  earlyBirdDiscount: number
  lateRegistrationFee: number
  siblingDiscount: number
  groupDiscount: number
  externalStudentSurcharge: number
  currency: string
}

interface RegistrationPeriod {
  id: number
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
  targetGroups: string[]
  maxRegistrations: number
  currentRegistrations: number
  priority: 'high' | 'medium' | 'low'
  description: string
  pricingSettings?: PricingSettings
}

interface ActivityControl {
  id: number
  name: string
  category: string
  isOpen: boolean
  capacity: number
  registered: number
  waitlist: number
  registrationDeadline: Date
  ageGroup: string
  fee: number
}

const mockRegistrationPeriods: RegistrationPeriod[] = [
  {
    id: 1,
    name: "Early Bird Registration",
    startDate: new Date("2024-04-01"),
    endDate: new Date("2024-04-30"),
    isActive: true,
    targetGroups: ["All Students"],
    maxRegistrations: 500,
    currentRegistrations: 234,
    priority: 'high',
    description: "Early registration with 15% discount for all summer activities",
    pricingSettings: {
      regularPrice: 3500,
      earlyBirdDiscount: 15,
      lateRegistrationFee: 0,
      siblingDiscount: 10,
      groupDiscount: 20,
      externalStudentSurcharge: 500,
      currency: "THB"
    }
  },
  {
    id: 2,
    name: "Regular Registration", 
    startDate: new Date("2024-05-01"),
    endDate: new Date("2024-05-31"),
    isActive: false,
    targetGroups: ["All Students"],
    maxRegistrations: 800,
    currentRegistrations: 0,
    priority: 'medium',
    description: "Standard registration period for summer activities",
    pricingSettings: {
      regularPrice: 3500,
      earlyBirdDiscount: 0,
      lateRegistrationFee: 0,
      siblingDiscount: 10,
      groupDiscount: 15,
      externalStudentSurcharge: 500,
      currency: "THB"
    }
  },
  {
    id: 3,
    name: "Late Registration",
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-15"),
    isActive: false,
    targetGroups: ["Year 7-12"],
    maxRegistrations: 200,
    currentRegistrations: 0,
    priority: 'low',
    description: "Final registration window with limited availability",
    pricingSettings: {
      regularPrice: 3500,
      earlyBirdDiscount: 0,
      lateRegistrationFee: 300,
      siblingDiscount: 5,
      groupDiscount: 10,
      externalStudentSurcharge: 500,
      currency: "THB"
    }
  }
]

const mockActivityControls: ActivityControl[] = [
  {
    id: 1,
    name: "Swimming Intensive",
    category: "Sports",
    isOpen: true,
    capacity: 20,
    registered: 18,
    waitlist: 5,
    registrationDeadline: new Date("2024-05-15"),
    ageGroup: "7-12 years",
    fee: 3500
  },
  {
    id: 2,
    name: "Art & Craft Workshop",
    category: "Creative",
    isOpen: true,
    capacity: 15,
    registered: 12,
    waitlist: 2,
    registrationDeadline: new Date("2024-05-20"),
    ageGroup: "5-10 years",
    fee: 2800
  },
  {
    id: 3,
    name: "Coding for Kids",
    category: "Technology",
    isOpen: false,
    capacity: 12,
    registered: 12,
    waitlist: 8,
    registrationDeadline: new Date("2024-05-10"),
    ageGroup: "8-14 years",
    fee: 4500
  }
]

export function SummerRegistrationControl() {
  const { t } = useLanguage()
  const [registrationPeriods, setRegistrationPeriods] = useState<RegistrationPeriod[]>(mockRegistrationPeriods)
  const [activityControls, setActivityControls] = useState<ActivityControl[]>(mockActivityControls)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<RegistrationPeriod | null>(null)
  const [newPeriodName, setNewPeriodName] = useState("")
  const [newPeriodStart, setNewPeriodStart] = useState<Date>()
  const [newPeriodEnd, setNewPeriodEnd] = useState<Date>()
  const [newPeriodDescription, setNewPeriodDescription] = useState("")
  const [globalRegistrationEnabled, setGlobalRegistrationEnabled] = useState(true)
  
  // Price settings states
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false)
  const [currentPeriodForPricing, setCurrentPeriodForPricing] = useState<RegistrationPeriod | null>(null)
  const [pricingForm, setPricingForm] = useState<PricingSettings>({
    regularPrice: 0,
    earlyBirdDiscount: 0,
    lateRegistrationFee: 0,
    siblingDiscount: 0,
    groupDiscount: 0,
    externalStudentSurcharge: 0,
    currency: "THB"
  })

  const getPriorityBadge = (priority: RegistrationPeriod['priority']) => {
    const variants = {
      high: { variant: "destructive" as const, label: t("summer.highPriority") },
      medium: { variant: "secondary" as const, label: t("summer.mediumPriority") },
      low: { variant: "outline" as const, label: t("summer.lowPriority") }
    }

    return (
      <Badge variant={variants[priority].variant}>
        {variants[priority].label}
      </Badge>
    )
  }

  const getRegistrationProgress = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100)
  }

  const getCapacityStatus = (registered: number, capacity: number) => {
    const percentage = (registered / capacity) * 100
    if (percentage >= 100) return { status: t("summer.full"), color: "text-red-600" }
    if (percentage >= 80) return { status: t("summer.almostFull"), color: "text-amber-600" }
    return { status: t("summer.available"), color: "text-green-600" }
  }

  const togglePeriodStatus = (id: number) => {
    setRegistrationPeriods(prev => prev.map(period => 
      period.id === id 
        ? { ...period, isActive: !period.isActive }
        : period
    ))
    toast.success(t("summer.periodStatusUpdated"))
  }

  const toggleActivityStatus = (id: number) => {
    setActivityControls(prev => prev.map(activity => 
      activity.id === id 
        ? { ...activity, isOpen: !activity.isOpen }
        : activity
    ))
    toast.success(t("summer.activityStatusUpdated"))
  }

  const handleSavePeriod = () => {
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) {
      toast.error(t("common.fillRequiredFields"))
      return
    }

    if (editingPeriod) {
      setRegistrationPeriods(prev => prev.map(period => 
        period.id === editingPeriod.id 
          ? { 
              ...period, 
              name: newPeriodName,
              startDate: newPeriodStart,
              endDate: newPeriodEnd,
              description: newPeriodDescription
            }
          : period
      ))
      toast.success(t("summer.periodUpdated"))
    } else {
      const newPeriod: RegistrationPeriod = {
        id: Date.now(),
        name: newPeriodName,
        startDate: newPeriodStart,
        endDate: newPeriodEnd,
        isActive: false,
        targetGroups: ["All Students"],
        maxRegistrations: 500,
        currentRegistrations: 0,
        priority: 'medium',
        description: newPeriodDescription
      }
      setRegistrationPeriods(prev => [...prev, newPeriod])
      toast.success(t("summer.periodCreated"))
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const resetForm = () => {
    setNewPeriodName("")
    setNewPeriodStart(undefined)
    setNewPeriodEnd(undefined)
    setNewPeriodDescription("")
    setEditingPeriod(null)
  }

  const handleEdit = (period: RegistrationPeriod) => {
    setEditingPeriod(period)
    setNewPeriodName(period.name)
    setNewPeriodStart(period.startDate)
    setNewPeriodEnd(period.endDate)
    setNewPeriodDescription(period.description)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setRegistrationPeriods(prev => prev.filter(period => period.id !== id))
    toast.success(t("summer.periodDeleted"))
  }

  const openPriceDialog = (period: RegistrationPeriod) => {
    setCurrentPeriodForPricing(period)
    setPricingForm(period.pricingSettings || {
      regularPrice: 0,
      earlyBirdDiscount: 0,
      lateRegistrationFee: 0,
      siblingDiscount: 0,
      groupDiscount: 0,
      externalStudentSurcharge: 0,
      currency: "THB"
    })
    setIsPriceDialogOpen(true)
  }

  const handleSavePricing = () => {
    if (!currentPeriodForPricing) return

    setRegistrationPeriods(prev => prev.map(period => 
      period.id === currentPeriodForPricing.id 
        ? { ...period, pricingSettings: pricingForm }
        : period
    ))

    toast.success(t("summer.pricingUpdated"))
    setIsPriceDialogOpen(false)
  }

  const resetPricingForm = () => {
    setCurrentPeriodForPricing(null)
    setPricingForm({
      regularPrice: 0,
      earlyBirdDiscount: 0,
      lateRegistrationFee: 0,
      siblingDiscount: 0,
      groupDiscount: 0,
      externalStudentSurcharge: 0,
      currency: "THB"
    })
  }

  const calculateFinalPrice = (basePrice: number, settings: PricingSettings) => {
    let finalPrice = basePrice
    
    // Apply early bird discount
    if (settings.earlyBirdDiscount > 0) {
      finalPrice = finalPrice * (1 - settings.earlyBirdDiscount / 100)
    }
    
    // Add late registration fee
    if (settings.lateRegistrationFee > 0) {
      finalPrice += settings.lateRegistrationFee
    }
    
    return finalPrice
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">{t("summer.title")}</h2>
          <p className="text-muted-foreground">
            {t("summer.description")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={globalRegistrationEnabled}
              onCheckedChange={setGlobalRegistrationEnabled}
            />
            <Label className="text-sm">{t("summer.globalRegistration")}</Label>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.addPeriod")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod ? t("summer.editPeriod") : t("summer.addPeriod")}
                </DialogTitle>
                <DialogDescription>
                  {t("summer.periodDialogDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period-name">{t("summer.periodName")}</Label>
                  <Input
                    id="period-name"
                    value={newPeriodName}
                    onChange={(e) => setNewPeriodName(e.target.value)}
                    placeholder={t("summer.periodNamePlaceholder")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("summer.startDate")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {newPeriodStart ? format(newPeriodStart, "PPP") : t("common.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newPeriodStart}
                          onSelect={setNewPeriodStart}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("summer.endDate")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {newPeriodEnd ? format(newPeriodEnd, "PPP") : t("common.selectDate")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newPeriodEnd}
                          onSelect={setNewPeriodEnd}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period-description">{t("common.description")}</Label>
                  <Textarea
                    id="period-description"
                    value={newPeriodDescription}
                    onChange={(e) => setNewPeriodDescription(e.target.value)}
                    placeholder={t("summer.descriptionPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleSavePeriod}>
                    {editingPeriod ? t("summer.updatePeriod") : t("summer.createPeriod")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="periods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="periods">{t("summer.registrationPeriods")}</TabsTrigger>
          <TabsTrigger value="activities">{t("summer.activityControl")}</TabsTrigger>
          <TabsTrigger value="settings">{t("summer.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summer.activePeriods")}</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {registrationPeriods.filter(p => p.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summer.totalRegistrations")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {registrationPeriods.reduce((sum, p) => sum + p.currentRegistrations, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summer.capacityUsed")}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">
                  {t("summer.ofTotalCapacity")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("summer.systemStatus")}</CardTitle>
                {globalRegistrationEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalRegistrationEnabled ? t("summer.online") : t("summer.offline")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Periods */}
          <Card>
            <CardHeader>
              <CardTitle>{t("summer.registrationPeriods")}</CardTitle>
              <CardDescription>
                {t("summer.registrationPeriodsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {registrationPeriods.map((period) => (
                  <div key={period.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{period.name}</h4>
                        {getPriorityBadge(period.priority)}
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={period.isActive}
                            onCheckedChange={() => togglePeriodStatus(period.id)}
                            size="sm"
                          />
                          <span className="text-xs text-muted-foreground">
                            {period.isActive ? t("common.active") : t("common.inactive")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-2">
                        <span>{t("summer.start")}: {format(period.startDate, "MMM dd, yyyy")}</span>
                        <span>{t("summer.end")}: {format(period.endDate, "MMM dd, yyyy")}</span>
                        <span>{t("summer.target")}: {period.targetGroups.join(", ")}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{period.description}</p>
                      
                      {/* Pricing Information */}
                      {period.pricingSettings && (
                        <div className="grid grid-cols-3 gap-4 text-sm mb-2 p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-muted-foreground">{t("summer.basePrice")}:</span>
                            <span className="ml-1 font-medium">฿{period.pricingSettings.regularPrice.toLocaleString()}</span>
                          </div>
                          {period.pricingSettings.earlyBirdDiscount > 0 && (
                            <div>
                              <span className="text-muted-foreground">{t("summer.earlyBird")}:</span>
                              <span className="ml-1 font-medium text-green-600">-{period.pricingSettings.earlyBirdDiscount}%</span>
                            </div>
                          )}
                          {period.pricingSettings.lateRegistrationFee > 0 && (
                            <div>
                              <span className="text-muted-foreground">{t("summer.lateFee")}:</span>
                              <span className="ml-1 font-medium text-red-600">+฿{period.pricingSettings.lateRegistrationFee}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{t("summer.registrations")}</span>
                            <span>{period.currentRegistrations}/{period.maxRegistrations}</span>
                          </div>
                          <Progress value={getRegistrationProgress(period.currentRegistrations, period.maxRegistrations)} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPriceDialog(period)}
                        className="flex items-center gap-1"
                      >
                        <DollarSign className="w-4 h-4" />
                        {t("summer.priceSettings")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(period)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(period.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                {t("summer.activityRegistrationControl")}
              </CardTitle>
              <CardDescription>
                {t("summer.activityControlDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityControls.map((activity) => {
                  const capacityStatus = getCapacityStatus(activity.registered, activity.capacity)
                  
                  return (
                    <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{activity.name}</h4>
                          <Badge variant="outline">{activity.category}</Badge>
                          <span className={`text-sm font-medium ${capacityStatus.color}`}>
                            {capacityStatus.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground mb-2">
                          <span>{t("summer.age")}: {activity.ageGroup}</span>
                          <span>{t("summer.fee")}: ฿{activity.fee.toLocaleString()}</span>
                          <span>{t("summer.deadline")}: {format(activity.registrationDeadline, "MMM dd")}</span>
                          <span>{t("summer.waitlist")}: {activity.waitlist}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{t("summer.capacity")}</span>
                              <span>{activity.registered}/{activity.capacity}</span>
                            </div>
                            <Progress value={(activity.registered / activity.capacity) * 100} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={activity.isOpen}
                            onCheckedChange={() => toggleActivityStatus(activity.id)}
                            size="sm"
                          />
                          <span className="text-xs text-muted-foreground">
                            {activity.isOpen ? t("summer.open") : t("summer.closed")}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("summer.globalSettings")}</CardTitle>
                <CardDescription>{t("summer.globalSettingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("summer.enableRegistrationSystem")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("summer.enableRegistrationSystemDesc")}
                    </p>
                  </div>
                  <Switch
                    checked={globalRegistrationEnabled}
                    onCheckedChange={setGlobalRegistrationEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("summer.autoCloseFullActivities")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("summer.autoCloseFullActivitiesDesc")}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("summer.enableWaitlist")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("summer.enableWaitlistDesc")}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("summer.notificationSettings")}</CardTitle>
                <CardDescription>{t("summer.notificationSettingsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("summer.registrationConfirmations")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("summer.registrationConfirmationsDesc")}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("summer.waitlistNotifications")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("summer.waitlistNotificationsDesc")}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t("summer.deadlineReminders")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("summer.deadlineRemindersDesc")}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Price Settings Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {t("summer.priceSettings")}
            </DialogTitle>
            <DialogDescription>
              {t("summer.priceSettingsDesc")} {currentPeriodForPricing?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Period Information */}
            {currentPeriodForPricing && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">{t("summer.period")}</Label>
                      <p className="font-medium">{currentPeriodForPricing.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("summer.duration")}</Label>
                      <p className="font-medium">
                        {format(currentPeriodForPricing.startDate, "MMM dd")} - {format(currentPeriodForPricing.endDate, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basic Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {t("summer.basicPricing")}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regular-price">{t("summer.regularPrice")}</Label>
                  <Input
                    id="regular-price"
                    type="number"
                    value={pricingForm.regularPrice}
                    onChange={(e) => setPricingForm({...pricingForm, regularPrice: Number(e.target.value)})}
                    placeholder="3500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">{t("summer.currency")}</Label>
                  <Select value={pricingForm.currency} onValueChange={(value) => setPricingForm({...pricingForm, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THB">{t("summer.thb")}</SelectItem>
                      <SelectItem value="USD">{t("summer.usd")}</SelectItem>
                      <SelectItem value="EUR">{t("summer.eur")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Discounts and Fees */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Percent className="w-4 h-4" />
                {t("summer.discountsAndFees")}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="early-bird">{t("summer.earlyBirdDiscountPercent")}</Label>
                  <Input
                    id="early-bird"
                    type="number"
                    min="0"
                    max="100"
                    value={pricingForm.earlyBirdDiscount}
                    onChange={(e) => setPricingForm({...pricingForm, earlyBirdDiscount: Number(e.target.value)})}
                    placeholder="15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="late-fee">{t("summer.lateRegistrationFee")}</Label>
                  <Input
                    id="late-fee"
                    type="number"
                    min="0"
                    value={pricingForm.lateRegistrationFee}
                    onChange={(e) => setPricingForm({...pricingForm, lateRegistrationFee: Number(e.target.value)})}
                    placeholder="300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sibling-discount">{t("summer.siblingDiscountPercent")}</Label>
                  <Input
                    id="sibling-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={pricingForm.siblingDiscount}
                    onChange={(e) => setPricingForm({...pricingForm, siblingDiscount: Number(e.target.value)})}
                    placeholder="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-discount">{t("summer.groupDiscountPercent")}</Label>
                  <Input
                    id="group-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={pricingForm.groupDiscount}
                    onChange={(e) => setPricingForm({...pricingForm, groupDiscount: Number(e.target.value)})}
                    placeholder="20"
                  />
                  <p className="text-xs text-muted-foreground">{t("summer.groupDiscountDesc")}</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="external-surcharge">{t("summer.externalStudentSurcharge")}</Label>
                  <Input
                    id="external-surcharge"
                    type="number"
                    min="0"
                    value={pricingForm.externalStudentSurcharge}
                    onChange={(e) => setPricingForm({...pricingForm, externalStudentSurcharge: Number(e.target.value)})}
                    placeholder="500"
                  />
                  <p className="text-xs text-muted-foreground">{t("summer.externalStudentSurchargeDesc")}</p>
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("summer.pricePreview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>{t("summer.regularPriceLabel")}:</span>
                    <span className="font-medium">฿{pricingForm.regularPrice.toLocaleString()}</span>
                  </div>

                  {pricingForm.earlyBirdDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t("summer.earlyBirdPrice")}:</span>
                      <span className="font-medium">
                        ฿{calculateFinalPrice(pricingForm.regularPrice, {...pricingForm, lateRegistrationFee: 0}).toLocaleString()}
                        <span className="text-xs ml-1">(-{pricingForm.earlyBirdDiscount}%)</span>
                      </span>
                    </div>
                  )}

                  {pricingForm.lateRegistrationFee > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{t("summer.lateRegistrationPrice")}:</span>
                      <span className="font-medium">
                        ฿{calculateFinalPrice(pricingForm.regularPrice, {...pricingForm, earlyBirdDiscount: 0}).toLocaleString()}
                        <span className="text-xs ml-1">(+฿{pricingForm.lateRegistrationFee})</span>
                      </span>
                    </div>
                  )}

                  {pricingForm.siblingDiscount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>{t("summer.siblingDiscountLabel")}:</span>
                      <span className="font-medium">-{pricingForm.siblingDiscount}%</span>
                    </div>
                  )}

                  {pricingForm.groupDiscount > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>{t("summer.groupDiscountLabel")}:</span>
                      <span className="font-medium">-{pricingForm.groupDiscount}%</span>
                    </div>
                  )}

                  {pricingForm.externalStudentSurcharge > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>{t("summer.externalStudentSurchargeLabel")}:</span>
                      <span className="font-medium">+฿{pricingForm.externalStudentSurcharge.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPriceDialogOpen(false)
                  resetPricingForm()
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSavePricing}>
                {t("summer.savePricingSettings")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}