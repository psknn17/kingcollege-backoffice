import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { Filter } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

export type PaymentStatus = "success" | "pending" | "failed" | "all"

export type PaymentChannel = "credit_card" | "wechat_pay" | "alipay" | "qr_payment" | "counter_bank" | "all"

interface StatusFilterProps {
  selectedStatus: PaymentStatus
  onStatusChange: (status: PaymentStatus) => void
}

export function StatusFilter({ selectedStatus, onStatusChange }: StatusFilterProps) {
  const { t } = useLanguage()
  const statusOptions = [
    { value: "all" as PaymentStatus, label: t("status.allStatus"), color: undefined },
    { value: "success" as PaymentStatus, label: t("status.success"), color: "bg-green-100 text-green-800 hover:bg-green-100" },
    { value: "pending" as PaymentStatus, label: t("status.pending"), color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
    { value: "failed" as PaymentStatus, label: t("status.failed"), color: "bg-red-100 text-red-800 hover:bg-red-100" }
  ]

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">{t("status.status")}</label>
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]">
          <Filter className="w-4 h-4 mr-2" />
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
  const { t } = useLanguage()
  const channelOptions = [
    { value: "all" as PaymentChannel, label: t("paymentChannel.allChannels") },
    { value: "credit_card" as PaymentChannel, label: t("paymentChannel.creditCard") },
    { value: "wechat_pay" as PaymentChannel, label: t("paymentChannel.wechatPay") },
    { value: "alipay" as PaymentChannel, label: t("paymentChannel.alipay") },
    { value: "qr_payment" as PaymentChannel, label: t("paymentChannel.qrPayment") },
    { value: "counter_bank" as PaymentChannel, label: t("paymentChannel.counterBank") }
  ]

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">{t("paymentChannel.label")}</label>
      <Select value={selectedChannel} onValueChange={onChannelChange}>
        <SelectTrigger className="w-[160px]">
          <Filter className="w-4 h-4 mr-2" />
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

export function getStatusBadge(status: string, t: (key: string) => string) {
  const statusLower = status.toLowerCase()

  switch (statusLower) {
    case "success":
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          {t("status.success")}
        </Badge>
      )
    case "pending":
    case "partial":
    case "unpaid":
    case "overdue":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          {t("status.pending")}
        </Badge>
      )
    case "failed":
    case "cancelled":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          {t("status.failed")}
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

export function getPaymentChannelLabel(channel: string, t: (key: string) => string) {
  const channelLower = channel.toLowerCase()

  switch (channelLower) {
    case "credit_card":
      return t("paymentChannel.creditCard")
    case "wechat_pay":
      return t("paymentChannel.wechatPay")
    case "alipay":
      return t("paymentChannel.alipay")
    case "qr_payment":
      return t("paymentChannel.qrPayment")
    case "counter_bank":
      return t("paymentChannel.counterBank")
    default:
      return channel
  }
}