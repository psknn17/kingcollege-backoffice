import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Switch } from "./ui/switch"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { Clock, CalendarDays, Edit, Trash2, Plus, AlertTriangle, CheckCircle, Send, Mail } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner@2.0.3"

interface PaymentDeadline {
  id: number
  eventName: string
  eventDate: string
  paymentDeadline: Date
  isActive: boolean
  reminderDays: number[]
  status: 'upcoming' | 'active' | 'overdue' | 'completed'
  totalStudents: number
  paidStudents: number
}

const mockDeadlines: PaymentDeadline[] = [
  {
    id: 1,
    eventName: "Sports Day 2024",
    eventDate: "2024-10-15",
    paymentDeadline: new Date("2024-10-08"),
    isActive: true,
    reminderDays: [7, 3, 1],
    status: 'active',
    totalStudents: 245,
    paidStudents: 189
  },
  {
    id: 2,
    eventName: "Science Fair",
    eventDate: "2024-10-22",
    paymentDeadline: new Date("2024-10-15"),
    isActive: true,
    reminderDays: [7, 3, 1],
    status: 'upcoming',
    totalStudents: 180,
    paidStudents: 45
  },
  {
    id: 3,
    eventName: "Music Concert",
    eventDate: "2024-11-05",
    paymentDeadline: new Date("2024-10-29"),
    isActive: true,
    reminderDays: [7, 3, 1],
    status: 'upcoming',
    totalStudents: 156,
    paidStudents: 12
  },
  {
    id: 4,
    eventName: "International Day",
    eventDate: "2024-09-20",
    paymentDeadline: new Date("2024-09-13"),
    isActive: false,
    reminderDays: [7, 3, 1],
    status: 'completed',
    totalStudents: 234,
    paidStudents: 234
  }
]

