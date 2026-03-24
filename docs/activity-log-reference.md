# Activity Log Reference — Roles × Modules × Actions × Detail

> Auto-generated reference of every `logActivity()` call in the codebase, grouped by role access.
> Based on seed data: 1,600 students, 150+ invoices, King College International School.

---

## Roles & Permissions Overview

| Role ID | Display Name | Accessible Sections | Exclusions |
|---------|-------------|--------------------|-----------|
| `super_admin` | Admin | ทุก Section | ไม่มี |
| `admin_accountant` | Finance Admin | ทุก Section ยกเว้น User Management | + ยกเว้น Approval Queue |
| `viewer` | Viewer | General, Report, Analytics | ดูได้แค่ Dashboard + Discount Reports (read-only) |
| `approver` | Approver | General | เห็นแค่ Approval Queue |

---

## 1. super_admin (Admin) — Full Access

### Section: General

#### Module: Authentication
_Files: Login.tsx, OTPVerification.tsx_

| Action | Detail Example |
|--------|---------------|
| Send OTP | `OTP sent to oliver.smith1@email.com` |
| Login | `User oliver.smith1@email.com logged in successfully` |
| Password Reset | `Password reset link sent to oliver.smith1@email.com` |
| Verify OTP | `OTP verified for oliver.smith1@email.com` |
| Resend OTP | `OTP resent to oliver.smith1@email.com` |

#### Module: Approval Queue
_File: ApprovalQueue.tsx_

| Action | Detail Example |
|--------|---------------|
| Approved and sent invoice 2025-00047 | `Approval Status: wait → approved, Email: sent immediately` |
| Approved 5 invoices | `Invoices: 2025-00048, 2025-00049, 2025-00050, 2025-00051, 2025-00052` |
| Rejected invoice 2025-00053 | `Approval Status: wait → rejected; Reason: Missing supporting document` |

#### Module: Debt Reminders
_File: DebtReminderSettings.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Reminder | `Created reminder: "Term 2 Overdue Notice"` |
| Update Reminder | `Updated reminder: "Term 2 Overdue Notice"` |
| Create Template | `Created template: "Late Payment Warning", Subject: "Overdue Tuition Fee - Term 2"` |
| Update Template | `Updated template: "Late Payment Warning", Subject: "Overdue Tuition Fee - Term 2"` |
| Delete Template | `Deleted template: Late Payment Warning` |
| Duplicate Reminder | `Duplicated from: "Term 2 Overdue Notice" -> "Term 2 Overdue Notice (Copy)", Subject: "Overdue Tuition Fee - Term 2"` |
| Send Reminder Email | `Subject: "Overdue Tuition Fee - Term 2", Recipients: 45, Academic Year: 2025/2026, Term: Term 2` |
| Schedule Reminder | `Scheduled "Overdue Tuition Fee - Term 2" for 15 Jan 2026 at 09:00` |
| Cancel Schedule | `Cancelled schedule for "Term 2 Overdue Notice"` |
| Cancel Reminder | `Cancelled reminder "Term 2 Overdue Notice"` |

#### Module: Payment History
_Files: PaymentHistory.tsx, PaymentHistorySimple.tsx_

| Action | Detail Example |
|--------|---------------|
| Export Excel | `Exported 342 payment records, File: payment-history-2026-03-24.xlsx` |

#### Module: Term Settings
_File: TuitionTermSettings.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Academic Year | `Created academic year 2026/2027 with 3 terms (Term 1, Term 2, Term 3)` |
| Delete Academic Year | `Deleted academic year 2024/2025, 1 year(s) remaining` |
| Delete Term | `Deleted "Term 3" from academic year 2025/2026, 2 term(s) remaining` |
| Update Term Settings | `Saved changes for academic year 2025/2026, Terms: Term 1, Term 2, Term 3` |

#### Module: School Settings
_File: SchoolSettings.tsx_

| Action | Detail Example |
|--------|---------------|
| Update School Settings | `Updated school settings for King College International School` |

#### Module: Settings (Bank)
_File: BankSettings.tsx_

| Action | Detail Example |
|--------|---------------|
| Created bank account | `BANK \| Bank: Bangkok Bank, Account: 123-4-56789-0` |
| Updated bank account | `EDIT \| Bank: Kasikorn Bank, Account: 098-7-65432-1` |
| Deleted bank account | `Account ID: bank-001` |

