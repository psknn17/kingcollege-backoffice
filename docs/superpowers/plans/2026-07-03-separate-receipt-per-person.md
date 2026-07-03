# Separate Receipt Per Person Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เมื่อ cashier รับชำระเงินหลายคนพร้อมกัน ให้ save AckRecord แยกต่อคน เพื่อให้หน้า Acknowledgement List แสดงแถวแยกต่อนักเรียนและ issue receipt ทีละคนได้

**Architecture:** แก้ที่ save time ใน `CashierPaymentPage.savePendingAcknowledgement` ให้ loop save N records แทน 1 record แต่ละ record มี `studentData` 1 คน พร้อม proportional `cardFee` และ `chargeAmount` ที่คำนวณไว้แล้ว ส่วน `CashierAcknowledgementList` ลบ multi-student tab switcher ออก เพราะไม่จำเป็นอีกต่อไป

**Tech Stack:** React 18, TypeScript, localStorage

---

## File Map

| File | Action | สิ่งที่แก้ |
|---|---|---|
| `src/components/CashierPaymentPage.tsx` | Modify | `savePendingAcknowledgement` + call site |
| `src/components/CashierAcknowledgementList.tsx` | Modify | ลบ multi-student tab switcher (lines 245–258) |

---

## Task 1: แก้ `savePendingAcknowledgement` ให้ save N records ต่อ N นักเรียน

**Files:**
- Modify: `src/components/CashierPaymentPage.tsx:150-189` (function body)
- Modify: `src/components/CashierPaymentPage.tsx:257-260` (call site)

### Background

ปัจจุบัน function นี้ save 1 combined `AckRecord` ที่มี `studentData: [s1, s2, s3]`
เราจะเปลี่ยนให้ save N records โดยแต่ละ record:
- `studentData` มี 1 คน
- `receiptNos` มี 1 key (ของคนนั้น)
- `paymentInfo.cardFee` = proportional fee ของคนนั้น (`totalCardFee * subtotal / grandTotal`)
- `paymentInfo.chargeAmount` = subtotal ของคนนั้น บวก overpayment เฉพาะคนแรก (`idx === 0`)
- `paymentInfo.edcAmount` = `chargeAmount + cardFee`
- `paymentId` เหมือนกันทุก record (reference เดิม)

- [ ] **Step 1.1: แทนที่ function `savePendingAcknowledgement` ทั้งหมด (lines 150–189)**

เปิดไฟล์ `src/components/CashierPaymentPage.tsx` แล้วแทนที่ทั้ง function ด้วย:

```typescript
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

> หมายเหตุ: ลบ parameter `chargeAmountVal` และ `edcAmountVal` ออก เพราะคำนวณ per-student ข้างใน function แล้ว

- [ ] **Step 1.2: แก้ call site ใน `handleConfirmPayment` (line 257–260)**

หา:
```typescript
      const receiptNos = savePendingAcknowledgement(
        studentData, paymentId, selectedBank, paymentMethod,
        chargeAmount, edcAmountCalc, cardFee, remark
      )
```

แทนที่ด้วย:
```typescript
      const receiptNos = savePendingAcknowledgement(
        studentData, paymentId, selectedBank, paymentMethod,
        cardFee, remark, overInvoice
      )
