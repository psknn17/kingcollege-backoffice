/**
 * analyticsService.ts
 *
 * Analytics data service for the Analytics Dashboard.
 * Currently reads from localStorage (mock/demo mode).
 *
 * ─── HOW TO SWAP TO REAL API (when backend is ready) ──────────────────────────
 * Replace each function body with a fetch() call to the documented endpoint.
 * All functions are already async — no call-site changes needed.
 *
 * Example:
 *   export async function getRevenueByYearGroup(params) {
 *     const res = await fetch(`/api/analytics/revenue-by-year-group?${new URLSearchParams(params)}`)
 *     return res.json()
 *   }
 * ──────────────────────────────────────────────────────────────────────────────
 */


// ── MOCK DATA (shown when localStorage has no real invoices) ───────────────────

function getMockInvoices(): any[] {
  const yearGroups = [
    "Pre-Nursery", "Nursery", "Reception",
    "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
    "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
  ]
  const academicYears = ["2023/2024", "2024/2025"]
  const terms = ["Term 1", "Term 2", "Term 3"]
  const categories = ["tuition", "eca", "trip", "exam", "bus"]
  const statuses = ["paid", "paid", "paid", "paid", "overdue", "pending", "cancelled"]

  // Tuition base fees per year group (THB)
  const tuitionFees: Record<string, number> = {
    "Pre-Nursery": 85000, "Nursery": 90000, "Reception": 95000,
    "Year 1": 100000, "Year 2": 100000, "Year 3": 105000,
    "Year 4": 105000, "Year 5": 110000, "Year 6": 110000,
    "Year 7": 135000, "Year 8": 135000, "Year 9": 140000,
    "Year 10": 150000, "Year 11": 150000, "Year 12": 165000, "Year 13": 165000
  }

  const students: Record<string, { id: string; family: string }> = {}
  yearGroups.forEach((yg, yi) => {
    const count = yg.startsWith("Year 1") || yg.startsWith("Year 2") ? 28 : 22
    for (let i = 0; i < count; i++) {
      const id = `S${String(yi * 30 + i + 1).padStart(4, "0")}`
      students[id] = { id, family: `F${String(Math.floor((yi * 30 + i) / 2)).padStart(4, "0")}` }
    }
  })

  const invoices: any[] = []
  let invNum = 1000

  Object.entries(students).forEach(([sid, stu]) => {
    const grade = yearGroups.find((_, idx) => {
      const start = idx * 30
      const end = start + 30
      const num = parseInt(sid.slice(1))
      return num >= start + 1 && num <= end
    }) || yearGroups[Math.floor(Math.random() * yearGroups.length)]

    const baseFee = tuitionFees[grade] || 100000

    academicYears.forEach(ay => {
      terms.forEach(term => {
        // Tuition invoice (every student, every term)
        const discount = Math.random() < 0.15 ? Math.round(baseFee * (Math.random() < 0.5 ? 0.1 : 0.2)) : 0
        const discountType = discount > 0 ? (Math.random() < 0.5 ? "sibling" : "scholarship") : null
        invoices.push({
          id: `INV-${invNum++}`,
          studentId: sid,
          familyCode: stu.family,
          studentGrade: grade,
          academicYear: ay,
          term,
          category: "tuition",
          subtotal: baseFee,
          totalDiscount: discount,
          netAmount: baseFee - discount,
          finalAmount: baseFee - discount,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          discounts: discount > 0 ? [{ name: discountType === "sibling" ? "Sibling Discount" : "Scholarship", amount: -discount }] : []
        })

        // ECA (60% of students)
        if (Math.random() < 0.60) {
          const ecaFee = [8000, 10000, 12000, 15000][Math.floor(Math.random() * 4)]
          invoices.push({
            id: `INV-${invNum++}`,
            studentId: sid,
            familyCode: stu.family,
            studentGrade: grade,
            academicYear: ay,
            term,
            category: "eca",
            subtotal: ecaFee,
            totalDiscount: 0,
            netAmount: ecaFee,
            finalAmount: ecaFee,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            discounts: []
          })
        }

        // Trip (30% of students, Term 2 only)
        if (term === "Term 2" && Math.random() < 0.30) {
          const tripFee = [18000, 25000, 35000][Math.floor(Math.random() * 3)]
          invoices.push({
            id: `INV-${invNum++}`,
            studentId: sid,
            familyCode: stu.family,
            studentGrade: grade,
            academicYear: ay,
            term,
            category: "trip",
            subtotal: tripFee,
            totalDiscount: 0,
            netAmount: tripFee,
            finalAmount: tripFee,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            discounts: []
          })
        }

        // Sport Competition (35% of students, Term 3 only, Year 4+)
        const yearNum = parseInt(grade.replace("Year ", ""))
        if (term === "Term 3" && !isNaN(yearNum) && yearNum >= 4 && Math.random() < 0.35) {
          const sportFee = [5000, 7000, 9000][Math.floor(Math.random() * 3)]
          invoices.push({
            id: `INV-${invNum++}`,
            studentId: sid,
            familyCode: stu.family,
            studentGrade: grade,
            academicYear: ay,
            term,
            category: "sport",
            subtotal: sportFee,
            totalDiscount: 0,
            netAmount: sportFee,
            finalAmount: sportFee,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            discounts: []
          })
        }

        // Others (20% of students — school bus, uniform, misc)
        if (Math.random() < 0.20) {
          const otherFee = [8000, 12000, 15000][Math.floor(Math.random() * 3)]
          invoices.push({
            id: `INV-${invNum++}`,
            studentId: sid,
            familyCode: stu.family,
            studentGrade: grade,
            academicYear: ay,
            term,
            category: "others",
            subtotal: otherFee,
            totalDiscount: 0,
            netAmount: otherFee,
            finalAmount: otherFee,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            discounts: []
          })
        }
      })
    })
  })

  return invoices
}

// Payment methods as defined in src/constants/paymentConstants.ts → PAYMENT_SOURCES
function getMockPaymentRecords(): any[] {
  const methods = [
    { name: "Bank Transfer",      weight: 0.38 },
    { name: "Onsite Credit Card", weight: 0.22 },
    { name: "Thai QR",            weight: 0.15 },
    { name: "Online Credit Card", weight: 0.13 },
    { name: "Cheque",             weight: 0.07 },
    { name: "Bill Payment",       weight: 0.05 },
  ]

  const records: any[] = []
  const total = 420

  methods.forEach(m => {
    const count = Math.round(total * m.weight)
    for (let i = 0; i < count; i++) {
      records.push({
        paymentMethod: m.name,
        amount: Math.round((50000 + Math.random() * 150000) / 1000) * 1000
      })
    }
  })

  return records
}

function getMockTransactionAttempts(): { successful: number; declined: number; byMethod: Record<string, { success: number; declined: number }> } {
  return {
    successful: 420,
    declined: 0,
    byMethod: {
      "Bank Transfer":      { success: 160, declined: 0 },
      "Onsite Credit Card": { success: 92,  declined: 0 },
      "Thai QR":            { success: 63,  declined: 0 },
      "Online Credit Card": { success: 55,  declined: 0 },
      "Cheque":             { success: 29,  declined: 0 },
      "Bill Payment":       { success: 21,  declined: 0 },
    }
  }
}

// Deterministic hash so mock fee amounts are stable (no Math.random)
function strHash(s: string): number {
  let n = 0
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) & 0x7fffffff
  return n
}

