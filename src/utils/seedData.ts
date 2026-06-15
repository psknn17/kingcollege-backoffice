// Mock data seeder — realistic, interconnected data across ALL menus
// Only seeds keys that don't already exist (seedIfEmpty)
import { seedMockData } from "@/services/analyticsService"

const CURRENT_YEAR = "2025/2026"
const PREV_YEAR = "2024/2025"

// ── Helpers ──────────────────────────────────────────────────
function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString()
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pad(n: number, len = 4): string { return String(n).padStart(len, "0") }
function seedIfEmpty(key: string, data: any) {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data))
}

// ── Name pools ───────────────────────────────────────────────
const FN = ["Oliver","Charlotte","James","Sophia","William","Emma","Benjamin","Mia","Lucas","Amelia","Henry","Harper","Alexander","Evelyn","Sebastian","Abigail","Jack","Emily","Daniel","Ella","Matthew","Scarlett","Leo","Grace","Owen","Chloe","Ethan","Victoria","Noah","Lily","Liam","Ava","Mason","Isabella","Logan","Zoe","Aiden","Penelope","Elijah","Layla","Jackson","Riley","Carter","Nora","Luke","Hannah","Gabriel","Stella","Jayden","Aurora","Theodore","Savannah","Caleb","Audrey","Ryan","Brooklyn","Adrian","Bella","Nathan","Claire","Isaac","Skylar","Thomas","Lucy","Aaron","Paisley","Wyatt","Anna","Hunter","Caroline","Dylan","Genesis","Grayson","Maya","Landon","Willow","Joshua","Ellie","Christopher","Violet","Andrew","Hazel","Lincoln","Aria","Mateo","Ruby","Oscar","Madeline","Dominic","Kennedy","Jaxon","Samantha","Max","Allison","Nicholas","Sarah","Cooper","Gabriella","Ian","Alice"]
const LN = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson","Taylor","Thomas","Moore","Martin","Lee","Clark","Lewis","Robinson","Walker","Hall","Allen","Young","King","Wright","Lopez","Hill","Green","Adams","Baker","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Morris","Reed","Cook","Morgan","Bell","Murphy","Bailey","Rivera","Cooper","Richardson","Cox","Howard","Ward","Torres","Peterson","Gray","James","Watson","Brooks","Kelly","Sanders","Price","Bennett","Wood","Barnes","Ross","Henderson","Coleman","Jenkins","Perry","Powell","Long","Patterson","Hughes","Flores","Washington","Butler","Simmons","Foster","Gonzales","Bryant","Russell","Griffin","Diaz","Hayes"]
const TH_FN = ["Somchai","Nattapong","Piyawat","Thanaporn","Siriporn","Kannika","Pattaraporn","Wichian","Sumalee","Pornthip","Worawut","Jintana","Kittisak","Suphatra","Phanuwat","Namfon","Thawatchai","Rungnapa","Apirak","Nantiya","Chaiwat","Supaporn","Prasit","Manee","Sompong","Ratana","Wattana","Ladda","Sakchai","Pimchan"]
const TH_LN = ["Srisawat","Wongsawat","Pongpanich","Chaisuwan","Rattanaporn","Sukhumvit","Thongchai","Prasert","Anantachai","Suthiwan","Kingkaew","Siriwan","Techapaiboon","Poonsawat","Charoenrat","Limpaiboon","Suwannarat","Thamrongvit","Boonyarit","Visarut"]

const GRADES = ["pre-nursery","nursery","reception","year1","year2","year3","year4","year5","year6","year7","year8","year9","year10","year11","year12","year13"]
const GRADE_LABELS: Record<string,string> = {"pre-nursery":"Pre-Nursery","nursery":"Nursery","reception":"Reception","year1":"Year 1","year2":"Year 2","year3":"Year 3","year4":"Year 4","year5":"Year 5","year6":"Year 6","year7":"Year 7","year8":"Year 8","year9":"Year 9","year10":"Year 10","year11":"Year 11","year12":"Year 12","year13":"Year 13"}

const TUITION: Record<string,number[]> = {
  "pre-nursery":[95000,90000,85000],"nursery":[105000,100000,95000],"reception":[115000,110000,105000],
  "year1":[125000,120000,115000],"year2":[125000,120000,115000],"year3":[130000,125000,120000],
  "year4":[130000,125000,120000],"year5":[135000,130000,125000],"year6":[135000,130000,125000],
  "year7":[145000,140000,135000],"year8":[145000,140000,135000],"year9":[150000,145000,140000],
  "year10":[155000,150000,145000],"year11":[155000,150000,145000],"year12":[160000,155000,150000],
  "year13":[160000,155000,150000]
}

const PAY_METHODS = ["Credit Card","Thai QR","Bank Transfer","Cashier's cheque","EDC"]
const PAY_CHANNELS: Record<string,string> = {"Credit Card":"credit_card","PromptPay":"qr_payment","Bank Transfer":"counter_bank","Bank Counter":"counter_bank","WeChat Pay":"wechat_pay"}

// ── 1. Families & Students (1600 students) ───────────────────
function generateFamiliesAndStudents() {
  const families: any[] = []
  const students: any[] = []
  let studentSeq = 1
  let familySeq = 1

  const gradeSlots: string[] = []
  for (const g of GRADES) { for (let i = 0; i < 100; i++) gradeSlots.push(g) }
  for (let i = gradeSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gradeSlots[i], gradeSlots[j]] = [gradeSlots[j], gradeSlots[i]]
  }

  let slotIdx = 0
  while (studentSeq <= 1600 && slotIdx < gradeSlots.length) {
    const r = Math.random()
    const numChildren = Math.min(r < 0.25 ? 1 : r < 0.85 ? 2 : 3, 1600 - studentSeq + 1, gradeSlots.length - slotIdx)

    const isThai = familySeq % 10 >= 7
    const parentFirst = isThai ? TH_FN[familySeq % TH_FN.length] : FN[(familySeq * 2) % FN.length]
    const parentLast = isThai ? TH_LN[familySeq % TH_LN.length] : LN[familySeq % LN.length]

    const famId = `family-${pad(familySeq)}`
    const famCode = `SM2025${pad(familySeq)}`
    const famEmail = `${parentFirst.toLowerCase()}.${parentLast.toLowerCase()}${familySeq}@email.com`
    const famPhone = `08${pad(Math.floor(Math.random() * 100000000), 8)}`
    const childIds: string[] = []

    for (let ci = 0; ci < numChildren; ci++) {
      if (slotIdx >= gradeSlots.length) break
      const grade = gradeSlots[slotIdx++]
      const sId = `student-${pad(studentSeq)}`
      const sCode = `KC2025${pad(studentSeq)}`
      const childFirst = isThai ? TH_FN[(studentSeq + ci * 7) % TH_FN.length] : FN[(studentSeq + ci * 7) % FN.length]
      const gradeIdx = GRADES.indexOf(grade)
      const birthYear = 2022 - gradeIdx - 3
      const dob = `${birthYear}-${pad(1 + Math.floor(Math.random() * 12), 2)}-${pad(1 + Math.floor(Math.random() * 28), 2)}T00:00:00.000Z`

      // Room assignment: A/B/C rotating — ~25 students per room per grade
      const room = ["A", "B", "C"][studentSeq % 3]
      students.push({
        id: sId, studentId: sCode, firstName: childFirst, lastName: parentLast,
        nickname: childFirst.substring(0, 3),
        dateOfBirth: dob, gender: studentSeq % 2 === 0 ? "female" : "male",
        gradeLevel: grade, room, academicYear: CURRENT_YEAR,
        enrollmentTerm: pick(["term1","term2","term3"]),
        status: studentSeq <= 1550 ? "active" : pick(["active","on_leave","withdrawn"] as const),
        familyId: famId, familyCode: famCode, childOrder: ci + 1,
        parents: [{ id: `parent-${pad(familySeq)}`, name: `${parentFirst} ${parentLast}`, relationship: ci === 0 ? "father" : "mother", phone: famPhone, email: famEmail, isPrimary: true }],
        enrollmentDate: randomDate(new Date("2021-04-01"), new Date("2025-08-01")),
        notes: "", createdBy: "System", createdAt: randomDate(new Date("2023-01-01"), new Date("2025-06-01")),
        updatedBy: "System", updatedAt: new Date().toISOString(),
      })
      childIds.push(sId)
      studentSeq++
    }

    families.push({
      id: famId, familyCode: famCode, familyName: `${parentLast} Family`,
      studentIds: childIds, primaryContactId: `parent-${pad(familySeq)}`,
      address: `${100 + familySeq} ${pick(["Sukhumvit","Silom","Sathorn","Ratchada","Rama 9","Thonglor","Ekkamai","Ari","Ladprao","Phahonyothin"])} Rd, Bangkok ${10110 + (familySeq % 50) * 10}`,
      email: famEmail, phone: famPhone, invoiceEmails: [famEmail],
      createdAt: randomDate(new Date("2022-01-01"), new Date("2025-06-01")),
      portalStatus: pick(["not_invited","invited","registered"] as const),
    })
    familySeq++
  }
  return { families, students }
}