#### Module: Email Jobs
_File: EmailJobsManagement.tsx_

| Action | Detail Example |
|--------|---------------|
| Save Email Job | `Saved 3 email jobs for invoice type` |

#### Module: Invoice Email
_File: InvoiceEmailManagement.tsx_

| Action | Detail Example |
|--------|---------------|
| Send Invoice Emails | `Sent 48 emails, 2 failed out of 50 total (invoice reminder)` |

#### Module: Email Delivery Report
_File: EmailDeliveryReport.tsx_

| Action | Detail Example |
|--------|---------------|
| Retry Email | `Retried failed email for record ID: email-rec-042` |
| Export Report | `Exported email delivery report with 156 records` |

#### Module: Email History
_File: EmailHistory.tsx_

| Action | Detail Example |
|--------|---------------|
| Download Report | `Downloaded report for "Tuition Invoice - Term 2 2025/2026" — 350 recipients` |

#### Module: Internal Email
_File: InternalEmailManagement.tsx_

| Action | Detail Example |
|--------|---------------|
| Add Contact | `Added contact: Somchai Srisawat (somchai.s@kingcollege.ac.th)` |
| Update Contact | `Updated contact: Somchai Srisawat (somchai.s@kingcollege.ac.th)` |
| Remove Contact | `Removed contact: Somchai Srisawat (somchai.s@kingcollege.ac.th)` |
| Download Template | `Downloaded internal email CSV template` |
| Import Emails | `Imported 25 emails from file` |

#### Module: Invoice Receipt Template
_File: InvoiceReceiptTemplate.tsx_

| Action | Detail Example |
|--------|---------------|
| Set Default Template | `Set "King College Official" as default invoice template` |
| Duplicate Template | `Duplicated invoice template "King College Official"` |
| Delete Template | `Deleted receipt template "Old Layout 2024"` |
| Update Template | `Updated invoice template "King College Official"` |
| Create Template | `Created new receipt template "Compact Receipt"` |

#### Module: Invoice Overview
_File: InvoiceOverview.tsx_

| Action | Detail Example |
|--------|---------------|
| Send Reminder | `Sent payment reminder to Oliver Smith (2025-00005)` |
| Download Invoice | `Downloaded invoice 2025-00005 for Oliver Smith` |

---

### Section: Tuition

#### Module: Tuition by Year
_File: TuitionByYear.tsx_

| Action | Detail Example |
|--------|---------------|
| Save Tuition Data | `Saved tuition data for academic year 2025/2026, Grand Total: 23,850,000` |

#### Module: Invoices
_Files: InvoiceManagement.tsx, InvoiceCreation.tsx_

| Action | Detail Example |
|--------|---------------|
| Updated invoice 2025-00012 | `Due Date: "2025-12-15" → "2026-01-15"; Notes: "-" → "Extended payment date"` |
| Saved and sent invoice 2025-00012 | `Due Date: "2025-12-15" → "2026-01-15"; Notes: "-" → "Extended payment date"` |
| Updated invoice 2025-00012 (items) | `Items updated (2 → 3)` |
| Deleted invoice 2025-00020 | `Invoice removed by user` |
| Bulk deleted 5 invoices | `Invoices: 2025-00021, 2025-00022, 2025-00023, 2025-00024, 2025-00025` |
| Created invoices | `Students: 12, Items per invoice: 2, Total per invoice: 140,000` |
| Sent invoice email 2025-00005 | `Recipient: oliver.smith1@email.com` |
| Imported 15 invoices from interface file | `Invoice numbers: 2025-00160, 2025-00161, 2025-00162... Auto-created 3 items` |
| Approved invoice 2025-00047 | `Approval Status: wait → approved, Email: sent immediately` |
| Rejected invoice 2025-00050 | `Approval Status: wait → rejected; Reason: Amount mismatch with tuition schedule` |
| Cancelled invoice 2025-00030 | `Status: approved → cancelled; Reason: Duplicate invoice for same student/term` |
| Recorded partial payment for 1 invoice(s): 2025-00008 | `Payment Method: Bank Transfer, Proofs: 1` |
| Marked invoice as paid for 1 invoice(s): 2025-00005 | `Payment Method: Credit Card, Proofs: 2, Credit Notes applied: 1, EDC Overpayment: ฿500` |