```

- [ ] **Step 1.3: ตรวจว่า TypeScript compile ผ่าน**

```bash
cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main"
npm run build 2>&1 | head -30
```

Expected: ไม่มี error จาก `CashierPaymentPage.tsx` — ถ้ามี type error ให้แก้ก่อน

- [ ] **Step 1.4: Manual test — single student**

1. `npm run dev`
2. ไป Cashier → Student Search
3. เลือก 1 นักเรียน เลือก invoice → Process Payment
4. เลือก bank → Confirm Payment
5. ไป Acknowledgement List
6. ตรวจว่า: มี 1 แถว, receipt no ถูกต้อง, ชื่อ = ชื่อนักเรียนคนนั้น
7. กด Issue → เลือก date → Confirm → ต้องสำเร็จ

- [ ] **Step 1.5: Manual test — multiple students**

1. เปิด Multi-pay mode ใน Student Search
2. เลือก 2 นักเรียน เลือก invoices → Process Payment
3. เลือก bank → Confirm Payment
4. ไป Acknowledgement List
5. ตรวจว่า: มี **2 แถว** แยกกัน (ไม่รวม)
6. แต่ละแถวมี receipt no ของตัวเอง และชื่อเฉพาะคนนั้น
7. Amount ของแต่ละแถว = subtotal + proportional fee ของคนนั้น
8. กด Issue แถวแรก → Confirm → status เปลี่ยนเป็น Issued เฉพาะแถวแรก
9. แถวที่ 2 ยัง Pending อยู่

- [ ] **Step 1.6: Commit**

```bash
git add src/components/CashierPaymentPage.tsx
git commit -m "feat: save separate AckRecord per student for simultaneous payments"
```

---

## Task 2: ลบ multi-student tab switcher ใน `CashierAcknowledgementList`

**Files:**
- Modify: `src/components/CashierAcknowledgementList.tsx:245-258`

### Background

ใน view dialog ปัจจุบันมี tab buttons สำหรับสลับดู PDF ของแต่ละคน เมื่อ record มี 1 คนแล้ว UI นี้ไม่จำเป็น และจะไม่แสดงอยู่ดี (เพราะ condition `viewTarget.studentData.length > 1` เป็น false เสมอสำหรับ records ใหม่) แต่เราลบออกเพื่อความสะอาด

- [ ] **Step 2.1: ลบ multi-student tab switcher ออกจาก view dialog**

เปิด `src/components/CashierAcknowledgementList.tsx` หา block นี้ (lines 245–258):

```tsx
              {viewTarget && viewTarget.studentData.length > 1 && (
                <div className="flex items-center gap-2 mr-8">
                  {viewTarget.studentData.map((student, idx) => (
                    <Button
                      key={student.sid}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(viewTarget, student)}
                    >
                      {idx + 1}. {student.name}
                    </Button>
                  ))}
                </div>
              )}
```

ลบออกทั้งหมด ผล: `<DialogHeader>` ใน view dialog จะเหลือแค่ `<DialogTitle>Acknowledgement Document</DialogTitle>`

- [ ] **Step 2.2: ตรวจว่า TypeScript compile ผ่าน**

```bash
cd "/Users/passkornnabangchang/Desktop/warp/kingcollenge 2/Kingcollegebackoffice-main"
npm run build 2>&1 | head -30
```

Expected: build สำเร็จ ไม่มี error

- [ ] **Step 2.3: Manual test — view dialog**

1. `npm run dev`
2. ไป Acknowledgement List
3. กด Eye icon ของ record ที่ issue แล้ว
4. ตรวจว่า: dialog เปิด แสดง PDF ปกติ ไม่มี tab buttons

- [ ] **Step 2.4: Commit**

```bash
git add src/components/CashierAcknowledgementList.tsx
git commit -m "chore: remove multi-student tab switcher from ack view dialog"
```

---

## Self-Review Checklist

| Requirement | Covered |
|---|---|
| Save N records ต่อ N นักเรียน | Task 1, Step 1.1 |
| Receipt number แยกต่อคน | `receiptNos: { [sid]: receiptNo }` ใน loop |
| cardFee proportional | `pFee = cardFeeVal * subtotal / grandTotal` |
| Overpayment ไปคนแรก | `pOver = idx === 0 ? overInvoiceAmt : 0` |
| paymentId เหมือนกันทุก record | ส่งผ่าน parameter ตรง |
| Backward compat (records เก่า) | ไม่แตะ read path |
| ลบ tab switcher | Task 2, Step 2.1 |
| Single student ไม่เสีย | Manual test Step 1.4 |
