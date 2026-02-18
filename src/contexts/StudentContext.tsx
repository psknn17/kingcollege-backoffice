import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface Parent {
  id: string
  name: string
  relationship: "father" | "mother" | "guardian" | "other"
  phone: string
  email: string
  isPrimary: boolean
  nationalId?: string // Parent's national ID / passport number
}

export interface Student {
  id: string
  studentId: string
  firstName: string
  lastName: string
  nickname: string
  dateOfBirth: Date | null
  gender: "male" | "female" | "other"
  gradeLevel: string
  academicYear: string
  enrollmentTerm: "term1" | "term2" | "term3" // Term when student enrolled
  status: "active" | "graduated" | "withdrawn" | "on_leave"
  familyId: string
  familyCode?: string // Added for easier display and search
  childOrder: number // 1 = first child, 2 = second child, etc.
  parents: Parent[]
  enrollmentDate: Date | null
  notes: string
  // Audit fields
  createdBy: string
  createdAt: Date
  updatedBy: string
  updatedAt: Date
}

export interface Family {
  id: string
  familyCode: string
  familyName: string
  studentIds: string[]
  primaryContactId: string
  address: string
  email: string
  phone?: string
  invoiceEmails?: string[]
  createdAt: Date
  // Parent Portal invitation tracking
  portalStatus?: "not_invited" | "invited" | "registered"
  invitationSentAt?: Date
  invitationAcceptedAt?: Date
}

interface StudentContextType {
  students: Student[]
  families: Family[]
  setStudents: (students: Student[]) => void
  setFamilies: (families: Family[]) => void
  addStudent: (student: Student) => void
  updateStudent: (studentId: string, updates: Partial<Student>) => void
  deleteStudent: (studentId: string) => void
  addFamily: (family: Family) => void
  updateFamily: (familyId: string, updates: Partial<Family>) => void
  deleteFamily: (familyId: string) => void
  getStudentsByFamily: (familyId: string) => Student[]
  getSiblingDiscount: (student: Student, term?: string) => number
  checkFeePrivilegeEligibility: (student: Student, currentYear: string, term: string) => {
    eligible: boolean
    reason: string
    completedYears: number
    creditPerTerm?: number
    startsFromTerm?: string
  }
  saveToLocalStorage: () => void
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

const STUDENTS_STORAGE_KEY = "students_v3" // เปลี่ยนชื่อ Key เพื่อบังคับ Hard Reset
const FAMILIES_STORAGE_KEY = "families_v4" // bump to regenerate with portalStatus mock
const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"
const STUDENT_DATA_VERSION_KEY = "student_data_version_v3"
const CURRENT_DATA_VERSION = "3.1" // เวอร์ชันข้อมูล - ไม่ reset ข้อมูลเมื่อเปลี่ยน version

// Helper to load discount options from localStorage
const loadDiscountOptions = (academicYear: string, term: string) => {
  try {
    const stored = localStorage.getItem(DISCOUNT_OPTIONS_STORAGE_KEY)
    if (stored) {
      const allData = JSON.parse(stored)
      // Storage key is just the academic year (e.g., "2024-2025")
      return allData[academicYear] || null
    }
  } catch (error) {
    console.error("Failed to load discount options:", error)
  }
  return null
}

// Default sibling discounts (fallback if no settings found)
const defaultSiblingDiscounts = [
  { childOrder: "first", percentage: 0, enabled: true },
  { childOrder: "second", percentage: 0, enabled: true },
  { childOrder: "third", percentage: 5, enabled: true },
  { childOrder: "fourth", percentage: 10, enabled: true },
  { childOrder: "fifth", percentage: 20, enabled: true },
]

// Convert term format from "term1" to "1" for storage key lookup
export const convertTermFormat = (term: string): string => {
  if (term === "term1") return "1"
  if (term === "term2") return "2"
  if (term === "term3") return "3"
  // If already in correct format ("1", "2", "3"), return as-is
  return term
}

// Get sibling discount percentage from settings
const getSiblingDiscountFromSettings = (childOrder: number, academicYear: string, term: string): number => {
  const convertedTerm = convertTermFormat(term)
  const options = loadDiscountOptions(academicYear, convertedTerm)
  const discounts = options?.siblingDiscounts || defaultSiblingDiscounts

  // Map child order number to discount index
  let discountIndex: number
  if (childOrder <= 0) return 0
  if (childOrder === 1) discountIndex = 0
  else if (childOrder === 2) discountIndex = 1
  else if (childOrder === 3) discountIndex = 2
  else if (childOrder === 4) discountIndex = 3
  else discountIndex = 4 // 5th and beyond

  const discount = discounts[discountIndex]
  if (discount && discount.enabled) {
    return discount.percentage
  }
  return 0
}

// Helper to convert value to Date if it's a date-like value
const toDateOrNull = (value: any): Date | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value
  if (typeof value === "string") {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }
  return null
}