function getMockBankFees(filter: AnalyticsFilter): BankFeeRow[] {
  // Read configured bank accounts from Bank Settings (localStorage)
  let configuredBanks: { bankName: string; paymentSource: string }[] = []
  try {
    const stored = localStorage.getItem("kingscollege_backoffice_bankAccounts")
    if (stored) {
      const accounts: any[] = JSON.parse(stored)
      const seen = new Set<string>()
      accounts
        .filter(a => a.isActive !== false && a.bankName)
        .forEach(a => {
          if (!seen.has(a.bankName)) {
            seen.add(a.bankName)
            configuredBanks.push({ bankName: a.bankName, paymentSource: a.paymentSource || "" })
          }
        })
    }
  } catch {}

  // Fallback if no bank accounts configured yet
  if (configuredBanks.length === 0) {
    configuredBanks = [
      { bankName: "KBank", paymentSource: "EDC" },
      { bankName: "UOB",   paymentSource: "EDC" },
      { bankName: "TTB",   paymentSource: "Thai QR" },
      { bankName: "KTC",   paymentSource: "Online" },
    ]
  }

  const academicYears = ["2023/2024", "2024/2025"]
  const terms = ["Term 1", "Term 2", "Term 3"]
  const allRows: BankFeeRow[] = []

  configuredBanks.forEach(({ bankName, paymentSource }) => {
    const isEDC = paymentSource === "EDC" || paymentSource === "Credit Card"
    const isQR  = paymentSource === "Thai QR"
    const baseFee = isEDC ? 200000 : isQR ? 48000 : 65000
    const baseTxn = isEDC ? 15 : isQR ? 30 : 8

    academicYears.forEach(ay => {
      terms.forEach(term => {
        const seed = strHash(`${bankName}${ay}${term}`)
        const mult = 0.80 + (seed % 40) / 100   // 0.80 – 1.19
        allRows.push({
          bankName,
          paymentSource,
          academicYear: ay,
          term,
          feeAmount: Math.round(baseFee * mult / 1000) * 1000,
          transactionCount: Math.max(1, Math.round(baseTxn * mult)),
        })
      })
    })
  })

  const ONLINE_SOURCES = ["thai qr", "online", "qr payment", "internet banking"]

  return allRows.filter(r => {
    if (filter.academicYear && filter.academicYear !== "all" && r.academicYear !== filter.academicYear) return false
    if (filter.term && filter.term !== "all" && r.term !== filter.term) return false
    // Online only — whitelist Thai QR and Online gateway sources
    const src = (r.paymentSource || "").toLowerCase()
    if (!ONLINE_SOURCES.some(s => src.includes(s))) return false
    return true
  })
}

// Pre-compute static fallback mock data (used only when localStorage is empty)
let _mockInvoices: any[] | null = null
let _mockPayments: any[] | null = null
// eslint-disable-next-line prefer-const
let _mockWaterfall: any[] | null = null

function normalizeStoredInvoice(inv: any) {
  return {
    ...inv,
    // Normalize term: "Term 1 2025/2026" → "Term 1"
    term: inv.termName || (typeof inv.term === "string" ? inv.term.split(" ").slice(0, 2).join(" ") : "Term 1"),
    studentGrade: inv.studentGrade || inv.yearGroup || "Unknown",
    netAmount: inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0,
  }
}

function cachedMockInvoices() {
  // Primary: read from localStorage (same source as Dashboard) for consistent totals
  try {
    const stored = localStorage.getItem("createdInvoices")
    if (stored) {
      const real: any[] = JSON.parse(stored)
      if (real.length > 0) {
        return real
          .filter(inv => inv.status && inv.status !== "draft")
          .map(normalizeStoredInvoice)
      }
    }
  } catch { /* ignore storage errors */ }

  // Fallback: static mock data when localStorage is empty
  if (!_mockInvoices) _mockInvoices = getMockInvoices()
  return _mockInvoices
}
function cachedMockPayments() {
  if (!_mockPayments) _mockPayments = getMockPaymentRecords()
  return _mockPayments
}
function cachedMockWaterfall() {
  if (!_mockWaterfall) _mockWaterfall = getMockWaterfallRows()
  return _mockWaterfall
}

// Matches Dashboard's CONFIRMED_STATUSES — invoices that count as revenue
const CONFIRMED_STATUSES = new Set(["paid", "sent", "overdue", "approved"])

