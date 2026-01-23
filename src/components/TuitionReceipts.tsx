import { ReceiptManagementFlow } from "./ReceiptManagementFlow"
import { useLanguage } from "@/contexts/LanguageContext"

export function TuitionReceipts() {
  const { t } = useLanguage()

  return (
    <ReceiptManagementFlow
      menuType="tuition"
      title={t("tuition.receipts.title")}
      description={t("tuition.receipts.description")}
    />
  )
}
