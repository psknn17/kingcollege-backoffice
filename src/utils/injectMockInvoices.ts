// DEV-only: generates mock invoices for every student in the system
// Runs once per student; skips if already injected (idempotent)

const STORAGE_KEYS: Record<string, string> = {
  tuition: "createdInvoices",
  eca: "createdInvoices_eca",
  trip: "createdInvoices_trip",
  exam: "createdInvoices_exam",
  bus: "createdInvoices_bus",
}

const SENTINEL = "__mockInvoicesInjected_v2__"

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

  // ECA: 70% chance, pick 1-2 activities
  if (rand() < 0.7) {
    const ecaName = ECA_NAMES[Math.floor(rand() * ECA_NAMES.length)]
    const ecaAmount = ECA_AMOUNTS[Math.floor(rand() * ECA_AMOUNTS.length)]
    const ecaDue = Math.floor(rand() * 35) - 3
    const invs: any[] = [{
      id: idOf("eca", 1),
      invoiceNumber: invNum(2),
      studentId,
      category: "eca",
      term: "Term 1 2025/2026",
      approvalStatus: "approved",
      status: ecaDue < 0 ? "overdue" : "unpaid",
      netAmount: ecaAmount,
      dueDate: daysFromNow(ecaDue),
      createdAt: daysFromNow(-25),
      description: `ECA - ${ecaName}`,
      items: [{ name: `${ecaName} Class`, amount: ecaAmount }],
    }]
    // 30% chance of a 2nd ECA
    if (rand() < 0.3) {
      const eca2Name = ECA_NAMES[Math.floor(rand() * ECA_NAMES.length)]
      const eca2Amount = ECA_AMOUNTS[Math.floor(rand() * ECA_AMOUNTS.length)]
      const eca2Due = Math.floor(rand() * 35)
      invs.push({
        id: idOf("eca", 2),
        invoiceNumber: invNum(3),
        studentId,
        category: "eca",
        term: "Term 1 2025/2026",
        approvalStatus: "approved",
        status: "unpaid",
        netAmount: eca2Amount,
        dueDate: daysFromNow(eca2Due),
        createdAt: daysFromNow(-20),
        description: `ECA - ${eca2Name}`,
        items: [{ name: `${eca2Name} Class`, amount: eca2Amount }],
      })
    }
    result["createdInvoices_eca"] = invs
  }

  // Trip: 50% chance
  if (rand() < 0.5) {
    const tripName = TRIP_NAMES[Math.floor(rand() * TRIP_NAMES.length)]
    const tripAmount = TRIP_AMOUNTS[Math.floor(rand() * TRIP_AMOUNTS.length)]
    const tripDue = Math.floor(rand() * 30) - 2
    result["createdInvoices_trip"] = [{
      id: idOf("trip", 1),
      invoiceNumber: invNum(4),
      studentId,
      category: "trip",
      term: "Term 1 2025/2026",
      approvalStatus: "approved",
      status: tripDue < 0 ? "overdue" : "unpaid",
      netAmount: tripAmount,
      dueDate: daysFromNow(tripDue),
      createdAt: daysFromNow(-14),
      description: `Field Trip - ${tripName}`,
      items: [{ name: "Field Trip Fee", amount: tripAmount }],
    }]
  }

  // Exam: 40% chance
  if (rand() < 0.4) {
    const examAmount = EXAM_AMOUNTS[Math.floor(rand() * EXAM_AMOUNTS.length)]
    const examDue = Math.floor(rand() * 30) - 4
    result["createdInvoices_exam"] = [{
      id: idOf("exam", 1),
      invoiceNumber: invNum(5),
      studentId,
      category: "exam",
      term: "Term 1 2025/2026",
      approvalStatus: "approved",
      status: examDue < 0 ? "overdue" : "unpaid",
      netAmount: examAmount,
      dueDate: daysFromNow(examDue),
      createdAt: daysFromNow(-18),
      description: "Exam Registration Fee",
      items: [{ name: "Exam Fee", amount: examAmount }],
    }]
  }

  // Bus: 60% chance
  if (rand() < 0.6) {
    const busAmount = BUS_AMOUNTS[Math.floor(rand() * BUS_AMOUNTS.length)]
    const busDue = Math.floor(rand() * 40)
    const busStatus = rand() < 0.15 ? "partial" : "unpaid"
    result["createdInvoices_bus"] = [{
      id: idOf("bus", 1),
      invoiceNumber: invNum(6),
      studentId,
      category: "bus",
      term: "Term 1 2025/2026",
      approvalStatus: "approved",
      status: busStatus,
      netAmount: busAmount,
      dueDate: daysFromNow(busDue),
      createdAt: daysFromNow(-28),
      description: "School Bus Term 1 2025/2026",
      items: [{ name: "Bus Fee", amount: busAmount }],
    }]
  }

  return result
}

export function injectMockInvoices(students: { studentId: string }[]) {
  if (localStorage.getItem(SENTINEL)) return  // already injected

  // Load existing data
  const buckets: Record<string, Map<string, any>> = {}
  for (const key of Object.values(STORAGE_KEYS)) {
    const existing: any[] = JSON.parse(localStorage.getItem(key) || "[]")
    buckets[key] = new Map(existing.map((i: any) => [i.id, i]))
  }

  // Generate for every student
  students.forEach((s, idx) => {
    const byKey = generateInvoicesForStudent(s.studentId, idx + 1)
    for (const [key, invs] of Object.entries(byKey)) {
      if (!buckets[key]) buckets[key] = new Map()
      for (const inv of invs) buckets[key].set(inv.id, inv)
    }
  })

  // Persist
  for (const [key, map] of Object.entries(buckets)) {
    localStorage.setItem(key, JSON.stringify(Array.from(map.values())))
  }

  localStorage.setItem(SENTINEL, "1")
  console.log(`✅ Mock invoices injected for ${students.length} students`)
}
