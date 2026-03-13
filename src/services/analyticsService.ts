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
    { name: "Bank Transfer",     weight: 0.40 },
    { name: "EDC",               weight: 0.23 },
    { name: "Thai QR",           weight: 0.15 },
    { name: "Credit Card",       weight: 0.14 },
    { name: "Cashier's cheque",  weight: 0.08 },
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
    successful: 408,
    declined: 12,
    byMethod: {
      "Bank Transfer":    { success: 165, declined: 2 },
      "EDC":              { success: 94,  declined: 3 },
      "Thai QR":          { success: 62,  declined: 0 },
      "Credit Card":      { success: 57,  declined: 0 },
      "Cashier's cheque": { success: 30,  declined: 7 },
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

  return allRows.filter(r => {
    if (filter.academicYear && filter.academicYear !== "all" && r.academicYear !== filter.academicYear) return false
    if (filter.term && filter.term !== "all" && r.term !== filter.term) return false
    return true
  })
}

// Pre-compute mock data once at module load
let _mockInvoices: any[] | null = null
let _mockPayments: any[] | null = null
// eslint-disable-next-line prefer-const
let _mockWaterfall: any[] | null = null

function cachedMockInvoices() {
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

/** Report 3: Transaction count by payment method */
export interface TransactionByMethod {
  method: string
  count: number
  totalAmount: number
  percentage: number
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

  invoices.forEach(inv => {
    const yg = inv.studentGrade || "Unknown"
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
  const invoices = loadInvoices(filter)
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
export async function getRevenueWaterfall(_filter: AnalyticsFilter): Promise<RevenueWaterfall[]> {
  // Not cached — reads discount groups from localStorage each time
  return getMockWaterfallRows()
}

// ── ACADEMIC YEAR / TERM OPTIONS ──────────────────────────────────────────────

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

export async function exportToExcel(
  activeTab: string,
  revenueData: RevenueByYearGroup[],
  avgData: AvgRevenueByYearGroup[],
  methodData: TransactionByMethod[],
  statusData: TransactionStatus[],
  bankFeeData: BankFeeRow[],
  waterfallData: RevenueWaterfall[],
  filter: AnalyticsFilter
) {
  const wb = XLSX.utils.book_new()
  let filename = "Analytics_Report"

  if (activeTab === "revenue") {
    const revSheet = XLSX.utils.json_to_sheet(revenueData.map(r => ({
      "Year Group": r.yearGroup,
      "Academic Year": r.academicYear,
      "Term": r.term,
      "Invoices": r.studentCount,
      "Gross Revenue": r.grossRevenue,
      "Discount": r.discountAmount,
      "Net Revenue": r.netRevenue
    })))
    XLSX.utils.book_append_sheet(wb, revSheet, "Revenue Comparison")
    filename = "Revenue_Comparison"
  } 
  else if (activeTab === "avg") {
    const avgSheet = XLSX.utils.json_to_sheet(avgData.map(r => ({
      "Year Group": r.yearGroup,
      "Students": r.studentCount,
      "Total Revenue": r.totalRevenue,
      "Avg / Student": r.avgPerStudent,
      "Tuition Fee": r.breakdown.tuition,
      "ECA": r.breakdown.eca,
      "Trip/Sport/Others": r.breakdown.trip + r.breakdown.sport + r.breakdown.others
    })))
    XLSX.utils.book_append_sheet(wb, avgSheet, "Avg_Revenue_Per_Student")
    filename = "Avg_Revenue_Per_Student"
  }
  else if (activeTab === "methods") {
    const methodSheet = XLSX.utils.json_to_sheet(methodData.map(m => ({
      "Payment Method": m.method,
      "Transactions": m.count,
      "Share (%)": m.percentage,
      "Total Amount": m.totalAmount
    })))
    XLSX.utils.book_append_sheet(wb, methodSheet, "Payment Methods")
    filename = "Transactions_By_Method"
  }
  else if (activeTab === "status") {
    const statusRows: any[] = []
    statusData.forEach(s => {
      if (s.byMethod) {
        Object.entries(s.byMethod).forEach(([method, v]) => {
          statusRows.push({
            "Status": s.label,
            "Method": method,
            "Successful": v.success,
            "Declined": v.declined,
            "Total": v.success + v.declined
          })
        })
      } else {
        statusRows.push({
          "Status": s.label,
          "Count": s.count,
          "Percentage": s.percentage
        })
      }
    })
    const statusSheet = XLSX.utils.json_to_sheet(statusRows)
    XLSX.utils.book_append_sheet(wb, statusSheet, "Transaction Status")
    filename = "Transaction_Status"
  }
  else if (activeTab === "fees") {
    const feeSheet = XLSX.utils.json_to_sheet(bankFeeData.map(r => ({
      "Bank": r.bankName,
      "Payment Source": r.paymentSource,
      "Academic Year": r.academicYear,
      "Term": r.term,
      "Transactions": r.transactionCount,
      "Fee Amount": r.feeAmount
    })))
    XLSX.utils.book_append_sheet(wb, feeSheet, "Bank Fees")
    filename = "Bank_Fees"
  }
  else if (activeTab === "waterfall") {
    const waterfallRows = waterfallData.map(r => {
      const row: any = {
        "Year Group": r.yearGroup,
        "Students": r.studentCount,
        "Gross Revenue": r.grossRevenue
      }
      Object.entries(r.discounts).forEach(([name, amt]) => {
        row[`Discount: ${name}`] = amt
      })
      row["Bank Fees"] = r.bankFees
      row["Net Revenue"] = r.netRevenue
      return row
    })
    const wfSheet = XLSX.utils.json_to_sheet(waterfallRows)
    XLSX.utils.book_append_sheet(wb, wfSheet, "Revenue Waterfall")
    filename = "Revenue_Waterfall"
  }

  // Generate and Save
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" })
  
  const filterDesc = `AY${filter.academicYear?.replace("/", "-") || "All"}_${filter.term || "All"}`
  saveAs(data, `${filename}_${filterDesc}_${new Date().toISOString().split("T")[0]}.xlsx`)
}
