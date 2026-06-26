# Cashier EDC Payment + Receipt Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When cashier fills in all payment fields and clicks "Confirm Payment", mock EDC processing runs (1.5s spinner), then navigate to a new CashierReceiptPage showing per-student receipt cards with PDF view/download.

**Architecture:** Three-file change — add i18n keys to LanguageContext, patch CashierPaymentPage to validate + navigate, create new CashierReceiptPage component, register route in App.tsx. PDF is generated client-side with jsPDF on demand (blob URL injected into an iframe for View Receipt; auto-download for the download button).

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS, shadcn/ui, jsPDF 4.x, react-router-dom (useNavigate / useAppNavigation hook)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/contexts/LanguageContext.tsx` | Add EN (line ~128) + TH (line ~4190) receipt keys |
| Modify | `src/components/CashierPaymentPage.tsx` | Validation, isProcessing state, navigate to receipt |
| Create | `src/components/CashierReceiptPage.tsx` | Full receipt page matching design screenshot |
| Modify | `src/App.tsx` | Import CashierReceiptPage + add `/cashier-receipt` route |

---

## Task 1: Add i18n Translation Keys

**Files:**
- Modify: `src/contexts/LanguageContext.tsx:128` (EN block, after `"cashier.noPaymentData"`)
- Modify: `src/contexts/LanguageContext.tsx:4190` (TH block, after `"cashier.noPaymentData"`)

- [ ] **Step 1: Add EN keys after line 128**

Find the exact line:
```
  "cashier.noPaymentData": "No payment data found.",
```
Insert immediately after:
```typescript
  "cashier.processingEdc": "Sending data to EDC machine...",
  "cashier.bankRequired": "Please select a bank",
  "cashier.cardTypeRequired": "Please select a card type",
  "cashier.receiptTitle": "Receipt (Version 1)",
  "cashier.receiptSuccess": "Payment successful",
  "cashier.paymentRef": "Payment Reference",
  "cashier.multiPersonCount": "persons paid",
  "cashier.createNewReceipt": "Create New Receipt",
  "cashier.allReceipts": "All Receipts",
  "cashier.viewReceipt": "View Receipt",
  "cashier.downloadReceipt": "Download Receipt (Black)",
  "cashier.receiptPdfSection": "Receipt PDF",
  "cashier.receiptPdfHint": "Press View Receipt to display the PDF file",
  "cashier.breadcrumbReceipt": "Receipt",
```

- [ ] **Step 2: Add TH keys after line 4190**

Find the exact line:
```
  "cashier.noPaymentData": "ไม่พบข้อมูลการชำระ",
```
Insert immediately after:
```typescript
  "cashier.processingEdc": "กำลังส่งข้อมูลไปยังเครื่อง EDC...",
  "cashier.bankRequired": "กรุณาเลือกธนาคาร",
  "cashier.cardTypeRequired": "กรุณาเลือกประเภทบัตร",
  "cashier.receiptTitle": "ใบเสร็จ (Version 1)",
  "cashier.receiptSuccess": "ชำระเงินสำเร็จ",
  "cashier.paymentRef": "เลขที่การชำระ",
  "cashier.multiPersonCount": "ชำระเงินหลายคน",
  "cashier.createNewReceipt": "สร้างใบเสร็จใหม่",
  "cashier.allReceipts": "ใบเสร็จทั้งหมด",
  "cashier.viewReceipt": "View Receipt",
  "cashier.downloadReceipt": "ดาวน์โหลดใบเสร็จ (ยุกดำ)",
  "cashier.receiptPdfSection": "Receipt PDF",
  "cashier.receiptPdfHint": "โปรดกด View Receipt เพื่อแสดงไฟล์ PDF",
  "cashier.breadcrumbReceipt": "ใบเสร็จ",
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" add src/contexts/LanguageContext.tsx
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" commit -m "i18n: add cashier receipt + EDC processing translation keys"
```

---

## Task 2: Patch CashierPaymentPage — Validation + Loading + Navigate

**Files:**
- Modify: `src/components/CashierPaymentPage.tsx:66-72` (state declarations)
- Modify: `src/components/CashierPaymentPage.tsx:341-348` (button section)

- [ ] **Step 1: Add `isProcessing` state after existing state declarations (~line 72)**

```typescript
const [isProcessing, setIsProcessing] = useState<boolean>(false)
```

- [ ] **Step 2: Add `handleConfirmPayment` function before the early-return guard (~line 113)**

```typescript
function generatePaymentId(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, "")
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `PAY-${date}-${rand}`
}