// ── 2. Academic Years ────────────────────────────────────────
function generateAcademicYears() {
  const d = (iso: string) => ({ __type: "Date", value: iso })
  return [
    { id: CURRENT_YEAR, name: CURRENT_YEAR, terms: [
      { id: "1", name: "Term 1", startDate: d("2025-08-15T00:00:00.000Z"), endDate: d("2025-12-20T00:00:00.000Z"), paymentDeadline: d("2025-08-01T00:00:00.000Z") },
      { id: "2", name: "Term 2", startDate: d("2026-01-08T00:00:00.000Z"), endDate: d("2026-03-20T00:00:00.000Z"), paymentDeadline: d("2025-12-15T00:00:00.000Z") },
      { id: "3", name: "Term 3", startDate: d("2026-04-01T00:00:00.000Z"), endDate: d("2026-06-15T00:00:00.000Z"), paymentDeadline: d("2026-03-15T00:00:00.000Z") },
    ]},
    { id: PREV_YEAR, name: PREV_YEAR, terms: [
      { id: "1", name: "Term 1", startDate: d("2024-08-15T00:00:00.000Z"), endDate: d("2024-12-20T00:00:00.000Z"), paymentDeadline: d("2024-08-01T00:00:00.000Z") },
      { id: "2", name: "Term 2", startDate: d("2025-01-08T00:00:00.000Z"), endDate: d("2025-03-20T00:00:00.000Z"), paymentDeadline: d("2024-12-15T00:00:00.000Z") },
      { id: "3", name: "Term 3", startDate: d("2025-04-01T00:00:00.000Z"), endDate: d("2025-06-15T00:00:00.000Z"), paymentDeadline: d("2025-03-15T00:00:00.000Z") },
    ]},
  ]
}

// ── 3. Tuition by Year ───────────────────────────────────────
function generateTuitionData() {
  const data: Record<string, any[]> = {}
  for (const year of [PREV_YEAR, CURRENT_YEAR]) {
    data[year] = GRADES.map((g, idx) => ({
      id: `tuition-${g}-${year}`, gradeLevel: g, gradeLevelOrder: idx,
      term1Amount: TUITION[g][0], term2Amount: TUITION[g][1], term3Amount: TUITION[g][2],
    }))
  }
  return data
}

// ── 4. Invoice Items (all categories) ────────────────────────
const INVOICE_ITEMS = [
  { id: "item-001", name: "Tuition Fee", description: "Tuition fee for the term", amount: 0, category: "tuition", isActive: true, applicableGrades: [], itemCode: "TUI-001", nominalCode: "4100", documentType: "SI" },
  { id: "item-002", name: "Registration Fee", description: "One-time registration fee", amount: 50000, category: "tuition", isActive: true, applicableGrades: [], itemCode: "REG-001", nominalCode: "4200", documentType: "SI" },
  { id: "item-003", name: "Security Deposit", description: "Refundable security deposit", amount: 30000, category: "tuition", isActive: true, applicableGrades: [], itemCode: "SEC-001", nominalCode: "4300", documentType: "SI" },
  { id: "item-004", name: "Lunch Programme", description: "School lunch programme per term", amount: 15000, category: "tuition", isActive: true, applicableGrades: [], itemCode: "LUN-001", nominalCode: "4400", documentType: "SI" },
  { id: "item-005", name: "Books & Materials", description: "Textbooks and learning materials", amount: 8500, category: "tuition", isActive: true, applicableGrades: [], itemCode: "BOK-001", nominalCode: "4500", documentType: "SI" },
  { id: "item-006", name: "IT & Technology Fee", description: "Technology access and devices", amount: 5500, category: "tuition", isActive: true, applicableGrades: [], itemCode: "ICT-001", nominalCode: "4600", documentType: "SI" },
]
const AFTERSCHOOL_ITEMS = [
  { id: "as-001", name: "Swimming Class", description: "Weekly swimming lessons", amount: 8000, category: "afterschool", isActive: true, applicableGrades: [], itemCode: "AS-001", nominalCode: "5100", documentType: "SI" },
  { id: "as-002", name: "Piano Lessons", description: "Weekly piano instruction", amount: 12000, category: "afterschool", isActive: true, applicableGrades: [], itemCode: "AS-002", nominalCode: "5100", documentType: "SI" },
  { id: "as-003", name: "Football Academy", description: "After-school football training", amount: 6500, category: "afterschool", isActive: true, applicableGrades: [], itemCode: "AS-003", nominalCode: "5100", documentType: "SI" },
  { id: "as-004", name: "Art & Craft Studio", description: "Creative arts programme", amount: 5000, category: "afterschool", isActive: true, applicableGrades: [], itemCode: "AS-004", nominalCode: "5100", documentType: "SI" },
  { id: "as-005", name: "Robotics & Coding", description: "STEM robotics programme", amount: 10000, category: "afterschool", isActive: true, applicableGrades: [], itemCode: "AS-005", nominalCode: "5100", documentType: "SI" },
]
const ECA_ITEMS = [
  { id: "eca-001", name: "Basketball Team", description: "Competitive basketball squad", amount: 7000, category: "eca", isActive: true, applicableGrades: [], itemCode: "ECA-001", nominalCode: "5200", documentType: "SI" },
  { id: "eca-002", name: "Drama Club", description: "Theatre and performance arts", amount: 5000, category: "eca", isActive: true, applicableGrades: [], itemCode: "ECA-002", nominalCode: "5200", documentType: "SI" },
  { id: "eca-003", name: "Debate Society", description: "Public speaking and debate", amount: 4000, category: "eca", isActive: true, applicableGrades: [], itemCode: "ECA-003", nominalCode: "5200", documentType: "SI" },
]
const EVENT_ITEMS = [
  { id: "evt-001", name: "Sports Day", description: "Annual sports day event", amount: 2000, category: "event", isActive: true, applicableGrades: [], itemCode: "EVT-001", nominalCode: "5300", documentType: "SI" },
  { id: "evt-002", name: "Science Fair", description: "Annual science fair", amount: 1500, category: "event", isActive: true, applicableGrades: [], itemCode: "EVT-002", nominalCode: "5300", documentType: "SI" },
  { id: "evt-003", name: "School Concert", description: "End of year concert", amount: 3000, category: "event", isActive: true, applicableGrades: [], itemCode: "EVT-003", nominalCode: "5300", documentType: "SI" },
]
const TRIP_ITEMS = [
  { id: "trip-001", name: "Chiang Mai Educational Trip", description: "3-day educational trip", amount: 15000, category: "trip", isActive: true, applicableGrades: [], itemCode: "TRP-001", nominalCode: "5400", documentType: "SI" },
  { id: "trip-002", name: "Museum Day Trip", description: "Day trip to National Museum", amount: 1500, category: "trip", isActive: true, applicableGrades: [], itemCode: "TRP-002", nominalCode: "5400", documentType: "SI" },
]
const EXAM_ITEMS = [
  { id: "exam-001", name: "IGCSE Exam Fee", description: "Cambridge IGCSE examination", amount: 25000, category: "exam", isActive: true, applicableGrades: ["year10","year11"], itemCode: "EXM-001", nominalCode: "5500", documentType: "SI" },
  { id: "exam-002", name: "A-Level Exam Fee", description: "Cambridge A-Level examination", amount: 30000, category: "exam", isActive: true, applicableGrades: ["year12","year13"], itemCode: "EXM-002", nominalCode: "5500", documentType: "SI" },
]
const SUMMER_ITEMS = [
  { id: "sum-001", name: "Summer Camp 2 Weeks", description: "Two-week summer camp programme", amount: 18000, category: "summer", isActive: true, applicableGrades: [], itemCode: "SUM-001", nominalCode: "5600", documentType: "SI" },
  { id: "sum-002", name: "Summer English Intensive", description: "Intensive English course", amount: 12000, category: "summer", isActive: true, applicableGrades: [], itemCode: "SUM-002", nominalCode: "5600", documentType: "SI" },
]
const BUS_ITEMS = [
  { id: "bus-001", name: "School Bus - Zone A", description: "Bus service Zone A (Sukhumvit)", amount: 20000, category: "bus", isActive: true, applicableGrades: [], itemCode: "BUS-001", nominalCode: "4800", documentType: "SI" },
  { id: "bus-002", name: "School Bus - Zone B", description: "Bus service Zone B (Silom/Sathorn)", amount: 25000, category: "bus", isActive: true, applicableGrades: [], itemCode: "BUS-002", nominalCode: "4800", documentType: "SI" },
]
const EXTERNAL_ITEMS = [
  { id: "ext-001", name: "Facility Rental", description: "School facility rental per day", amount: 50000, category: "external", isActive: true, applicableGrades: [], itemCode: "EXT-001", nominalCode: "6100", documentType: "SI" },
  { id: "ext-002", name: "Catering Service", description: "Event catering service", amount: 30000, category: "external", isActive: true, applicableGrades: [], itemCode: "EXT-002", nominalCode: "6200", documentType: "SI" },
]

// Category → item pool mapping
const CAT_ITEMS: Record<string,any[]> = {
  tuition: INVOICE_ITEMS, afterschool: AFTERSCHOOL_ITEMS, eca: ECA_ITEMS,
  event: EVENT_ITEMS, trip: TRIP_ITEMS, exam: EXAM_ITEMS,
  summer: SUMMER_ITEMS, bus: BUS_ITEMS, external: EXTERNAL_ITEMS,
}

