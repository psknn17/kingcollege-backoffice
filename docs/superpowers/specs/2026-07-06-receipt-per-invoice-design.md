# Design: ออกใบเสร็จแยกต่อ Invoice

**วันที่**: 2026-07-06  
**Approach**: B — AckRecord per invoice  
**Risk**: Medium (เปลี่ยน AckRecord shape + backward compat)

---

## ปัญหาเดิม

ระบบออกใบเสร็จ 1 ใบต่อ 1 นักเรียน โดยรวม invoice ทั้งหมดไว้ในตารางเดียวกัน  
ต้องการเปลี่ยนเป็น: 1 ใบเสร็จต่อ 1 invoice — receipt number แยกต่างหากทุกใบ

---

## โครงสร้างข้อมูลใหม่

### AckRecord (1 record = 1 invoice เสมอ)

```ts
{
  id: string
  status: "pending" | "issued"
  receiptNos: { [invoiceId: string]: string }  // exactly 1 entry
  paymentDate: string
  paymentId: string        // ties all invoices from same card swipe
  studentData: [{
    sid: string
    name: string
    guardian: string
    grade: string
    subtotal: number       // amount ของ invoice นี้เท่านั้น
    invoices: [Invoice]    // exactly 1 invoice
  }]
  paymentInfo: {
    bank: string
    paymentMethod: string
    chargeAmount: number   // = invoice amount + overpayment (first invoice only)
    edcAmount: number      // chargeAmount + cardFee
    cardFee: number        // proportioned to this invoice
    remark: string
  }
  schoolYear: string
  createdAt: string
}
```

**Key เปลี่ยน**: `receiptNos` ใช้ `invoiceId` แทน `sid`

### Backward Compatibility

Record เก่า (หลาย invoice ใน `studentData[].invoices[]`) ยังอยู่ใน localStorage  
`CashierAcknowledgementList` ต้อง fallback: ถ้า lookup ด้วย `invoiceId` ไม่เจอ ให้ใช้ `receiptNos[student.sid]`

---

## ไฟล์ที่เปลี่ยน

### 1. `CashierPaymentPage.tsx`

**ฟังก์ชัน `savePendingAcknowledgement()`**

- เปลี่ยน loop จาก per student → per student × per invoice
- เรียก `generateReceiptNo()` 1 ครั้งต่อ invoice
- คำนวณ `cardFee` แบบ proportional: `cardFeeTotal * invoiceAmt / grandTotal`
- invoice สุดท้ายรับ remainder เพื่อป้องกัน rounding drift
- คืนค่า `Record<invoiceId, receiptNo>` ให้ `CashierReceiptPage`

**Navigation params ที่ส่งไป CashierReceiptPage**

เปลี่ยน `receiptNos: Record<sid, string>` → `receiptNos: Record<invoiceId, string>`

---

### 2. `CashierReceiptPage.tsx`

**Interface ใหม่ `InvoiceReceiptItem`**

```ts
interface InvoiceReceiptItem {
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

**UI**

- Flatten `studentData[].invoices[]` → `InvoiceReceiptItem[]` ตอน render
- แสดงการ์ดต่อ invoice (header: student name + invoice number)
- React key = `invoiceId`

**PDF**

- `buildCashierReceiptHtml` รับ `InvoiceReceiptItem` แทน `StudentReceiptData`
- ตาราง invoice มี 1 row เสมอ
- `studentFee` = `item.cardFee` (pre-computed)

---

### 3. `CashierAcknowledgementList.tsx`

**Display**

- 1 row = 1 AckRecord = 1 invoice
- เพิ่มคอลัมน์ "Invoice No." แสดง `invoices[0].invoiceNumber`
- Receipt number = `Object.values(rec.receiptNos)[0]`

**Backward compat**

- Record เก่า (`receiptNos[sid]` รูปแบบเดิม): แสดงได้ปกติ เพราะใช้ `Object.values()[0]`
- Invoice no. column: record เก่าที่มีหลาย invoice แสดง invoice แรก

---

## Verification Criteria

- [ ] 1 student + 5 invoices → สร้าง 5 AckRecord, 5 running receipt numbers
- [ ] Receipt number เรียงต่อเนื่อง ไม่มี gap
- [ ] PDF แต่ละใบมี 1 invoice row เท่านั้น
- [ ] cardFee รวมกันทุกใบ = ค่าธรรมเนียมจริงทั้งหมด (ไม่มี rounding drift)
- [ ] AcknowledgementList แสดง 5 rows สำหรับ payment นั้น
- [ ] Record เก่า (multi-invoice) ยังแสดงถูกต้องใน AcknowledgementList
- [ ] Issue receipt ยังทำงานได้ปกติ

---

## Risks

| Risk | ระดับ | Mitigation |
|------|-------|------------|
| AckRecord เก่า format ไม่ตรง | Medium | Fallback lookup ใน AcknowledgementList |
| Running number กระโดด (เรียก generateReceiptNo หลายครั้ง) | Low | ตั้งใจให้เป็นแบบนั้น — 1 invoice = 1 receipt no. |
| CashierReceiptPage params shape เปลี่ยน | Low | เปลี่ยน interface ชัดเจน + TypeScript จะ catch |
