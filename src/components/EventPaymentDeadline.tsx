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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Clock, CalendarDays, Edit, Trash2, Plus, AlertTriangle, CheckCircle, Send, Mail } from "lucide-react"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { usePersistedState } from "@/hooks/usePersistedState"
import { logActivity } from "@/lib/activityLog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { ColumnPresets } from "@/utils/tableAlignment"

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
  const { t, language } = useLanguage()
  const locale = language === "th" ? th : enUS
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const confirmDialog = useConfirmDialog()
  const [deadlines, setDeadlines] = useState<PaymentDeadline[]>(mockDeadlines)
  const [selectedEvent, setSelectedEvent] = usePersistedState("event-deadline:selectedEvent", "")
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
      upcoming: { variant: "secondary" as const, label: t("eventPayment.status.upcoming") },
      active: { variant: "default" as const, label: t("eventPayment.status.active") },
      overdue: { variant: "destructive" as const, label: t("eventPayment.status.overdue") },
      completed: { variant: "outline" as const, label: t("eventPayment.status.completed") }
    }
    
    return (
      <Badge variant={variants[status].variant}>
        {variants[status].label}
      </Badge>
    )
  }

  const handleSaveDeadline = () => {
    if (!selectedEvent || !selectedDate) {
      toast.error(t("eventPayment.toast.fillRequired"))
      return
    }

    const reminderDaysArray = reminderDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))

    if (editingDeadline) {
      setDeadlines(prev => prev.map(deadline =>
        deadline.id === editingDeadline.id
          ? { ...deadline, paymentDeadline: selectedDate, reminderDays: reminderDaysArray }
          : deadline
      ))
      toast.success(t("eventPayment.toast.deadlineUpdated"))
      logActivity({ action: "Update Deadline", module: "Event Payment Deadline", detail: `Updated deadline for "${selectedEvent}" to ${selectedDate ? format(selectedDate, "dd MMM yyyy") : "N/A"}` })
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
      toast.success(t("eventPayment.toast.deadlineCreated"))
      logActivity({ action: "Create Deadline", module: "Event Payment Deadline", detail: `Created deadline for "${selectedEvent}" due ${selectedDate ? format(selectedDate, "dd MMM yyyy") : "N/A"}` })
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleSaveDeadlineClick = () => {
    confirmDialog.confirm(() => {
      handleSaveDeadline()
    })
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
    const deadline = deadlines.find(d => d.id === id)
    setDeadlines(prev => prev.filter(d => d.id !== id))
    toast.success(t("eventPayment.toast.deadlineDeleted"))
    logActivity({ action: "Delete Deadline", module: "Event Payment Deadline", detail: `Deleted deadline for "${deadline?.eventName || "Unknown"}"` })
  }

  const toggleActiveStatus = (id: number) => {
    const deadline = deadlines.find(d => d.id === id)
    const newStatus = !deadline?.isActive
    setDeadlines(prev => prev.map(d =>
      d.id === id
        ? { ...d, isActive: !d.isActive }
        : d
    ))
    toast.success(t("eventPayment.toast.statusUpdated"))
    logActivity({ action: "Update Status", module: "Event Payment Deadline", detail: `Set "${deadline?.eventName || "Unknown"}" to ${newStatus ? "Active" : "Inactive"}` })
  }

  const openReminderDialog = (deadline: PaymentDeadline) => {
    setCurrentDeadlineForReminder(deadline)
    setIsReminderDialogOpen(true)
    // Set default message based on reminder type
    setCustomMessage(getDefaultReminderMessage(reminderType, deadline))
  }

  const getDefaultReminderMessage = (type: string, deadline: PaymentDeadline) => {
    const messages = {
      payment_due: `Dear Parent,\n\nThis is a friendly reminder that payment for the ${deadline.eventName} is due by ${format(deadline.paymentDeadline, "dd MMMM yyyy")}.\n\nPlease ensure payment is completed to secure your child's participation.\n\nThank you for your attention to this matter.\n\nBest regards,\nKing's College Finance Team`,
      payment_overdue: `Dear Parent,\n\nWe notice that the payment for ${deadline.eventName} is now overdue. The deadline was ${format(deadline.paymentDeadline, "dd MMMM yyyy")}.\n\nPlease make the payment as soon as possible to avoid any inconvenience.\n\nIf you have already made the payment, please disregard this message.\n\nBest regards,\nKing's College Finance Team`,
      final_notice: `Dear Parent,\n\nThis is the final notice regarding the overdue payment for ${deadline.eventName}.\n\nImmediate action is required to secure your child's participation. Please contact our finance office if you need assistance.\n\nThank you for your immediate attention.\n\nBest regards,\nKing's College Finance Team`,
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
    const typeLabel = reminderDetails.type === 'payment_due' ? t("eventPayment.reminder.paymentReminder") :
        reminderDetails.type === 'payment_overdue' ? t("eventPayment.reminder.overdueNotice") :
        t("eventPayment.reminder.finalNotice")
    const actionLabel = reminderSchedule === 'immediate' ? t("eventPayment.reminder.sent") : t("eventPayment.reminder.scheduled")
    toast.success(
      `${typeLabel} ${actionLabel} ${t("eventPayment.reminder.toRecipients")} ${reminderDetails.totalRecipients} ${t("eventPayment.reminder.forEvent")} ${reminderDetails.eventName}`
    )
    logActivity({ action: "Update Status", module: "Event Payment Deadline", detail: `Sent ${typeLabel} to ${reminderDetails.totalRecipients} recipients for "${reminderDetails.eventName}"` })

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="mb-2">{t("eventPayment.title")}</h2>
          <p className="text-muted-foreground">
            {t("eventPayment.description")}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} disabled={!userCanEdit}>
              <Plus className="w-4 h-4 mr-2" />
              {t("eventPayment.addDeadline")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg p-6">
            <DialogHeader>
              <DialogTitle>
                {editingDeadline ? t("eventPayment.editDeadline") : t("eventPayment.addDeadline")}
              </DialogTitle>
              <DialogDescription>
                {t("eventPayment.dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-select">{t("eventPayment.event")}</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent} disabled={!userCanEdit}>
                  <SelectTrigger disabled={!userCanEdit}>
                    <SelectValue placeholder={t("eventPayment.selectEvent")} />
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
                <Label>{t("eventPayment.paymentDeadline")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" disabled={!userCanEdit}>
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {selectedDate ? format(selectedDate, "PPP", { locale }) : t("eventPayment.selectDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      disabled={!userCanEdit}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-days">{t("eventPayment.reminderDays")}</Label>
                <Input
                  id="reminder-days"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(e.target.value)}
                  placeholder={t("eventPayment.reminderDaysPlaceholder")}
                  disabled={!userCanEdit}
                />
                <p className="text-xs text-muted-foreground">
                  {t("eventPayment.reminderDaysHint")}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSaveDeadlineClick} disabled={!userCanEdit}>
                  {editingDeadline ? t("eventPayment.updateDeadline") : t("eventPayment.createDeadline")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("eventPayment.activeDeadlines")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadlines.filter(d => d.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("eventPayment.upcoming")}</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadlines.filter(d => d.status === 'upcoming').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("eventPayment.overdue")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deadlines.filter(d => d.status === 'overdue').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("eventPayment.completed")}</CardTitle>
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
          <CardTitle>{t("eventPayment.paymentDeadlines")}</CardTitle>
          <CardDescription>
            {t("eventPayment.listDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* text: Event Name */}
                <TableHead align="left">{t("eventPayment.event")}</TableHead>
                {/* date: Event Date */}
                <TableHead align="left">{t("eventPayment.eventDate")}</TableHead>
                {/* date: Payment Deadline */}
                <TableHead align="left">{t("eventPayment.paymentDeadline")}</TableHead>
                {/* currency: Amount */}
                <TableHead align="right">{t("eventPayment.paid")}</TableHead>
                {/* status: Status Badge */}
                <TableHead align="center">{t("common.status")}</TableHead>
                {/* actions: Action Buttons */}
                <TableHead align="center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deadlines.map((deadline) => (
                <TableRow key={deadline.id}>
                  {/* text: Event Name */}
                  <TableCell align="left" className="font-medium">
                    {deadline.eventName}
                  </TableCell>
                  {/* date: Event Date */}
                  <TableCell align="left">
                    {deadline.eventDate}
                  </TableCell>
                  {/* date: Payment Deadline */}
                  <TableCell align="left">
                    {format(deadline.paymentDeadline, "dd MMM yyyy", { locale })}
                  </TableCell>
                  {/* currency: Amount */}
                  <TableCell align="right">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {deadline.paidStudents}/{deadline.totalStudents}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({Math.round((deadline.paidStudents / deadline.totalStudents) * 100)}%)
                      </div>
                    </div>
                  </TableCell>
                  {/* status: Status Badge */}
                  <TableCell align="center">
                    <div className="flex flex-col items-center gap-2">
                      {getStatusBadge(deadline.status)}
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={deadline.isActive}
                          onCheckedChange={() => toggleActiveStatus(deadline.id)}
                          disabled={!userCanEdit}
                        />
                        <span className="text-xs text-muted-foreground">
                          {deadline.isActive ? t("common.active") : t("common.inactive")}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  {/* actions: Action Buttons */}
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReminderDialog(deadline)}
                        disabled={!deadline.isActive || !userCanEdit}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        {t("eventPayment.sendReminder")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(deadline)}
                        disabled={!userCanEdit}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(deadline.id)}
                        disabled={!userCanEdit}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t("eventPayment.sendPaymentReminder")}
            </DialogTitle>
            <DialogDescription>
              {t("eventPayment.configureReminder")} {currentDeadlineForReminder?.eventName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Event Summary */}
            {currentDeadlineForReminder && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">{t("eventPayment.event")}</Label>
                      <p className="font-medium">{currentDeadlineForReminder.eventName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("eventPayment.paymentDeadline")}</Label>
                      <p className="font-medium">{format(currentDeadlineForReminder.paymentDeadline, "dd MMM yyyy", { locale })}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("eventPayment.totalStudents")}</Label>
                      <p className="font-medium">{currentDeadlineForReminder.totalStudents}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("eventPayment.unpaid")}</Label>
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
                <Label htmlFor="reminder-type">{t("eventPayment.reminderType")}</Label>
                <Select
                  value={reminderType}
                  onValueChange={(value) => {
                    setReminderType(value)
                    if (currentDeadlineForReminder) {
                      setCustomMessage(getDefaultReminderMessage(value, currentDeadlineForReminder))
                    }
                  }}
                  disabled={!userCanEdit}
                >
                  <SelectTrigger disabled={!userCanEdit}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment_due">{t("eventPayment.reminderTypes.paymentDue")}</SelectItem>
                    <SelectItem value="payment_overdue">{t("eventPayment.reminderTypes.paymentOverdue")}</SelectItem>
                    <SelectItem value="final_notice">{t("eventPayment.reminderTypes.finalNotice")}</SelectItem>
                    <SelectItem value="custom">{t("eventPayment.reminderTypes.custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminder-schedule">{t("eventPayment.schedule")}</Label>
                <Select value={reminderSchedule} onValueChange={setReminderSchedule} disabled={!userCanEdit}>
                  <SelectTrigger disabled={!userCanEdit}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">{t("eventPayment.scheduleOptions.immediate")}</SelectItem>
                    <SelectItem value="next_hour">{t("eventPayment.scheduleOptions.nextHour")}</SelectItem>
                    <SelectItem value="tomorrow">{t("eventPayment.scheduleOptions.tomorrow")}</SelectItem>
                    <SelectItem value="custom_date">{t("eventPayment.scheduleOptions.later")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients">{t("eventPayment.recipients")}</Label>
              <Select value={selectedRecipients} onValueChange={setSelectedRecipients} disabled={!userCanEdit}>
                <SelectTrigger disabled={!userCanEdit}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_unpaid">{t("eventPayment.recipientOptions.allUnpaid")}</SelectItem>
                  <SelectItem value="all_students">{t("eventPayment.recipientOptions.allRegistered")}</SelectItem>
                  <SelectItem value="specific_groups">{t("eventPayment.recipientOptions.specificGroups")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label htmlFor="custom-message">{t("eventPayment.messageContent")}</Label>
              <Textarea
                id="custom-message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={t("eventPayment.messagePlaceholder")}
                rows={8}
                className="resize-none"
                disabled={!userCanEdit}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("eventPayment.characters")}: {customMessage.length}</span>
                <span>{t("eventPayment.deliveryNote")}</span>
              </div>
            </div>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("eventPayment.preview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.type")}:</span>
                    <span className="capitalize">{reminderType.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("eventPayment.schedule")}:</span>
                    <span className="capitalize">{reminderSchedule.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("eventPayment.recipients")}:</span>
                    <span>
                      {selectedRecipients === 'all_unpaid' && currentDeadlineForReminder
                        ? `${currentDeadlineForReminder.totalStudents - currentDeadlineForReminder.paidStudents} ${t("eventPayment.unpaidStudents")}`
                        : selectedRecipients === 'all_students' && currentDeadlineForReminder
                        ? `${currentDeadlineForReminder.totalStudents} ${t("eventPayment.allStudents")}`
                        : t("eventPayment.selectedGroups")}
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
                {t("common.cancel")}
              </Button>
              <Button
                onClick={sendReminder}
                disabled={!customMessage.trim() || !userCanEdit}
              >
                <Send className="w-4 h-4 mr-2" />
                {reminderSchedule === 'immediate' ? t("eventPayment.sendNow") : t("eventPayment.scheduleReminder")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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