// ── 5. Invoices — covers ALL categories ──────────────────────
function generateInvoices(students: any[], families: any[]) {
  const invoices: any[] = []
  const active = students.filter(s => s.status === "active")

  // Per-category plan: { category, count, statusDist }
  // Timeline: Term 1 (Aug-Dec 2025) mostly paid, Term 2 (Jan-Mar 2026) mixed, Term 3 (Apr-Jun 2026) draft/pending
  const repeat = (arr: string[], n: number) => { const r: string[] = []; for (let i = 0; i < n; i++) r.push(...arr); return r }
  const plans: { cat: string; count: number; dist: string[] }[] = [
    { cat: "tuition",     count: 150, dist: [
      // Term 1 — 50 invoices: mostly paid (school year well underway)
      ...repeat(["paid"], 30), ...repeat(["partial"], 5), ...repeat(["sent"], 5), ...repeat(["overdue"], 5), ...repeat(["approved"], 5),
      // Term 2 — 50 invoices: mix (current term)
      ...repeat(["paid"], 12), ...repeat(["partial"], 3), ...repeat(["sent"], 10), ...repeat(["overdue"], 10), ...repeat(["approved"], 5), ...repeat(["pending_approval"], 5), ...repeat(["rejected"], 5),
      // Term 3 — 50 invoices: mostly draft/pending (upcoming)
      ...repeat(["draft"], 25), ...repeat(["pending_approval"], 20), ...repeat(["rejected"], 5),
    ]},
    { cat: "eca",         count: 40, dist: [...repeat(["paid"], 12), ...repeat(["partial"], 4), ...repeat(["sent"], 8), ...repeat(["overdue"], 6), ...repeat(["approved"], 4), ...repeat(["draft"], 3), ...repeat(["pending_approval"], 2), "rejected"] },
    { cat: "trip",        count: 30, dist: [...repeat(["paid"], 10), ...repeat(["partial"], 2), ...repeat(["sent"], 6), ...repeat(["overdue"], 4), ...repeat(["approved"], 3), ...repeat(["draft"], 3), ...repeat(["pending_approval"], 1), "rejected"] },
    { cat: "exam",        count: 25, dist: [...repeat(["paid"], 8), ...repeat(["partial"], 2), ...repeat(["sent"], 5), ...repeat(["overdue"], 3), ...repeat(["approved"], 2), ...repeat(["draft"], 3), "pending_approval", "rejected"] },
    { cat: "bus",         count: 30, dist: [...repeat(["paid"], 10), ...repeat(["partial"], 3), ...repeat(["sent"], 6), ...repeat(["overdue"], 4), ...repeat(["approved"], 3), ...repeat(["draft"], 2), "pending_approval", "rejected"] },
    { cat: "external",    count: 20, dist: [...repeat(["paid"], 7), ...repeat(["partial"], 1), ...repeat(["sent"], 4), ...repeat(["overdue"], 2), ...repeat(["approved"], 2), ...repeat(["draft"], 2), "pending_approval", "rejected"] },
    { cat: "afterschool", count: 20, dist: [...repeat(["paid"], 6), ...repeat(["partial"], 2), ...repeat(["sent"], 4), ...repeat(["overdue"], 3), "approved", "approved", "draft", "draft", "pending_approval"] },
    { cat: "event",       count: 10, dist: [...repeat(["paid"], 3), "partial", ...repeat(["sent"], 2), "overdue", "approved", "draft", "pending_approval"] },
  ]

  let invSeq = 1
  let studentIdx = 0

  for (const plan of plans) {
    for (let i = 0; i < plan.count; i++) {
      const s = active[studentIdx % active.length]
      studentIdx++
      const family = families.find((f: any) => f.id === s.familyId)
      const status = plan.dist[i % plan.dist.length]
      const termNum = (i % 3) + 1
      const termLabel = `Term ${termNum}`
      const hasInvNum = ["approved","sent","paid","partial","overdue"].includes(status)
      const approvalStatus = ["approved","sent","paid","partial","overdue"].includes(status) ? "approved" : status === "rejected" ? "rejected" : "wait"

      // Build items
      let items: any[] = []
      let subtotal = 0
      if (plan.cat === "tuition") {
        const tuitionAmt = TUITION[s.gradeLevel]?.[termNum - 1] || 125000
        items = [
          { id: `ii-${invSeq}-1`, name: "Tuition Fee", description: `Tuition ${GRADE_LABELS[s.gradeLevel]} ${termLabel}`, amount: tuitionAmt, category: "tuition", isActive: true, applicableGrades: [], itemCode: "TUI-001", nominalCode: "4100" },
          { id: `ii-${invSeq}-2`, name: "Lunch Programme", description: "School lunch", amount: 15000, category: "tuition", isActive: true, applicableGrades: [], itemCode: "LUN-001", nominalCode: "4400" },
        ]
        subtotal = tuitionAmt + 15000
      } else if (plan.cat === "external") {
        const chosen = EXTERNAL_ITEMS[i % EXTERNAL_ITEMS.length]
        items = [{ ...chosen, id: `ii-${invSeq}-1` }]
        subtotal = chosen.amount
      } else {
        const pool = CAT_ITEMS[plan.cat] || ECA_ITEMS
        const chosen = pool[i % pool.length]
        items = [{ ...chosen, id: `ii-${invSeq}-1` }]
        subtotal = chosen.amount
      }

      // Discounts (tuition only)
      const discounts: any[] = []
      let totalDiscount = 0
      if (plan.cat === "tuition") {
        // Sibling discount (3rd child+)
        if (s.childOrder >= 3) {
          const pct = s.childOrder === 3 ? 5 : s.childOrder === 4 ? 10 : 20
          const discAmt = Math.round(subtotal * pct / 100)
          discounts.push({ name: `Sibling Discount (${pct}%)`, amount: discAmt, percentage: pct })
          totalDiscount += discAmt
        }
        // Student group discounts (based on student index in active list)
        // Slices below MUST stay in sync with generateStudentGroups() so every
        // active student belongs to some discount group
        const activeIdx = students.filter(st => st.status === "active").findIndex(st => st.studentId === s.studentId)
        if (activeIdx >= 0 && activeIdx < 100) {
          // Staff Children — 50%
          const amt = Math.round(subtotal * 50 / 100)
          discounts.push({ name: "Staff Children", amount: amt, percentage: 50 })
          totalDiscount += amt
        } else if (activeIdx >= 100 && activeIdx < 200) {
          // Scholarship Recipients — 100%
          const amt = subtotal
          discounts.push({ name: "Scholarship Recipients", amount: amt, percentage: 100 })
          totalDiscount += amt
        } else if (activeIdx >= 200 && activeIdx < 450) {
          // Partial Scholarship — 25%
          const amt = Math.round(subtotal * 25 / 100)
          discounts.push({ name: "Partial Scholarship", amount: amt, percentage: 25 })
          totalDiscount += amt
        } else if (activeIdx >= 450 && activeIdx < 900) {
          // Early Bird — fixed 10,000
          discounts.push({ name: "Early Bird 2025/2026", amount: 10000 })
          totalDiscount += 10000
        } else if (activeIdx >= 900 && activeIdx < 1200) {
          // Corporate Partner — 10%
          const amt = Math.round(subtotal * 10 / 100)
          discounts.push({ name: "Corporate Partner Families", amount: amt, percentage: 10 })
          totalDiscount += amt
        } else if (activeIdx >= 1200) {
          // Loyalty Discount Program — 5% (catch-all for remaining active students)
          const amt = Math.round(subtotal * 5 / 100)
          discounts.push({ name: "Loyalty Discount Program", amount: amt, percentage: 5 })
          totalDiscount += amt
        }
      }

      const netAmount = subtotal - totalDiscount
      // Dates based on term timeline
      const termDates: Record<number, { issue: string; due: string; paidRange: [Date, Date] }> = {
        1: { issue: "2025-07-15", due: "2025-08-01", paidRange: [new Date("2025-07-20"), new Date("2025-09-30")] },
        2: { issue: "2025-11-15", due: "2025-12-15", paidRange: [new Date("2025-11-20"), new Date("2026-02-28")] },
        3: { issue: "2026-02-15", due: "2026-03-15", paidRange: [new Date("2026-02-20"), new Date("2026-04-30")] },
      }
      const td = termDates[termNum] || termDates[1]
      const issueDate = status === "draft" ? "2026-03-10" : td.issue
      const dueDate = status === "overdue" ? (termNum === 1 ? "2025-08-01" : termNum === 2 ? "2025-12-15" : "2026-03-15") : td.due
      const invYear = issueDate.substring(0, 4)
      const invNumber = hasInvNum ? `${invYear}-${pad(invSeq, 5)}` : ""
      const paidDate = status === "paid" ? randomDate(td.paidRange[0], td.paidRange[1]) : undefined
      const payMethod = status === "paid" ? pick(PAY_METHODS) : status === "partial" ? "Partial" : undefined
      const partialPaidAmount = status === "partial" ? Math.round(netAmount * (0.3 + Math.random() * 0.4)) : undefined

      const isExternal = plan.cat === "external"

      invoices.push({
        id: `inv-${pad(invSeq)}`,
        invoiceNumber: invNumber,
        studentName: isExternal ? "" : `${s.firstName} ${s.lastName}`,
        studentId: isExternal ? "" : s.studentId,
        studentGrade: isExternal ? "" : (GRADE_LABELS[s.gradeLevel] || s.gradeLevel),
        studentRoom: "",
        parentName: isExternal ? `Client ${invSeq}` : (s.parents[0]?.name || ""),
        parentEmail: isExternal ? `client${invSeq}@company.com` : (s.parents[0]?.email || family?.email || ""),
        recipientName: isExternal ? `Company ${invSeq} Ltd.` : undefined,
        recipientAddress: isExternal ? `${invSeq} Business Ave, Bangkok 10500` : undefined,
        clientId: isExternal ? `CL${pad(invSeq, 4)}` : undefined,
        items, subtotal, discounts, totalDiscount, netAmount,
        finalAmount: netAmount, // alias used by some components
        dueDate, issueDate,
        status: status === "partial" ? "sent" : status, approvalStatus,
        term: `${termLabel} ${CURRENT_YEAR}`,
        termName: termLabel,
        academicYear: CURRENT_YEAR,
        paymentType: "termly",
        createdAt: randomDate(new Date("2025-07-15"), new Date("2026-03-10")),
        invoiceType: isExternal ? "external" : plan.cat === "afterschool" ? "afterschool" : plan.cat === "event" || plan.cat === "summer" ? "event" : "student",
        category: plan.cat,
        isNewStudent: invSeq <= 3,
        familyCode: isExternal ? "" : s.familyCode,
        adultIdNo: isExternal ? "" : s.familyCode,
        documentType: "SI",
        paidDate, paymentMethod: payMethod,
        ...(partialPaidAmount ? { partialPaidAmount } : {}),
        ...(isExternal ? { eventName: items[0]?.name || "External Service" } : {}),
      })
      invSeq++
    }
  }

  // ── Historical invoices for 2021/2022 – 2024/2025 (compact, 30/year) ──
  const historicalAYs = [
    { ay: "2021/2022", y: "2021", termStart: ["2021-08","2022-01","2022-04"] },
    { ay: "2022/2023", y: "2022", termStart: ["2022-08","2023-01","2023-04"] },
    { ay: "2023/2024", y: "2023", termStart: ["2023-08","2024-01","2024-04"] },
    { ay: "2024/2025", y: "2024", termStart: ["2024-08","2025-01","2025-04"] },
  ]
  const historicalCats = ["tuition","eca","bus","trip","exam"]
  const historicalDist = ["paid","paid","paid","paid","paid","paid","sent","overdue","cancelled"]
  for (const { ay, y, termStart } of historicalAYs) {
    for (let i = 0; i < 30; i++) {
      const s = active[i % active.length]
      const termNum = (i % 3) + 1
      const termLabel = `Term ${termNum}`
      const cat = historicalCats[i % historicalCats.length]
      const status = historicalDist[i % historicalDist.length]
      const netAmount = cat === "tuition"
        ? (TUITION[s.gradeLevel]?.[termNum - 1] || 125000)
        : cat === "eca" ? 7000 + (i % 3) * 2000
        : cat === "bus" ? 20000
        : cat === "trip" ? 15000
        : 25000
      invoices.push({
        id: `inv-hist-${y}-${pad(i + 1)}`,
        invoiceNumber: `${y}-${pad(invSeq, 5)}`,
        studentId: s.studentId, studentName: `${s.firstName} ${s.lastName}`,
        studentGrade: GRADE_LABELS[s.gradeLevel] || s.gradeLevel,
        parentName: s.parents?.[0]?.name || "",
        category: cat, invoiceType: "student",
        academicYear: ay,
        term: `${termLabel} ${ay}`, termName: termLabel,
        status, approvalStatus: ["paid","sent","overdue"].includes(status) ? "approved" : status === "cancelled" ? "cancelled" : "wait",
        netAmount, finalAmount: netAmount, subtotal: netAmount,
        issueDate: `${termStart[termNum - 1]}-15`,
        dueDate: `${termStart[termNum - 1]}-01`,
        familyCode: s.familyCode || "",
        items: [{ name: cat === "tuition" ? "Tuition Fee" : cat, amount: netAmount }],
        discounts: [], totalDiscount: 0,
        paymentType: "termly", documentType: "SI",
        paidDate: status === "paid" ? `${termStart[termNum - 1]}-20` : undefined,
      })
      invSeq++
    }
  }

  return invoices
}