function handleConfirmPayment() {
  if (!selectedBank) {
    toast.error(t("cashier.bankRequired"))
    return
  }
  if (!selectedCardType) {
    toast.error(t("cashier.cardTypeRequired"))
    return
  }
  setIsProcessing(true)
  setTimeout(() => {
    const paymentId = generatePaymentId()
    navigateToSubPage("cashier-receipt", {
      paymentId,
      studentData: studentData.map(({ sid, student, invoices, guardian, subtotal }) => ({
        sid,
        name: student ? `${student.firstName} ${student.lastName}` : sid,
        guardian,
        subtotal,
        invoices,
      })),
      paymentInfo: {
        bank: selectedBank,
        cardType: selectedCardType,
        paymentMethod,
        chargeAmount,
        edcAmount,
        remark,
      },
    })
    setIsProcessing(false)
  }, 1500)
}
```

- [ ] **Step 3: Replace the Confirm Payment button (~line 345)**

Replace:
```tsx
<Button onClick={() => toast.info(t("cashier.underDevelopment"))}>
  {t("cashier.confirmPayment")}
</Button>
```

With:
```tsx
<Button onClick={handleConfirmPayment} disabled={isProcessing}>
  {isProcessing ? (
    <span className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      {t("cashier.processingEdc")}
    </span>
  ) : t("cashier.confirmPayment")}
</Button>
```

- [ ] **Step 4: Commit**

```bash
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" add src/components/CashierPaymentPage.tsx
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" commit -m "feat: add validation + mock EDC loading + navigate to receipt in CashierPaymentPage"
```

---

## Task 3: Create CashierReceiptPage

**Files:**
- Create: `src/components/CashierReceiptPage.tsx`

This page receives params from navigation state:
- `paymentId: string`
- `studentData: { sid, name, guardian, subtotal, invoices }[]`
- `paymentInfo: { bank, cardType, paymentMethod, chargeAmount, edcAmount, remark }`

Layout (matches screenshot exactly):
- Breadcrumb row
- Title + green success alert + "สร้างใบเสร็จใหม่" button
- Two-column body: left = student receipt cards, right = PDF preview iframe

- [ ] **Step 1: Create the full component file**

Create `/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main/src/components/CashierReceiptPage.tsx` with:

```typescript
import { useState } from "react"
import { jsPDF } from "jspdf"
import { CheckCircle2 } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAppNavigation } from "@/hooks/useAppNavigation"

interface StudentReceiptData {
  sid: string
  name: string
  guardian: string
  subtotal: number
  invoices: any[]
}

interface PaymentInfo {
  bank: string
  cardType: string
  paymentMethod: string
  chargeAmount: number
  edcAmount: number
  remark: string
}