export function EventPaymentDeadline() {
  const [deadlines, setDeadlines] = useState<PaymentDeadline[]>(mockDeadlines)
  const [selectedEvent, setSelectedEvent] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [reminderDays, setReminderDays] = useState<string>("7,3,1")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDeadline, setEditingDeadline] = useState<PaymentDeadline | null>(null)
  
  // Reminder dialog states
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [currentDeadlineForReminder, setCurrentDeadlineForReminder] = useState<PaymentDeadline | null>(null)
  const [reminderType, setReminderType] = useState<string>("payment_due")
  const [reminderSchedule, setReminderSchedule] = useState<string>("immediate")
  const [customMessage, setCustomMessage] = useState<string>("")
  const [selectedRecipients, setSelectedRecipients] = useState<string>("all_unpaid")

  const getStatusBadge = (status: PaymentDeadline['status']) => {
    const variants = {
      upcoming: { variant: "secondary" as const, label: "Upcoming" },
      active: { variant: "default" as const, label: "Active" },
      overdue: { variant: "destructive" as const, label: "Overdue" },
      completed: { variant: "outline" as const, label: "Completed" }
    }
    
    return (
      <Badge variant={variants[status].variant}>
        {variants[status].label}
      </Badge>
    )
  }

  const handleSaveDeadline = () => {
    if (!selectedEvent || !selectedDate) {
      toast.error("Please fill in all required fields")
      return
    }

    const reminderDaysArray = reminderDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))

    if (editingDeadline) {
      setDeadlines(prev => prev.map(deadline => 
        deadline.id === editingDeadline.id 
          ? { ...deadline, paymentDeadline: selectedDate, reminderDays: reminderDaysArray }
          : deadline
      ))
      toast.success("Payment deadline updated successfully")
    } else {
      const newDeadline: PaymentDeadline = {
        id: Date.now(),
        eventName: selectedEvent,
        eventDate: "2024-12-01",
        paymentDeadline: selectedDate,
        isActive: true,
        reminderDays: reminderDaysArray,
        status: 'upcoming',
        totalStudents: 0,
        paidStudents: 0
      }
      setDeadlines(prev => [...prev, newDeadline])
      toast.success("Payment deadline created successfully")
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setSelectedEvent("")
    setSelectedDate(undefined)
    setReminderDays("7,3,1")
    setEditingDeadline(null)
  }

  const handleEdit = (deadline: PaymentDeadline) => {
    setEditingDeadline(deadline)
    setSelectedEvent(deadline.eventName)
    setSelectedDate(deadline.paymentDeadline)
    setReminderDays(deadline.reminderDays.join(','))
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeadlines(prev => prev.filter(deadline => deadline.id !== id))
    toast.success("Payment deadline deleted")
  }

  const toggleActiveStatus = (id: number) => {
    setDeadlines(prev => prev.map(deadline => 
      deadline.id === id 
        ? { ...deadline, isActive: !deadline.isActive }
        : deadline
    ))
    toast.success("Deadline status updated")
  }

  const openReminderDialog = (deadline: PaymentDeadline) => {
    setCurrentDeadlineForReminder(deadline)
    setIsReminderDialogOpen(true)
    // Set default message based on reminder type
    setCustomMessage(getDefaultReminderMessage(reminderType, deadline))
  }

  const getDefaultReminderMessage = (type: string, deadline: PaymentDeadline) => {
    const messages = {
      payment_due: `Dear Parent,\n\nThis is a friendly reminder that payment for the ${deadline.eventName} is due by ${format(deadline.paymentDeadline, "MMMM dd, yyyy")}.\n\nPlease ensure payment is completed to secure your child's participation.\n\nThank you for your attention to this matter.\n\nBest regards,\nSISB Finance Team`,
      payment_overdue: `Dear Parent,\n\nWe notice that the payment for ${deadline.eventName} is now overdue. The deadline was ${format(deadline.paymentDeadline, "MMMM dd, yyyy")}.\n\nPlease make the payment as soon as possible to avoid any inconvenience.\n\nIf you have already made the payment, please disregard this message.\n\nBest regards,\nSISB Finance Team`,
      final_notice: `Dear Parent,\n\nThis is the final notice regarding the overdue payment for ${deadline.eventName}.\n\nImmediate action is required to secure your child's participation. Please contact our finance office if you need assistance.\n\nThank you for your immediate attention.\n\nBest regards,\nSISB Finance Team`,
      custom: ''
    }
    return messages[type as keyof typeof messages] || messages.payment_due
  }

  const sendReminder = () => {
    if (!currentDeadlineForReminder) return

    const reminderDetails = {
      eventName: currentDeadlineForReminder.eventName,
      type: reminderType,
      schedule: reminderSchedule,
      recipients: selectedRecipients,
      message: customMessage,
      totalRecipients: selectedRecipients === 'all_unpaid' 
        ? currentDeadlineForReminder.totalStudents - currentDeadlineForReminder.paidStudents
        : currentDeadlineForReminder.totalStudents
    }

    // Simulate sending reminder
    toast.success(
      `${reminderDetails.type === 'payment_due' ? 'Payment reminder' : 
        reminderDetails.type === 'payment_overdue' ? 'Overdue notice' : 
        'Final notice'} ${reminderSchedule === 'immediate' ? 'sent' : 'scheduled'} to ${reminderDetails.totalRecipients} recipient(s) for ${reminderDetails.eventName}`
    )

    setIsReminderDialogOpen(false)
    resetReminderForm()
  }

  const resetReminderForm = () => {
    setCurrentDeadlineForReminder(null)
    setReminderType("payment_due")
    setReminderSchedule("immediate")
    setCustomMessage("")
    setSelectedRecipients("all_unpaid")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-2">Event Payment Deadlines</h2>
          <p className="text-muted-foreground">
            Manage payment deadlines and reminders for school events
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deadline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDeadline ? "Edit Payment Deadline" : "Add Payment Deadline"}
              </DialogTitle>
              <DialogDescription>
                Set payment deadline and reminder schedule for an event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-select">Event</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sports Day 2024">Sports Day 2024</SelectItem>
                    <SelectItem value="Science Fair">Science Fair</SelectItem>
                    <SelectItem value="Music Concert">Music Concert</SelectItem>
                    <SelectItem value="Field Trip - Zoo">Field Trip - Zoo</SelectItem>
                    <SelectItem value="International Day">International Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-days">Reminder Days</Label>
                <Input
                  id="reminder-days"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  placeholder="e.g., 7,3,1"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of days before deadline to send reminders
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDeadline}>
                  {editingDeadline ? "Update" : "Create"} Deadline
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deadlines</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadlines.filter(d => d.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadlines.filter(d => d.status === 'upcoming').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {deadlines.filter(d => d.status === 'overdue').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadlines.filter(d => d.status === 'completed').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Deadlines List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Deadlines</CardTitle>
          <CardDescription>
            Manage and monitor payment deadlines for all events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {deadlines.map((deadline) => (
              <div key={deadline.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{deadline.eventName}</h4>
                    {getStatusBadge(deadline.status)}
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={deadline.isActive}
                        onCheckedChange={() => toggleActiveStatus(deadline.id)}
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {deadline.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Event: {deadline.eventDate}</span>
                    <span>Deadline: {format(deadline.paymentDeadline, "MMM dd, yyyy")}</span>
                    <span>
                      Paid: {deadline.paidStudents}/{deadline.totalStudents} 
                      ({Math.round((deadline.paidStudents / deadline.totalStudents) * 100)}%)
                    </span>
                    <span>Reminders: {deadline.reminderDays.join(', ')} days</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReminderDialog(deadline)}
                    disabled={!deadline.isActive}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Send Reminder
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(deadline)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(deadline.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Payment Reminder
            </DialogTitle>
            <DialogDescription>
              Configure and send payment reminder for {currentDeadlineForReminder?.eventName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Event Summary */}
            {currentDeadlineForReminder && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Event</Label>
                      <p className="font-medium">{currentDeadlineForReminder.eventName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Payment Deadline</Label>
                      <p className="font-medium">{format(currentDeadlineForReminder.paymentDeadline, "MMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Students</Label>
                      <p className="font-medium">{currentDeadlineForReminder.totalStudents}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Unpaid</Label>
                      <p className="font-medium text-amber-600">
                        {currentDeadlineForReminder.totalStudents - currentDeadlineForReminder.paidStudents}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reminder Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reminder-type">Reminder Type</Label>
                <Select 
                  value={reminderType} 
                  onValueChange={(value) => {
                    setReminderType(value)
                    if (currentDeadlineForReminder) {
                      setCustomMessage(getDefaultReminderMessage(value, currentDeadlineForReminder))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_due">Payment Due Reminder</SelectItem>
                    <SelectItem value="payment_overdue">Payment Overdue Notice</SelectItem>
                    <SelectItem value="final_notice">Final Notice</SelectItem>
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-schedule">Schedule</Label>
                <Select value={reminderSchedule} onValueChange={setReminderSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Send Immediately</SelectItem>
                    <SelectItem value="next_hour">Send in Next Hour</SelectItem>
                    <SelectItem value="tomorrow">Send Tomorrow 9 AM</SelectItem>
                    <SelectItem value="custom_date">Schedule for Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Select value={selectedRecipients} onValueChange={setSelectedRecipients}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_unpaid">All Unpaid Students Only</SelectItem>
                  <SelectItem value="all_students">All Registered Students</SelectItem>
                  <SelectItem value="specific_groups">Specific Year Groups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label htmlFor="custom-message">Message Content</Label>
              <Textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter your reminder message..."
                rows={8}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Characters: {customMessage.length}</span>
                <span>Recipients will receive this via email and SMS</span>
              </div>
            </div>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{reminderType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule:</span>
                    <span className="capitalize">{reminderSchedule.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipients:</span>
                    <span>
                      {selectedRecipients === 'all_unpaid' && currentDeadlineForReminder
                        ? `${currentDeadlineForReminder.totalStudents - currentDeadlineForReminder.paidStudents} unpaid students`
                        : selectedRecipients === 'all_students' && currentDeadlineForReminder
                        ? `${currentDeadlineForReminder.totalStudents} all students`
                        : 'Selected groups'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsReminderDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={sendReminder}
                disabled={!customMessage.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                {reminderSchedule === 'immediate' ? 'Send Now' : 'Schedule Reminder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}