// ── 6. Receipts (ReceiptPageUpdated format) ──────────────────
// Maps category→storage key as the app does
const RECEIPT_STORAGE_MAP: Record<string,string> = {
  tuition: "receiptRecords_tuition",
  eca: "receiptRecords_eca",
  afterschool: "receiptRecords_eca",
  trip: "receiptRecords_trip",
  exam: "receiptRecords_event",    // app maps exam→event
  event: "receiptRecords_event",
  bus: "receiptRecords_summer",    // app maps bus→summer
  summer: "receiptRecords_summer",
  external: "receiptRecords_external",
}


function generateReceipts(invoices: any[]) {
  const paid = invoices.filter(inv => inv.status === "paid")
  const receipts: Record<string,any[]> = {}
  // Initialize all keys
  for (const key of Object.values(RECEIPT_STORAGE_MAP)) {
    if (!receipts[key]) receipts[key] = []
  }

  paid.forEach((inv, idx) => {
    const cat = inv.category || "tuition"
    const storageKey = RECEIPT_STORAGE_MAP[cat] || "receiptRecords_tuition"
    const payMethod = inv.paymentMethod || pick(PAY_METHODS)
    const rcpDate = inv.paidDate || randomDate(new Date("2025-09-01"), new Date("2026-03-15"))
    const rcpYear = new Date(rcpDate).getFullYear()

    const isExtCat = cat === "external"
    // ReceiptPageUpdated expected format
    receipts[storageKey].push({
      id: `rcp-${pad(idx + 1)}`,
      receiptNo: `R${rcpYear}-${String(idx + 1).padStart(5, "0")}`,
      receiptDate: rcpDate,
      clientType: isExtCat ? "external" : "student",
      clientNo: isExtCat ? (inv.clientId || "") : (inv.studentId || inv.familyCode || ""),
      clientId: isExtCat ? (inv.clientId || "") : "",
      clientName: isExtCat ? (inv.recipientName || "") : (inv.studentName || ""),
      contactName: inv.parentName || "",
      address: isExtCat ? (inv.recipientAddress || "") : "",
      yearGroup: inv.studentGrade || "",
      schoolYear: CURRENT_YEAR,
      academicYear: CURRENT_YEAR,
      term: inv.termName || "Term 1",
      totalAmount: inv.netAmount,
      creditNoteTotal: 0,
      paymentMethod: payMethod,
      status: "issued",
      createdAt: rcpDate,
      downloadCount: Math.floor(Math.random() * 3),
      familyCode: inv.familyCode || "",
      invoices: [{
        id: inv.id,
        invoiceNo: inv.invoiceNumber,
        invoiceDate: inv.issueDate,
        invoiceAmount: inv.netAmount,
        receivedAmount: inv.netAmount,
        cnDeduction: 0,
        outstandingAmount: 0,
      }],
    })
  })
  return receipts
}

