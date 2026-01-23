import { ReceiptManagementFlow } from "./ReceiptManagementFlow"
import { useLanguage } from "@/contexts/LanguageContext"

export function EventReceipts() {
  const { t } = useLanguage()

  return (
    <ReceiptManagementFlow
      menuType="event"
      title={t("exam.receipts.title")}
      description={t("exam.receipts.description")}
    />
  )
}
