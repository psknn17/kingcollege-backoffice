# Design: แยกใบเสร็จต่อคนเมื่อจ่ายพร้อมกัน

**Date:** 2026-07-03  
**Status:** Approved  

---

## Problem

เมื่อ cashier รับชำระเงินหลายนักเรียนพร้อมกันใน 1 transaction (multi-person payment) ระบบบันทึก 1 `AckRecord` รวมนักเรียนทุกคนใน `studentData[]` ผลลัพธ์:
- หน้า **Cashier Acknowledgement List** (Issue Receipt) แสดง 1 แถวต่อ transaction ชื่อนักเรียนถูก join เป็นสตริงเดียว
- ปุ่ม "Issue" issue รวมในครั้งเดียว ไม่สามารถ issue ทีละคนได้

## Requirement

เมื่อ payment มีนักเรียนหลายคน ให้ออกใบเสร็จ **แยกต่อคน** — หน้า Issue Receipt ต้องแสดงแต่ละคนเป็นแถวแยก พร้อม receipt number ของตัวเอง และ Issue ทีละคนได้

---

## Solution: แยกที่ Save Time (Approach A)

แก้ `CashierPaymentPage.savePendingAcknowledgement` ให้ save **N AckRecords** แทน 1 record เมื่อมี N นักเรียน แต่ละ record มี `studentData` 1 คน

### ทำไมแก้ที่ save time

- Display logic ใน `CashierAcknowledgementList` ไม่ต้องแก้ — แถวในตารางแสดงทีละคนโดยอัตโนมัติ
- ไม่ต้องสร้าง special case สำหรับ multi-student
- `getStudentFee`, `makePaymentInfo`, `handleIssue` ทำงานถูกต้องทันทีเมื่อ record มี 1 คน

---

## Data Model Changes

### ก่อน (1 combined record)

```typescript
{
  id: "uuid-1",
  studentData: [
    { sid: "S001", name: "Alice", subtotal: 60000, ... },
    { sid: "S002", name: "Bob",   subtotal: 40000, ... },
  ],
  receiptNos: { S001: "R-CC-2026-00001", S002: "R-CC-2026-00002" },
  paymentInfo: { cardFee: 2500, chargeAmount: 100000, edcAmount: 102500, ... },
  paymentId: "PAY-20260703-1234",
}
```

### หลัง (N per-student records)

```typescript
// Record สำหรับ Alice
{
  id: "uuid-2",
  studentData: [{ sid: "S001", name: "Alice", subtotal: 60000, ... }],
  receiptNos: { S001: "R-CC-2026-00001" },
  paymentInfo: { cardFee: 1500, chargeAmount: 60000, edcAmount: 61500, ... },
  paymentId: "PAY-20260703-1234",  // เหมือนกัน — reference ว่ามาจาก transaction เดียว
}

// Record สำหรับ Bob
{
  id: "uuid-3",
  studentData: [{ sid: "S002", name: "Bob", subtotal: 40000, ... }],
  receiptNos: { S002: "R-CC-2026-00002" },
  paymentInfo: { cardFee: 1000, chargeAmount: 40000, edcAmount: 41000, ... },
  paymentId: "PAY-20260703-1234",
}
```

---

## Card Fee Allocation

ใช้ proportional allocation เหมือน behavior ปัจจุบัน:

```
studentCardFee = totalCardFee × (studentSubtotal / grandTotal)
```

ตัวอย่าง:
- Grand total = ฿100,000, totalCardFee = ฿2,500 (2.5%)
- Alice (฿60,000) → cardFee = ฿1,500
- Bob (฿40,000) → cardFee = ฿1,000

---

## Overpayment Handling

Overpayment (chargeAmount > grandTotal) ถูกจัดให้กับนักเรียนคนแรก (`stdData[0]`):

```
// คนแรก
chargeAmount = student.subtotal + overpaymentAmt

// คนอื่น
chargeAmount = student.subtotal
```

`makePaymentInfo` ใน `CashierAcknowledgementList` คำนวณ `overAmt = chargeAmount - totalSubtotal` ได้ถูกต้องโดยไม่แก้

---

## Files Changed

### 1. `src/components/CashierPaymentPage.tsx`

**Function:** `savePendingAcknowledgement`

เปลี่ยนจาก save 1 record → loop save N records:

```typescript
function savePendingAcknowledgement(
  stdData: ...,
  paymentId: string,
  bank: string,
  paymentMethodVal: string,
  chargeAmountVal: number,   // grand total (ใช้คำนวณ proportion)
  edcAmountVal: number,
  cardFeeVal: number,        // total card fee
  remark: string,
  overInvoiceAmt: number     // pass overpayment amount
): Record<string, string> {
  const receiptNos: Record<string, string> = {}
  const grandTotal = stdData.reduce((s, d) => s + d.subtotal, 0)
  const now = new Date()
  const month = now.getMonth() + 1
  const acYearStart = month >= 8 ? now.getFullYear() : now.getFullYear() - 1

  const newRecords = stdData.map(({ sid, student, invoices, guardian, subtotal }, idx) => {
    const receiptNo = generateReceiptNo()
    receiptNos[sid] = receiptNo

    const pFee = grandTotal > 0 ? Number((cardFeeVal * subtotal / grandTotal).toFixed(2)) : 0
    const pOver = idx === 0 ? overInvoiceAmt : 0
    const pCharge = subtotal + pOver

    return {
      id: crypto.randomUUID(),
      status: "pending" as const,
      receiptNos: { [sid]: receiptNo },
      paymentDate: now.toISOString(),
      paymentId,
      studentData: [{
        sid,
        name: student ? `${student.firstName} ${student.lastName}` : sid,
        guardian,
        grade: student?.gradeLevel ?? "-",
        subtotal,
        invoices,
      }],
      paymentInfo: {
        bank, paymentMethod: paymentMethodVal,
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

**Call site** ใน `handleConfirmPayment`: pass `overInvoice` เพิ่มเป็น argument

### 2. `src/components/CashierAcknowledgementList.tsx`

**ลบ** multi-student tab switcher ใน view dialog (บรรทัดประมาณ 245–258):

```tsx
// ลบออก — ไม่จำเป็นแล้ว เพราะแต่ละ record มี 1 student
{viewTarget && viewTarget.studentData.length > 1 && (
  <div className="flex items-center gap-2 mr-8">
    {viewTarget.studentData.map((student, idx) => (
      <Button key={student.sid} ... />
    ))}
  </div>
)}
```

ไม่มีการแก้ logic อื่น — `firstReceiptNo`, `studentNames`, `grandTotal`, `getStudentFee`, `handleIssue` ทำงานถูกต้องทันที

---

## Backward Compatibility

Records เก่าใน `localStorage` ที่มี `studentData.length > 1` จะยังแสดงถูกต้อง:
- `studentNames` → join ชื่อทุกคน (behavior เดิม)
- `firstReceiptNo` → receipt ของคนแรก
- `grandTotal` → รวมทุกคน
- ไม่ crash

เฉพาะ records ใหม่เท่านั้นที่จะแยกต่อคน

---

## Testing

1. สร้าง payment หลายนักเรียน → ไปที่ Acknowledgement List → ต้องเห็นแถวแยกต่อคน
2. Receipt number ต้องถูกต้องตามแต่ละคน
3. Amount แสดง subtotal + proportional fee ของแต่ละคน
4. กด Issue ทีละคนได้อิสระ
5. หากมี overpayment → คนแรกเท่านั้นที่แสดง overpayment amount
6. Payment คนเดียว → behavior เดิมไม่เปลี่ยน