// ── 7. Payment Records (PaymentHistorySimple + InvoiceManagement) ──
function generatePaymentRecords(invoices: any[]) {
  const paid = invoices.filter(inv => inv.status === "paid")
  return paid.map((inv, idx) => {
    const payMethod = inv.paymentMethod || pick(PAY_METHODS)
    return {
      id: `pay-${pad(idx + 1)}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentName: inv.studentName || inv.recipientName || "",
      studentId: inv.studentId || "",
      studentGrade: inv.studentGrade || "",
      amount: inv.netAmount,
      term: inv.termName?.replace("Term ", "") || "1",
      paymentMethod: payMethod,
      paymentChannel: PAY_CHANNELS[payMethod] || "counter_bank",
      payerName: inv.parentName || "",
      status: "paid",
      transactionDate: inv.paidDate || randomDate(new Date("2025-09-01"), new Date("2026-03-15")),
      referenceNumber: `REF${pad(idx + 1, 8)}`,
      dueDate: inv.dueDate,
      parentType: inv.category === "external" ? "external" : "internal",
    }
  })
}

// ── 8. Credit Notes ──────────────────────────────────────────
function generateCreditNotes(invoices: any[]) {
  const reasons = ["Overpayment refund","Course cancellation","Early withdrawal credit","Billing adjustment","Scholarship retroactive","Duplicate payment correction","Fee recalculation","Programme change credit","Transfer credit","Administrative adjustment"]
  const types: ("refund" | "adjustment" | "discount")[] = ["refund","adjustment","discount"]

  // Gather invoices by status for different credit note categories
  const unpaid = invoices.filter(inv =>
    inv.approvalStatus === "approved" &&
    ["sent","overdue","approved"].includes(inv.status) &&
    inv.studentId && inv.familyCode &&
    inv.category !== "external"
  )
  const paid = invoices.filter(inv =>
    inv.status === "paid" && inv.invoiceNumber &&
    inv.studentId && inv.familyCode
  )

  const cnList: any[] = []
  let seq = 1

  const makeCN = (inv: any, status: string, hasBalance: boolean, dateRange: [Date, Date]) => {
    const creditAmt = Math.round(inv.netAmount * (0.05 + Math.random() * 0.15))
    const cn: any = {
      id: `cn-${pad(seq)}`, creditNoteNumber: `CN-2026-${pad(seq)}`,
      invoiceNumber: status === "applied" ? (inv.invoiceNumber || "") : "",
      studentName: inv.studentName, studentId: inv.studentId, studentGrade: inv.studentGrade,
      parentName: inv.parentName,
      originalAmount: inv.netAmount, creditAmount: creditAmt,
      remainingBalance: hasBalance ? creditAmt : 0,
      reason: reasons[(seq - 1) % reasons.length], type: types[(seq - 1) % types.length],
      status,
      issueDate: randomDate(dateRange[0], dateRange[1]),
      issuedBy: pick(["System Administrator", "finance admin", "test approver"]),
      approvedBy: status !== "draft" ? "finance admin" : undefined,
      notes: status === "applied" ? `Applied to ${inv.invoiceNumber}` : `Credit note for ${inv.studentName}`,
      familyCode: inv.familyCode, adultIdNo: inv.familyCode,
      academicYear: inv.academicYear || CURRENT_YEAR,
      term: inv.term || `Term 1 ${CURRENT_YEAR}`,
      yearGroup: inv.studentGrade,
    }
    if (status === "applied") {
      cn.appliedToInvoice = inv.invoiceNumber
      cn.appliedDate = randomDate(dateRange[0], dateRange[1])
    }
    cnList.push(cn)
    seq++
  }

  // 1) "issued" — 80 credit notes for students with unpaid invoices (usable at payment)
  for (const inv of unpaid.slice(0, 80)) {
    makeCN(inv, "issued", true, [new Date("2025-10-01"), new Date("2026-02-28")])
  }

  // 2) "applied" — 50 credit notes already used (historical)
  for (const inv of paid.slice(0, 50)) {
    makeCN(inv, "applied", false, [new Date("2025-08-01"), new Date("2025-12-31")])
  }

  // 3) "draft" — 30 credit notes pending approval
  for (const inv of unpaid.slice(80, 110)) {
    makeCN(inv, "draft", true, [new Date("2026-02-01"), new Date("2026-03-15")])
  }

  // 4) "cancelled" — 20 cancelled credit notes
  for (const inv of paid.slice(50, 70)) {
    makeCN(inv, "cancelled", false, [new Date("2025-09-01"), new Date("2026-01-15")])
  }

  // 5) "partial" — 20 partially used credit notes
  for (const inv of unpaid.slice(110, 130)) {
    const creditAmt = Math.round(inv.netAmount * (0.1 + Math.random() * 0.1))
    const usedAmt = Math.round(creditAmt * (0.3 + Math.random() * 0.4))
    cnList.push({
      id: `cn-${pad(seq)}`, creditNoteNumber: `CN-2026-${pad(seq)}`,
      invoiceNumber: "",
      studentName: inv.studentName, studentId: inv.studentId, studentGrade: inv.studentGrade,
      parentName: inv.parentName,
      originalAmount: inv.netAmount, creditAmount: creditAmt,
      remainingBalance: creditAmt - usedAmt,
      reason: reasons[(seq - 1) % reasons.length], type: types[(seq - 1) % types.length],
      status: "partial",
      issueDate: randomDate(new Date("2025-10-01"), new Date("2026-01-31")),
      issuedBy: "finance admin", approvedBy: "finance admin",
      notes: `Partially used credit note`,
      familyCode: inv.familyCode, adultIdNo: inv.familyCode,
      academicYear: inv.academicYear || CURRENT_YEAR,
      term: inv.term || `Term 1 ${CURRENT_YEAR}`,
      yearGroup: inv.studentGrade,
      usageHistory: [{ appliedAmount: usedAmt, appliedAt: randomDate(new Date("2025-11-01"), new Date("2026-02-28")), appliedBy: "staff" as const }],
    })
    seq++
  }

  // 6) Historical credit notes — 2021/2022 through 2024/2025 (4 per year)
  const historicalYears = [
    { ay: "2021/2022", start: "2021-08-15", end: "2022-06-15" },
    { ay: "2022/2023", start: "2022-08-15", end: "2023-06-15" },
    { ay: "2023/2024", start: "2023-08-15", end: "2024-06-15" },
    { ay: "2024/2025", start: "2024-08-15", end: "2025-06-15" },
  ]
  const sampleStudents = [...paid, ...unpaid].filter(inv => inv.studentId && inv.studentName)
  if (sampleStudents.length > 0) {
    const yearNum = (ay: string) => ay.split("/")[0]
    for (const { ay, start, end } of historicalYears) {
      for (let i = 0; i < 4; i++) {
        const inv = sampleStudents[(seq * 7 + i) % sampleStudents.length]
        const creditAmt = Math.round((50000 + Math.random() * 150000) / 100) * 100
        const isApplied = i < 3
        const termNum = (i % 3) + 1
        cnList.push({
          id: `cn-${pad(seq)}`,
          creditNoteNumber: `CN-${yearNum(ay)}-${pad(seq)}`,
          invoiceNumber: "",
          studentName: inv.studentName, studentId: inv.studentId, studentGrade: inv.studentGrade,
          parentName: inv.parentName,
          originalAmount: creditAmt * 10, creditAmount: creditAmt,
          remainingBalance: 0,
          reason: reasons[(seq - 1) % reasons.length],
          type: types[(seq - 1) % types.length],
          status: isApplied ? "applied" : "cancelled",
          issueDate: randomDate(new Date(start), new Date(end)),
          issuedBy: pick(["System Administrator", "finance admin"]),
          approvedBy: "finance admin",
          notes: isApplied ? `Applied — ${ay} Term ${termNum}` : `Cancelled — ${ay}`,
          familyCode: inv.familyCode, adultIdNo: inv.familyCode,
          academicYear: ay,
          term: `Term ${termNum} ${ay}`,
          yearGroup: inv.studentGrade,
          ...(isApplied ? { appliedDate: randomDate(new Date(start), new Date(end)) } : {}),
        })
        seq++
      }
    }
  }

  return cnList
}

// ── 9. Email Logs ────────────────────────────────────────────
function generateEmailLogs(invoices: any[]) {
  const sent = invoices.filter(inv => ["sent","paid","approved"].includes(inv.status) && inv.invoiceNumber)
  return sent.map((inv, idx) => ({
    id: `email-${pad(idx + 1)}`,
    invoiceId: inv.id, invoiceNumber: inv.invoiceNumber,
    recipientEmail: inv.parentEmail, recipientName: inv.parentName,
    sentAt: randomDate(new Date("2025-09-01"), new Date("2026-03-17")),
    sentBy: idx % 3 === 0 ? "System Administrator" : "finance admin",
    status: idx % 12 === 11 ? "failed" : "sent",
  })).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
}

// ── 10. Email Reminder History ───────────────────────────────
function generateEmailReminderHistory() {
  // Realistic timeline: reminders sent before/after payment deadlines
  const entries = [
    { id: "reminder-hist-001", sentDate: "2025-07-25T09:00:00.000Z", subject: `Payment Reminder - Term 1 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 1", recipients: 520, status: "sent", message: "Dear Parent, this is a reminder for your upcoming Term 1 payment." },
    { id: "reminder-hist-002", sentDate: "2025-08-10T09:00:00.000Z", subject: `Payment Reminder - Term 1 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 1", recipients: 340, status: "sent", message: "Dear Parent, this is a follow-up reminder for Term 1 payment." },
    { id: "reminder-hist-003", sentDate: "2025-09-04T09:00:00.000Z", subject: `Overdue Payment - Term 1 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 1", recipients: 185, status: "sent", message: "Dear Parent, your Term 1 payment is now overdue." },
    { id: "reminder-hist-004", sentDate: "2025-12-01T09:00:00.000Z", subject: `Payment Reminder - Term 2 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 2", recipients: 480, status: "sent", message: "Dear Parent, this is a reminder for your upcoming Term 2 payment." },
    { id: "reminder-hist-005", sentDate: "2025-12-20T09:00:00.000Z", subject: `Payment Reminder - Term 2 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 2", recipients: 310, status: "sent", message: "Dear Parent, please arrange your Term 2 payment before the deadline." },
    { id: "reminder-hist-006", sentDate: "2026-01-10T09:00:00.000Z", subject: `Overdue Payment - Term 2 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 2", recipients: 195, status: "sent", message: "Dear Parent, your Term 2 payment is now overdue." },
    { id: "reminder-hist-007", sentDate: "2026-02-15T09:00:00.000Z", subject: `Payment Reminder - Term 3 ${CURRENT_YEAR}`, academicYear: CURRENT_YEAR, term: "Term 3", recipients: 580, status: "sent", message: "Dear Parent, this is an early reminder for your upcoming Term 3 payment." },
    { id: "reminder-hist-008", sentDate: "2026-03-15T09:00:00.000Z", subject: `Final Payment Reminder`, academicYear: CURRENT_YEAR, term: "Term 3", recipients: 420, status: "sent", message: "Dear Parent, this is a final reminder for all outstanding payments." },
    { id: "reminder-hist-009", sentDate: "2026-03-15T09:00:00.000Z", subject: `ECA Fee Reminder`, academicYear: PREV_YEAR, term: "Term 1", recipients: 98, status: "sent", message: "Dear Parent, please settle your outstanding ECA fees." },
    { id: "reminder-hist-010", sentDate: "2026-03-13T09:00:00.000Z", subject: `Final Payment Reminder`, academicYear: CURRENT_YEAR, term: "Term 3", recipients: 222, status: "sent", message: "Dear Parent, this is the final notice for outstanding payments." },
  ]
  return entries.sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime())
}

// ── 11. Discount Groups (linked to real students) ────────────
function generateStudentGroups(students: any[]) {
  const active = students.filter(s => s.status === "active")
  const mapStudent = (s: any) => ({
    id: s.studentId, name: `${s.firstName} ${s.lastName}`,
    yearGroup: GRADE_LABELS[s.gradeLevel] || s.gradeLevel,
    parentName: s.parents[0]?.name || "", isActive: true,
  })
  // Sibling discount — all children with childOrder >= 3 (matches invoice discount logic)
  const siblingStudents = active.filter((s: any) => s.childOrder >= 3)
  // NOTE: Slices below MUST stay in sync with generateInvoices() discount logic
  // so every student with a red discount on an invoice is visible here.
  return [
    { id: "sg-000", name: "All Students (Tuition)", financeCode: "", nominalCode: "", students: active.map(mapStudent), discountType: "percentage", discountPercentage: 0, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Master group — all enrolled students for tuition billing" },
    { id: "sg-001", name: "Staff Children", financeCode: "DISC-STAFF", nominalCode: "5101", students: active.slice(0, 100).map(mapStudent), discountType: "percentage", discountPercentage: 50, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Children of school staff — 50% tuition discount" },
    { id: "sg-002", name: "Scholarship Recipients", financeCode: "DISC-SCHOL", nominalCode: "5102", students: active.slice(100, 200).map(mapStudent), discountType: "percentage", discountPercentage: 100, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Full scholarship students — 100% tuition waiver" },
    { id: "sg-003", name: "Partial Scholarship", financeCode: "DISC-PSCHOL", nominalCode: "5103", students: active.slice(200, 450).map(mapStudent), discountType: "percentage", discountPercentage: 25, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Partial scholarship — 25% tuition discount" },
    { id: "sg-004", name: "Early Bird 2025/2026", financeCode: "DISC-EB", nominalCode: "5104", students: active.slice(450, 900).map(mapStudent), discountType: "fixed", discountPercentage: 0, fixedAmount: 10000, departments: ["Tuition"], isActive: true, description: "Early payment discount — 10,000 THB off per term" },
    { id: "sg-005", name: "Corporate Partner Families", financeCode: "DISC-CORP", nominalCode: "5105", students: active.slice(900, 1200).map(mapStudent), discountType: "percentage", discountPercentage: 10, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Families from corporate partner companies — 10% discount" },
    { id: "sg-006", name: "Loyalty Discount Program", financeCode: "DISC-LOY", nominalCode: "5106", students: active.slice(1200).map(mapStudent), discountType: "percentage", discountPercentage: 5, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Long-standing families — 5% loyalty discount" },
    { id: "sg-007", name: "Sibling Discount Families", financeCode: "DISC-SIB", nominalCode: "5107", students: siblingStudents.map(mapStudent), discountType: "percentage", discountPercentage: 5, fixedAmount: 0, departments: ["Tuition"], isActive: true, description: "Families with 3+ children — tiered sibling discount (5%/10%/20%)" },
  ]
}

// ── 11b. Category Discount Groups — 1 group per menu, varied % / fixed ──
function generateCategoryDiscountGroups(students: any[], category: string, department: string) {
  const active = students.filter(s => s.status === "active")
  const mapStudent = (s: any) => ({
    id: s.studentId, name: `${s.firstName} ${s.lastName}`,
    yearGroup: GRADE_LABELS[s.gradeLevel] || s.gradeLevel,
    parentName: s.parents[0]?.name || "", isActive: true,
  })
  const prefix = category.toUpperCase().slice(0, 4)
  // One discount per menu — mix of % and fixed amounts (no 100%)
  const SPEC: Record<string, { name: string; type: "percentage" | "fixed"; pct: number; amt: number }> = {
    eca:         { name: "ECA Scholarship Recipients",          type: "percentage", pct: 30, amt: 0 },
    trip:        { name: "Trip & Activity Early Bird",          type: "fixed",      pct: 0,  amt: 1500 },
    exam:        { name: "Exam Fee Waiver",                     type: "percentage", pct: 20, amt: 0 },
    bus:         { name: "School Bus Staff Discount",           type: "fixed",      pct: 0,  amt: 2000 },
    afterschool: { name: "After School Sibling Discount",       type: "percentage", pct: 15, amt: 0 },
    event:       { name: "Event Corporate Partner Discount",    type: "percentage", pct: 10, amt: 0 },
  }
  const spec = SPEC[category] || SPEC.eca
  return [{
    id: `${prefix}-GRP001`,
    name: spec.name,
    financeCode: `${prefix}-DISC`,
    nominalCode: "4110001",
    students: active.slice(0, 120).map(mapStudent),
    discountType: spec.type,
    discountPercentage: spec.pct,
    fixedAmount: spec.amt,
    departments: [department],
    isActive: true,
  }]
}

// Summer discount group — single group, shape includes createdDate + description
function generateSummerDiscountGroups(students: any[]) {
  const active = students.filter(s => s.status === "active")
  const mapStudent = (s: any) => ({
    id: s.studentId, name: `${s.firstName} ${s.lastName}`,
    yearGroup: GRADE_LABELS[s.gradeLevel] || s.gradeLevel,
    parentName: s.parents[0]?.name || "", isActive: true,
  })
  return [{
    id: "SUM-GRP001",
    name: "Summer Early Bird 2025/2026",
    students: active.slice(0, 120).map(mapStudent),
    discountType: "fixed",
    discountPercentage: 0,
    fixedAmount: 2500,
    isActive: true,
    createdDate: new Date().toISOString(),
    description: "Early registration discount — ฿2,500 off summer programme",
  }]
}

// ── 12. Discount Records ─────────────────────────────────────
function generateDiscountRecords(students: any[]) {
  const active = students.filter(s => s.status === "active")
  const rec = (s: any) => ({ studentId: s.studentId, studentName: `${s.firstName} ${s.lastName}`, addedAt: new Date().toISOString() })
  return {
    staffChild: active.slice(0, 100).map(rec),
    scholarship: active.slice(100, 200).map(rec),
    earlyBird: active.slice(450, 900).map(rec),
    schoolBus: active.slice(300, 380).map(rec),
  }
}

// ── 13. Discount Options ─────────────────────────────────────
function generateDiscountOptions() {
  const base = {
    siblingDiscounts: [
      { childOrder: "first", label: "1st Child", percentage: 0, enabled: true },
      { childOrder: "second", label: "2nd Child", percentage: 0, enabled: true },
      { childOrder: "third", label: "3rd Child", percentage: 5, enabled: true },
      { childOrder: "fourth", label: "4th Child", percentage: 10, enabled: true },
      { childOrder: "fifth", label: "5th Child+", percentage: 20, enabled: true },
    ],
    registrationFees: { applicationFee: 5000, registrationFee: 50000, securityDeposit: 30000, applicationFeeRefundable: false, registrationFeeRefundable: false, securityDepositRefundable: true },
    registrationPrivileges: [
      { id: "priv-001", condition: "Sibling enrolled", privilege: "Waive application fee", enabled: true },
      { id: "priv-002", condition: "Staff child", privilege: "50% tuition discount", enabled: true },
    ],
    waiverAfter3rdYear: { enabled: true, minimumGradeLevel: "year3", minimumTerms: 9, creditAmount: 30000, termsToCredit: 3, firstChildImmediate: false, secondChildImmediate: false },
    waiverImmediate: { enabled: false, creditAmount: 0, termsToCredit: 0, limitedFamily: false },
  }
  return { [PREV_YEAR]: { ...base, academicYear: PREV_YEAR }, [CURRENT_YEAR]: { ...base, academicYear: CURRENT_YEAR } }
}

// ── 14. Bank Accounts ────────────────────────────────────────
const BANK_ACCOUNTS_OFFLINE = [
  { id: "BA-OFF-1", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12788-5", glAccount: "111-2101", isActive: true },
  { id: "BA-OFF-2", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12885-7", glAccount: "111-2102", isActive: true },
  { id: "BA-OFF-3", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-365-315-8", glAccount: "111-2105", isActive: true },
  { id: "BA-OFF-4", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-1-06348-7", glAccount: "111-2106", isActive: true },
  { id: "BA-OFF-5", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-6-06112-4", glAccount: "111-2107", isActive: true },
  { id: "BA-OFF-6", paymentSource: "Bank Transfer", bankName: "Kasikorn Bank", accountNumber: "041-1-12884-9", glAccount: "111-2202", isActive: true },
  { id: "BA-OFF-7", paymentSource: "Bank Transfer", bankName: "United Overseas Bank", accountNumber: "817-169-492-2", glAccount: "111-2205", isActive: true },
  { id: "BA-OFF-8", paymentSource: "Bank Transfer", bankName: "TMBThanachart Bank", accountNumber: "212-2-78322-4", glAccount: "111-2206", isActive: true },
  { id: "BA-OFF-9", paymentSource: "Bank Transfer", bankName: "Krungthai Card", accountNumber: "048-0-20031-9", glAccount: "111-2207", isActive: true },
]
const BANK_ACCOUNTS_ONLINE = [
  { id: "obank-002", paymentSource: "Thai QR", bankName: "Kasikorn Bank", accountNumber: "Online", glAccount: "111-2201", isActive: true },
  { id: "obank-003", paymentSource: "Credit Note", bankName: "Kasikorn Bank", accountNumber: "041-1-12977-2", glAccount: "111-2201", isActive: true },
]

// ── 15. Activity Logs (realistic timeline) ───────────────────
function generateActivityLogs(_invoices: any[], _students: any[]) {
  const logs: any[] = []
  let ts = new Date("2025-08-01T08:00:00.000Z")
  const advance = (h: number) => { ts = new Date(ts.getTime() + h * 3600000) }
  const ips = ["192.168.1.100", "192.168.1.101", "192.168.1.102", "10.0.0.50"]
  const devices = ["Chrome on macOS", "Chrome on Windows", "Safari on macOS", "Edge on Windows"]
  let ipIdx = 0
  const add = (user: string, action: string, module: string, detail: string, status = "success") => {
    logs.push({ id: `log-${pad(logs.length + 1)}`, user, action, module, detail, ip: ips[ipIdx % ips.length], device: devices[ipIdx % devices.length], status, timestamp: ts.toISOString() })
    advance(0.3 + Math.random() * 2)
  }

  const admin = "System Administrator"
  const finance = "finance admin"
  const approver = "test approver"
  const viewer = "viewer"

  // ── Login & Authentication ──
  add(admin, "Login", "Login & Authentication", "Logged in"); ipIdx++
  add(finance, "Login", "Login & Authentication", "Logged in"); ipIdx++
  add(approver, "Login", "Login & Authentication", "Logged in"); ipIdx++
  add(viewer, "Login", "Login & Authentication", "Logged in")
  advance(1)

  // ── Student List ──
  add(admin, "Import Students", "Student List", "Imported 1550 students")
  add(admin, "Create Student", "Student List", "Created 1 student")
  add(admin, "Edit Student", "Student List", "Updated student info")
  add(admin, "Delete Student", "Student List", "Deleted 1 student")
  advance(2)

  // ── Family Group ──
  add(admin, "Create Family", "Family Group", "Created 1 family group")
  add(admin, "Edit Family", "Family Group", "Updated family group")
  add(admin, "Delete Family", "Family Group", "Deleted 1 family group")
  advance(2)

  // ── Users ──
  add(admin, "Create User", "Users", "Created 1 user")
  add(admin, "Edit User", "Users", "Updated user info")
  add(admin, "Delete User", "Users", "Deleted 1 user")
  add(admin, "Change Status", "Users", "Changed status to Inactive")
  advance(2)

  // ── Term Settings ──
  add(admin, "Create Term Setting", "Term Settings", "Created Term Setting 2026/2027")
  add(admin, "Update Term Setting", "Term Settings", "Updated Term Setting")
  advance(2)

  // ── Tuition by Year ──
  add(finance, "Save Tuition By Year", "Tuition by Year", `Saved Tuition By Year ${CURRENT_YEAR}`)
  advance(4)

  // ── Per-invoice-type modules ──
  const invoiceTypes = [
    { key: "tuition", label: "Tuition", itemPrefix: "TUI", invPrefix: "2025" },
    { key: "eca", label: "ECA", itemPrefix: "ECA", invPrefix: "2025" },
    { key: "trip", label: "Trip & Activity", itemPrefix: "TRP", invPrefix: "2025" },
    { key: "exam", label: "Exam", itemPrefix: "EXM", invPrefix: "2025" },
    { key: "bus", label: "School Bus", itemPrefix: "BUS", invPrefix: "2025" },
    { key: "external", label: "External", itemPrefix: "EXT", invPrefix: "2026" },
  ]

  for (const t of invoiceTypes) {
    const itemMod = "Items / Templates"
    const discMod = "Discount Group"
    const invMod = `${t.label} Invoice`
    const rcptMod = "Receipts"

    // Items / Templates
    add(finance, "Create Item", itemMod, `Created ${t.itemPrefix}-001 item`)
    add(finance, "Edit Item", itemMod, `Updated ${t.itemPrefix}-001 item`)
    add(finance, "Delete Item", itemMod, `Deleted 2 items`)
    add(finance, "Import interface file Items", itemMod, `Imported 15 items`)
    add(finance, "Export Interface file Items", itemMod, `Exported interface file`)
    advance(1)

    // Discount Group (skip external)
    if (t.key !== "external") {
      add(finance, "Create Group", discMod, `Created 1 group`)
      add(finance, "Edit Group", discMod, `Updated 1 group`)
      add(finance, "Delete Group", discMod, `Deleted 1 group`)
      add(finance, "Download List", discMod, `Download Excel`)
      advance(1)
    }

    // Invoice
    add(finance, "Create Invoice", invMod, `Created 58 invoices`)
    add(finance, "Edit Invoice", invMod, `Updated 1 invoice`)
    add(finance, "Delete Invoice", invMod, `Deleted 3 invoices`)
    add(finance, "Import Interface", invMod, `Imported interface file`)
    add(finance, "Export Interface", invMod, `Exported interface file`)
    add(finance, "Mark Invoice as Paid", invMod, `Mark Invoice as Paid invoice ${t.invPrefix}-00${Math.floor(Math.random() * 900 + 100)}`)
    advance(1)

    // Receipts
    add(finance, "Export Interface", rcptMod, `Exported interface file`)
    add(finance, "Save Chages Template Email Invoice", rcptMod, `Update Invoice Template Email`)
    advance(2)
  }

  // ── Client List (External) ──
  add(finance, "Create Client", "Client List", "Created 1 client")
  add(finance, "Edit Client", "Client List", "Updated 1 client")
  add(finance, "Delete Client", "Client List", "Deleted 1 client")
  advance(4)

  // ── Approval Queue ──
  add(approver, "Approve Invoice", "Approval Queue", "Approved 5 invoice")
  add(approver, "Reject Invoice", "Approval Queue", "Rejected 2 invoice")
  advance(4)

  // ── Debt Reminder Settings ──
  add(finance, "Create Reminder", "Debt Reminder Settings", "Created 1 reminder")
  add(finance, "Edit Reminder", "Debt Reminder Settings", "Updated 1 reminder")
  add(finance, "Delete Reminder", "Debt Reminder Settings", "Deleted 1 reminder")
  add(finance, "Send Reminder", "Debt Reminder Settings", "Sent to 310 recipients")
  advance(4)

  // ── Dashboard & Analytics ──
  add(finance, "Export Report", "Dashboard & Analytics", "Exported Excel")
  advance(1)

  // ── Payment History ──
  add(finance, "Export Report", "Payment History", "Exported Excel")
  advance(1)

  // ── Email History ──
  add(finance, "Export Report", "Email History", "Exported Excel")
  advance(1)

  // ── Discount Reports ──
  add(finance, "Export Report", "Discount Reports", "Exported Excel")
  advance(1)

  // ── Credit Notes ──
  add(finance, "Export Interface file", "Credit Notes", "Exported interface file")
  advance(2)

  // ── Activity Log ──
  add(admin, "Export Log", "Activity Log", "Exported Excel")
  advance(2)

  // ── Login & Authentication (additional events) ──
  add(admin, "Reset Password", "Login & Authentication", "Reset password")
  add(viewer, "Force log out", "Login & Authentication", "Forcefully logged out due to a password reset")
  add(finance, "Logout", "Login & Authentication", "Logged out")
  add(admin, "Logout", "Login & Authentication", "Logged out")

  return logs.slice(-500).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// ── 16. Debt Reminder Config (usePersistedState prefixed) ────
function generateDebtReminders() {
  const reminders = []
  for (let i = 0; i < 5; i++) {
    const termNum = (i % 3) + 1
    reminders.push({
      id: `rem-${pad(i + 1)}`,
      name: `Term ${termNum} Payment Reminder ${i + 1}`,
      academicYear: CURRENT_YEAR,
      term: String(termNum),
      sendDate: `2026-0${termNum + 1}-15`,
      sendTime: "09:00",
      method: "email",
      enabled: true,
      subject: `Payment Reminder - Term ${termNum} ${CURRENT_YEAR}`,
      emailTitle: `Outstanding Payment for Term ${termNum}`,
      message: `Dear Parent, this is a friendly reminder about your outstanding payment for Term ${termNum} of the academic year ${CURRENT_YEAR}. Please arrange payment at your earliest convenience.`,
      invoiceStatuses: ["unpaid", "overdue"],
      dueDateFilter: "all",
      status: i < 2 ? "reminded" : "new",
      sentAt: i < 2 ? randomDate(new Date("2025-10-01"), new Date("2026-02-28")) : undefined,
      recipientCount: i < 2 ? 180 + Math.floor(Math.random() * 200) : undefined,
    })
  }
  return reminders
}

// ── 17. School Settings ──────────────────────────────────────
function generateSchoolSettings() {
  return {
    schoolName: "King's College International School",
    schoolNameTh: "โรงเรียนนานาชาติคิงส์คอลเลจ",
    address: "999 Rama 9 Road, Huai Khwang, Bangkok 10310",
    phone: "02-123-4567", fax: "02-123-4568",
    email: "info@kingscollege.ac.th", website: "www.kingscollege.ac.th",
    taxId: "0105562012345", logo: "",
    billerId: "01234567890123", ref1Prefix: "KC", ref2Prefix: "INV",
  }
}

// ── Clients (External Invoice Recipients) ────────────────────
// Matches the external-invoice pattern in generateInvoices():
//   external invSeq range 276..295 → Client {seq} / Company {seq} Ltd.
function generateClients() {
  const EXTERNAL_SEQ_START = 276
  const EXTERNAL_COUNT = 20
  const STREET_NAMES = [
    "Sukhumvit","Sathorn","Silom","Rama 4","Rama 9","Wireless","Phaholyothin",
    "Ratchadaphisek","Asok","Ploenchit","Charoen Krung","Bang Na","Ramkhamhaeng",
    "Lat Phrao","Vibhavadi","Petchaburi","Ekkamai","Thonglor","Sri Nakarin","Rangsit",
  ]
  const POSTAL_CODES = ["10110","10120","10220","10310","10330","10400","10500","10900"]

  const clients: any[] = []
  const baseTime = new Date("2025-06-01").getTime()

  // 20 clients matching external invoices (so the dropdown/search is consistent)
  for (let i = 0; i < EXTERNAL_COUNT; i++) {
    const seq = EXTERNAL_SEQ_START + i
    clients.push({
      id: `cli-${pad(seq)}`,
      clientName: `Company ${seq} Ltd.`,
      clientId: `CL${pad(seq, 4)}`,
      contactName: `Client ${seq}`,
      address: `${seq} ${STREET_NAMES[i % STREET_NAMES.length]} Road, Bangkok ${POSTAL_CODES[i % POSTAL_CODES.length]}`,
      createdAt: new Date(baseTime + i * 86400000).toISOString(),
    })
  }

  // A few extra realistic client entries (no linked invoices yet)
  const EXTRA_CLIENTS: { name: string; contact: string; addr: string }[] = [
    { name: "Bangkok Hospitality Group Co., Ltd.", contact: "Khun Somchai Ratanawong", addr: "88 Sukhumvit Soi 24, Klongton, Bangkok 10110" },
    { name: "Siam Catering Services", contact: "Khun Niran Phumirat", addr: "123 Silom Road, Bang Rak, Bangkok 10500" },
    { name: "Thailand Conference Center", contact: "Ms. Patcharin Lim", addr: "456 Ratchadaphisek, Huai Khwang, Bangkok 10310" },
    { name: "Phoenix Event Solutions", contact: "Mr. David Johnson", addr: "77 Asok Montri Road, Bangkok 10110" },
    { name: "Royal Garden Florist", contact: "Khun Malee Suksawat", addr: "29 Wireless Road, Lumpini, Bangkok 10330" },
    { name: "Pacific Travel Agency", contact: "Khun Anan Wongchai", addr: "199 Ploenchit Road, Lumpini, Bangkok 10330" },
    { name: "Star Audio Visual Co., Ltd.", contact: "Mr. Kenji Tanaka", addr: "315 Phaholyothin Road, Chatuchak, Bangkok 10900" },
    { name: "Bangkok Sports Equipment", contact: "Khun Wichai Boonmee", addr: "42 Lat Phrao Road, Wang Thonglang, Bangkok 10310" },
  ]
  EXTRA_CLIENTS.forEach((c, idx) => {
    clients.push({
      id: `cli-extra-${idx + 1}`,
      clientName: c.name,
      clientId: `CL${pad(1000 + idx + 1, 4)}`,
      contactName: c.contact,
      address: c.addr,
      createdAt: new Date(baseTime + (EXTERNAL_COUNT + idx) * 86400000).toISOString(),
    })
  })

  return clients
}

// ══════════════════════════════════════════════════════════════
// MAIN SEEDER
// ══════════════════════════════════════════════════════════════
export function seedAllData() {
  try {
    // ── Force reseed v2: clear old mock data ─────────────────
    const RESEED_KEY = "seed_version"
    const SEED_VER = "3.9"
    if (localStorage.getItem(RESEED_KEY) !== SEED_VER) {
      const keysToRemove = [
        // NOTE: students_v1600 and families_v1600 intentionally excluded — preserve real backoffice student data
        "student_data_version_v3","academicYears","tuitionByYearData",
        "createdInvoices","paymentRecords","creditNotes","creditNotesRecords","invoiceEmailLogs","emailReminderHistory",
        "receiptRecords_tuition","receiptRecords_eca","receiptRecords_trip","receiptRecords_event","receiptRecords_summer","receiptRecords_external",
        "studentGroups","studentGroups_afterschool","studentGroups_event","studentGroups_eca","studentGroups_trip","studentGroups_exam","studentGroups_bus","studentGroups_external","summerDiscountGroups",
        "app:studentGroups_migrated_v2",
        "discountOptions","scholarshipRecords","staffChildRecords","earlyBirdRecords","schoolBusRecords",
        "activityLogs","schoolSettings","clientList","kingscollege_backoffice_clientList",
        "invoiceItems","afterschoolItems","ecaItems","eventItems","tripItems","examItems","summerItems","busItems","externalItems",
        "bankAccounts","onlineBankAccounts","kingscollege_backoffice_bankAccounts",
        "kingscollege_backoffice_debt-reminder:reminders-v2","kingscollege_backoffice_debt-reminder:globalSettings",
        "analyticsService_mockVersion", // force analytics to re-seed after full clear
        "analyticsService_studentLinked", // force student-linked re-seed
      ]
      keysToRemove.forEach(k => localStorage.removeItem(k))
      localStorage.setItem(RESEED_KEY, SEED_VER)
      console.log("[SeedData] Force reseed v2 — cleared old mock data")
    }

    // ── Generate or load student data ────────────────────────
    // Use stored students if available to ensure invoices/credit notes match
    let students: any[]
    let families: any[]
    const storedStudents = localStorage.getItem("students_v1600")
    const storedFamilies = localStorage.getItem("families_v1600")
    if (storedStudents && storedFamilies) {
      students = JSON.parse(storedStudents)
      families = JSON.parse(storedFamilies)
    } else {
      const generated = generateFamiliesAndStudents()
      students = generated.students
      families = generated.families
      localStorage.setItem("students_v1600", JSON.stringify(students))
      localStorage.setItem("families_v1600", JSON.stringify(families))
    }
    seedIfEmpty("student_data_version_v3", "3.1")

    // ── Generate all linked data from the SAME student pool ──
    const invoices = generateInvoices(students, families)
    const receipts = generateReceipts(invoices)
    const paymentRecords = generatePaymentRecords(invoices)
    const creditNotes = generateCreditNotes(invoices)
    const emailLogs = generateEmailLogs(invoices)
    const activityLogs = generateActivityLogs(invoices, students)
    const discountRecords = generateDiscountRecords(students)

    // ── Academic Years ───────────────────────────────────────
    const existingAY = localStorage.getItem("academicYears")
    if (existingAY && existingAY.includes("ay/")) localStorage.removeItem("academicYears")
    seedIfEmpty("academicYears", generateAcademicYears())

    // ── Tuition Data ─────────────────────────────────────────
    const existingTuition = localStorage.getItem("tuitionByYearData")
    if (existingTuition && !existingTuition.includes("2025/2026")) localStorage.removeItem("tuitionByYearData")
    seedIfEmpty("tuitionByYearData", generateTuitionData())

    // ── Invoice Items (all categories) ───────────────────────
    seedIfEmpty("invoiceItems", INVOICE_ITEMS)
    seedIfEmpty("afterschoolItems", AFTERSCHOOL_ITEMS)
    seedIfEmpty("ecaItems", ECA_ITEMS)
    seedIfEmpty("eventItems", EVENT_ITEMS)
    seedIfEmpty("tripItems", TRIP_ITEMS)
    seedIfEmpty("examItems", EXAM_ITEMS)
    seedIfEmpty("summerItems", SUMMER_ITEMS)
    seedIfEmpty("busItems", BUS_ITEMS)
    seedIfEmpty("externalItems", EXTERNAL_ITEMS)

    // ── Templates ────────────────────────────────────────────
    for (const cat of ["invoiceTemplates","afterschoolTemplates","ecaTemplates","eventTemplates","tripTemplates","examTemplates","summerTemplates","busTemplates","externalTemplates"]) {
      seedIfEmpty(cat, [])
    }

    // ── Invoices (all categories) ────────────────────────────
    // Version check: re-seed invoices when seed data structure changes
    const INVOICE_SEED_VERSION = "3.2" // Bump when invoice seed data changes
    const currentSeedVersion = localStorage.getItem("invoice_seed_version")
    // If analytics service has already seeded createdInvoices (5-year mock), skip seedData invoices
    const analyticsHasSeeded = !!localStorage.getItem("analyticsService_mockVersion")
    if (!analyticsHasSeeded) {
      if (currentSeedVersion !== INVOICE_SEED_VERSION) {
        localStorage.removeItem("createdInvoices")
        // Also clear receipts & payment records so they match new invoices
        for (const key of Object.keys(RECEIPT_STORAGE_MAP).map(k => RECEIPT_STORAGE_MAP[k])) {
          localStorage.removeItem(key)
        }
        localStorage.removeItem("paymentRecords")
        localStorage.removeItem("creditNotes")
        localStorage.removeItem("creditNotesRecords")
        localStorage.removeItem("invoiceEmailLogs")
        // Clear discount groups too so they stay in sync with invoice discounts
        localStorage.removeItem("studentGroups")
        localStorage.removeItem("scholarshipRecords")
        localStorage.removeItem("staffChildRecords")
        localStorage.removeItem("earlyBirdRecords")
      }
      seedIfEmpty("createdInvoices", invoices)
    }
    localStorage.setItem("invoice_seed_version", INVOICE_SEED_VERSION)

    // ── Receipts (per category storage key) ──────────────────
    for (const [key, records] of Object.entries(receipts)) {
      if (records.length > 0) seedIfEmpty(key, records)
    }

    // ── Payment Records ──────────────────────────────────────
    seedIfEmpty("paymentRecords", paymentRecords)

    // ── Credit Notes — versioned independently so historical notes always seed ──
    const CN_SEED_VERSION = "1.2"
    if (localStorage.getItem("creditNotes_seed_version") !== CN_SEED_VERSION) {
      localStorage.removeItem("creditNotes")
      localStorage.removeItem("creditNotesRecords")
    }
    seedIfEmpty("creditNotes", creditNotes)
    // creditNotesRecords is NOT pre-seeded — components fallback to creditNotes
    localStorage.setItem("creditNotes_seed_version", CN_SEED_VERSION)

    // ── Email Logs ───────────────────────────────────────────
    seedIfEmpty("invoiceEmailLogs", emailLogs)
    seedIfEmpty("emailReminderHistory", generateEmailReminderHistory())

    // ── Discount Options & Groups (all categories) ───────────
    seedIfEmpty("discountOptions", generateDiscountOptions())
    seedIfEmpty("studentGroups", generateStudentGroups(students))
    // Per-category discount groups (matches keys used by DiscountManagement)
    const CATEGORY_DEPT_MAP: Record<string, { key: string; department: string }> = {
      afterschool: { key: "studentGroups_afterschool", department: "After School" },
      event:       { key: "studentGroups_event",       department: "Event" },
      eca:         { key: "studentGroups_eca",         department: "ECA" },
      trip:        { key: "studentGroups_trip",        department: "Trip & Activity" },
      exam:        { key: "studentGroups_exam",        department: "Exam" },
      bus:         { key: "studentGroups_bus",         department: "School Bus" },
    }
    for (const [cat, { key, department }] of Object.entries(CATEGORY_DEPT_MAP)) {
      seedIfEmpty(key, generateCategoryDiscountGroups(students, cat, department))
    }
    // External stays empty — user explicitly excluded it
    seedIfEmpty("studentGroups_external", [])
    // Summer programme uses a different shape & storage key
    seedIfEmpty("summerDiscountGroups", generateSummerDiscountGroups(students))

    // ── Scholarship / Staff / Early Bird / Bus records ───────
    seedIfEmpty("scholarshipRecords", discountRecords.scholarship)
    seedIfEmpty("staffChildRecords", discountRecords.staffChild)
    seedIfEmpty("earlyBirdRecords", discountRecords.earlyBird)
    seedIfEmpty("schoolBusRecords", discountRecords.schoolBus)

    // ── Bank Accounts (both direct and prefixed keys) ────────
    seedIfEmpty("bankAccounts", BANK_ACCOUNTS_OFFLINE)
    seedIfEmpty("onlineBankAccounts", BANK_ACCOUNTS_ONLINE)
    seedIfEmpty("kingscollege_backoffice_bankAccounts", BANK_ACCOUNTS_OFFLINE)

    // ── Activity Logs ────────────────────────────────────────
    seedIfEmpty("activityLogs", activityLogs)

    // ── School Settings ──────────────────────────────────────
    seedIfEmpty("schoolSettings", generateSchoolSettings())

    // ── Client List (External Invoice Recipients) ────────────
    // Note: ClientList component uses usePersistedState which adds "kingscollege_backoffice_" prefix
    seedIfEmpty("kingscollege_backoffice_clientList", generateClients())

    // ── Debt Reminder Config (usePersistedState prefixed) ────
    seedIfEmpty("kingscollege_backoffice_debt-reminder:reminders-v2", generateDebtReminders())
    seedIfEmpty("kingscollege_backoffice_debt-reminder:globalSettings", JSON.stringify({ enableReminders: true, fromEmail: "finance@kingscollege.ac.th" }))

    console.log(`[SeedData] Seeded: ${students.length} students, ${families.length} families, ${invoices.length} invoices (${[...new Set(invoices.map(i=>i.category))].join(",")}), ${Object.values(receipts).flat().length} receipts, ${paymentRecords.length} payments, ${creditNotes.length} credit notes`)
  } catch (e) {
    console.error("[SeedData] Failed to seed data:", e)
  }
}
