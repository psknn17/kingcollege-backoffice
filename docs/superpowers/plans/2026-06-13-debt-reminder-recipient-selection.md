# Debt Reminder Recipient Selection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a student/invoice checklist to the "Send Now" tab in the Debt Reminder send modal so users can deselect specific students before sending the real email.

**Architecture:** UI-only change to `TabsContent value="confirm"` inside the Send Modal in `DebtReminderSettings.tsx`. Reuses existing state (`sendMatchingInvoices`, `sendSelectedIds`, `sendInvoiceSearch`) already managed by `openSendModal()`. No new state, no logic changes.

**Tech Stack:** React 18, TypeScript, shadcn/ui (Checkbox, Input, Badge), Tailwind CSS, Lucide icons

---

## File Map

| File | Change |
|---|---|
| `src/components/DebtReminderSettings.tsx` | Edit lines ~2177–2204: replace TabsContent `value="confirm"` body |

---

### Task 1: Replace Tab "Send Now" body with email preview + recipient checklist

**Files:**
- Modify: `src/components/DebtReminderSettings.tsx` — lines 2177–2204 (TabsContent `value="confirm"`)

**Reference — current code to replace (lines 2177–2204):**
```tsx
{/* Tab 1: Send Now — shows subject & message preview */}
<TabsContent value="confirm" className="space-y-4 mt-4">
  {sendModalReminder && (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("debtReminder.subject") || "Subject"}</span>
          <p className="text-sm font-medium mt-1">{sendModalReminder.subject}</p>
        </div>
        <div className="border-t pt-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("debtReminder.messagePreview") || "Message Preview"}</span>
          <div className="text-sm mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sendModalReminder.message || "" }} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
          {t("common.cancel") || "Cancel"}
        </Button>
        <Button
          onClick={() => setIsFinalConfirmOpen(true)}
        >
          <Send className="w-4 h-4 mr-2" />
          {t("debtReminder.confirmSend") || "Send Now"}
        </Button>
      </DialogFooter>
    </div>
  )}
</TabsContent>
```

- [ ] **Step 1: Replace TabsContent `value="confirm"` with new layout**

Locate the exact block above in `DebtReminderSettings.tsx` and replace with:

```tsx
{/* Tab 1: Send Now — email preview + recipient selection */}
<TabsContent value="confirm" className="space-y-4 mt-4">
  {sendModalReminder && (() => {
    const ay = academicYears.find(y => y.id === sendModalReminder.academicYear)
    const tm = ay?.terms.find(t => t.id === sendModalReminder.term)
    const allSelected = sendMatchingInvoices.length > 0 && sendSelectedIds.size === sendMatchingInvoices.length
    return (
      <div className="space-y-4">
        {/* Email Preview */}
        <div className="rounded-lg border p-4 space-y-3">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("debtReminder.subject") || "Subject"}</span>
            <p className="text-sm font-medium mt-1">{sendModalReminder.subject}</p>
          </div>
          <div className="border-t pt-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{t("debtReminder.messagePreview") || "Message Preview"}</span>
            <div className="text-sm mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sendModalReminder.message || "" }} />
          </div>
        </div>

        {/* Recipients Section */}
        <div className="space-y-3">
          {/* Summary row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Users className="w-4 h-4" />
              {t("debtReminder.recipients") || "Recipients"}
              {(ay?.name || sendModalReminder.academicYear) && (
                <span className="text-muted-foreground/70 font-normal ml-1">
                  · {ay?.name || sendModalReminder.academicYear}{tm?.name ? ` · ${tm.name}` : ""}
                </span>
              )}
            </span>
            <span className="font-medium">{t("debtReminder.selected") || "Selected"}: {sendSelectedIds.size}/{sendMatchingInvoices.length}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or invoice number..."
              value={sendInvoiceSearch}
              onChange={(e) => setSendInvoiceSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center gap-2 pb-1 border-b">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSendSelectedIds(new Set(sendMatchingInvoices.map((inv: any) => inv.id)))
                } else {
                  setSendSelectedIds(new Set())
                }
              }}
            />
            <span className="text-sm font-medium">{t("common.selectAll") || "Select All"}</span>
          </div>

          {/* Invoice List */}
          <div className="overflow-y-auto space-y-1" style={{ maxHeight: "240px" }}>
            {(() => {
              const q = sendInvoiceSearch.toLowerCase().trim()
              const filtered = q
                ? sendMatchingInvoices.filter((inv: any) =>
                    (inv.studentName || "").toLowerCase().includes(q) ||
                    (inv.invoiceNumber || inv.id || "").toLowerCase().includes(q) ||
                    (inv.studentId || "").toLowerCase().includes(q)
                  )
                : sendMatchingInvoices
              if (filtered.length === 0) return (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {q ? "No matching results" : (t("debtReminder.noMatchingInvoices") || "No matching invoices found")}
                </p>
              )
              return filtered.map((inv: any) => (
                <div
                  key={inv.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                    sendSelectedIds.has(inv.id) && "bg-muted/50 border-primary/30"
                  )}
                  onClick={() => {
                    setSendSelectedIds(prev => {
                      const next = new Set(prev)
                      if (next.has(inv.id)) next.delete(inv.id)
                      else next.add(inv.id)
                      return next
                    })
                  }}
                >
                  <Checkbox
                    checked={sendSelectedIds.has(inv.id)}
                    onCheckedChange={() => {
                      setSendSelectedIds(prev => {
                        const next = new Set(prev)
                        if (next.has(inv.id)) next.delete(inv.id)
                        else next.add(inv.id)
                        return next
                      })
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.studentName || inv.studentId || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.invoiceNumber || inv.id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">฿{(inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0).toLocaleString()}</p>
                    <Badge variant="outline" className={cn("text-xs",
                      inv.status === "overdue" ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700"
                    )}>
                      {inv.status || "unpaid"}
                    </Badge>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            disabled={sendSelectedIds.size === 0}
            onClick={() => setIsFinalConfirmOpen(true)}
          >
            <Send className="w-4 h-4 mr-2" />
            {t("debtReminder.confirmSend") || "Send Now"} ({sendSelectedIds.size})
          </Button>
        </DialogFooter>
      </div>
    )
  })()}
</TabsContent>
```

- [ ] **Step 2: Verify dev server compiles without errors**

```bash
npm run dev
```

Expected: no TypeScript errors, browser opens at `localhost:3000`

- [ ] **Step 3: Manual verification**

1. ไปที่ Debt Reminder Settings
2. กด Send (icon) ที่ reminder ใดก็ได้
3. ตรวจ Tab "Send Now":
   - เห็น email preview (Subject + Message) ด้านบน
   - เห็นรายชื่อนักเรียน/invoices ด้านล่าง พร้อม checkbox
   - ตัวเลข Selected: N/N ถูกต้อง
   - ค้นหาชื่อนักเรียนได้
   - Select All / deselect ทำงานได้
   - ปุ่ม "Send Now (N)" แสดงจำนวนที่เลือก
   - ปุ่ม disabled เมื่อ N = 0
4. ตรวจ Tab "Send Verification Email": ยังคงเดิม ไม่เปลี่ยน
5. Deselect นักเรียน 2 คน → กด Send Now → Final confirm → ส่งสำเร็จ → recipientCount ถูกต้อง

- [ ] **Step 4: Commit**

```bash
git add src/components/DebtReminderSettings.tsx
git commit -m "feat: add recipient selection to Send Now tab in debt reminder modal"
```