const loadStudentsFromStorage = (): Student[] | null => {
  try {
    const stored = localStorage.getItem(STUDENTS_STORAGE_KEY)
    if (stored !== null) {
      const parsed = JSON.parse(stored)
      if (parsed.length === 0) return [] // explicitly cleared
      return parsed.map((s: any) => ({
        ...s,
        dateOfBirth: toDateOrNull(s.dateOfBirth),
        enrollmentDate: toDateOrNull(s.enrollmentDate),
        createdAt: toDateOrNull(s.createdAt) || new Date(),
        updatedAt: toDateOrNull(s.updatedAt) || new Date(),
        createdBy: s.createdBy || "System",
        updatedBy: s.updatedBy || "System"
      }))
    }
  } catch (error) {
    console.error("Failed to load students from localStorage:", error)
  }
  return null
}

// Generate Family Code from family name
const generateFamilyCodeFromName = (familyName: string, existingCodes: string[]): string => {
  if (!familyName || familyName.length < 2) return ""

  const prefix = familyName.substring(0, 2).toUpperCase()
  const year = new Date().getFullYear()

  // Find existing codes with same prefix and year
  const matchingCodes = existingCodes.filter(code => code && code.startsWith(`${prefix}${year}`))

  let maxSeq = 0
  matchingCodes.forEach(code => {
    const seqStr = code.substring(6)
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  })

  const nextSeq = (maxSeq + 1).toString().padStart(3, '0')
  return `${prefix}${year}${nextSeq}`
}

const loadFamiliesFromStorage = (): Family[] | null => {
  try {
    const stored = localStorage.getItem(FAMILIES_STORAGE_KEY)
    if (stored !== null) {
      const parsed = JSON.parse(stored)
      if (parsed.length === 0) return [] // explicitly cleared
      const existingCodes: string[] = []

      // Auto-generate familyCode for families that don't have one
      return parsed.map((f: any) => {
        let familyCode = f.familyCode
        if (!familyCode && f.familyName) {
          familyCode = generateFamilyCodeFromName(f.familyName, existingCodes)
        }
        existingCodes.push(familyCode)

        return {
          ...f,
          familyCode,
          createdAt: toDateOrNull(f.createdAt) || new Date()
        }
      })
    }
  } catch (error) {
    console.error("Failed to load families from localStorage:", error)
  }
  return null
}

const saveStudentsToStorage = (students: Student[]) => {
  try {
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students))
  } catch (error) {
    console.error("Failed to save students to localStorage:", error)
  }
}

const saveFamiliesToStorage = (families: Family[]) => {
  try {
    localStorage.setItem(FAMILIES_STORAGE_KEY, JSON.stringify(families))
  } catch (error) {
    console.error("Failed to save families to localStorage:", error)
  }
}

