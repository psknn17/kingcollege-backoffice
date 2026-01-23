import { ReceiptPage } from "./ReceiptPageUpdated"
import { useLanguage } from "@/contexts/LanguageContext"

export function TuitionInvoiceManagement() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">{t("menu.transactions")}</h2>
        <p className="text-muted-foreground">
          {t("receiptCreditNote.description")}
        </p>
      </div>

      <ReceiptPage />
    </div>
  )
}
