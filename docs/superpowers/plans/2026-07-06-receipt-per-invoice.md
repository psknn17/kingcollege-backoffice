# Receipt Per Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยนระบบออกใบเสร็จจาก 1 ใบต่อนักเรียน → 1 ใบต่อ invoice โดยแต่ละใบมี receipt running number แยกต่างหาก

**Architecture:** เปลี่ยน `savePendingAcknowledgement()` ให้ loop per invoice แทน per student สร้าง 1 AckRecord ต่อ invoice — ทำให้ CashierReceiptPage แสดงการ์ดต่อ invoice และ PDF มี 1 row เสมอ ส่วน AcknowledgementList แสดง 1 row ต่อ AckRecord พร้อมคอลัมน์ invoice number ใหม่

**Tech Stack:** React 18, TypeScript, jsPDF, html2canvas, localStorage

---

## File Map

| ไฟล์ | สิ่งที่เปลี่ยน |
|---|---|
| `src/components/CashierPaymentPage.tsx` | `savePendingAcknowledgement()` loop per invoice, navigation params |
| `src/components/CashierReceiptPage.tsx` | `InvoiceReceiptItem` interface, `buildCashierReceiptHtml`, `generatePdfBlob` signature, card UI |
| `src/components/CashierAcknowledgementList.tsx` | invoice column, `handlePreview`, `handleIssue` ใช้ `InvoiceReceiptItem` |

---

## Task 1: เพิ่ม `InvoiceReceiptItem` interface และแก้ `generatePdfBlob` ใน CashierReceiptPage.tsx

**Files:**
- Modify: `src/components/CashierReceiptPage.tsx`

- [ ] **Step 1: เปิดไฟล์และหา interface `StudentReceiptData` (บรรทัด 16-23)**

  ปัจจุบัน:
  ```ts
  interface StudentReceiptData {
    sid: string
    name: string
    guardian: string
    subtotal: number
    invoices: any[]
    grade?: string
  }
  ```

- [ ] **Step 2: เพิ่ม interface `InvoiceReceiptItem` ต่อจาก `StudentReceiptData`**

  แทรกหลังบรรทัด 23 (หลัง `}` ปิด `StudentReceiptData`):
  ```ts
  export interface InvoiceReceiptItem {
    sid: string
    name: string
    guardian: string
    grade: string
    invoiceId: string
    invoiceNumber: string
    invoiceAmount: number
    receiptNo: string
    cardFee: number
  }
  ```

