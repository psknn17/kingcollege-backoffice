import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { useLanguage } from "@/contexts/LanguageContext"

export type PaymentStatus = "paid" | "partial" | "unpaid" | "cancelled" | "overdue" | "all"

export type PaymentChannel = "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank" | "all"

interface StatusFilterProps {
  selectedStatus: PaymentStatus
  onStatusChange: (status: PaymentStatus) => void
}

export function StatusFilter({ selectedStatus, onStatusChange }: StatusFilterProps) {
  const { t } = useLanguage()
  const statusOptions = [
    { value: "all" as PaymentStatus, label: "All Status", color: undefined },
    { value: "paid" as PaymentStatus, label: "Paid", color: "bg-green-100 text-green-800 hover:bg-green-100" },
    { value: "partial" as PaymentStatus, label: "Partial", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
    { value: "unpaid" as PaymentStatus, label: "Unpaid", color: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
    { value: "cancelled" as PaymentStatus, label: "Cancelled", color: "bg-red-100 text-red-800 hover:bg-red-100" },
    { value: "overdue" as PaymentStatus, label: "Overdue", color: "bg-orange-100 text-orange-800 hover:bg-orange-100" }
  ]

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Status:</label>
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.color && (
                  <Badge className={`text-xs px-2 py-0.5 ${option.color}`}>
                    {option.label}
                  </Badge>
                )}
                {!option.color && <span>{option.label}</span>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface PaymentChannelFilterProps {
  selectedChannel: PaymentChannel
  onChannelChange: (channel: PaymentChannel) => void
}

export function PaymentChannelFilter({ selectedChannel, onChannelChange }: PaymentChannelFilterProps) {
  const channelOptions = [
    { value: "all" as PaymentChannel, label: "All Channels" },
    { value: "credit_card" as PaymentChannel, label: "Credit Card" },
    { value: "wechat_pay" as PaymentChannel, label: "WeChat Pay" },
    { value: "alipay" as PaymentChannel, label: "Alipay" },
    { value: "qr_payment" as PaymentChannel, label: "QR Payment" },
    { value: "counter_bank" as PaymentChannel, label: "Counter Bank" }
  ]

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Payment Channel:</label>
      <Select value={selectedChannel} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {channelOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function getStatusBadge(status: string) {
  const statusLower = status.toLowerCase()
  
  switch (statusLower) {
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Paid
        </Badge>
      )
    case "partial":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          Partial
        </Badge>
      )
    case "unpaid":
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          Unpaid
        </Badge>
      )
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Cancelled
        </Badge>
      )
    case "overdue":
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          Overdue
        </Badge>
      )
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          {status}
        </Badge>
      )
  }
}

export function getPaymentChannelLabel(channel: string) {
  const channelLower = channel.toLowerCase()
  
  switch (channelLower) {
    case "credit_card":
      return "Credit Card"
    case "wechat_pay":
      return "WeChat Pay"
    case "alipay":
      return "Alipay"
    case "qr_payment":
      return "QR Payment"
    case "counter_bank":
      return "Counter Bank"
    default:
      return channel
  }
}