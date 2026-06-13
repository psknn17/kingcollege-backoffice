# Debt Reminder — Recipient Selection in Send Now

**Date:** 2026-06-13  
**Component:** `DebtReminderSettings.tsx`  
**Risk:** Low — UI-only change, no data mutation logic

---

## Problem

Tab "Send Now" ส่ง email ถึงทุกคนที่ match criteria โดยไม่มี selection
ผู้ใช้ไม่สามารถยกเว้นนักเรียนบางคนออกจากการส่งได้

---

## Solution

เพิ่ม checklist นักเรียน/invoice ใน Tab "Send Now" ให้ผู้ใช้เลือกก่อนส่งจริง

---

## Design Decisions

- **Unit**: 1 email ต่อ 1 นักเรียน/invoice — ไม่ group ตาม parent/family
- **Default**: เลือกทุกคนไว้แล้วเมื่อเปิด modal
- **No auto-link**: ครอบครัวที่มีลูกหลายคนรับหลาย emails แยกกัน ตามพฤติกรรมเดิม

---

## UI Layout — Tab "Send Now" (ใหม่)

```
┌─────────────────────────────────────────────────────┐
│ Subject: Tuition Payment Reminder                   │
│ Message preview...                                  │
├─────────────────────────────────────────────────────┤
│ Recipients  AY2025/2026 · Term 1   Selected: 243/244│
│ [Search by name or invoice no...]                   │
│ ☑ Select All                                        │
│ ──────────────────────────────────────────────────  │
│ ☑ John Smith      INV-001    ฿5,000   [unpaid]      │
│ ☑ Jane Doe        INV-002    ฿3,500   [unpaid]      │
│ ☐ Mike Johnson    INV-003    ฿4,200   [overdue]     │
├─────────────────────────────────────────────────────┤
│ [Cancel]                      [Send Now (243)]      │
└─────────────────────────────────────────────────────┘
```

---

## Behavior

| สถานการณ์ | ผลลัพธ์ |
|---|---|
| เปิด modal | โหลด matching invoices, เลือกทุกคน default |
| ค้นหาแล้ว deselect | ยังคง deselected แม้ clear search |
| ไม่มี invoice match | แสดง empty state, ปิด Send button |
| กด Send Now (N) | Final Confirm → `handleSendNow` ใช้ `sendSelectedIds.size` เป็น count |

---

## Scope

### เปลี่ยน
- `TabsContent value="confirm"` ใน Send Modal — แทน layout ปัจจุบัน (preview only)
  ด้วย: email preview section + recipient checklist section

### ไม่เปลี่ยน
- Tab "Send Verification Email" (`value="test"`) — คงเดิมทุกอย่าง
- `handleSendNow()` — logic เดิม, ใช้ `sendSelectedIds.size` อยู่แล้ว
- `openSendModal()` — preloads `sendMatchingInvoices` + `sendSelectedIds` อยู่แล้ว
- State ที่ reuse ได้: `sendMatchingInvoices`, `sendSelectedIds`, `sendInvoiceSearch`

### State ใหม่ที่ต้องเพิ่ม
- ไม่มี — reuse state ที่มีอยู่ทั้งหมด

---

## Files Changed

| File | Type |
|---|---|
| `src/components/DebtReminderSettings.tsx` | Edit — TabsContent `confirm` section only |