- [ ] **Step 3: แก้ `buildCashierReceiptHtml` ให้รับ `InvoiceReceiptItem` แทน `StudentReceiptData`**

  แทนที่ function signature และ body ทั้งหมด (บรรทัด 36-180) ด้วย:
  ```ts
  function buildCashierReceiptHtml(params: {
    item: InvoiceReceiptItem
    cashierName: string
    paymentInfo: PaymentInfo
    copyType: "Customer" | "Accounting"
  }): string {
    const { item, cashierName, paymentInfo, copyType } = params
    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const today = format(new Date(), "dd MMMM yyyy")
    const currentYear = new Date().getFullYear()
    const academicYear = `${currentYear - 1}/${currentYear}`
    const rawGrade = item.grade ?? "-"
    const grade = rawGrade.replace(/^year\s*/i, "Year ")

    const received = item.invoiceAmount + item.cardFee
    const overpaymentAmt = paymentInfo.overpaymentAmount ?? 0
    const grandReceived = received + overpaymentAmt
    const cardLabel = [paymentInfo.bank.toUpperCase(), paymentInfo.cardType].filter(Boolean).join(" ")

    return `<div style="font-family:'Times New Roman',serif;font-size:13px;line-height:1.5;padding:40px 52px;width:794px;background:white;color:black">

      <!-- Header -->
      <div style="position:relative;text-align:center;margin-bottom:6px">
        <div style="position:absolute;top:0;right:0;font-size:11px">${copyType}</div>
        <img src="${SchoolLogo}" style="height:100px;display:block;margin:0 auto 6px" crossorigin="anonymous"
          onerror="this.onerror=null;this.style.display='none'" />
        <div style="font-size:14px;font-weight:bold;letter-spacing:2px">KING'S COLLEGE INTERNATIONAL SCHOOL</div>
        <div style="font-size:10px;letter-spacing:3px;margin-bottom:2px">BANGKOK</div>
      </div>

      <!-- Title -->
      <h2 style="text-align:center;font-size:19px;font-weight:bold;margin:18px 0 14px;letter-spacing:0.5px">
        Acknowledgement of School Fee Payment
      </h2>

      <!-- Info table -->
      <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:12px;margin-bottom:14px">
        <tr>
          <td style="border:1px solid black;padding:5px 10px;width:130px">Student ID no.</td>
          <td style="border:1px solid black;padding:5px 8px">${item.sid}</td>
          <td style="border:1px solid black;padding:5px 10px;width:100px">Receipt no.</td>
          <td style="border:1px solid black;padding:5px 10px;text-align:right;width:150px">${item.receiptNo}</td>
        </tr>
        <tr>
          <td style="border:1px solid black;padding:5px 10px">Student name</td>
          <td style="border:1px solid black;padding:5px 8px">${item.name}</td>
          <td style="border:1px solid black;padding:5px 10px">Receipt date</td>
          <td style="border:1px solid black;padding:5px 10px;text-align:right">${today}</td>
        </tr>
        <tr>
          <td style="border:1px solid black;padding:5px 10px">Contact name</td>
          <td style="border:1px solid black;padding:5px 8px">${item.guardian}</td>
          <td style="border:1px solid black;padding:5px 10px">Year group</td>
          <td style="border:1px solid black;padding:5px 10px;text-align:right">${grade}</td>
        </tr>
        <tr>
          <td style="border:1px solid black;padding:5px 10px"></td>
          <td style="border:1px solid black;padding:5px 8px"></td>
          <td style="border:1px solid black;padding:5px 10px">School year</td>
          <td style="border:1px solid black;padding:5px 10px;text-align:right">${academicYear}</td>
        </tr>
      </table>

      <!-- Invoice table (1 row) -->
      <table style="width:100%;border-collapse:collapse;border:1px solid black;font-size:12px;margin-bottom:10px">
        <thead>
          <tr>
            <th style="border:1px solid black;padding:6px 8px;text-align:center;width:36px">No.</th>
            <th style="border:1px solid black;padding:6px 8px;text-align:center">Invoice no.</th>
            <th style="border:1px solid black;padding:6px 8px;text-align:center">Invoice amount<br/>(THB)</th>
            <th style="border:1px solid black;padding:6px 8px;text-align:center">Credit card fee*<br/>(THB)</th>
            <th style="border:1px solid black;padding:6px 8px;text-align:center">Received amount<br/>(THB)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border:1px solid black;padding:5px 8px;text-align:center">1</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:center">${item.invoiceNumber}</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(item.invoiceAmount)}</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(item.cardFee)}</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(received)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid black;padding:5px 8px">Overpayment amount**</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right">0.00</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right">0.00</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right">${fmt(overpaymentAmt)}</td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid black;padding:5px 8px"></td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right;font-weight:bold;text-decoration:underline">${fmt(item.invoiceAmount)}</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right;font-weight:bold;text-decoration:underline">${fmt(item.cardFee)}</td>
            <td style="border:1px solid black;padding:5px 8px;text-align:right;font-weight:bold;text-decoration:underline">${fmt(grandReceived)}</td>
          </tr>
          <tr style="font-weight:bold">
            <td colspan="2" style="border:1px solid black;padding:5px 8px">GRAND TOTAL</td>
            <td colspan="3" style="border:1px solid black;padding:5px 8px;text-align:center;font-style:italic;text-transform:uppercase;font-size:11px">
              ${numberToWords(grandReceived)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Notes -->
      <div style="font-size:10px;margin-bottom:10px;line-height:1.9">
        <p>* Credit card processing fee payable to Bank</p>
        <p>** Please note that any overpayments amount is non-refundable and will be credited against future school fee invoices.</p>
      </div>

      <!-- Credit card info -->
      <div style="font-size:12px;margin-bottom:18px">
        <strong>Credit card:</strong> ${cardLabel}
      </div>

      <!-- Signature -->
      <table style="width:100%;margin-top:12px;font-size:12px">
        <tr>
          <td style="text-align:center;width:50%;padding:0 20px;vertical-align:bottom">
            <div style="margin-bottom:34px">${cashierName}</div>
            <div style="border-top:1px solid black;padding-top:6px;font-weight:bold">Cashier</div>
          </td>
          <td style="text-align:center;width:50%;padding:0 20px;vertical-align:bottom">
            <div style="margin-bottom:34px">${AUTHORISED_NAME}</div>
            <div style="border-top:1px solid black;padding-top:6px;font-weight:bold">Authorised signature</div>
          </td>
        </tr>
      </table>

      <!-- Footer -->
      <div style="text-align:center;font-size:9px;margin-top:22px;border-top:1px solid #999;padding-top:6px">
        <p>${SCHOOL_INFO.name}, ${SCHOOL_INFO.address}</p>
        <p>${SCHOOL_INFO.phone}, ${SCHOOL_INFO.email}, ${SCHOOL_INFO.website}</p>
      </div>
    </div>`
  }
  ```

- [ ] **Step 4: แก้ `generatePdfBlob` signature (บรรทัด 207-230)**

  แทนที่ function ทั้งหมดด้วย:
  ```ts
  export async function generatePdfBlob(
    item: InvoiceReceiptItem,
    cashierName: string,
    paymentInfo: PaymentInfo
  ): Promise<Blob> {
    const baseParams = { item, cashierName, paymentInfo }

    const canvas1 = await renderHtmlToCanvas(buildCashierReceiptHtml({ ...baseParams, copyType: "Customer" }))
    const canvas2 = await renderHtmlToCanvas(buildCashierReceiptHtml({ ...baseParams, copyType: "Accounting" }))

    const pdf = new jsPDF("p", "mm", "a4")
    const pw = pdf.internal.pageSize.getWidth()

    const ph1 = (canvas1.height * pw) / canvas1.width
    pdf.addImage(canvas1.toDataURL("image/png"), "PNG", 0, 0, pw, ph1)

    pdf.addPage()
    const ph2 = (canvas2.height * pw) / canvas2.width
    pdf.addImage(canvas2.toDataURL("image/png"), "PNG", 0, 0, pw, ph2)

    return pdf.output("blob")
  }
  ```

- [ ] **Step 5: แก้ component body — derive `invoiceItems` จาก `studentData` + `receiptNumbers`**

  แทนที่ทุก state declarations และ helper functions ใน `CashierReceiptPage` component (บรรทัด 233-305) ด้วยนี้:
  ```ts
  export function CashierReceiptPage() {
    const { t } = useLanguage()
    const { subPageParams, navigateToSubPage } = useAppNavigation()
    const { user } = useAuth()

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewBlobUrls, setPreviewBlobUrls] = useState<Record<string, string>>({})
    const receiptNumbers: Record<string, string> = subPageParams?.receiptNos ?? {}
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

    const paymentId: string = subPageParams?.paymentId ?? "PAY-UNKNOWN"
    const studentData: { sid: string; name: string; guardian: string; grade?: string; subtotal: number; invoices: any[] }[] = subPageParams?.studentData ?? []
    const paymentInfo: PaymentInfo = subPageParams?.paymentInfo ?? {
      bank: "", cardType: "", paymentMethod: "full", chargeAmount: 0, edcAmount: 0, remark: "",
    }

    const grandTotal = studentData.reduce((s, st) => s + st.subtotal, 0)
    const totalFee = Math.max(0, paymentInfo.edcAmount - paymentInfo.chargeAmount)
    const cashierName = user?.name ?? "Cashier"

    // Flatten to per-invoice items, distribute card fee proportionally
    const invoiceItems: InvoiceReceiptItem[] = (() => {
      const allInvs: InvoiceReceiptItem[] = []
      let allocated = 0
      const flatInvs = studentData.flatMap(st =>
        (st.invoices ?? []).map((inv: any) => ({ st, inv }))
      )
      flatInvs.forEach(({ st, inv }, idx) => {
        const invAmt: number = inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
        const isLast = idx === flatInvs.length - 1
        const fee = grandTotal > 0
          ? isLast
            ? Number((totalFee - allocated).toFixed(2))
            : Number((totalFee * invAmt / grandTotal).toFixed(2))
          : 0
        allocated += fee
        allInvs.push({
          sid: st.sid,
          name: st.name,
          guardian: st.guardian,
          grade: st.grade ?? "-",
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || inv.id || "-",
          invoiceAmount: invAmt,
          receiptNo: receiptNumbers[inv.id] ?? `R-CC-${new Date().getFullYear()}-00001`,
          cardFee: fee,
        })
      })
      return allInvs
    })()
  ```

- [ ] **Step 6: แก้ `handleViewReceipt` และ `handleDownloadReceipt` ให้รับ `InvoiceReceiptItem`**

  แทนที่ functions ทั้งสองด้วย:
  ```ts
    async function handleViewReceipt(item: InvoiceReceiptItem) {
      if (previewBlobUrls[item.invoiceId]) {
        setPreviewUrl(previewBlobUrls[item.invoiceId])
        return
      }
      setLoadingStates(prev => ({ ...prev, [item.invoiceId]: true }))
      try {
        const blob = await generatePdfBlob(item, cashierName, paymentInfo)
        const url = URL.createObjectURL(blob)
        setPreviewBlobUrls(prev => ({ ...prev, [item.invoiceId]: url }))
        setPreviewUrl(url)
      } finally {
        setLoadingStates(prev => ({ ...prev, [item.invoiceId]: false }))
      }
    }

    async function handleDownloadReceipt(item: InvoiceReceiptItem) {
      setLoadingStates(prev => ({ ...prev, [`dl-${item.invoiceId}`]: true }))
      try {
        const blob = await generatePdfBlob(item, cashierName, paymentInfo)
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `receipt-${item.sid}-${item.receiptNo}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } finally {
        setLoadingStates(prev => ({ ...prev, [`dl-${item.invoiceId}`]: false }))
      }
    }
  ```

- [ ] **Step 7: แก้ JSX — เปลี่ยน card loop จาก `studentData.map(student)` → `invoiceItems.map(item)`**

  แทนที่ block `{studentData.map((student, idx) => (...))}` ด้วย:
  ```tsx
  {invoiceItems.map((item, idx) => (
    <Card key={item.invoiceId}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between bg-slate-100 rounded-t-lg px-4 py-2">
          <span className="text-sm font-semibold text-slate-600">#{idx + 1}</span>
          <span className="text-sm font-mono text-slate-500">{item.receiptNo}</span>
        </div>
        <div className="px-4 pt-3 pb-4 space-y-3">
          <div>
            <p className="font-semibold text-sm">{item.name}</p>
            <p className="text-xs text-muted-foreground">Invoice: {item.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">{t("cashier.guardianShort")}: {item.guardian}</p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={!!loadingStates[item.invoiceId]}
            onClick={() => handleViewReceipt(item)}
          >
            {loadingStates[item.invoiceId]
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังสร้าง PDF...</>
              : t("cashier.viewReceipt")}
          </Button>
          <Button
            variant="default"
            className="w-full"
            disabled={!!loadingStates[`dl-${item.invoiceId}`]}
            onClick={() => handleDownloadReceipt(item)}
          >
            {loadingStates[`dl-${item.invoiceId}`]
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />กำลังดาวน์โหลด...</>
              : t("cashier.downloadReceipt")}
          </Button>
        </div>
      </CardContent>
    </Card>
  ))}
  ```

- [ ] **Step 8: ตรวจ TypeScript ไม่มี error**

  Run: `cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" && npx tsc --noEmit 2>&1 | head -30`

  Expected: ไม่มี error ใน CashierReceiptPage.tsx (อาจมี error ใน CashierAcknowledgementList.tsx — ยังไม่แก้)

- [ ] **Step 9: Commit**

  ```bash
  cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main"
  git add src/components/CashierReceiptPage.tsx
  git commit -m "feat: receipt per invoice — InvoiceReceiptItem, single-row PDF, per-invoice cards"
  ```

---

## Task 2: แก้ `savePendingAcknowledgement()` ใน CashierPaymentPage.tsx

**Files:**
- Modify: `src/components/CashierPaymentPage.tsx`

- [ ] **Step 1: แทนที่ function `savePendingAcknowledgement` (บรรทัด 150-211)**

  ```ts
  function savePendingAcknowledgement(
    stdData: { sid: string; student: any; invoices: any[]; guardian: string; subtotal: number }[],
    paymentId: string,
    bank: string,
    paymentMethodVal: string,
    cardFeeVal: number,
    remark: string,
    overInvoiceAmt: number
  ): Record<string, string> {
    const receiptNos: Record<string, string> = {}
    const grandTotal = stdData.reduce((s, d) => s + d.subtotal, 0)

    const now = new Date()
    const month = now.getMonth() + 1
    const acYearStart = month >= 8 ? now.getFullYear() : now.getFullYear() - 1

    // Flatten to (student, invoice) pairs
    const pairs = stdData.flatMap(({ sid, student, invoices, guardian }) =>
      (invoices ?? []).map((inv: any) => ({ sid, student, inv, guardian }))
    )

    let allocatedFee = 0
    let isFirstInvoice = true

    const newRecords = pairs.map(({ sid, student, inv, guardian }, idx) => {
      const invAmt: number = inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0
      const isLast = idx === pairs.length - 1

      const pFee = grandTotal > 0
        ? isLast
          ? Number((cardFeeVal - allocatedFee).toFixed(2))
          : Number((cardFeeVal * invAmt / grandTotal).toFixed(2))
        : 0
      allocatedFee += pFee

      const pOver = isFirstInvoice ? overInvoiceAmt : 0
      isFirstInvoice = false

      const pCharge = invAmt + pOver
      const receiptNo = generateReceiptNo()
      receiptNos[inv.id] = receiptNo

      return {
        id: crypto.randomUUID(),
        status: "pending" as const,
        receiptNos: { [inv.id]: receiptNo },
        paymentDate: now.toISOString(),
        paymentId,
        studentData: [{
          sid,
          name: student ? `${student.firstName} ${student.lastName}` : sid,
          guardian,
          grade: student?.gradeLevel ?? "-",
          subtotal: invAmt,
          invoices: [inv],
        }],
        paymentInfo: {
          bank,
          paymentMethod: paymentMethodVal,
          chargeAmount: pCharge,
          edcAmount: pCharge + pFee,
          cardFee: pFee,
          remark,
        },
        schoolYear: `${acYearStart}/${acYearStart + 1}`,
        createdAt: now.toISOString(),
      }
    })

    const existing = JSON.parse(localStorage.getItem("cashier_acknowledgements") || "[]")
    localStorage.setItem("cashier_acknowledgements", JSON.stringify([...newRecords, ...existing]))
    return receiptNos
  }
  ```

- [ ] **Step 2: ตรวจ TypeScript**

  Run: `cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" && npx tsc --noEmit 2>&1 | head -30`

  Expected: ไม่มี error ใหม่ใน CashierPaymentPage.tsx

- [ ] **Step 3: Commit**

  ```bash
  cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main"
  git add src/components/CashierPaymentPage.tsx
  git commit -m "feat: savePendingAcknowledgement creates 1 AckRecord per invoice"
  ```

---

## Task 3: แก้ `CashierAcknowledgementList.tsx` — invoice column + ใช้ InvoiceReceiptItem

**Files:**
- Modify: `src/components/CashierAcknowledgementList.tsx`

- [ ] **Step 1: เพิ่ม import `InvoiceReceiptItem` จาก CashierReceiptPage**

  แทนที่บรรทัด 14:
  ```ts
  import { generatePdfBlob, PaymentInfo, InvoiceReceiptItem } from "./CashierReceiptPage"
  ```

- [ ] **Step 2: แทนที่ `getStudentFee` และ `makePaymentInfo` helpers (บรรทัด 57-76) ด้วย helper เดียว**

  ลบ `getStudentFee` และ `makePaymentInfo` ออก แล้วเพิ่ม:
  ```ts
  function makeInvoiceItem(rec: AckRecord): InvoiceReceiptItem {
    const student = rec.studentData[0]
    const inv = student?.invoices[0]
    return {
      sid: student?.sid ?? "-",
      name: student?.name ?? "-",
      guardian: student?.guardian ?? "-",
      grade: student?.grade ?? "-",
      invoiceId: inv?.id ?? rec.id,
      invoiceNumber: inv?.invoiceNumber || inv?.id || "-",
      invoiceAmount: student?.subtotal ?? 0,
      receiptNo: Object.values(rec.receiptNos)[0] ?? "-",
      cardFee: rec.paymentInfo.cardFee,
    }
  }

  function makePaymentInfoFromRec(rec: AckRecord): PaymentInfo {
    return {
      bank: rec.paymentInfo.bank,
      cardType: "",
      paymentMethod: rec.paymentInfo.paymentMethod,
      chargeAmount: rec.paymentInfo.chargeAmount,
      edcAmount: rec.paymentInfo.edcAmount,
      remark: rec.paymentInfo.remark,
      overpaymentAmount: Math.max(0, rec.paymentInfo.chargeAmount - (rec.studentData[0]?.subtotal ?? 0)),
    }
  }
  ```

- [ ] **Step 3: แก้ `handlePreview` (บรรทัด 87-103)**

  แทนที่ด้วย:
  ```ts
  async function handlePreview(rec: AckRecord) {
    const key = `view-${rec.id}`
    setLoadingMap(prev => ({ ...prev, [key]: true }))
    try {
      const item = makeInvoiceItem(rec)
      const blob = await generatePdfBlob(item, cashierName, makePaymentInfoFromRec(rec))
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } finally {
      setLoadingMap(prev => ({ ...prev, [key]: false }))
    }
  }
  ```

- [ ] **Step 4: แก้ `openViewDialog` (บรรทัด 78-85)**

  แทนที่ด้วย:
  ```ts
  async function openViewDialog(rec: AckRecord) {
    setViewTarget(rec)
    setPreviewUrl(null)
    setViewDialogOpen(true)
    await handlePreview(rec)
  }
  ```

- [ ] **Step 5: แก้ `handleIssue` — ลบ student loop ออก สร้าง 1 receiptRecord เสมอ (บรรทัด 112-166)**

  แทนที่ด้วย:
  ```ts
  const handleIssue = () => {
    if (!issueTarget) return

    const item = makeInvoiceItem(issueTarget)
    const received = item.invoiceAmount + item.cardFee

    const newReceiptRecord = {
      id: crypto.randomUUID(),
      receiptNo: item.receiptNo,
      receiptDate: officialDate.toISOString(),
      clientType: "internal",
      clientNo: item.sid,
      clientName: item.name,
      contactName: item.guardian,
      yearGroup: item.grade,
      schoolYear: issueTarget.schoolYear,
      totalAmount: received,
      receivedAmount: received,
      creditNoteTotal: 0,
      netPayableAmount: received,
      overpaymentAmount: 0,
      paymentMethod: "Credit Card",
      bankName: issueTarget.paymentInfo.bank,
      cardType: "",
      transactionFeeAmount: item.cardFee,
      status: "generated",
      createdAt: new Date().toISOString(),
      invoices: [{
        id: item.invoiceId,
        invoiceNo: item.invoiceNumber,
        invoiceDate: issueTarget.studentData[0]?.invoices[0]?.issueDate ?? new Date().toISOString(),
        invoiceAmount: item.invoiceAmount,
        receivedAmount: received,
        outstandingAmount: 0,
      }],
    }

    const existing = JSON.parse(localStorage.getItem("receiptRecords_tuition") || "[]")
    localStorage.setItem("receiptRecords_tuition", JSON.stringify([newReceiptRecord, ...existing]))

    const updated = records.map(r =>
      r.id === issueTarget.id
        ? { ...r, status: "issued" as const, officialDate: officialDate.toISOString() }
        : r
    )
    localStorage.setItem("cashier_acknowledgements", JSON.stringify(updated))
    setRecords(updated)
    toast.success(t("cashier.ackIssuedSuccess"))
    setDialogOpen(false)
  }
  ```

- [ ] **Step 6: เพิ่มคอลัมน์ "Invoice No." ใน TableHeader (หลัง Student column)**

  แทนที่ `<TableHead align="left">{t("cashier.ackColStudent")}</TableHead>` ด้วย:
  ```tsx
  <TableHead align="left">{t("cashier.ackColStudent")}</TableHead>
  <TableHead align="left">Invoice No.</TableHead>
  ```

- [ ] **Step 7: เพิ่ม `<TableCell>` สำหรับ Invoice No. ใน row (หลัง student name cell)**

  แทนที่ `<TableCell align="left" className="text-sm">{studentNames(rec)}</TableCell>` ด้วย:
  ```tsx
  <TableCell align="left" className="text-sm">{studentNames(rec)}</TableCell>
  <TableCell align="left" className="text-sm font-mono">
    {rec.studentData[0]?.invoices[0]?.invoiceNumber || rec.studentData[0]?.invoices[0]?.id || "-"}
  </TableCell>
  ```

- [ ] **Step 8: อัพเดท colSpan ใน empty state row จาก 7 → 8**

  แทนที่ `colSpan={7}` ด้วย `colSpan={8}`

- [ ] **Step 9: ตรวจ TypeScript ไม่มี error**

  Run: `cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" && npx tsc --noEmit 2>&1 | head -30`

  Expected: no errors

- [ ] **Step 10: Commit**

  ```bash
  cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main"
  git add src/components/CashierAcknowledgementList.tsx
  git commit -m "feat: AcknowledgementList 1 row per invoice with invoice number column"
  ```

---

## Task 4: Smoke test ด้วยตา

- [ ] **Step 1: Start dev server**

  ```bash
  cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main" && npm run dev
  ```

- [ ] **Step 2: ทดสอบ happy path**

  1. ไป Student Search → เลือกนักเรียนที่มี 2+ invoices
  2. ชำระเงิน → ยืนยัน
  3. หน้า Receipt ต้องแสดงการ์ดแยกต่อ invoice (ไม่รวม)
  4. กด View Receipt → PDF มีตาราง 1 row เท่านั้น
  5. Receipt number ต่อ card ต้องไม่ซ้ำกัน

- [ ] **Step 3: ตรวจ AcknowledgementList**

  1. ไปหน้า Issue Receipts
  2. ต้องมีหลาย rows สำหรับ payment ที่เพิ่งทำ
  3. แต่ละ row มีคอลัมน์ Invoice No.
  4. กด Issue → ทำงานได้

- [ ] **Step 4: ตรวจ backward compat**

  ถ้ามี record เก่า (multi-invoice) ใน localStorage → ยังแสดงใน list ได้ปกติ ไม่ crash
