import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { ReceiptPage } from "./ReceiptPageUpdated"
import { CreditNoteManagement } from "./CreditNoteManagement"
import { useLanguage } from "@/contexts/LanguageContext"

export function TuitionInvoiceManagement() {
  const [activeTab, setActiveTab] = useState("receipts")
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">{t("menu.transactions")}</h2>
        <p className="text-muted-foreground">
          {t("receiptCreditNote.description")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="receipts">{t("invoice.receipts")}</TabsTrigger>
          <TabsTrigger value="credit-notes">{t("invoice.creditNotes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-6">
          <ReceiptPage />
        </TabsContent>

        <TabsContent value="credit-notes" className="space-y-6">
          <CreditNoteManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