// Helper function to generate mock data
const generateMockData = () => {
  const familyNamesList = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Taylor", "Anderson",
    "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Martinez", "Robinson", "Clark", "Rodriguez",
    "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "Hernandez", "King", "Wright", "Lopez",
    "Hill", "Scott", "Green", "Adams", "Baker", "Gonzalez", "Nelson", "Carter", "Mitchell", "Perez",
    "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards", "Collins", "Stewart", "Sanchez",
    "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera", "Cooper",
    "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez", "James", "Watson",
    "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross", "Henderson", "Coleman",
    "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington", "Butler", "Simmons",
    "Foster", "Gonzales", "Bryant", "Alexander", "Russell", "Griffin", "Diaz", "Hayes", "Myers", "Ford",
    "Hamilton", "Graham", "Sullivan", "Wallace", "Woods", "Cole", "West", "Jordan", "Owens", "Reynolds",
    "Fisher", "Ellis", "Harrison", "Gibson", "Mcdonald", "Cruz", "Marshall", "Ortiz", "Gomez", "Murray",
    "Freeman", "Wells", "Webb", "Simpson", "Stevens", "Tucker", "Porter", "Hunter", "Hicks", "Crawford",
    "Henry", "Boyd", "Mason", "Morales", "Kennedy", "Warren", "Dixon", "Ramos", "Reyes", "Burns",
    "Gordon", "Shaw", "Holmes", "Rice", "Robertson", "Hunt", "Black", "Daniels", "Palmer", "Mills"
  ]
  const maleFirstNames = ["James", "Michael", "Oliver", "Lucas", "Ethan", "Alexander", "William", "Benjamin", "Henry", "Sebastian", "Jack", "Daniel", "Matthew", "Joseph", "David", "Andrew", "Christopher", "Joshua", "Nathan", "Ryan", "Samuel", "Thomas", "Gabriel", "Leo"]
  const femaleFirstNames = ["Emily", "Sophia", "Charlotte", "Mia", "Ava", "Isabella", "Amelia", "Harper", "Evelyn", "Abigail", "Emma", "Olivia", "Elizabeth", "Sofia", "Victoria", "Grace", "Chloe", "Camila", "Penelope", "Riley", "Layla", "Zoey"]
  const gradeLevels = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]

  const families: Family[] = []
  const students: Student[] = []

  // สร้าง 150 ครอบครัวให้ครบถ้วน
  let studentCount = 0

  for (let familyIndex = 0; familyIndex < 150; familyIndex++) {
    const familyName = familyNamesList[familyIndex % familyNamesList.length]
    // ทำให้ชื่อครอบครัวไม่ซ้ำด้วยการต่อท้าย index ถ้ามีชื่อซ้ำ
    const uniqueFamilyName = familyIndex >= familyNamesList.length ? `${familyName} ${Math.floor(familyIndex / familyNamesList.length) + 1}` : familyName
    const familyId = `FAM-${String(familyIndex + 1).padStart(3, '0')}`

    // สร้างรหัสครอบครัวที่แน่นอน
    const familyCode = `${uniqueFamilyName.substring(0, 2).toUpperCase()}2025${String(familyIndex + 1).padStart(3, '0')}`

    // จำนวนนักเรียน: 1-3 คนต่อบ้าน
    // 30% มี 1 คน, 50% มี 2 คน, 20% มี 3 คน
    const rand = Math.random()
    const numChildrenInFamily = rand < 0.3 ? 1 : rand < 0.8 ? 2 : 3
    const familyStudentIds: string[] = []

    // สร้างข้อมูลผู้ปกครองชุดเดียวสำหรับทั้งบ้าน
    const fatherName = `${maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]} ${uniqueFamilyName}`
    const motherName = `${femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]} ${uniqueFamilyName}`
    const familyParents: Parent[] = [
      { id: `P-${familyId}-1`, name: fatherName, relationship: "father", phone: `081-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`, email: `${uniqueFamilyName.toLowerCase().replace(/\s/g, '')}@email.com`, isPrimary: true },
      { id: `P-${familyId}-2`, name: motherName, relationship: "mother", phone: `081-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`, email: `${uniqueFamilyName.toLowerCase().replace(/\s/g, '')}2@email.com`, isPrimary: false }
    ]

    for (let i = 0; i < numChildrenInFamily; i++) {
      studentCount++
      const sid = String(studentCount).padStart(3, '0')
      const isMale = Math.random() > 0.5
      const firstName = isMale ? maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)] : femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)]

      const student: Student = {
        id: `STU-${sid}`,
        studentId: `KC2025${sid}`,
        firstName,
        lastName: uniqueFamilyName,
        nickname: firstName.substring(0, 3).toUpperCase(),
        dateOfBirth: new Date(2010 + Math.floor(Math.random() * 10), 0, 1),
        gender: isMale ? "male" : "female",
        gradeLevel: gradeLevels[Math.floor(Math.random() * gradeLevels.length)],
        academicYear: "2025-2026",
        enrollmentTerm: "term1",
        status: "active",
        familyId: familyId,
        familyCode: familyCode, // ใส่ Family Code โดยตรงตามคำขอ
        childOrder: i + 1,
        parents: familyParents,
        enrollmentDate: new Date(),
        notes: i > 0 ? "Sibling" : "",
        createdBy: "System",
        createdAt: new Date(),
        updatedBy: "System",
        updatedAt: new Date()
      }
      students.push(student)
      familyStudentIds.push(student.id)
    }

    // Mock portal status: 40% not_invited, 30% invited, 30% registered
    const portalRand = Math.random()
    const portalStatus = portalRand < 0.4 ? "not_invited" : portalRand < 0.7 ? "invited" : "registered"
    const invitationSentAt = portalStatus !== "not_invited" ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined
    const invitationAcceptedAt = portalStatus === "registered" ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : undefined

    families.push({
      id: familyId,
      familyCode: familyCode,
      familyName: uniqueFamilyName,
      studentIds: familyStudentIds,
      primaryContactId: familyParents[0].id,
      address: `${Math.floor(Math.random() * 999) + 1} Sukhumvit Rd, Bangkok ${10110 + Math.floor(Math.random() * 100)}`,
      email: familyParents[0].email,
      phone: familyParents[0].phone,
      createdAt: new Date(),
      portalStatus,
      invitationSentAt,
      invitationAcceptedAt
    })
  }

  return { families, students }
}


