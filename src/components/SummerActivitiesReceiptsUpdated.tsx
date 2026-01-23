import { ReceiptManagementFlow } from "./ReceiptManagementFlow"
import { useLanguage } from "@/contexts/LanguageContext"

export function SummerActivitiesReceipts() {
  const { t } = useLanguage()

  return (
    <ReceiptManagementFlow
      menuType="summer"
      title={t("schoolBus.receipts.title")}
      description={t("schoolBus.receipts.description")}
    />
  )
}
