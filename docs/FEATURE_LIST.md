# Feature List — Payment Backoffice System
> Generated: 2026-03-02 | Version: 1.3 | Updated: 2026-03-04

---

## 🏠 Dashboard & Reports

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 1 | Dashboard (ReportOverview) | View | — | — | Year / Term | — | — | — | — | — |
| 2 | Discount Reports | View | — | — | Year / Term | — | — | — | — | — |

---

## 💰 Payment Reminders

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 3 | Debt Reminder Settings | U | — | — | Year / Term / Invoice Status / Due Date | — | — | — | — | ✅ 4 Templates / Preview + Send |
| 4 | Invoice / Receipt Template | U | — | — | — | — | — | — | — | — |
| 5 | Email History | View | — | XLSX | Recipient / Type / Subject | — | — | — | — | — |
| 6 | Payment History | View / U | — | XLSX | Date / Status / Student / Amount | ✅ | ✅ | — | — | — |

> **Debt Reminder Templates (C1.1):** 1. First Reminder · 2. Second Reminder · 3. Final Notice · 4. Overdue Notice

---

## 🎓 Tuition Management

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 7  | Tuition By Year | U | — | — | Academic Year | — | Grade | Save All | — | — |
| 8  | Student Discount Groups | CRUD | — | — | Search | — | — | — | — | — |
| 9  | Invoice Management (Tuition) | CRUD | ✅ Interface File | XLSX / ZIP / PDF | Invoice# / Student / Status / Date | ✅ | ✅ | ✅ Approve / Reject / Pay / Email | ✅ | ✅ |
| 10 | Items & Templates (Tuition) | CRUD | ✅ XLSX / CSV | ✅ XLSX | Code / Name / Grade | ✅ | ✅ | ✅ Delete / Toggle / Sync | — | — |
| 11 | Receipts (Tuition) | View / C | ✅ Excel | ✅ Report | Status / Grade / Receipt# / Date | ✅ | ✅ | ✅ Approve / Edit / Delete | ✅ | — |
| 12 | Credit Notes | CRUD | ✅ XLSX | ✅ XLSX | Credit# / Student / Status | ✅ | ✅ | — | — | — |

---

## 🏃 ECA / After School

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 13 | ECA Invoices | CRUD | ✅ | XLSX / ZIP / PDF | Invoice# / Student / Status | ✅ | ✅ | ✅ | ✅ | ✅ |
| 14 | ECA Items & Templates | CRUD | ✅ XLSX | ✅ | Code / Name | ✅ | ✅ | ✅ | — | — |
| 15 | ECA Receipts | View / C | ✅ | ✅ | Status / Date | ✅ | ✅ | ✅ | ✅ | — |
| 16 | ECA Discount Groups | CRUD | — | — | Search | — | — | — | — | — |

---

## 🗺️ Trip & Activity

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 17 | Trip Invoices | CRUD | ✅ | XLSX / ZIP / PDF | Invoice# / Student / Status | ✅ | ✅ | ✅ | ✅ | ✅ |
| 18 | Trip Items & Templates | CRUD | ✅ | ✅ | Code / Name | ✅ | ✅ | ✅ | — | — |
| 19 | Trip Receipts | View / C | ✅ | ✅ | Status / Date | ✅ | ✅ | ✅ | ✅ | — |
| 20 | Trip Discount Groups | CRUD | — | — | Search | — | — | — | — | — |

---

## 📝 Exam

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 21 | Exam Invoices | CRUD | ✅ | XLSX / ZIP / PDF | Invoice# / Student / Status | ✅ | ✅ | ✅ | ✅ | ✅ |
| 22 | Exam Items & Templates | CRUD | ✅ | ✅ | Code / Name | ✅ | ✅ | ✅ | — | — |
| 23 | Exam Receipts | View / C | ✅ | ✅ | Status / Date | ✅ | ✅ | ✅ | ✅ | — |
| 24 | Exam Discount Groups | CRUD | — | — | Search | — | — | — | — | — |

---

## 🚌 School Bus

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 25 | Bus Invoices | CRUD | ✅ | XLSX / ZIP / PDF | Invoice# / Student / Status | ✅ | ✅ | ✅ | ✅ | ✅ |
| 26 | Bus Items & Templates | CRUD | ✅ | ✅ | Code / Name | ✅ | ✅ | ✅ | — | — |
| 27 | Bus Receipts | View / C | ✅ | ✅ | Status / Date | ✅ | ✅ | ✅ | ✅ | — |
| 28 | Bus Discount Groups | CRUD | — | — | Search | — | — | — | — | — |

---

## 🏢 External Invoice

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 29 | External Invoices | CRUD | ✅ | XLSX / ZIP / PDF | Invoice# / Client / Status | ✅ | ✅ | ✅ | ✅ | ✅ |
| 30 | Client List | CRUD | ✅ XLSX / CSV | ✅ XLSX | Search | — | — | — | — | — |
| 31 | External Items & Templates | CRUD | ✅ | ✅ | Code / Name | ✅ | ✅ | ✅ | — | — |
| 32 | External Receipts | View / C | ✅ | ✅ | Status / Date | ✅ | ✅ | ✅ | ✅ | — |
| 33 | External Discount Groups | CRUD | — | — | Search | — | — | — | — | — |

---

## 👨‍🎓 Student Management

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 34 | Student List | CRUD | ✅ XLSX / CSV | ✅ XLSX | Search + Status / Year / Grade / Term | ✅ | ✅ | ✅ Email invite | — | ✅ |
| 35 | Family Groups | CRUD | — | ✅ XLSX | Search | ✅ | ✅ | ✅ Email invite | — | ✅ |

