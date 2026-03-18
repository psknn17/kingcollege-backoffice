/**
 * Discount & Fee Rules Configuration
 * เงื่อนไขส่วนลดและค่าธรรมเนียมทั้งหมด
 *
 * อัพเดทล่าสุด: 2026-01-07
 */

// ===========================================
// 1. Sibling Discount (ส่วนลดพี่น้อง)
// ===========================================
export const SIBLING_DISCOUNT_RULES = {
  child1: 0,    // คนที่ 1: 0%
  child2: 0,    // คนที่ 2: 0%
  child3: 5,    // คนที่ 3: 5%
  child4: 10,   // คนที่ 4: 10%
  child5Plus: 20, // คนที่ 5+: 20%
}

// ===========================================
// 2. Fee Waiver (ยกเว้นค่าลงทะเบียน)
// ===========================================
export const FEE_WAIVER_RULES = {
  totalAmount: 225000,       // ยอดรวม 225,000 บาท
  creditPerTerm: 75000,      // คืนเป็นงวด 75,000 บาท × 3 เทอม
  termsToCredit: 3,          // จำนวนเทอมที่คืน

  // เด็กคนแรก
  firstChild: {
    waitTerms: 3,            // รอ 3 เทอม
    startsFromTerm: 4,       // เทอมถัดไปจาก 3 เทอม ถึงจะได้รับ
  },

  // เด็กคนที่ 2+
  secondChildPlus: {
    immediate: true,         // ได้รับทันที
  },

  // เงื่อนไข
  conditions: {
    minimumGradeLevel: 3,    // ต้อง Year 3 ขึ้นไป
    noWithdrawnSiblings: true, // ไม่มีพี่น้องลาออก
    // ถ้าคนแรกลาออก คนถัดไปที่เรียนอยู่เทอมต่อไปจะไม่ได้ส่วนลด
  },
}

// ===========================================
// 3. Group Discount (ส่วนลดกลุ่ม)
// ===========================================
export const GROUP_DISCOUNT_RULES = [
  {
    name: "Year 7 Excellence",
    gradeLevel: "Year 7",
    discountType: "percentage",
    discountValue: 15,       // 15%
  },
  {
    name: "Secondary School",
    gradeLevel: "Year 8-10",
    discountType: "percentage",
    discountValue: 10,       // 10%
  },
  {
    name: "Senior School Merit",
    gradeLevel: "Year 11-12",
    discountType: "fixed",
    discountValue: 25000,    // 25,000 บาท (คงที่)
  },
  {
    name: "Primary School Support",
    gradeLevel: "Year 3-5",
    discountType: "percentage",
    discountValue: 5,        // 5%
  },
]

// ===========================================
// 4. Discount Codes
// ===========================================
export const DISCOUNT_CODES = [
  {
    code: "EARLY2024",
    type: "Early Bird",
    discountPercentage: 15,
    applicableTo: ["Tuition", "After School", "Events"],
  },
  {
    code: "SIBLING10",
    type: "Sibling",
    discountPercentage: 10,
    applicableTo: ["Tuition", "After School"],
  },
  {
    code: "TERMLY15",
    type: "Termly",
    discountPercentage: 15,
    applicableTo: ["Tuition"],
  },
]

// ===========================================
// 5. Other Discounts (ส่วนลดอื่นๆ)
// ===========================================
export const OTHER_DISCOUNTS = {
  scholarship: 50,    // Scholarship: 50%
  staffChild: 50,     // Staff Child: 50%
  earlyBird: 5,       // Early Bird: 5%
}

// ===========================================
// 7. Registration Fees (ค่าธรรมเนียมแรกเข้า) - เด็กใหม่เท่านั้น
// ===========================================
export const REGISTRATION_FEES = {
  applicationFee: {
    amount: 5000,           // 5,000 บาท
    refundable: false,      // คืนไม่ได้
  },
  registrationFee: {
    amount: 225000,         // 225,000 บาท
    refundable: false,      // คืนไม่ได้
  },
  securityDeposit: {
    amount: 200000,         // 200,000 บาท
    refundable: true,       // คืนได้
  },
}

// ===========================================
// 8. ID Charges (ค่าธรรมเนียม ID) - ทุกคน
// ===========================================
export const ID_CHARGES = {
  percentage: 1.3,          // 1.3% ของยอดรวม
  applicableTo: "allStudents",
}

// ===========================================
// Student Types (ประเภทนักเรียน)
// ===========================================
export const STUDENT_TYPES = {
  newStudent: {
    // เด็กใหม่ - เพิ่มผ่านปุ่ม "Add New Student"
    fees: [
      "Application Fee",
      "Registration Fee",
      "Security Deposit",
      "ID Charges (3%)",
    ],
    eligibleWaivers: [
      "Security Deposit Waiver (ถ้ามีสิทธิ์ Fee Waiver)",
    ],
  },
  existingStudent: {
    // เด็กเก่า - เลือกจากรายชื่อนักเรียน
    fees: [
      "ID Charges (3%)",  // เก็บทุกคน
    ],
    eligibleWaivers: [],
  },
}

// ===========================================
// Invoice Item Order (ลำดับรายการใน Invoice)
// ===========================================
export const INVOICE_ITEM_ORDER = [
  "1. รายการปกติ (Tuition, Bus, etc.) - สีดำ",
  "2. ค่าธรรมเนียมเด็กใหม่ (Application, Registration, Security Deposit) - สีส้ม",
  "3. Security Deposit Waiver (ถ้ามีสิทธิ์) - สีม่วง",
  "4. ส่วนลดทั้งหมด (Sibling, Registration Fee Waiver, Group, Scholarship, Staff, Early Bird) - สีเขียว",
  "5. ID Charges (3%) - ทุกคน - สีดำ",
  "6. TOTAL",
]

// ===========================================
// Color Coding (รหัสสี)
// ===========================================
export const INVOICE_COLORS = {
  regularItems: "text-black",           // รายการปกติ
  newStudentFees: "text-orange-600",    // ค่าธรรมเนียมเด็กใหม่
  discounts: "text-green-700",          // ส่วนลด
  idCharges: "text-orange-600",         // ID Charges
}