function buildReceiptPdf(
  student: StudentReceiptData,
  paymentId: string,
  paymentInfo: PaymentInfo
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  })

  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("King's College International School Bangkok", 20, 20)

  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text("RECEIPT", 20, 30)
  doc.text(`Payment Ref: ${paymentId}`, 20, 38)
  doc.text(`Date: ${today}`, 20, 46)

  doc.line(20, 50, 190, 50)

  doc.setFont("helvetica", "bold")
  doc.text("Student Information", 20, 58)
  doc.setFont("helvetica", "normal")
  doc.text(`Student: ${student.name}`, 20, 66)
  doc.text(`Student ID: ${student.sid}`, 20, 74)
  doc.text(`Guardian: ${student.guardian}`, 20, 82)

  doc.line(20, 88, 190, 88)

  doc.setFont("helvetica", "bold")
  doc.text("Payment Details", 20, 96)
  doc.setFont("helvetica", "normal")
  doc.text(`Bank: ${paymentInfo.bank.toUpperCase()}`, 20, 104)
  doc.text(`Card Type: ${paymentInfo.cardType}`, 20, 112)
  doc.text(`Payment Method: ${paymentInfo.paymentMethod === "full" ? "Full Payment" : "Installment"}`, 20, 120)

  doc.line(20, 126, 190, 126)

  doc.setFont("helvetica", "bold")
  doc.text("Invoice Summary", 20, 134)
  doc.setFont("helvetica", "normal")

  let y = 142
  for (const inv of student.invoices) {
    const invNo = inv.invoiceNumber || inv.id
    const amt = (inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0).toLocaleString()
    doc.text(`${invNo}`, 20, y)
    doc.text(`${amt} THB`, 150, y, { align: "right" })
    y += 8
  }

  doc.line(20, y, 190, y)
  y += 8
  doc.setFont("helvetica", "bold")
  doc.text("Total Amount", 20, y)
  doc.text(`${student.subtotal.toLocaleString()} THB`, 150, y, { align: "right" })

  if (paymentInfo.remark) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Remark: ${paymentInfo.remark}`, 20, y + 12)
  }

  return doc
}

export function CashierReceiptPage() {
  const { t } = useLanguage()
  const { subPageParams, navigateToSubPage } = useAppNavigation()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlobUrls, setPreviewBlobUrls] = useState<Record<string, string>>({})

  const paymentId: string = subPageParams?.paymentId ?? "PAY-UNKNOWN"
  const studentData: StudentReceiptData[] = subPageParams?.studentData ?? []
  const paymentInfo: PaymentInfo = subPageParams?.paymentInfo ?? {
    bank: "", cardType: "", paymentMethod: "full",
    chargeAmount: 0, edcAmount: 0, remark: "",
  }

  function handleViewReceipt(student: StudentReceiptData) {
    if (previewBlobUrls[student.sid]) {
      setPreviewUrl(previewBlobUrls[student.sid])
      return
    }
    const doc = buildReceiptPdf(student, paymentId, paymentInfo)
    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    setPreviewBlobUrls(prev => ({ ...prev, [student.sid]: url }))
    setPreviewUrl(url)
  }

  function handleDownloadReceipt(student: StudentReceiptData) {
    const doc = buildReceiptPdf(student, paymentId, paymentInfo)
    doc.save(`receipt-${student.sid}-${paymentId}.pdf`)
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <button
          onClick={() => navigateToSubPage("cashier-dashboard")}
          className="hover:text-foreground transition-colors"
        >
          {t("menu.cashierDashboard")}
        </button>
        <span>/</span>
        <button
          onClick={() => navigateToSubPage("cashier-student-search")}
          className="hover:text-foreground transition-colors"
        >
          {t("cashier.breadcrumbSearch")}
        </button>
        <span>/</span>
        <button
          onClick={() => navigateToSubPage("cashier-payment")}
          className="hover:text-foreground transition-colors"
        >
          {t("cashier.breadcrumbPayment")}
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{t("cashier.breadcrumbReceipt")}</span>
      </nav>

      <h2 className="text-xl font-semibold">{t("cashier.receiptTitle")}</h2>

      {/* Success alert */}
      <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <span className="text-sm">
          <span className="font-medium">{t("cashier.receiptSuccess")}</span>
          {" "}
          {t("cashier.paymentRef")}: <span className="font-mono font-semibold">{paymentId}</span>
          {" "}
          {t("cashier.multiPersonCount")}: {studentData.length} {t("cashier.personUnit")}
        </span>
      </div>

      {/* Create new receipt button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => navigateToSubPage("cashier-student-search")}
        >
          {t("cashier.createNewReceipt")}
        </Button>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6 items-start">
        {/* Left: receipt cards */}
        <div className="space-y-4" style={{ flex: 1 }}>
          <h3 className="text-base font-semibold">{t("cashier.allReceipts")}</h3>
          {studentData.map((student, idx) => (
            <Card key={student.sid}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                  <span className="text-sm font-mono text-muted-foreground">{student.sid}</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{t("cashier.guardianShort")}: {student.guardian}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewReceipt(student)}
                >
                  {t("cashier.viewReceipt")}
                </Button>
                <Button
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => handleDownloadReceipt(student)}
                >
                  {t("cashier.downloadReceipt")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right: PDF preview */}
        <Card className="self-start" style={{ flex: 2 }}>
          <CardContent className="p-6 space-y-2">
            <h3 className="text-base font-semibold">{t("cashier.receiptPdfSection")}</h3>
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full rounded border"
                style={{ height: "600px" }}
                title="Receipt PDF"
              />
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {t("cashier.receiptPdfHint")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" add src/components/CashierReceiptPage.tsx
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" commit -m "feat: add CashierReceiptPage with per-student PDF view and download"
```

---

## Task 4: Register Route in App.tsx

**Files:**
- Modify: `src/App.tsx:126` (import section, after CashierPaymentPage import)
- Modify: `src/App.tsx:948` (route section, after cashier-payment route)

- [ ] **Step 1: Add import after line 126**

After:
```typescript
import { CashierPaymentPage } from "./components/CashierPaymentPage"
```
Add:
```typescript
import { CashierReceiptPage } from "./components/CashierReceiptPage"
```

- [ ] **Step 2: Add route after line 948**

After:
```tsx
<Route path="/cashier-payment" element={<CashierPaymentPage />} />
```
Add:
```tsx
<Route path="/cashier-receipt" element={<CashierReceiptPage />} />
```

- [ ] **Step 3: Commit**

```bash
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" add src/App.tsx
git -C "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" commit -m "feat: register /cashier-receipt route for CashierReceiptPage"
```

---

## Verification

After all tasks complete, verify manually:

1. Open `http://localhost:3000/cashier-student-search`
2. Select a student with invoices → click "Process Payment"
3. On payment page: click Confirm without selecting bank → toast error shown
4. Select bank only → click Confirm → toast error for card type
5. Select bank + card type → click Confirm → spinner shows "กำลังส่งข้อมูลไปยังเครื่อง EDC..."
6. After ~1.5s → navigate to `/cashier-receipt`
7. Green success banner shows PAY-YYYYMMDD-XXXX + student count
8. Student cards appear on left with correct names + guardians
9. Click "View Receipt" → PDF renders in right iframe
10. Click "ดาวน์โหลดใบเสร็จ (ยุกดำ)" → PDF file downloads
11. Click "สร้างใบเสร็จใหม่" → navigate back to cashier-student-search