---

## 💸 Discount Management

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 36 | Waive Fee Management | View | — | — | Status / Year | — | — | — | — | — |
| 37 | Waive Fee Year Details | C / U | — | — | Search / Status | — | — | — | — | — |

---

## ✅ Approval & Invoice Creation

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 38 | Approval Queue | View / Approve | — | XLSX / PDF | Status / Date / Student | ✅ | ✅ | ✅ Bulk Approve / Per-invoice Reject / PDF | ✅ | ✅ |
| 39 | Invoice Creation | C / U | — | PDF / Interface File | Search Student / Item | — | — | — | ✅ | ✅ |
| 40 | External Invoice Creation | C / U | — | PDF | Search Client / Item | — | — | — | ✅ | ✅ |

> **Discount types (L2.3):** 5 ประเภท — Student Group · Sibling · Staff Child · Scholarship · Early Bird
> ทุกประเภทบริหารผ่าน Discount Management (% หรือ Fixed Amount) · Staff Child 100% ไม่แสดงในหน้าสร้าง Invoice · ห้ามเพิ่ม discount ซ้ำต่อนักเรียน

---

## ⚙️ Settings & Administration

| # | Feature | CRUD | Import | Export | Search/Filter | Pagination | Sort | Bulk | PDF | Email |
|---|---------|:----:|:------:|:------:|:-------------:|:----------:|:----:|:----:|:---:|:-----:|
| 41 | School Settings | U | — | — | — | — | — | — | — | — |
| 42 | Bank Settings | CRUD | — | — | — | — | — | — | — | — |
| 43 | Term Settings | CRUD | — | — | — | — | — | — | — | — |
| 44 | User Management | CRUD | — | — | Username / Role / Email | ✅ | — | — | — | ✅ Reset pw |
| 45 | Activity Log | View | — | — | Search / Filter | ✅ | — | — | — | — |
| 46 | User Profile | U | — | — | — | — | — | — | — | — |
| 47 | User Settings | U | — | — | — | — | — | — | — | — |
| 48 | User Activity | View | — | — | — | — | — | — | — | — |

---

## 📊 Summary Statistics

| Feature Capability | Pages |
|--------------------|:-----:|
| Full CRUD | 30 |
| Import (XLSX / CSV) | 14 |
| Export (XLSX / PDF / ZIP) | 22 |
| Search + Filter | 35 |
| Pagination | 18 |
| Sorting | 15 |
| Bulk Actions | 16 |
| PDF Generation | 10 |
| Email Sending | 12 |
| **Total Pages** | **48** |

---

## 🗂️ Sidebar Menu Structure (Display Order)

```
1.  Dashboard
2.  Reports
── Payment Reminders ──────────────────
3.  Debt Reminder Settings
4.  Invoice / Receipt Template
5.  Email History
6.  Payment History
── Tuition ────────────────────────────
7.  Tuition By Year
8.  Student Discount Groups
9.  Invoice Management
10. Items & Templates
11. Receipts
    └─ Credit Notes
── ECA ────────────────────────────────
12. ECA Invoices
13. Items & Templates
14. Receipts
15. Student Groups
── Trip & Activity ────────────────────
16. Trip Invoices
17. Items & Templates
18. Receipts
19. Student Groups
── Exam ───────────────────────────────
20. Exam Invoices
21. Items & Templates
22. Receipts
23. Student Groups
── School Bus ─────────────────────────
24. Bus Invoices
25. Items & Templates
26. Receipts
27. Student Groups
── External Invoice ───────────────────
28. External Invoices
29. Client List
30. Items & Templates
31. Receipts
32. Student Groups
── Student Management ─────────────────
33. Student List
34. Family Groups
── User Management ────────────────────
35. Users
36. Activity Log
37. Approval Queue
── Settings ───────────────────────────
38. School Settings
39. Bank Settings
40. Term Settings
── User (Footer) ──────────────────────
41. Profile
42. Settings
43. Activity
```

---

## 🔐 Role-Based Access Control

| Role | Access Level |
|------|-------------|
| Admin | Full access — all pages and actions |
| Admin Accountant | Create / manage / approve invoices, manage discounts |
| Viewer | Read-only across all modules |
| Approver | Approval Queue only (restricted to approval actions) |

---

## 📦 Data Storage Keys (localStorage)

| Key | Data |
|-----|------|
| `createdInvoices` | All invoices across all categories |
| `tuitionByYearData` | Tuition fee structure by grade/year |
| `invoiceItems` | Tuition items |
| `ecaItems` / `tripItems` / `examItems` / `busItems` / `externalItems` | Category-specific items |
| `invoiceTemplates` | Invoice templates |
| `creditNotes` | Credit note records |
| `studentGroups` | Tuition discount groups |
| `studentGroups_${category}` | Category discount groups |
| `schoolSettings` | School info & bank details |
| `discountOptions` | Global discount config |
| `invoiceEmailLogs` | Email delivery history |
| `students` | Student records |
| `families` | Family records |
| `users` | System users |
| `activityLogs` | Audit trail |
| `clientList` | External client records |
| `scholarshipRecords` | Scholarship discount tracking |
| `staffChildRecords` | Staff child discount tracking |
| `earlyBirdRecords` | Early bird discount tracking |

---

*Last updated: 2026-03-04 (v1.2)*
