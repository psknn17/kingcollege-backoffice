import { ReceiptManagementFlow } from "./ReceiptManagementFlow"
import { useLanguage } from "@/contexts/LanguageContext"

export function AfterSchoolReceipts() {
  const { t } = useLanguage()

  return (
    <ReceiptManagementFlow
      menuType="afterschool"
      title={t("tripActivity.receipts.title")}
      description={t("tripActivity.receipts.description")}
    />
  )
}