#### Module: Invoice Details
_Files: ViewDetailsPage.tsx, ViewModal.tsx_

| Action | Detail Example |
|--------|---------------|
| Add Line Item | `Added item "Lunch Programme" to invoice #2025-00005` |
| Save Changes | `Saved changes to invoice #2025-00005` |
| Download Document | `Downloaded document for invoice #2025-00005` |
| Print Document | `Printed document for invoice #2025-00005` |

#### Module: Items & Templates
_File: ItemManagement.tsx_

| Action | Detail Example |
|--------|---------------|
| Save | `Saved all changes for tuition items and templates` |
| Create (Item) | `Created item "Science Lab Fee" (SCI-001)` |
| Update (Item) | `Updated item "Tuition Fee" (TUI-001)` |
| Delete (Item) | `Deleted item "Old Registration Fee"` |
| Delete (Bulk) | `Bulk deleted 4 items` |
| Export (Download Template) | `Downloaded item import template (tuition)` |
| Export (Items) | `Exported 28 items for tuition` |
| Import | `Imported 12 items (2 skipped) for tuition` |
| Sync | `Synced tuition fees for 2025/2026: 3 created, 14 updated` |
| Create (Template) | `Created template "Full Tuition Package" with 5 items` |
| Update (Template) | `Updated template "Full Tuition Package" with 6 items` |
| Delete (Template) | `Deleted template "Deprecated Template"` |

#### Module: Receipts
_Files: ReceiptPageUpdated.tsx, ReceiptPage.tsx_

| Action | Detail Example |
|--------|---------------|
| Download Receipt PDF | `Receipt: R2025-00001, Student: Oliver Smith (KC20250001), Amount: ฿125,000, Invoice: 2025-00001` |
| Send Receipt Email | `Receipt: R2025-00001, Student: Oliver Smith (KC20250001), Amount: ฿125,000, Payment: Credit Card` |
| Bulk Download Receipt PDF | `Downloaded 8 receipts: R2025-00001, R2025-00002, R2025-00003, R2025-00004, R2025-00005...` |
| Bulk Send Receipt Email | `Sent emails for 8 receipts` |
| Download Interface File | `Exported 42 receipts to interface file, File: interface-receipts-24-03-2026.xlsx` |
| Export Excel | `Exported 42 receipts to Excel, File: receipts-export-24-03-2026.xlsx` |
| Download Receipt | `Downloaded receipt R2025-00003 for Charlotte Johnson` |
| Resend Receipt | `Resent receipt R2025-00003 to Charlotte Johnson's parent` |
| Bulk Resend Receipts | `Bulk resent 12 receipts: 10 succeeded, 2 failed` |

#### Module: Receipt Management
_File: ReceiptManagementFlow.tsx_

| Action | Detail Example |
|--------|---------------|
| Generate Receipt | `Generated 3 receipt(s) for Smith Family (SM20250001)` |
| Send Receipt | `Sent receipt R2025-00015 to Smith Family` |
| Download Receipt | `Downloaded receipt R2025-00015 for Smith Family` |
| Create Receipt Template | `Created receipt template "Official Receipt 2026"` |
| Update Receipt Template | `Updated receipt template "Official Receipt 2026"` |

#### Module: Student Groups
_File: TuitionDiscountGroups.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Group | `Created group "Staff Children" with 25 students` |
| Update Group | `Updated group "Staff Children" with 27 students` |
| Delete Group | `Deleted group "Old Scholarship 2024"` |
| Add Student | `Added student "James Williams" (KC20250003) to group` |

---

### Section: ECA (After School)

> Uses the same components as Tuition (ItemManagement, ReceiptPageUpdated, TuitionDiscountGroups) with `invoiceType = "eca"`.
> All actions are identical — only the invoice type context changes.

**Example differences:**
- `Saved all changes for eca items and templates`
- `Created item "Swimming Lessons" (ECA-001)`
- `Exported 15 items for eca`

#### Module: Course Quota
_File: CourseQuotaOverview.tsx_

| Action | Detail Example |
|--------|---------------|
| Update Course | `Updated course "Swimming Lessons", Capacity: 30, Fee: 12000` |
| Export Report | `Exported student report for course "Swimming Lessons", 28 students` |
| Import Courses | `Imported 8 courses from CSV file "courses-term2.xlsx"` |
| Download Template | `Downloaded course import Excel template` |

