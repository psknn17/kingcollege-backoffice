import { ReceiptManagementFlow } from "./ReceiptManagementFlow"
import { useLanguage } from "@/contexts/LanguageContext"

export function ECAReceipts() {
  const { t } = useLanguage()

  return (
    <ReceiptManagementFlow
      menuType="eca"
      title={t("eca.receipts.title")}
      description={t("eca.receipts.description")}
    />
  )
}
