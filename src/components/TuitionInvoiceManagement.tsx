import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { InvoiceOverview } from "./InvoiceOverview"
import { ReceiptPage } from "./ReceiptPageUpdated"
import { CreditNoteManagement } from "./CreditNoteManagement"

export function TuitionInvoiceManagement() {
  const [activeTab, setActiveTab] = useState("invoices")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2">Transaction Management</h2>
        <p className="text-muted-foreground">
          Manage invoices, receipts, and credit notes for tuition fees
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoice</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <InvoiceOverview />
        </TabsContent>

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