#### Module: Course Student Report
_File: CourseStudentReport.tsx_

| Action | Detail Example |
|--------|---------------|
| Export Report | `Exported student report for Swimming Lessons (28 records)` |

#### Module: External Parents
_File: ExternalParentManagement.tsx, ExternalParentManagementUpdated.tsx_

| Action | Detail Example |
|--------|---------------|
| Update Status | `Updated Sophia Brown's application status to approved` |
| Send Email | `Sent email to Somchai Srisawat (somchai.s@external.com)` |
| Download Application | `Downloaded application for Sophia Brown (Somchai Srisawat)` |
| Resend Reminder | `Resent reminder email to Somchai Srisawat (somchai.s@external.com)` |

#### Module: External Parents Approval
_File: ExternalParentsApproval.tsx_

| Action | Detail Example |
|--------|---------------|
| Update Application Status | `Application for student "Sophia Brown" (parent: Somchai Srisawat) has been approved` |

---

### Section: Trip Activity / Exam / School Bus

> Uses the same shared components as Tuition and ECA. Invoice types: `trip`, `exam`, `bus`.
> All actions are identical to Tuition section — only the invoice type context changes.

**Example differences:**
- `Saved all changes for trip items and templates`
- `Created item "Field Trip Fee" (TRIP-001)`
- `Exported 10 items for exam`
- `Exported 8 items for bus`

---

### Section: External Invoice

#### Module: External Invoices
_File: ExternalInvoiceCreation.tsx_

| Action | Detail Example |
|--------|---------------|
| Created external invoice 2025-00151 | `Client: ABC Consulting Co., Ltd., Amount: 85,000` |
| Updated external invoice 2025-00151 | `Client: ABC Consulting Co., Ltd., Amount: 92,000` |

#### Module: Client List
_File: ClientList.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Client | `Created client "XYZ Corporation" (ID: CLT-001)` |
| Update Client | `Updated client "XYZ Corporation" (ID: CLT-001)` |
| Delete Client | `Deleted client "Old Vendor Ltd." (ID: CLT-005)` |
| Export Clients | `Exported 18 client(s) to Excel` |
| Import Clients | `Imported 10 client(s), 2 duplicate(s) skipped` |
| Download Template | `Downloaded client import template` |

---

### Section: Discount

#### Module: Discount Management
_File: DiscountManagement.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Group | `Created discount group "Early Bird 2026" (GRP001) with 150 students` |
| Update Group | `Updated discount group "Early Bird 2026" with 155 students` |
| Delete Group | `Deleted discount group "Early Bird 2025" (GRP003)` |
| Create Discount Code | `Created discount code "EARLYBIRD2026" (percentage: 10)` |
| Update Discount Code | `Updated discount code "EARLYBIRD2026" (percentage: 12)` |
| Toggle Discount Status | `Toggled discount code "EARLYBIRD2025" to inactive` |
| Add Student | `Added student "Sophia Brown" (KC20250004) to group via dropdown` |
| Import Students (CSV) | `Imported 45 students via CSV to group "Staff Children"` |
| Import Students (File) | `Imported 30 students from file` |
| Download Template | `Downloaded student ID template file` |

#### Module: Discount Options
_File: DiscountOptions.tsx_

| Action | Detail Example |
|--------|---------------|
| Save Discount Options | `Saved discount options for academic year 2025/2026` |

---

### Section: User Management

#### Module: User Management
_File: UserManagement.tsx_

| Action | Detail Example |
|--------|---------------|
| Created user | `Username: jane.doe, Role: admin_accountant` |
| Updated user | `Username: jane.doe, Role: super_admin` |
| Deleted user | `Username: old.staff` |
| Updated user permissions | `Username: jane.doe, Permissions count: 8` |
| Toggled user status | `Username: old.staff -> inactive` |

---

### Section: Student Management

#### Module: Student Management
_File: StudentList.tsx_

| Action | Detail Example |
|--------|---------------|
| Created student | `Oliver Smith (ID: KC20250001)` |
| Updated student | `Oliver Smith (ID: KC20250001)` |
| Deleted student | `Charlotte Johnson (ID: KC20250002)` |
| Promoted students | `Successfully promoted 95 students to Year 8` |
| Graduated students | `Successfully marked 42 students as graduated for Year 13` |