// Generate sample data
const sampleData = generateMockData()

export function StudentProvider({ children }: { children: ReactNode }) {
  // โหลดข้อมูลจาก localStorage ก่อน ถ้าไม่มีค่อยใช้ mock data
  // ไม่ reset ข้อมูลเมื่อ version เปลี่ยน - เก็บข้อมูลที่มีอยู่

  const [students, setStudentsState] = useState<Student[]>(() => {
    const stored = loadStudentsFromStorage()
    return stored !== null ? stored : sampleData.students
  })

  const [families, setFamiliesState] = useState<Family[]>(() => {
    const stored = loadFamiliesFromStorage()
    return stored !== null ? stored : sampleData.families
  })

  // อัปเดต version marker เท่านั้น ไม่ reset ข้อมูล
  useEffect(() => {
    const savedVersion = localStorage.getItem(STUDENT_DATA_VERSION_KEY)
    if (savedVersion !== CURRENT_DATA_VERSION) {
      localStorage.setItem(STUDENT_DATA_VERSION_KEY, CURRENT_DATA_VERSION)
    }
  }, [])

  // Auto-save students to localStorage whenever they change
  useEffect(() => {
    saveStudentsToStorage(students)
  }, [students])

  // Auto-save families to localStorage whenever they change
  useEffect(() => {
    saveFamiliesToStorage(families)
  }, [families])

  const setStudents = (newStudents: Student[]) => {
    setStudentsState(newStudents)
  }

  const setFamilies = (newFamilies: Family[]) => {
    setFamiliesState(newFamilies)
  }

  const addStudent = (student: Student) => {
    setStudentsState(prev => [...prev, student])
  }

  const updateStudent = (studentId: string, updates: Partial<Student>) => {
    setStudentsState(prev => prev.map(s =>
      s.id === studentId ? { ...s, ...updates } : s
    ))
  }

  const deleteStudent = (studentId: string) => {
    setStudentsState(prev => prev.filter(s => s.id !== studentId))
  }

  const addFamily = (family: Family) => {
    setFamiliesState(prev => [...prev, family])
  }

  const updateFamily = (familyId: string, updates: Partial<Family>) => {
    setFamiliesState(prev => prev.map(f =>
      f.id === familyId ? { ...f, ...updates } : f
    ))
  }

  const deleteFamily = (familyId: string) => {
    setFamiliesState(prev => prev.filter(f => f.id !== familyId))
  }

  const getStudentsByFamily = (familyId: string): Student[] => {
    return students
      .filter(s => s.familyId === familyId)
      .sort((a, b) => a.childOrder - b.childOrder)
  }

  const getSiblingDiscount = (student: Student, term: string = "term1"): number => {
    // Check if any sibling in the family has withdrawn status
    // If yes, no sibling discount for anyone in that family
    if (student.familyId) {
      const familySiblings = students.filter(s => s.familyId === student.familyId)
      const hasWithdrawnSibling = familySiblings.some(s => s.status === "withdrawn")
      if (hasWithdrawnSibling) {
        return 0
      }
    }

    // Sibling discount is available from 1st child onwards
    // No Year 3+ requirement for sibling discount (that's only for Registration Fee Waiver)
    // Get discount from Discount Options settings
    const academicYear = student.academicYear || "2025-2026"
    return getSiblingDiscountFromSettings(student.childOrder, academicYear, term)
  }

  const saveToLocalStorage = () => {
    saveStudentsToStorage(students)
    saveFamiliesToStorage(families)
  }

  const checkFeePrivilegeEligibility = (
    student: Student,
    currentYear: string,
    term: string
  ): { eligible: boolean; reason: string; completedYears: number; creditPerTerm?: number; startsFromTerm?: string } => {
    // Load waiver settings (convert term format if needed)
    const convertedTerm = convertTermFormat(term)
    const options = loadDiscountOptions(currentYear, convertedTerm)
    const waiverSettings = options?.waiverAfter3rdYear || {
      enabled: false,
      minimumGradeLevel: 3,
      minimumTerms: 3,  // First child waits 3 terms
      creditAmount: 225000,
      termsToCredit: 3,
      firstChildImmediate: false,  // First child waits 3 terms
      secondChildImmediate: true,  // Second child+ gets immediately
    }

    // Check if waiver is enabled
    if (!waiverSettings.enabled) {
      return { eligible: false, reason: "Fee waiver privilege is disabled", completedYears: 0 }
    }

    // Parse grade level from student.gradeLevel (e.g., "Year 3" -> 3, "Year 10" -> 10, "Nursery" -> 0, "Reception" -> 0)
    let studentGradeLevel = 0
    if (student.gradeLevel === "Nursery" || student.gradeLevel === "Reception") {
      studentGradeLevel = 0
    } else {
      const gradeLevelMatch = student.gradeLevel.match(/(\d+)/)
      studentGradeLevel = gradeLevelMatch ? parseInt(gradeLevelMatch[1]) : 0
    }

    // Check minimum grade level requirement (must be Year 3+)
    if (studentGradeLevel < waiverSettings.minimumGradeLevel) {
      return {
        eligible: false,
        reason: `Must be in Year ${waiverSettings.minimumGradeLevel}+ (currently Year ${studentGradeLevel})`,
        completedYears: 0
      }
    }

    // Get family siblings to check for withdrawn/graduated status
    const familySiblings = student.familyId
      ? students.filter(s => s.familyId === student.familyId && s.id !== student.id)
      : []

    // Find first child in family (childOrder === 1)
    const firstChild = student.childOrder === 1 ? student : familySiblings.find(s => s.childOrder === 1)

    // Check if first child has withdrawn (affects second child+ from next term)
    // If first child is "graduated", siblings still keep their privilege
    if (student.childOrder > 1 && firstChild?.status === "withdrawn") {
      return {
        eligible: false,
        reason: "First child has withdrawn - siblings not eligible from next term",
        completedYears: 0
      }
    }

    // Calculate credit per term
    const creditPerTerm = Math.round(waiverSettings.creditAmount / waiverSettings.termsToCredit)

    // Number of terms for credit
    const termsToCredit = waiverSettings.termsToCredit

    // Get current term number (1, 2, or 3)
    const currentTermNum = term === "term1" || term === "1" ? 1
      : term === "term2" || term === "2" ? 2
        : term === "term3" || term === "3" ? 3 : 1

    // Get enrollment term number
    const enrollmentTermNum = student.enrollmentTerm === "term1" ? 1
      : student.enrollmentTerm === "term2" ? 2
        : student.enrollmentTerm === "term3" ? 3 : 1

    // Get enrollment year from enrollmentDate (not academicYear which changes on promotion)
    // Academic year follows: May-April (Term 1: May-Aug, Term 2: Sep-Dec, Term 3: Jan-Apr)
    const getAcademicYearFromDate = (date: Date | null): number => {
      if (!date) return 2025
      const month = date.getMonth() + 1 // 1-12
      const year = date.getFullYear()
      // If month >= 5 (May), academic year starts in current year
      // If month < 5 (Jan-Apr), academic year started in previous year
      return month >= 5 ? year : year - 1
    }

    const enrollmentYearNum = getAcademicYearFromDate(student.enrollmentDate)
    const currentYearNum = currentYear ? parseInt(currentYear.split("-")[0]) : 2025

    // Calculate total terms completed since enrollment
    const yearsDiff = currentYearNum - enrollmentYearNum
    const termsCompleted = (yearsDiff * 3) + (currentTermNum - enrollmentTermNum)

    // Default childOrder to 1 if not set
    const childOrder = student.childOrder || 1

    // Minimum terms to wait (for first child)
    const minimumTerms = waiverSettings.minimumTerms || 3

    // CASE 1: First child - must wait 3 terms, receives from term 4 onwards
    if (childOrder === 1) {
      if (waiverSettings.firstChildImmediate) {
        // If firstChildImmediate is true, first child gets immediately
        return {
          eligible: true,
          reason: `Child #1 - ฿${creditPerTerm.toLocaleString()}/term x ${termsToCredit} terms (immediate)`,
          completedYears: termsCompleted,
          creditPerTerm,
          startsFromTerm: "immediate"
        }
      }

      // First child must wait minimumTerms (3 terms), eligible from term 4
      if (termsCompleted >= minimumTerms) {
        // Calculate when the waiver starts
        const startTermNum = ((enrollmentTermNum - 1 + minimumTerms) % 3) + 1
        const startYear = enrollmentYearNum + Math.floor((enrollmentTermNum - 1 + minimumTerms) / 3)
        const startsFromTerm = `Term ${startTermNum}, ${startYear}-${startYear + 1}`

        return {
          eligible: true,
          reason: `Child #1 - ฿${creditPerTerm.toLocaleString()}/term x ${termsToCredit} terms (after ${minimumTerms} terms)`,
          completedYears: termsCompleted,
          creditPerTerm,
          startsFromTerm
        }
      }

      // Still waiting
      const termsRemaining = minimumTerms - termsCompleted
      return {
        eligible: false,
        reason: `Child #1 - Need ${termsRemaining} more term(s) (${termsCompleted}/${minimumTerms} completed)`,
        completedYears: termsCompleted
      }
    }

    // CASE 2: Second child or later (childOrder >= 2) - gets immediately
    if (childOrder >= 2) {
      // Check secondChildImmediate setting
      if (waiverSettings.secondChildImmediate !== false) {
        // Check if first child is still in school (active) or graduated
        if (!firstChild || firstChild.status === "active" || firstChild.status === "graduated") {
          return {
            eligible: true,
            reason: `Child #${childOrder} - ฿${creditPerTerm.toLocaleString()}/term x ${termsToCredit} terms (immediate)`,
            completedYears: termsCompleted,
            creditPerTerm,
            startsFromTerm: "immediate"
          }
        }

        // First child is on_leave or other status
        return {
          eligible: false,
          reason: "First child status prevents privilege",
          completedYears: termsCompleted
        }
      }
    }

    return {
      eligible: false,
      reason: "Not eligible for fee waiver",
      completedYears: 0
    }
  }

  return (
    <StudentContext.Provider value={{
      students,
      families,
      setStudents,
      setFamilies,
      addStudent,
      updateStudent,
      deleteStudent,
      addFamily,
      updateFamily,
      deleteFamily,
      getStudentsByFamily,
      getSiblingDiscount,
      checkFeePrivilegeEligibility,
      saveToLocalStorage
    }}>
      {children}
    </StudentContext.Provider>
  )
}

export function useStudents() {
  const context = useContext(StudentContext)
  if (context === undefined) {
    throw new Error("useStudents must be used within a StudentProvider")
  }
  return context
}
