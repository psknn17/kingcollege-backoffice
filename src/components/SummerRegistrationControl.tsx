import { useState } from "react"
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
import { toast } from "sonner@2.0.3"

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
      high: { variant: "destructive" as const, label: "High Priority" },
      medium: { variant: "secondary" as const, label: "Medium Priority" },
      low: { variant: "outline" as const, label: "Low Priority" }
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
    if (percentage >= 100) return { status: "Full", color: "text-red-600" }
    if (percentage >= 80) return { status: "Almost Full", color: "text-amber-600" }
    return { status: "Available", color: "text-green-600" }
  }

  const togglePeriodStatus = (id: number) => {
    setRegistrationPeriods(prev => prev.map(period => 
      period.id === id 
        ? { ...period, isActive: !period.isActive }
        : period
    ))
    toast.success("Registration period status updated")
  }

  const toggleActivityStatus = (id: number) => {
    setActivityControls(prev => prev.map(activity => 
      activity.id === id 
        ? { ...activity, isOpen: !activity.isOpen }
        : activity
    ))
    toast.success("Activity registration status updated")
  }

  const handleSavePeriod = () => {
    if (!newPeriodName || !newPeriodStart || !newPeriodEnd) {
      toast.error("Please fill in all required fields")
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
      toast.success("Registration period updated successfully")
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
      toast.success("Registration period created successfully")
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
    toast.success("Registration period deleted")
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

    toast.success("Pricing settings updated successfully")
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
          <h2 className="mb-2">Summer Registration Control</h2>
          <p className="text-muted-foreground">
            Manage registration periods and activity availability for summer programs
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={globalRegistrationEnabled}
              onCheckedChange={setGlobalRegistrationEnabled}
            />
            <Label className="text-sm">Global Registration</Label>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Period
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg p-6">
              <DialogHeader>
                <DialogTitle>
                  {editingPeriod ? "Edit Registration Period" : "Add Registration Period"}
                </DialogTitle>
                <DialogDescription>
                  Configure registration period settings and availability
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="period-name">Period Name</Label>
                  <Input
                    id="period-name"
                    value={newPeriodName}
                    onChange={(e) => setNewPeriodName(e.target.value)}
                    placeholder="e.g., Early Bird Registration"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {newPeriodStart ? format(newPeriodStart, "PPP") : "Select date"}
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
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarDays className="w-4 h-4 mr-2" />
                          {newPeriodEnd ? format(newPeriodEnd, "PPP") : "Select date"}
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
                  <Label htmlFor="period-description">Description</Label>
                  <Textarea
                    id="period-description"
                    value={newPeriodDescription}
                    onChange={(e) => setNewPeriodDescription(e.target.value)}
                    placeholder="Describe this registration period..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSavePeriod}>
                    {editingPeriod ? "Update" : "Create"} Period
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="periods" className="space-y-6">
        <TabsList>
          <TabsTrigger value="periods">Registration Periods</TabsTrigger>
          <TabsTrigger value="activities">Activity Control</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Periods</CardTitle>
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
                <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
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
                <CardTitle className="text-sm font-medium">Capacity Used</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">68%</div>
                <p className="text-xs text-muted-foreground">
                  of total capacity
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                {globalRegistrationEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalRegistrationEnabled ? 'Online' : 'Offline'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Periods */}
          <Card>
            <CardHeader>
              <CardTitle>Registration Periods</CardTitle>
              <CardDescription>
                Manage registration periods and their availability
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
                            {period.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground mb-2">
                        <span>Start: {format(period.startDate, "MMM dd, yyyy")}</span>
                        <span>End: {format(period.endDate, "MMM dd, yyyy")}</span>
                        <span>Target: {period.targetGroups.join(", ")}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">{period.description}</p>
                      
                      {/* Pricing Information */}
                      {period.pricingSettings && (
                        <div className="grid grid-cols-3 gap-4 text-sm mb-2 p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-muted-foreground">Base Price:</span>
                            <span className="ml-1 font-medium">฿{period.pricingSettings.regularPrice.toLocaleString()}</span>
                          </div>
                          {period.pricingSettings.earlyBirdDiscount > 0 && (
                            <div>
                              <span className="text-muted-foreground">Early Bird:</span>
                              <span className="ml-1 font-medium text-green-600">-{period.pricingSettings.earlyBirdDiscount}%</span>
                            </div>
                          )}
                          {period.pricingSettings.lateRegistrationFee > 0 && (
                            <div>
                              <span className="text-muted-foreground">Late Fee:</span>
                              <span className="ml-1 font-medium text-red-600">+฿{period.pricingSettings.lateRegistrationFee}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Registrations</span>
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
                        Price Settings
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
                Activity Registration Control
              </CardTitle>
              <CardDescription>
                Manage individual activity registration status and capacity
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
                          <span>Age: {activity.ageGroup}</span>
                          <span>Fee: ฿{activity.fee.toLocaleString()}</span>
                          <span>Deadline: {format(activity.registrationDeadline, "MMM dd")}</span>
                          <span>Waitlist: {activity.waitlist}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Capacity</span>
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
                            {activity.isOpen ? 'Open' : 'Closed'}
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
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>System-wide registration controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Registration System</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn on/off the entire registration system
                    </p>
                  </div>
                  <Switch
                    checked={globalRegistrationEnabled}
                    onCheckedChange={setGlobalRegistrationEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-close Full Activities</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically close registration when capacity is reached
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Waitlist</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow students to join waitlist for full activities
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure registration notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Registration Confirmations</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email confirmations for successful registrations
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Waitlist Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when waitlist spots become available
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Deadline Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders before registration deadlines
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
              Price Settings
            </DialogTitle>
            <DialogDescription>
              Configure pricing and discounts for {currentPeriodForPricing?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Period Information */}
            {currentPeriodForPricing && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Period</Label>
                      <p className="font-medium">{currentPeriodForPricing.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Duration</Label>
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
                Basic Pricing
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regular-price">Regular Price (฿)</Label>
                  <Input
                    id="regular-price"
                    type="number"
                    value={pricingForm.regularPrice}
                    onChange={(e) => setPricingForm({...pricingForm, regularPrice: Number(e.target.value)})}
                    placeholder="3500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={pricingForm.currency} onValueChange={(value) => setPricingForm({...pricingForm, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THB">THB (Thai Baht)</SelectItem>
                      <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Discounts and Fees */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Discounts & Fees
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="early-bird">Early Bird Discount (%)</Label>
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
                  <Label htmlFor="late-fee">Late Registration Fee (฿)</Label>
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
                  <Label htmlFor="sibling-discount">Sibling Discount (%)</Label>
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
                  <Label htmlFor="group-discount">Group Discount (%)</Label>
                  <Input
                    id="group-discount"
                    type="number"
                    min="0"
                    max="100"
                    value={pricingForm.groupDiscount}
                    onChange={(e) => setPricingForm({...pricingForm, groupDiscount: Number(e.target.value)})}
                    placeholder="20"
                  />
                  <p className="text-xs text-muted-foreground">For 3+ students from same family</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="external-surcharge">External Student Surcharge (฿)</Label>
                  <Input
                    id="external-surcharge"
                    type="number"
                    min="0"
                    value={pricingForm.externalStudentSurcharge}
                    onChange={(e) => setPricingForm({...pricingForm, externalStudentSurcharge: Number(e.target.value)})}
                    placeholder="500"
                  />
                  <p className="text-xs text-muted-foreground">Additional fee for non-SISB students</p>
                </div>
              </div>
            </div>

            {/* Price Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Price Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Regular Price:</span>
                    <span className="font-medium">฿{pricingForm.regularPrice.toLocaleString()}</span>
                  </div>
                  
                  {pricingForm.earlyBirdDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Early Bird Price:</span>
                      <span className="font-medium">
                        ฿{calculateFinalPrice(pricingForm.regularPrice, {...pricingForm, lateRegistrationFee: 0}).toLocaleString()}
                        <span className="text-xs ml-1">(-{pricingForm.earlyBirdDiscount}%)</span>
                      </span>
                    </div>
                  )}
                  
                  {pricingForm.lateRegistrationFee > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Late Registration Price:</span>
                      <span className="font-medium">
                        ฿{calculateFinalPrice(pricingForm.regularPrice, {...pricingForm, earlyBirdDiscount: 0}).toLocaleString()}
                        <span className="text-xs ml-1">(+฿{pricingForm.lateRegistrationFee})</span>
                      </span>
                    </div>
                  )}

                  {pricingForm.siblingDiscount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Sibling Discount:</span>
                      <span className="font-medium">-{pricingForm.siblingDiscount}%</span>
                    </div>
                  )}

                  {pricingForm.groupDiscount > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Group Discount (3+):</span>
                      <span className="font-medium">-{pricingForm.groupDiscount}%</span>
                    </div>
                  )}

                  {pricingForm.externalStudentSurcharge > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>External Student Surcharge:</span>
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
                Cancel
              </Button>
              <Button onClick={handleSavePricing}>
                Save Pricing Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}