#### Module: Family Groups
_File: FamilyGroups.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Family | `Created family "Williams Family" (SM20250003)` |
| Update Family | `Updated family "Williams Family" (SM20250003)` |
| Delete Family | `Deleted family "Old Test Family" (SM20250999)` |
| Add Student | `Added student "James Williams" to family "Williams Family" (SM20250003)` |
| Remove Student | `Removed student "James Williams" from family "Williams Family" (SM20250003)` |
| Export | `Exported 850 families to file family_groups_2026-03-24.xlsx` |

#### Module: Credit Notes
_Files: CreditNoteManagement.tsx, ReceiptPageUpdated.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Credit Note | `Created CN CN-2026-0001 for Oliver Smith — amount: 15,000` |
| Save Credit Note | `Saved 24 credit note(s) to storage` |
| Download Credit Note | `Downloaded credit note CN-2026-0001 for Oliver Smith` |
| Send Credit Note | `Sent credit note CN-2026-0001 to Somchai Srisawat` |
| Import Credit Notes | `Imported 8 credit note(s) from "credit-notes-import.xlsx", 1 duplicates skipped, CN numbers: CN-2026-0025, CN-2026-0026, CN-2026-0027, CN-2026-0028, CN-2026-0029...` |
| Create Receipt | `Created a new receipt from credit note` |
| Cancel Credit Note | `CN: CN-2026-0003, Student: James Williams (KC20250003), Amount: ฿10,000, Status: issued → cancelled` |
| Download Credit Note PDF | `CN: CN-2026-0001, Student: Oliver Smith (KC20250001), Amount: ฿15,000, Status: applied` |
| Bulk Download Credit Note PDF | `Downloaded 5 credit notes: CN-2026-0001, CN-2026-0002, CN-2026-0003, CN-2026-0004, CN-2026-0005` |
| Bulk Cancel Credit Notes | `Cancelled 3 credit notes: CN-2026-0010, CN-2026-0011, CN-2026-0012` |
| Export Excel | `Exported 24 credit notes to Excel, File: credit-notes-export-24-03-2026.xlsx` |

---

### Section: Event Management

#### Module: Event Import
_File: EventImport.tsx_

| Action | Detail Example |
|--------|---------------|
| Import Events | `Imported sports-day-2026.xlsx for term Term 2 (123 success, 2 errors)` |
| Download Template | `Downloaded event import template` |

#### Module: Event Payment Deadline
_File: EventPaymentDeadline.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Deadline | `Created deadline for "Sports Day 2026" due 15 Feb 2026` |
| Update Deadline | `Updated deadline for "Sports Day 2026" to 20 Feb 2026` |
| Delete Deadline | `Deleted deadline for "Sports Day 2026"` |
| Update Status (Toggle) | `Set "Sports Day 2026" to Inactive` |
| Update Status (Send Reminder) | `Sent Payment Reminder to 85 recipients for "Sports Day 2026"` |

#### Module: Event Registration Reports
_File: EventRegistrationReports.tsx_

| Action | Detail Example |
|--------|---------------|
| Export Report | `Exported report as XLSX (234 records)` |

---

### Section: Summer Activities

#### Module: Summer Import
_File: SummerActivitiesImport.tsx_

| Action | Detail Example |
|--------|---------------|
| Import Activities | `Imported summer-camp-2026.xlsx for season Summer 2026 — 85 success, 3 errors` |
| Download Template | `Downloaded template: Activity Schedule` |

#### Module: Summer Registration
_File: SummerRegistrationControl.tsx_

| Action | Detail Example |
|--------|---------------|
| Update Status (Period) | `Set period "Summer Camp Week 1" to Active` |
| Update Status (Activity) | `Set activity "Art Workshop" to Closed` |
| Create Period | `Created period "Summer Camp Week 1" (01 Apr 2026 - 05 Apr 2026)` |
| Update Period | `Updated period "Summer Camp Week 1" (01 Apr 2026 - 07 Apr 2026)` |
| Delete Period | `Deleted period "Summer Camp Week 1"` |
| Update Pricing | `Updated pricing for "Summer Camp Week 1": base ฿8,500, early bird -15%, sibling -10%` |

#### Module: Summer Payment Reports
_File: SummerPaymentReports.tsx_

