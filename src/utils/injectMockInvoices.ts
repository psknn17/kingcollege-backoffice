// DEV-only: generates mock invoices for every student in the system
// Runs once per student; skips if already injected (idempotent)

const STORAGE_KEYS: Record<string, string> = {
  tuition: "createdInvoices",
  eca: "createdInvoices_eca",
  trip: "createdInvoices_trip",
  exam: "createdInvoices_exam",
  bus: "createdInvoices_bus",
}

const INJECTED_SET_KEY = "__mockInvoicesInjectedIds_v4__"

function getInjectedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(INJECTED_SET_KEY) || "[]")) }
  catch { return new Set() }
}

function saveInjectedIds(ids: Set<string>) {
  localStorage.setItem(INJECTED_SET_KEY, JSON.stringify(Array.from(ids)))
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function daysFromNow(offsetDays: number): string {
  const dt = new Date()
  dt.setDate(dt.getDate() + offsetDays)
  return dt.toISOString()
}

const ECA_NAMES = ["Swimming", "Piano", "Football", "Basketball", "Art & Craft", "Chess", "Dance", "Drama", "Guitar", "Tennis", "Badminton", "Coding Club"]
const TRIP_NAMES = ["Science Museum", "National Park", "Historical Site", "Art Gallery", "Planetarium", "Zoo Visit", "Botanical Garden"]
const TUITION_AMOUNTS = [78000, 82000, 87500, 90000, 95000, 102000, 108000, 115000]
const ECA_AMOUNTS = [4500, 6000, 7500, 8500, 9000, 10000, 11000, 12500]
const TRIP_AMOUNTS = [1800, 2500, 3200, 4500, 5500, 6000]
const EXAM_AMOUNTS = [1200, 1500, 1800, 2000, 2200]
const BUS_AMOUNTS = [9500, 10500, 12000, 13500, 15000]

export function generateInvoicesForStudent(studentId: string, index: number): Record<string, any[]> {
  const rand = seededRandom(index * 31337 + studentId.charCodeAt(studentId.length - 1) * 997)
  const result: Record<string, any[]> = {}

  const invNum = (n: number) => `INV-2025-${String(index * 10 + n).padStart(5, "0")}`
  const idOf = (cat: string, n: number) => `mock-${studentId}-${cat}-${n}`

  // Tuition: every student gets one
  const tAmount = TUITION_AMOUNTS[Math.floor(rand() * TUITION_AMOUNTS.length)]
  const tDue = Math.floor(rand() * 40) - 5  // -5 to +35 days
  result["createdInvoices"] = [{
    id: idOf("tuition", 1),
    invoiceNumber: invNum(1),
    studentId,
    category: "tuition",
    term: "Term 1 2025/2026",
    approvalStatus: "approved",
    status: tDue < 0 ? "overdue" : "unpaid",
    netAmount: tAmount,
    dueDate: daysFromNow(tDue),
    createdAt: daysFromNow(-30),
    description: "Tuition Fee Term 1 2025/2026",
    items: [{ name: "Tuition Fee", amount: tAmount }],
  }]

  // ECA 1 — always
  const ecaName = ECA_NAMES[Math.floor(rand() * ECA_NAMES.length)]
  const ecaAmount = ECA_AMOUNTS[Math.floor(rand() * ECA_AMOUNTS.length)]
  const ecaDue = Math.floor(rand() * 35) - 3
  // ECA 2 — always
  const eca2Name = ECA_NAMES[Math.floor(rand() * ECA_NAMES.length)]
  const eca2Amount = ECA_AMOUNTS[Math.floor(rand() * ECA_AMOUNTS.length)]
  const eca2Due = Math.floor(rand() * 35)
  result["createdInvoices_eca"] = [
    {
      id: idOf("eca", 1), invoiceNumber: invNum(2), studentId,
      category: "eca", term: "Term 1 2025/2026", approvalStatus: "approved",
      status: ecaDue < 0 ? "overdue" : "unpaid",
      netAmount: ecaAmount, dueDate: daysFromNow(ecaDue), createdAt: daysFromNow(-25),
      description: `ECA - ${ecaName}`, items: [{ name: `${ecaName} Class`, amount: ecaAmount }],
    },
    {
      id: idOf("eca", 2), invoiceNumber: invNum(3), studentId,
      category: "eca", term: "Term 1 2025/2026", approvalStatus: "approved",
      status: eca2Due < 0 ? "overdue" : "unpaid",
      netAmount: eca2Amount, dueDate: daysFromNow(eca2Due), createdAt: daysFromNow(-20),
      description: `ECA - ${eca2Name}`, items: [{ name: `${eca2Name} Class`, amount: eca2Amount }],
    },
  ]

  // Trip — always
  const tripName = TRIP_NAMES[Math.floor(rand() * TRIP_NAMES.length)]
  const tripAmount = TRIP_AMOUNTS[Math.floor(rand() * TRIP_AMOUNTS.length)]
  const tripDue = Math.floor(rand() * 30) - 2
  result["createdInvoices_trip"] = [{
    id: idOf("trip", 1), invoiceNumber: invNum(4), studentId,
    category: "trip", term: "Term 1 2025/2026", approvalStatus: "approved",
    status: tripDue < 0 ? "overdue" : "unpaid",
    netAmount: tripAmount, dueDate: daysFromNow(tripDue), createdAt: daysFromNow(-14),
    description: `Field Trip - ${tripName}`, items: [{ name: "Field Trip Fee", amount: tripAmount }],
  }]

  // Exam — always
  const examAmount = EXAM_AMOUNTS[Math.floor(rand() * EXAM_AMOUNTS.length)]
  const examDue = Math.floor(rand() * 30) - 4
  result["createdInvoices_exam"] = [{
    id: idOf("exam", 1), invoiceNumber: invNum(5), studentId,
    category: "exam", term: "Term 1 2025/2026", approvalStatus: "approved",
    status: examDue < 0 ? "overdue" : "unpaid",
    netAmount: examAmount, dueDate: daysFromNow(examDue), createdAt: daysFromNow(-18),
    description: "Exam Registration Fee", items: [{ name: "Exam Fee", amount: examAmount }],
  }]

  // Bus: 60% chance (optional 5th type)
  if (rand() < 0.6) {
    const busAmount = BUS_AMOUNTS[Math.floor(rand() * BUS_AMOUNTS.length)]
    const busDue = Math.floor(rand() * 40)
    result["createdInvoices_bus"] = [{
      id: idOf("bus", 1), invoiceNumber: invNum(6), studentId,
      category: "bus", term: "Term 1 2025/2026", approvalStatus: "approved",
      status: rand() < 0.15 ? "partial" : "unpaid",
      netAmount: busAmount, dueDate: daysFromNow(busDue), createdAt: daysFromNow(-28),
      description: "School Bus Term 1 2025/2026", items: [{ name: "Bus Fee", amount: busAmount }],
    }]
  }

  return result
}

const MAX_MOCK_STUDENTS = 100

export function injectMockInvoices(students: { studentId: string }[]) {
  const injectedIds = getInjectedIds()

  // Find students with no existing invoices (across all keys)
  const existingStudentIds = new Set<string>()
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]")
      existing.forEach((inv: any) => { if (inv.studentId) existingStudentIds.add(inv.studentId) })
    } catch { /* ignore */ }
  }

  const candidates = students.filter(
    s => !injectedIds.has(s.studentId) && !existingStudentIds.has(s.studentId)
  ).slice(0, MAX_MOCK_STUDENTS)

  if (candidates.length === 0) return

  // Load existing data
  const buckets: Record<string, Map<string, any>> = {}
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]")
      buckets[key] = new Map(existing.map((i: any) => [i.id, i]))
    } catch { buckets[key] = new Map() }
  }

  candidates.forEach((s, idx) => {
    const globalIdx = students.findIndex(x => x.studentId === s.studentId) + 1
    const byKey = generateInvoicesForStudent(s.studentId, globalIdx)
    for (const [key, invs] of Object.entries(byKey)) {
      if (!buckets[key]) buckets[key] = new Map()
      for (const inv of invs) buckets[key].set(inv.id, inv)
    }
    injectedIds.add(s.studentId)
  })

  // Persist with quota guard
  let saved = 0
  for (const [key, map] of Object.entries(buckets)) {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(map.values())))
      saved++
    } catch {
      console.warn(`⚠️ localStorage quota exceeded at key "${key}" — stopping mock injection`)
      break
    }
  }

  saveInjectedIds(injectedIds)
  console.log(`✅ Mock invoices injected for ${candidates.length} students (${saved} keys saved)`)
}