export const YEAR_GROUP_ORDER = [
  "Pre-Nursery", "Nursery", "Reception",
  ...Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`)
]

const sortByYearGroup = <T extends { yearGroup: string }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => {
    const ai = YEAR_GROUP_ORDER.indexOf(a.yearGroup)
    const bi = YEAR_GROUP_ORDER.indexOf(b.yearGroup)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

// ── TYPES ──────────────────────────────────────────────────────────────────────

export interface AnalyticsFilter {
  academicYear?: string
  term?: string
  category?: string   // "all" | "tuition" | "eca" | "trip" | "sport" | "exam" | "bus" | "others"
}

/** Report 1: YoY / Term-on-Term Revenue by Year Group */
export interface RevenueByYearGroup {
  yearGroup: string
  academicYear: string
  term: string
  grossRevenue: number      // totalAmount (before discount)
  discountAmount: number    // sum of all discounts
  netRevenue: number        // finalAmount (after discount)
  studentCount: number      // number of invoices / students in period
  categories: {
    tuition: number
    eca: number
    trip: number
    sport: number
    others: number
  }
}

/** Report 2: Average Revenue per Student per Year Group */
export interface AvgRevenueByYearGroup {
  yearGroup: string
  totalRevenue: number
  studentCount: number
  avgPerStudent: number
  breakdown: {
    tuition: number
    eca: number
    trip: number
    sport: number
    others: number
  }
}

/** Matrix row: Year Group × Term columns (for Tab 1 left table) */
export interface RevenueTermMatrixRow {
  yearGroup: string
  termCols: Record<string, number>   // key = "2024/2025 Term 1", value = netRevenue
  _type?: "module"
}

/** Matrix row: Year Group × Academic Year columns (for Tab 1 right table) */
export interface RevenueYearMatrixRow {
  yearGroup: string
  yearCols: Record<string, number>   // key = "2024/2025", value = netRevenue
  _type?: "module"
}

/** Row for Avg Revenue Tab — one row per year group */
export interface AvgTermMatrixRow {
  yearGroup: string
  studentCount: number
  termCols: Record<string, number>          // key = "2024/2025 Term 1", value = avg net per student
  termStudentCounts: Record<string, number> // key = "2024/2025 Term 1", value = unique student count in that term
}

export interface AvgYearMatrixRow {
  yearGroup: string
  studentCount: number
  yearCols: Record<string, number>          // key = "2024/2025", value = avg net per student
  yearStudentCounts: Record<string, number> // key = "2024/2025", value = unique student count in that year
}

/** Report 3: Transaction count by payment method */
export interface TransactionByMethod {
  method: string
  count: number
  totalAmount: number
  percentage: number
}

/** Year Group × Method matrix row (for Tab 3) */
export interface TransactionYearGroupMethodRow {
  yearGroup: string
  methods: Record<string, number>    // key = method name, value = count
  total: number
}

/** Bank fees: Year Group × Term/Year matrix rows (for Tab 5) */
export interface BankFeeTermMatrixRow {
  bankName: string
  paymentSource: string
  termCols: Record<string, number>   // key = "2024/2025 Term 1"
}

export interface BankFeeYearMatrixRow {
  bankName: string
  paymentSource: string
  yearCols: Record<string, number>   // key = "2024/2025"
}

/** Report 4: Declined vs Successful transactions */
export interface TransactionStatus {
  label: string
  status: "successful" | "declined"
  count: number
  percentage: number
  byMethod?: Record<string, { success: number; declined: number }>
}

/** Report 5: Bank fees by term/year (requires backend/gateway data) */
export interface BankFeeRow {
  bankName: string
  paymentSource: string
  academicYear: string
  term: string
  feeAmount: number         // provided by bank gateway
  transactionCount: number
}

/** Report 6: Net vs Gross revenue waterfall (by Year Group) */
export interface RevenueWaterfall {
  yearGroup: string
  studentCount: number
  grossRevenue: number
  discounts: Record<string, number>  // key = discount group name, value = amount (negative)
  bankFees: number
  netRevenue: number
}

// ── HELPERS ────────────────────────────────────────────────────────────────────

function loadInvoices(filter: AnalyticsFilter): any[] {
  return cachedMockInvoices().filter(inv => {
    if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
    if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
    if (filter.category && filter.category !== "all") {
      const cat = inv.category || "tuition"
      if (cat !== filter.category) return false
    }
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })
}

function catAmount(inv: any, cat: string): number {
  if ((inv.category || "tuition") !== cat) return 0
  return inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0
}

// ── REPORT 1: Revenue by Year Group ───────────────────────────────────────────

/**
 * GET /api/analytics/revenue-by-year-group
 * Query: { academicYear?: string, term?: string }
 * Response: RevenueByYearGroup[]
 */
export async function getRevenueByYearGroup(filter: AnalyticsFilter): Promise<RevenueByYearGroup[]> {
  const invoices = loadInvoices(filter)
  const map = new Map<string, RevenueByYearGroup>()

  const ygSet = new Set(YEAR_GROUP_ORDER)
  invoices.forEach(inv => {
    const yg = inv.studentGrade || ""
    if (!ygSet.has(yg)) return
    const ay = inv.academicYear || "-"
    const tm = inv.term || "-"
    const key = `${yg}|${ay}|${tm}`

    const gross = inv.subtotal ?? inv.totalAmount ?? 0
    const discount = inv.totalDiscount ?? inv.discountAmount ?? 0
    const net = inv.netAmount ?? inv.finalAmount ?? (gross - discount)
    const cat = inv.category || "tuition"

    const existing = map.get(key) ?? {
      yearGroup: yg, academicYear: ay, term: tm,
      grossRevenue: 0, discountAmount: 0, netRevenue: 0, studentCount: 0,
      categories: { tuition: 0, eca: 0, trip: 0, sport: 0, others: 0 }
    }

    existing.grossRevenue += gross
    existing.discountAmount += discount
    existing.netRevenue += net
    existing.studentCount += 1
    if (cat === "tuition") existing.categories.tuition += net
    else if (cat === "eca") existing.categories.eca += net
    else if (cat === "trip") existing.categories.trip += net
    else if (cat === "sport") existing.categories.sport += net
    else existing.categories.others += net

    map.set(key, existing)
  })

  return sortByYearGroup(Array.from(map.values()))
}

// ── REPORT 2: Average Revenue per Student ─────────────────────────────────────

/**
 * GET /api/analytics/avg-revenue-by-year-group
 * Query: { academicYear?: string, term?: string }
 * Response: AvgRevenueByYearGroup[]
 */
export async function getAvgRevenueByYearGroup(filter: AnalyticsFilter): Promise<AvgRevenueByYearGroup[]> {
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
    if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
    if (filter.category && filter.category !== "all" && (inv.category || "tuition") !== filter.category) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })
  const map = new Map<string, { total: number; students: Set<string>; breakdown: AvgRevenueByYearGroup["breakdown"] }>()

  invoices.forEach(inv => {
    const yg = inv.studentGrade || "Unknown"
    const net = inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0
    const cat = inv.category || "tuition"

    const existing = map.get(yg) ?? {
      total: 0, students: new Set<string>(),
      breakdown: { tuition: 0, eca: 0, trip: 0, sport: 0, others: 0 }
    }
    existing.total += net
    if (inv.studentId) existing.students.add(inv.studentId)
    if (cat === "tuition") existing.breakdown.tuition += net
    else if (cat === "eca") existing.breakdown.eca += net
    else if (cat === "trip") existing.breakdown.trip += net
    else if (cat === "sport") existing.breakdown.sport += net
    else existing.breakdown.others += net
    map.set(yg, existing)
  })

  const result: AvgRevenueByYearGroup[] = []
  map.forEach((v, yg) => {
    const count = v.students.size || 1
    result.push({
      yearGroup: yg,
      totalRevenue: v.total,
      studentCount: v.students.size,
      avgPerStudent: Math.round(v.total / count),
      breakdown: v.breakdown
    })
  })
  return sortByYearGroup(result)
}

// ── REPORT 1b: Revenue Term Matrix (dual-table left) ──────────────────────────

const MODULE_LABELS: Record<string, string> = {
  tuition: "Tuition", eca: "ECA", trip: "Trip", sport: "ECA-Sport",
  exam: "Exam", bus: "Bus", others: "Other", external: "External",
}
const MODULE_ORDER = ["tuition", "eca", "trip", "sport", "exam", "bus", "others", "external"]

/**
 * Returns rows of [ yearGroup, { "2024/2025 Term 1": netRev, ... } ]
 * Used for "Compare by Term" left table in Tab 1.
 */
export async function getRevenueTermMatrix(filter: AnalyticsFilter): Promise<{
  rows: RevenueTermMatrixRow[]
  termKeys: string[]
}> {
  // Load without term filter (we want all terms as columns)
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
    if (filter.category && filter.category !== "all" && (inv.category || "tuition") !== filter.category) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  const termKeySet = new Set<string>()
  const map = new Map<string, Record<string, number>>()

  const ygSet = new Set(YEAR_GROUP_ORDER)

  invoices.forEach(inv => {
    const yg = inv.studentGrade || ""
    if (!ygSet.has(yg)) return
    const key = `${inv.academicYear} ${inv.term}`
    termKeySet.add(key)
    const net = inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0

    if (!map.has(yg)) map.set(yg, {})
    const row = map.get(yg)!
    row[key] = (row[key] ?? 0) + net
  })

  const termKeys = Array.from(termKeySet).sort()
  const rows: RevenueTermMatrixRow[] = []
  map.forEach((termCols, yearGroup) => {
    rows.push({ yearGroup, termCols })
  })

  return { rows: sortByYearGroup(rows), termKeys }
}

/**
 * Returns rows of [ yearGroup, { "2024/2025": netRev, ... } ]
 * Used for "Compare by Academic Year" right table in Tab 1.
 */
export async function getRevenueYearMatrix(filter: AnalyticsFilter): Promise<{
  rows: RevenueYearMatrixRow[]
  yearKeys: string[]
}> {
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.category && filter.category !== "all" && (inv.category || "tuition") !== filter.category) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  const yearKeySet = new Set<string>()
  const map = new Map<string, Record<string, number>>()

  const ygSet = new Set(YEAR_GROUP_ORDER)

  invoices.forEach(inv => {
    const yg = inv.studentGrade || ""
    if (!ygSet.has(yg)) return
    const ay = inv.academicYear || "-"
    yearKeySet.add(ay)
    const net = inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0

    if (!map.has(yg)) map.set(yg, {})
    const row = map.get(yg)!
    row[ay] = (row[ay] ?? 0) + net
  })

  const yearKeys = Array.from(yearKeySet).sort()
  const rows: RevenueYearMatrixRow[] = []
  map.forEach((yearCols, yearGroup) => {
    rows.push({ yearGroup, yearCols })
  })

  return { rows: sortByYearGroup(rows), yearKeys }
}

// ── REPORT 2b: Avg Revenue Term/Year Matrix ────────────────────────────────────

export async function getAvgTermMatrix(filter: AnalyticsFilter): Promise<{
  rows: AvgTermMatrixRow[]
  termKeys: string[]
}> {
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
    if (filter.category && filter.category !== "all" && (inv.category || "tuition") !== filter.category) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  const termKeySet = new Set<string>()
  // Map: yearGroup → termKey → { total, students }
  const map = new Map<string, { termTotals: Record<string, number>; termStudents: Record<string, Set<string>>; allStudents: Set<string> }>()

  const ygSet2 = new Set(YEAR_GROUP_ORDER)
  invoices.forEach(inv => {
    const yg = inv.studentGrade || ""
    if (!ygSet2.has(yg)) return
    const key = `${inv.academicYear} ${inv.term}`
    termKeySet.add(key)
    if (!map.has(yg)) map.set(yg, { termTotals: {}, termStudents: {}, allStudents: new Set() })
    const row = map.get(yg)!
    const net = inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0
    row.termTotals[key] = (row.termTotals[key] ?? 0) + net
    if (!row.termStudents[key]) row.termStudents[key] = new Set()
    if (inv.studentId) {
      row.termStudents[key].add(inv.studentId)
      row.allStudents.add(inv.studentId)
    }
  })

  const termKeys = Array.from(termKeySet).sort()
  const rows: AvgTermMatrixRow[] = []
  map.forEach((v, yearGroup) => {
    const termCols: Record<string, number> = {}
    const termStudentCounts: Record<string, number> = {}
    termKeys.forEach(k => {
      const cnt = v.termStudents[k]?.size || 1
      termCols[k] = Math.round((v.termTotals[k] ?? 0) / cnt)
      termStudentCounts[k] = v.termStudents[k]?.size ?? 0
    })
    rows.push({ yearGroup, studentCount: v.allStudents.size, termCols, termStudentCounts })
  })

  return { rows: sortByYearGroup(rows), termKeys }
}

export async function getAvgYearMatrix(filter: AnalyticsFilter): Promise<{
  rows: AvgYearMatrixRow[]
  yearKeys: string[]
}> {
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.category && filter.category !== "all" && (inv.category || "tuition") !== filter.category) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  const yearKeySet = new Set<string>()
  const map = new Map<string, { yearTotals: Record<string, number>; yearStudents: Record<string, Set<string>>; allStudents: Set<string> }>()

  const ygSet3 = new Set(YEAR_GROUP_ORDER)
  invoices.forEach(inv => {
    const yg = inv.studentGrade || ""
    if (!ygSet3.has(yg)) return
    const ay = inv.academicYear || "-"
    yearKeySet.add(ay)
    if (!map.has(yg)) map.set(yg, { yearTotals: {}, yearStudents: {}, allStudents: new Set() })
    const row = map.get(yg)!
    const net = inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0
    row.yearTotals[ay] = (row.yearTotals[ay] ?? 0) + net
    if (!row.yearStudents[ay]) row.yearStudents[ay] = new Set()
    if (inv.studentId) {
      row.yearStudents[ay].add(inv.studentId)
      row.allStudents.add(inv.studentId)
    }
  })

  const yearKeys = Array.from(yearKeySet).sort()
  const rows: AvgYearMatrixRow[] = []
  map.forEach((v, yearGroup) => {
    const yearCols: Record<string, number> = {}
    const yearStudentCounts: Record<string, number> = {}
    yearKeys.forEach(k => {
      const cnt = v.yearStudents[k]?.size || 1
      yearCols[k] = Math.round((v.yearTotals[k] ?? 0) / cnt)
      yearStudentCounts[k] = v.yearStudents[k]?.size ?? 0
    })
    rows.push({ yearGroup, studentCount: v.allStudents.size, yearCols, yearStudentCounts })
  })

  return { rows: sortByYearGroup(rows), yearKeys }
}

// ── REPORT 3: Transaction count by payment method ─────────────────────────────

/**
 * GET /api/analytics/transactions-by-method
 * Query: { academicYear?: string, term?: string }
 * Response: TransactionByMethod[]
 */
export async function getTransactionsByMethod(filter: AnalyticsFilter): Promise<TransactionByMethod[]> {
  /**
   * NOTE FOR BACKEND:
   * Payment gateway should log every transaction attempt with:
   *   - paymentMethod: "EDC" | "Bank Transfer" | "Thai QR" | "Online" | ...
   *   - amount: number
   *   - status: "success" | "failed" | "declined"
   *   - timestamp: ISO string
   * Currently only PAID transactions are in paymentRecords.
   */
  try {
    const records: any[] = cachedMockPayments()

    const map = new Map<string, { count: number; amount: number }>()
    records.forEach(r => {
      const method = r.paymentMethod || "Unknown"
      const existing = map.get(method) ?? { count: 0, amount: 0 }
      existing.count += 1
      existing.amount += r.amount ?? 0
      map.set(method, existing)
    })

    const total = records.length || 1
    const result: TransactionByMethod[] = []
    map.forEach((v, method) => {
      result.push({
        method,
        count: v.count,
        totalAmount: v.amount,
        percentage: Math.round((v.count / total) * 100)
      })
    })
    return result.sort((a, b) => b.count - a.count)
  } catch { return [] }
}

// ── REPORT 3b: Transactions by Year Group × Method matrix ─────────────────────

/**
 * Returns Year Group × Method matrix.
 * Uses mock payment records + year group assignment.
 */
export async function getTransactionsByYearGroupAndMethod(filter: AnalyticsFilter): Promise<{
  rows: TransactionYearGroupMethodRow[]
  methodKeys: string[]
}> {
  // Build a map of studentId → yearGroup from invoices
  const allInvoices = cachedMockInvoices().filter(inv => {
    if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
    if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  const studentGradeMap = new Map<string, string>()
  allInvoices.forEach(inv => {
    if (inv.studentId && inv.studentGrade) studentGradeMap.set(inv.studentId, inv.studentGrade)
  })

  // Distribute mock payment records across year groups proportionally
  // by assigning each record to a random student from the known pool
  const studentIds = Array.from(studentGradeMap.keys())
  const payments = cachedMockPayments()
  const methodKeySet = new Set<string>()
  // yearGroup → method → count
  const matrixMap = new Map<string, Record<string, number>>()

  YEAR_GROUP_ORDER.forEach(yg => matrixMap.set(yg, {}))

  payments.forEach((p, idx) => {
    const sid = studentIds[idx % studentIds.length]
    const yg = studentGradeMap.get(sid) || "Unknown"
    const method = p.paymentMethod || "Unknown"
    methodKeySet.add(method)
    if (!matrixMap.has(yg)) matrixMap.set(yg, {})
    const row = matrixMap.get(yg)!
    row[method] = (row[method] ?? 0) + 1
  })

  const methodKeys = Array.from(methodKeySet).sort()
  const rows: TransactionYearGroupMethodRow[] = []
  matrixMap.forEach((methods, yearGroup) => {
    if (Object.keys(methods).length === 0) return
    const total = Object.values(methods).reduce((s, v) => s + v, 0)
    rows.push({ yearGroup, methods, total })
  })

  return { rows: sortByYearGroup(rows), methodKeys }
}

// ── REPORT 5b: Bank Fees Term/Year Matrix ─────────────────────────────────────

export async function getBankFeeTermMatrix(filter: AnalyticsFilter): Promise<{
  rows: BankFeeTermMatrixRow[]
  termKeys: string[]
}> {
  // Load all rows ignoring term filter (terms become columns)
  const filterNoTerm: AnalyticsFilter = { academicYear: filter.academicYear }
  const allRows = getMockBankFees(filterNoTerm)

  const termKeySet = new Set<string>()
  // bankName+paymentSource → termKey → feeAmount
  const map = new Map<string, Record<string, number>>()
  const sourceMap = new Map<string, string>()

  allRows.forEach(r => {
    const id = `${r.bankName}|${r.paymentSource}`
    const key = `${r.academicYear} ${r.term}`
    termKeySet.add(key)
    if (!map.has(id)) map.set(id, {})
    sourceMap.set(id, r.paymentSource)
    const row = map.get(id)!
    row[key] = (row[key] ?? 0) + r.feeAmount
  })

  const termKeys = Array.from(termKeySet).sort()
  const rows: BankFeeTermMatrixRow[] = []
  map.forEach((termCols, id) => {
    const [bankName] = id.split("|")
    rows.push({ bankName, paymentSource: sourceMap.get(id) || "", termCols })
  })

  return { rows, termKeys }
}

export async function getBankFeeYearMatrix(filter: AnalyticsFilter): Promise<{
  rows: BankFeeYearMatrixRow[]
  yearKeys: string[]
}> {
  const allRows = getMockBankFees({})

  const yearKeySet = new Set<string>()
  const map = new Map<string, Record<string, number>>()
  const sourceMap = new Map<string, string>()

  allRows.forEach(r => {
    const id = `${r.bankName}|${r.paymentSource}`
    yearKeySet.add(r.academicYear)
    if (!map.has(id)) map.set(id, {})
    sourceMap.set(id, r.paymentSource)
    const row = map.get(id)!
    row[r.academicYear] = (row[r.academicYear] ?? 0) + r.feeAmount
  })

  const yearKeys = Array.from(yearKeySet).sort()
  const rows: BankFeeYearMatrixRow[] = []
  map.forEach((yearCols, id) => {
    const [bankName] = id.split("|")
    rows.push({ bankName, paymentSource: sourceMap.get(id) || "", yearCols })
  })

  return { rows, yearKeys }
}

// ── REPORT 4: Transaction status (success vs declined) ────────────────────────

/**
 * GET /api/analytics/transaction-status
 * Query: { academicYear?: string, term?: string }
 * Response: TransactionStatus[]
 *
 * NOTE FOR BACKEND:
 * Payment gateway provides real decline/failure data.
 * Current data only has invoice approval status — not payment gateway decline.
 * "declined" count will always be 0 until gateway integration.
 */
export async function getTransactionStatus(_filter: AnalyticsFilter): Promise<TransactionStatus[]> {
  const data = getMockTransactionAttempts()
  const total = data.successful + data.declined || 1
  return [
    {
      label: "Successful",
      status: "successful",
      count: data.successful,
      percentage: Math.round((data.successful / total) * 100),
      byMethod: data.byMethod
    },
    {
      label: "Declined",
      status: "declined",
      count: data.declined,
      percentage: Math.round((data.declined / total) * 100),
      byMethod: data.byMethod
    }
  ]
}

// ── REPORT 5: Bank Fees ────────────────────────────────────────────────────────

/**
 * GET /api/analytics/bank-fees
 * Query: { academicYear?: string, term?: string }
 * Response: BankFeeRow[]
 *
 * NOTE FOR BACKEND:
 * This requires bank settlement reports or payment gateway fee data.
 * Banks: KBank, UOB, TTB, KTC
 * Fee structure per bank:
 *   - EDC/POS: ~1.5-2% per transaction
 *   - QR Payment: ~0.5-1% per transaction
 *   - Online Transfer: flat fee per transaction
 * Settlement files (CSV/XML) from each bank should be imported and stored.
 */
export async function getBankFees(filter: AnalyticsFilter): Promise<BankFeeRow[]> {
  return getMockBankFees(filter)
}

function getMockWaterfallRows(): RevenueWaterfall[] {
  // Read discount groups from Discount Management (localStorage)
  let discountGroups: { id: string; name: string; discountType: string; discountPercentage: number; fixedAmount: number }[] = []
  try {
    const stored = localStorage.getItem("studentGroups")
    if (stored) discountGroups = JSON.parse(stored).filter((g: any) => g.isActive !== false)
  } catch {}

  // Fallback default discount groups if none configured
  if (discountGroups.length === 0) {
    discountGroups = [
      { id: "d1", name: "Scholarship",       discountType: "percentage", discountPercentage: 20, fixedAmount: 0 },
      { id: "d2", name: "2nd Child (5%)",    discountType: "percentage", discountPercentage: 5,  fixedAmount: 0 },
      { id: "d3", name: "2nd Child (2%)",    discountType: "percentage", discountPercentage: 2,  fixedAmount: 0 },
      { id: "d4", name: "3rd Child (5%)",    discountType: "percentage", discountPercentage: 5,  fixedAmount: 0 },
      { id: "d5", name: "4th Child (10%)",   discountType: "percentage", discountPercentage: 10, fixedAmount: 0 },
      { id: "d6", name: "Intl. Org (10%)",   discountType: "percentage", discountPercentage: 10, fixedAmount: 0 },
      { id: "d7", name: "Contributor (30%)", discountType: "percentage", discountPercentage: 30, fixedAmount: 0 },
    ]
  }

  const yearGroups = [
    { yearGroup: "Pre-Nursery", studentCount: 71,  grossRevenue: 17371200, bankFees: -208454 },
    { yearGroup: "Nursery",     studentCount: 86,  grossRevenue: 24011200, bankFees: -288134 },
    { yearGroup: "Reception",   studentCount: 110, grossRevenue: 33112800, bankFees: -397354 },
    { yearGroup: "Year 1",      studentCount: 124, grossRevenue: 42209600, bankFees: -506517 },
    { yearGroup: "Year 2",      studentCount: 117, grossRevenue: 39826800, bankFees: -478102 },
    { yearGroup: "Year 3",      studentCount: 114, grossRevenue: 41587200, bankFees: -499046 },
    { yearGroup: "Year 4",      studentCount: 129, grossRevenue: 47059200, bankFees: -564710 },
    { yearGroup: "Year 5",      studentCount: 93,  grossRevenue: 34707600, bankFees: -416491 },
    { yearGroup: "Year 6",      studentCount: 109, grossRevenue: 40492200, bankFees: -485907 },
    { yearGroup: "Year 7",      studentCount: 81,  grossRevenue: 31363200, bankFees: -376358 },
    { yearGroup: "Year 8",      studentCount: 127, grossRevenue: 48980800, bankFees: -587770 },
    { yearGroup: "Year 9",      studentCount: 91,  grossRevenue: 35235200, bankFees: -422824 },
    { yearGroup: "Year 10",     studentCount: 91,  grossRevenue: 38480600, bankFees: -461768 },
    { yearGroup: "Year 11",     studentCount: 56,  grossRevenue: 22176000, bankFees: -266112 },
    { yearGroup: "Year 12",     studentCount: 41,  grossRevenue: 17418000, bankFees: -209016 },
    { yearGroup: "Year 13",     studentCount: 52,  grossRevenue: 20592000, bankFees: -247104 },
  ]

  return yearGroups.map(yg => {
    const discounts: Record<string, number> = {}
    discountGroups.forEach(dg => {
      // Deterministic mock: use hash to decide which year groups have this discount and how many students
      const seed = strHash(`${yg.yearGroup}${dg.id}`)
      const hasDiscount = (seed % 3) !== 0  // ~67% of year groups have this discount
      if (hasDiscount) {
        const affected = Math.max(1, Math.round(yg.studentCount * ((seed % 20 + 5) / 100)))
        const avgTuition = Math.round(yg.grossRevenue / yg.studentCount)
        const rate = dg.discountType === "percentage" ? dg.discountPercentage / 100 : 0
        const fixedAmt = dg.discountType === "fixed" ? dg.fixedAmount : 0
        const amount = dg.discountType === "percentage"
          ? -(affected * avgTuition * rate)
          : -(affected * fixedAmt)
        discounts[dg.name] = Math.round(amount / 100) * 100
      } else {
        discounts[dg.name] = 0
      }
    })
    const totalDiscount = Object.values(discounts).reduce((s, v) => s + v, 0)
    return {
      yearGroup: yg.yearGroup,
      studentCount: yg.studentCount,
      grossRevenue: yg.grossRevenue,
      discounts,
      bankFees: yg.bankFees,
      netRevenue: yg.grossRevenue + totalDiscount + yg.bankFees,
    }
  })
}

// ── REPORT 6: Net vs Gross Revenue Waterfall ──────────────────────────────────

/**
 * GET /api/analytics/revenue-waterfall
 * Query: { academicYear?: string, term?: string }
 * Response: RevenueWaterfall[]
 */
export async function getRevenueWaterfall(filter: AnalyticsFilter): Promise<RevenueWaterfall[]> {
  const rows = getMockWaterfallRows()

  // Override studentCount with real unique students from createdInvoices (confirmed only)
  const ygSet = new Set(YEAR_GROUP_ORDER)
  const studentMap = new Map<string, Set<string>>()
  cachedMockInvoices()
    .filter(inv => {
      if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
      if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
      if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
      const yg = inv.studentGrade || ""
      return ygSet.has(yg)
    })
    .forEach(inv => {
      const yg = inv.studentGrade!
      if (!studentMap.has(yg)) studentMap.set(yg, new Set())
      if (inv.studentId) studentMap.get(yg)!.add(inv.studentId)
    })

  return rows.map(r => ({
    ...r,
    studentCount: studentMap.get(r.yearGroup)?.size ?? 0,
  }))
}

// ── YOY MATRIX — Tab 3 & 4: Payment Method × Academic Year ───────────────────

/** Method × Academic Year transaction count matrix (Tab 3 & Tab 4) */
export interface TxnMethodYearRow {
  method: string
  yearCols: Record<string, number>   // key = "2024/2025", value = txn count
}

/**
 * Returns payment method × academic year transaction count matrix.
 * Since mock payment records lack academicYear, counts are distributed
 * proportionally based on confirmed invoice distribution per year.
 */
export async function getTxnMethodYearMatrix(filter: AnalyticsFilter): Promise<{
  rows: TxnMethodYearRow[]
  yearKeys: string[]
}> {
  // Step 1: Get year distribution ratios from confirmed invoices
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
    if (filter.category && filter.category !== "all" && (inv.category || "tuition") !== filter.category) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })
  const yearCount = new Map<string, number>()
  invoices.forEach(inv => {
    const ay = inv.academicYear || "-"
    yearCount.set(ay, (yearCount.get(ay) ?? 0) + 1)
  })
  const totalInvoices = invoices.length || 1
  const yearKeys = Array.from(yearCount.keys()).sort()

  // Step 2: Distribute method counts proportionally per year
  const payments = cachedMockPayments()
  const methodMap = new Map<string, Record<string, number>>()

  payments.forEach(p => {
    const method = p.paymentMethod || "Unknown"
    if (!methodMap.has(method)) methodMap.set(method, {})
    const row = methodMap.get(method)!
    yearKeys.forEach(ay => {
      const ratio = (yearCount.get(ay) ?? 0) / totalInvoices
      row[ay] = (row[ay] ?? 0) + ratio
    })
  })

  const rows: TxnMethodYearRow[] = []
  methodMap.forEach((yearCols, method) => {
    const rounded: Record<string, number> = {}
    yearKeys.forEach(ay => { rounded[ay] = Math.round(yearCols[ay] ?? 0) })
    rows.push({ method, yearCols: rounded })
  })

  return { rows: rows.sort((a, b) => a.method.localeCompare(b.method)), yearKeys }
}

// ── YOY MATRIX — Tab 6: Year Group × Academic Year (Gross + Net) ─────────────

/** Year Group × Academic Year matrix row with gross + net per cell (Tab 6) */
export interface WaterfallYearMatrixRow {
  yearGroup: string
  yearCols: Record<string, { gross: number; net: number }>
}

/**
 * Returns year group × academic year matrix with gross and net revenue per cell.
 * Ignores academicYear filter so all years appear as columns.
 */
export async function getWaterfallYearMatrix(filter: AnalyticsFilter): Promise<{
  rows: WaterfallYearMatrixRow[]
  yearKeys: string[]
}> {
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  const yearKeySet = new Set<string>()
  const ygSet = new Set(YEAR_GROUP_ORDER)
  const map = new Map<string, Record<string, { gross: number; net: number }>>()

  invoices.forEach(inv => {
    const yg = inv.studentGrade || ""
    if (!ygSet.has(yg)) return
    const ay = inv.academicYear || "-"
    yearKeySet.add(ay)
    if (!map.has(yg)) map.set(yg, {})
    const row = map.get(yg)!
    if (!row[ay]) row[ay] = { gross: 0, net: 0 }
    row[ay].gross += inv.subtotal ?? inv.totalAmount ?? 0
    const discount = inv.totalDiscount ?? inv.discountAmount ?? 0
    const gross = inv.subtotal ?? inv.totalAmount ?? 0
    row[ay].net += inv.netAmount ?? inv.finalAmount ?? (gross - discount)
  })

  const yearKeys = Array.from(yearKeySet).sort()
  const rows: WaterfallYearMatrixRow[] = []
  map.forEach((yearCols, yearGroup) => {
    rows.push({ yearGroup, yearCols })
  })

  return { rows: sortByYearGroup(rows), yearKeys }
}

// ── ACADEMIC YEAR / TERM OPTIONS ──────────────────────────────────────────────

export interface SummaryTotals {
  collected: number
  outstanding: number
  creditNoteTotal: number
  totalRevenue: number
  invoiceCount: number
  studentCount: number
}

export async function getSummaryTotals(filter: AnalyticsFilter): Promise<SummaryTotals> {
  const invoices = cachedMockInvoices().filter(inv => {
    if (filter.academicYear && filter.academicYear !== "all" && inv.academicYear !== filter.academicYear) return false
    if (filter.term && filter.term !== "all" && inv.term !== filter.term) return false
    if (filter.category && filter.category !== "all") {
      if ((inv.category || "tuition") !== filter.category) return false
    }
    if (!CONFIRMED_STATUSES.has(inv.status || "")) return false
    return true
  })

  let collected = 0
  let outstanding = 0
  const studentIds = new Set<string>()

  invoices.forEach(inv => {
    const amt = inv.netAmount ?? inv.finalAmount ?? inv.subtotal ?? 0
    if (inv.status === "paid") {
      collected += amt
    } else if (inv.status === "overdue" || inv.status === "unpaid" || inv.status === "sent" || inv.status === "pending") {
      outstanding += amt
    }
    if (inv.studentId) studentIds.add(inv.studentId)
  })

  let creditNoteTotal = 0
  try {
    const raw = localStorage.getItem("creditNotes")
    if (raw) {
      const cns: any[] = JSON.parse(raw)
      cns.forEach(cn => {
        if (cn.status === "cancelled" || cn.status === "draft") return
        if (filter.academicYear && filter.academicYear !== "all" && cn.academicYear !== filter.academicYear) return
        creditNoteTotal += cn.creditAmount ?? cn.amount ?? 0
      })
    }
  } catch {}

  return {
    collected,
    outstanding,
    creditNoteTotal,
    totalRevenue: collected + outstanding - creditNoteTotal,
    invoiceCount: invoices.length,
    studentCount: studentIds.size,
  }
}

export async function getFilterOptions(): Promise<{ academicYears: string[]; terms: string[] }> {
  const years = new Set<string>()
  const terms = new Set<string>()
  cachedMockInvoices().forEach(inv => {
    if (inv.academicYear) years.add(inv.academicYear)
    if (inv.term) terms.add(inv.term)
  })
  return {
    academicYears: Array.from(years).sort().reverse(),
    terms: Array.from(terms).sort()
  }
}
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

export interface ExportPayload {
  activeTab: string
  filter: AnalyticsFilter
  // Tab 1
  termMatrixRows: RevenueTermMatrixRow[]
  termMatrixKeys: string[]
  yearMatrixRows: RevenueYearMatrixRow[]
  yearMatrixKeys: string[]
  // Tab 2
  avgTermRows: AvgTermMatrixRow[]
  avgTermKeys: string[]
  avgYearRows: AvgYearMatrixRow[]
  avgYearKeys: string[]
  avgToggle: "person" | "yearGroup"
  // Tab 3
  txnMatrixRows: TransactionYearGroupMethodRow[]
  txnMethodKeys: string[]
  methodData: TransactionByMethod[]
  // Tab 4
  statusData: TransactionStatus[]
  // Tab 5
  bankFeeData: BankFeeRow[]
  feeTermRows: BankFeeTermMatrixRow[]
  feeTermKeys: string[]
  feeYearRows: BankFeeYearMatrixRow[]
  feeYearKeys: string[]
  // Tab 6
  waterfallData: RevenueWaterfall[]
}

export async function exportToExcel(payload: ExportPayload) {
  const { activeTab, filter } = payload
  const wb = XLSX.utils.book_new()
  let filename = "Analytics_Report"

  if (activeTab === "revenue") {
    // Sheet 1: เปรียบเทียบรายเทอม (Compare by Term)
    const termHeaders = ["Year Group", ...payload.termMatrixKeys, "Total"]
    const termRows = payload.termMatrixRows.map(r => {
      const row: any = { "Year Group": r.yearGroup }
      let total = 0
      payload.termMatrixKeys.forEach(k => {
        row[k] = r.termCols[k] ?? 0
        total += r.termCols[k] ?? 0
      })
      row["Total"] = total
      return row
    })
    // Total row
    const termTotalRow: any = { "Year Group": "Total" }
    let grandTotal = 0
    payload.termMatrixKeys.forEach(k => {
      const colTotal = payload.termMatrixRows.reduce((s, r) => s + (r.termCols[k] ?? 0), 0)
      termTotalRow[k] = colTotal
      grandTotal += colTotal
    })
    termTotalRow["Total"] = grandTotal
    termRows.push(termTotalRow)
    const termSheet = XLSX.utils.json_to_sheet(termRows, { header: termHeaders })
    XLSX.utils.book_append_sheet(wb, termSheet, "Compare by Term")

    // Sheet 2: เปรียบเทียบปีการศึกษา (Compare by Year)
    const yearHeaders = ["Year Group", ...payload.yearMatrixKeys, "Total"]
    const yearRows = payload.yearMatrixRows.map(r => {
      const row: any = { "Year Group": r.yearGroup }
      let total = 0
      payload.yearMatrixKeys.forEach(k => {
        row[k] = r.yearCols[k] ?? 0
        total += r.yearCols[k] ?? 0
      })
      row["Total"] = total
      return row
    })
    const yearTotalRow: any = { "Year Group": "Total" }
    let yearGrandTotal = 0
    payload.yearMatrixKeys.forEach(k => {
      const colTotal = payload.yearMatrixRows.reduce((s, r) => s + (r.yearCols[k] ?? 0), 0)
      yearTotalRow[k] = colTotal
      yearGrandTotal += colTotal
    })
    yearTotalRow["Total"] = yearGrandTotal
    yearRows.push(yearTotalRow)
    const yearSheet = XLSX.utils.json_to_sheet(yearRows, { header: yearHeaders })
    XLSX.utils.book_append_sheet(wb, yearSheet, "Compare by Year")

    filename = "Revenue_Comparison"
  }
  else if (activeTab === "avg") {
    const mode = payload.avgToggle === "person" ? "Per Person" : "Per Year Group"

    // Sheet 1: AVG by Term
    const termHeaders = ["Year Group", "No. of Students", ...payload.avgTermKeys]
    const termRows = payload.avgTermRows.map(r => {
      const row: any = { "Year Group": r.yearGroup, "No. of Students": r.studentCount }
      payload.avgTermKeys.forEach(k => { row[k] = r.termCols[k] ?? 0 })
      return row
    })
    const termTotalRow: any = { "Year Group": "Total", "No. of Students": payload.avgTermRows.reduce((s, r) => s + r.studentCount, 0) }
    payload.avgTermKeys.forEach(k => {
      const sum = payload.avgTermRows.reduce((s, r) => s + (r.termCols[k] ?? 0), 0)
      termTotalRow[k] = payload.avgToggle === "person" ? Math.round(sum / (payload.avgTermRows.length || 1)) : sum
    })
    termRows.push(termTotalRow)
    const termSheet = XLSX.utils.json_to_sheet(termRows, { header: termHeaders })
    XLSX.utils.book_append_sheet(wb, termSheet, `AVG by Term (${mode})`)

    // Sheet 2: AVG by Year
    const yearHeaders = ["Year Group", "No. of Students", ...payload.avgYearKeys]
    const yearRows = payload.avgYearRows.map(r => {
      const row: any = { "Year Group": r.yearGroup, "No. of Students": r.studentCount }
      payload.avgYearKeys.forEach(k => { row[k] = r.yearCols[k] ?? 0 })
      return row
    })
    const yearTotalRow: any = { "Year Group": "Total", "No. of Students": payload.avgYearRows.reduce((s, r) => s + r.studentCount, 0) }
    payload.avgYearKeys.forEach(k => {
      const sum = payload.avgYearRows.reduce((s, r) => s + (r.yearCols[k] ?? 0), 0)
      yearTotalRow[k] = payload.avgToggle === "person" ? Math.round(sum / (payload.avgYearRows.length || 1)) : sum
    })
    yearRows.push(yearTotalRow)
    const yearSheet = XLSX.utils.json_to_sheet(yearRows, { header: yearHeaders })
    XLSX.utils.book_append_sheet(wb, yearSheet, `AVG by Year (${mode})`)

    filename = "AVG_Amount"
  }
  else if (activeTab === "methods") {
    // Sheet 1: Year Group × Method matrix
    const matrixHeaders = ["Year Group", ...payload.txnMethodKeys, "Total"]
    const matrixRows = payload.txnMatrixRows.map(r => {
      const row: any = { "Year Group": r.yearGroup }
      payload.txnMethodKeys.forEach(k => { row[k] = r.methods[k] ?? 0 })
      row["Total"] = r.total
      return row
    })
    const matrixTotalRow: any = { "Year Group": "Total" }
    let matrixGrandTotal = 0
    payload.txnMethodKeys.forEach(k => {
      const colTotal = payload.txnMatrixRows.reduce((s, r) => s + (r.methods[k] ?? 0), 0)
      matrixTotalRow[k] = colTotal
      matrixGrandTotal += colTotal
    })
    matrixTotalRow["Total"] = matrixGrandTotal
    matrixRows.push(matrixTotalRow)
    const matrixSheet = XLSX.utils.json_to_sheet(matrixRows, { header: matrixHeaders })
    XLSX.utils.book_append_sheet(wb, matrixSheet, "No. of Trans")

    // Sheet 2: Summary
    const summarySheet = XLSX.utils.json_to_sheet(payload.methodData.map(m => ({
      "Payment Method": m.method,
      "Transactions": m.count,
      "Share (%)": m.percentage,
      "Total Amount": m.totalAmount
    })))
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary")

    filename = "No_of_Transactions"
  }
  else if (activeTab === "status") {
    // Sheet 1: Overview
    const overviewSheet = XLSX.utils.json_to_sheet(payload.statusData.map(s => ({
      "Status": s.label,
      "Count": s.count,
      "Percentage (%)": s.percentage
    })))
    XLSX.utils.book_append_sheet(wb, overviewSheet, "Declined vs Successful")

    // Sheet 2: By Method breakdown
    if (payload.statusData[0]?.byMethod) {
      const methodRows = Object.entries(payload.statusData[0].byMethod).map(([method, v]) => ({
        "Method": method,
        "Successful": v.success,
        "Declined": v.declined,
        "Total": v.success + v.declined,
        "Success Rate (%)": (v.success + v.declined) > 0 ? Math.round((v.success / (v.success + v.declined)) * 100) : 0
      }))
      const methodSheet = XLSX.utils.json_to_sheet(methodRows)
      XLSX.utils.book_append_sheet(wb, methodSheet, "By Method")
    }

    filename = "Declined_vs_Successful"
  }
  else if (activeTab === "fees") {
    // Sheet 1: Bank Fees by Term
    const feeTermHeaders = ["Bank Name", "Payment Source", ...payload.feeTermKeys, "Total"]
    const feeTermRows = payload.feeTermRows.map(r => {
      const row: any = { "Bank Name": r.bankName, "Payment Source": r.paymentSource }
      let total = 0
      payload.feeTermKeys.forEach(k => {
        row[k] = r.termCols[k] ?? 0
        total += r.termCols[k] ?? 0
      })
      row["Total"] = total
      return row
    })
    const feeTotalRow: any = { "Bank Name": "Total", "Payment Source": "" }
    let feeGrandTotal = 0
    payload.feeTermKeys.forEach(k => {
      const colTotal = payload.feeTermRows.reduce((s, r) => s + (r.termCols[k] ?? 0), 0)
      feeTotalRow[k] = colTotal
      feeGrandTotal += colTotal
    })
    feeTotalRow["Total"] = feeGrandTotal
    feeTermRows.push(feeTotalRow)
    const feeTermSheet = XLSX.utils.json_to_sheet(feeTermRows, { header: feeTermHeaders })
    XLSX.utils.book_append_sheet(wb, feeTermSheet, "Bank Fees by Term")

    // Sheet 2: Bank Fees by Year
    const feeYearHeaders = ["Bank Name", "Payment Source", ...payload.feeYearKeys, "Total"]
    const feeYearRows = payload.feeYearRows.map(r => {
      const row: any = { "Bank Name": r.bankName, "Payment Source": r.paymentSource }
      let total = 0
      payload.feeYearKeys.forEach(k => {
        row[k] = r.yearCols[k] ?? 0
        total += r.yearCols[k] ?? 0
      })
      row["Total"] = total
      return row
    })
    const feeYearTotalRow: any = { "Bank Name": "Total", "Payment Source": "" }
    let feeYearGrandTotal = 0
    payload.feeYearKeys.forEach(k => {
      const colTotal = payload.feeYearRows.reduce((s, r) => s + (r.yearCols[k] ?? 0), 0)
      feeYearTotalRow[k] = colTotal
      feeYearGrandTotal += colTotal
    })
    feeYearTotalRow["Total"] = feeYearGrandTotal
    feeYearRows.push(feeYearTotalRow)
    const feeYearSheet = XLSX.utils.json_to_sheet(feeYearRows, { header: feeYearHeaders })
    XLSX.utils.book_append_sheet(wb, feeYearSheet, "Bank Fees by Year")

    filename = "Bank_Fees"
  }
  else if (activeTab === "waterfall") {
    const discKeys = payload.waterfallData.length > 0 ? Object.keys(payload.waterfallData[0].discounts) : []
    const wfHeaders = ["Year Group", "Students", "Gross Revenue", ...discKeys.map(k => `Discount: ${k}`), "Bank Fees", "Net Revenue"]
    const wfRows = payload.waterfallData.map(r => {
      const row: any = {
        "Year Group": r.yearGroup,
        "Students": r.studentCount,
        "Gross Revenue": r.grossRevenue
      }
      discKeys.forEach(k => { row[`Discount: ${k}`] = r.discounts[k] ?? 0 })
      row["Bank Fees"] = r.bankFees
      row["Net Revenue"] = r.netRevenue
      return row
    })
    // Total row
    const wfTotalRow: any = {
      "Year Group": "Total",
      "Students": payload.waterfallData.reduce((s, r) => s + r.studentCount, 0),
      "Gross Revenue": payload.waterfallData.reduce((s, r) => s + r.grossRevenue, 0)
    }
    discKeys.forEach(k => {
      wfTotalRow[`Discount: ${k}`] = payload.waterfallData.reduce((s, r) => s + (r.discounts[k] ?? 0), 0)
    })
    wfTotalRow["Bank Fees"] = payload.waterfallData.reduce((s, r) => s + r.bankFees, 0)
    wfTotalRow["Net Revenue"] = payload.waterfallData.reduce((s, r) => s + r.netRevenue, 0)
    wfRows.push(wfTotalRow)
    const wfSheet = XLSX.utils.json_to_sheet(wfRows, { header: wfHeaders })
    XLSX.utils.book_append_sheet(wb, wfSheet, "Net vs Gross Revenue")

    filename = "Net_vs_Gross_Revenue"
  }

  // Generate and Save
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" })

  const filterDesc = `AY${filter.academicYear?.replace("/", "-") || "All"}_${filter.term || "All"}`
  saveAs(data, `${filename}_${filterDesc}_${new Date().toISOString().split("T")[0]}.xlsx`)
}