| Action | Detail Example |
|--------|---------------|
| Export Report | `Exported report as XLSX (156 records)` |

#### Module: Summer Discount Groups
_File: SummerDiscountGroups.tsx_

| Action | Detail Example |
|--------|---------------|
| Create Group | `Created group "Summer Early Bird" with 40 students` |
| Update Group | `Updated group "Summer Early Bird"` |
| Delete Group | `Deleted group "Summer Early Bird"` |
| Bulk Add Students | `Added 15 students from CSV file "summer-students.xlsx"` |
| Add Student | `Added student Mia Garcia (KC20250006) to group` |

---

### Section: Report & Analytics

#### Module: Analytics
_File: AnalyticsDashboard.tsx_

| Action | Detail Example |
|--------|---------------|
| Export Report | `Exported analytics report for tab "revenue" with filter: 2025/2026 / Term 2` |

---

## 2. admin_accountant (Finance Admin)

**Identical to Admin above, EXCEPT:**

| Excluded | Reason |
|----------|--------|
| Approval Queue (3 actions) | `approval-queue` in `excludedMenuItems` |
| User Management section (5 actions + Activity Log) | `userManagement` not in `sections` |

All other modules and actions are fully accessible.

---

## 3. viewer (Viewer) — Read-only

**Accessible pages:** Dashboard, Discount Reports only.

All action buttons are hidden (`canPerformActions()` returns `false`).

**Only these logs are generated:**

| Module | Action | Detail Example |
|--------|--------|---------------|
| Authentication | Login | `User viewer@kingcollege.ac.th logged in successfully` |
| Authentication | Send OTP | `OTP sent to viewer@kingcollege.ac.th` |
| Authentication | Verify OTP | `OTP verified for viewer@kingcollege.ac.th` |
| User Profile | Update Profile | `Updated profile: Viewer User (viewer@kingcollege.ac.th)` |
| User Profile | Change Password | `Password changed successfully` |
| User Settings | Save Settings | `Saved settings — language: th, theme: light` |

---

## 4. approver (Approver) — Approval Queue Only

**Accessible page:** Approval Queue only.

| Module | Action | Detail Example |
|--------|--------|---------------|
| Approval Queue | Approved and sent invoice 2025-00047 | `Approval Status: wait → approved, Email: sent immediately` |
| Approval Queue | Approved 5 invoices | `Invoices: 2025-00048, 2025-00049, 2025-00050, 2025-00051, 2025-00052` |
| Approval Queue | Rejected invoice 2025-00053 | `Approval Status: wait → rejected; Reason: Missing supporting document` |
| Authentication | Login | `User approver@kingcollege.ac.th logged in successfully` |
| Authentication | Send OTP | `OTP sent to approver@kingcollege.ac.th` |
| Authentication | Verify OTP | `OTP verified for approver@kingcollege.ac.th` |
| User Profile | Update Profile | `Updated profile: Approver User (approver@kingcollege.ac.th)` |
| User Profile | Change Password | `Password changed successfully` |
| User Settings | Save Settings | `Saved settings — language: en, theme: light` |

---

## Shared Modules (All Roles)

These modules are accessible regardless of role:

#### Module: User Profile
_File: UserProfile.tsx_

| Action | Detail Example |
|--------|---------------|
| Update Profile | `Updated profile: Admin User (admin@kingcollege.ac.th)` |
| Change Password | `Password changed successfully` |
| Upload Avatar | `Uploaded avatar: profile-photo.jpg` |

#### Module: User Settings
_File: UserSettings.tsx_

| Action | Detail Example |
|--------|---------------|
| Save Settings | `Saved settings — language: th, theme: light` |

---

## Statistics

| Metric | Count |
|--------|-------|
| Total `logActivity()` calls | 187+ |
| Unique modules | 35+ |
| Files with `logActivity` | 42 |
| Unique actions | 120+ |

### Top Modules by Action Count
1. **Invoices** (InvoiceManagement + InvoiceCreation) — 13 actions
2. **Credit Notes** (CreditNoteManagement + ReceiptPageUpdated) — 11 actions
3. **Debt Reminders** (DebtReminderSettings) — 10 actions
4. **Items & Templates** (ItemManagement) — 12 actions
5. **Receipts** (ReceiptPageUpdated + ReceiptPage) — 9 actions
6. **Discount Management** (DiscountManagement) — 10 actions
