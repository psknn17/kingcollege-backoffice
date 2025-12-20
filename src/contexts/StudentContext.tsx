import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface Parent {
  id: string
  name: string
  relationship: "father" | "mother" | "guardian" | "other"
  phone: string
  email: string
  isPrimary: boolean
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
  phone: string
  createdAt: Date
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
  }
}

const StudentContext = createContext<StudentContextType | undefined>(undefined)

const STUDENTS_STORAGE_KEY = "students"
const FAMILIES_STORAGE_KEY = "families"
const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"

// Helper to load discount options from localStorage
const loadDiscountOptions = (academicYear: string, term: string) => {
  try {
    const stored = localStorage.getItem(DISCOUNT_OPTIONS_STORAGE_KEY)
    if (stored) {
      const allData = JSON.parse(stored)
      const storageKey = `${academicYear}_${term}`
      return allData[storageKey] || null
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
const convertTermFormat = (term: string): string => {
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
    if (stored) {
      const parsed = JSON.parse(stored)
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
    if (stored) {
      const parsed = JSON.parse(stored)
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
  const familyNames = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
    "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
    "Campbell", "Mitchell", "Carter", "Roberts", "Turner", "Phillips", "Evans",
    "Parker", "Edwards", "Collins", "Stewart", "Morris", "Murphy", "Cook"
  ]

  const maleFirstNames = [
    "James", "Michael", "Oliver", "Lucas", "Ethan", "Alexander", "William", "Benjamin",
    "Henry", "Sebastian", "Jack", "Daniel", "Matthew", "Joseph", "David", "Andrew",
    "Christopher", "Joshua", "Nathan", "Ryan", "Samuel", "Thomas", "Gabriel", "Leo",
    "Isaac", "Owen", "Adrian", "Julian", "Aaron", "Dylan", "Elijah", "Caleb"
  ]

  const femaleFirstNames = [
    "Emily", "Sophia", "Charlotte", "Mia", "Ava", "Isabella", "Amelia", "Harper",
    "Evelyn", "Abigail", "Emma", "Olivia", "Elizabeth", "Sofia", "Victoria", "Grace",
    "Chloe", "Camila", "Penelope", "Riley", "Layla", "Zoey", "Nora", "Lily",
    "Eleanor", "Hannah", "Lillian", "Addison", "Aubrey", "Stella", "Natalie", "Zoe"
  ]

  const nicknames: Record<string, string> = {
    "James": "Jamie", "Michael": "Mike", "Oliver": "Ollie", "Lucas": "Luke",
    "Alexander": "Alex", "William": "Will", "Benjamin": "Ben", "Sebastian": "Seb",
    "Daniel": "Dan", "Matthew": "Matt", "Joseph": "Joe", "Christopher": "Chris",
    "Joshua": "Josh", "Nathan": "Nate", "Samuel": "Sam", "Thomas": "Tom",
    "Emily": "Em", "Sophia": "Sophie", "Charlotte": "Charlie", "Isabella": "Bella",
    "Amelia": "Amy", "Abigail": "Abby", "Elizabeth": "Liz", "Victoria": "Vicky",
    "Chloe": "Clo", "Penelope": "Penny", "Eleanor": "Ellie", "Lillian": "Lily",
    "Natalie": "Nat", "Addison": "Addie"
  }

  const addresses = [
    "123 Sukhumvit Road, Bangkok 10110",
    "456 Silom Road, Bangkok 10500",
    "789 Sathorn Road, Bangkok 10120",
    "321 Ratchadaphisek Road, Bangkok 10400",
    "555 Ladprao Road, Bangkok 10230",
    "999 Phahonyothin Road, Bangkok 10900",
    "111 Rama IV Road, Bangkok 10330",
    "222 Thonglor Road, Bangkok 10110",
    "333 Ekkamai Road, Bangkok 10110",
    "444 Asoke Road, Bangkok 10110"
  ]

  const gradeLevels = [
    "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5",
    "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"
  ]

  // Calculate birth year based on grade level (assuming current year 2025)
  const getBirthYear = (gradeLevel: string): number => {
    const gradeToAge: Record<string, number> = {
      "Nursery": 4, "Reception": 5, "Year 1": 6, "Year 2": 7, "Year 3": 8,
      "Year 4": 9, "Year 5": 10, "Year 6": 11, "Year 7": 12, "Year 8": 13,
      "Year 9": 14, "Year 10": 15, "Year 11": 16, "Year 12": 17, "Year 13": 18
    }
    return 2025 - (gradeToAge[gradeLevel] || 10)
  }

  const families: Family[] = []
  const students: Student[] = []

  let studentCounter = 1
  let familyCounter = 1
  let parentCounter = 1

  // Create families with varying sizes to distribute 150 students
  // Strategy: We need 150 students across 15 grades (10 per grade)
  // Create a mix of 1-child (40), 2-child (35), and 3-child (10) families = 150 students total

  // Track students per grade to ensure 10 per grade
  const studentsPerGrade: Record<string, number> = {}
  gradeLevels.forEach(g => studentsPerGrade[g] = 0)

  // Helper to get next available grade with less than 10 students
  const getAvailableGrade = (preferredGrades: string[]): string | null => {
    for (const grade of preferredGrades) {
      if (studentsPerGrade[grade] < 10) return grade
    }
    // Fallback: find any grade with space
    for (const grade of gradeLevels) {
      if (studentsPerGrade[grade] < 10) return grade
    }
    return null
  }

  // Create families
  for (let f = 0; f < 60; f++) {
    const familyName = familyNames[f % familyNames.length]
    const familyId = `FAM${String(familyCounter).padStart(3, '0')}`
    const familyCode = `${familyName.substring(0, 2).toUpperCase()}2024${String(familyCounter).padStart(3, '0')}`

    // Determine number of children for this family
    let numChildren: number
    if (f < 30) numChildren = 1  // 30 single-child families
    else if (f < 50) numChildren = 2  // 20 two-child families (40 students)
    else numChildren = 3  // 10 three-child families (30 students)
    // Total: 30 + 40 + 30 = 100 students from this structure
    // We need 150 total, so we'll add more families below

    const studentIds: string[] = []
    const familyStudents: { id: string; grade: string }[] = []

    // Create students for this family
    for (let c = 0; c < numChildren; c++) {
      // Determine grade based on child order (older children in higher grades)
      let preferredGrades: string[]
      if (numChildren === 1) {
        preferredGrades = [...gradeLevels]
      } else if (numChildren === 2) {
        preferredGrades = c === 0
          ? gradeLevels.slice(5) // First child: Year 4+
          : gradeLevels.slice(0, 8) // Second child: Nursery to Year 6
      } else {
        preferredGrades = c === 0
          ? gradeLevels.slice(7) // First child: Year 6+
          : c === 1
            ? gradeLevels.slice(3, 10) // Second child: Year 2 to Year 8
            : gradeLevels.slice(0, 6) // Third child: Nursery to Year 4
      }

      const grade = getAvailableGrade(preferredGrades)
      if (!grade) continue // Skip if all grades are full

      studentsPerGrade[grade]++

      const studentId = `STU${String(studentCounter).padStart(3, '0')}`
      const isMale = studentCounter % 2 === 1
      const firstName = isMale
        ? maleFirstNames[(studentCounter - 1) % maleFirstNames.length]
        : femaleFirstNames[(studentCounter - 1) % femaleFirstNames.length]
      const nickname = nicknames[firstName] || firstName.substring(0, 3)

      const birthYear = getBirthYear(grade)
      const birthMonth = ((studentCounter * 3) % 12) + 1
      const birthDay = ((studentCounter * 7) % 28) + 1

      const enrollmentYear = Math.max(2020, birthYear + 4)

      const fatherId = `P${String(parentCounter).padStart(3, '0')}`
      const motherId = `P${String(parentCounter + 1).padStart(3, '0')}`
      parentCounter += 2

      const student: Student = {
        id: studentId,
        studentId: `KC2024${String(studentCounter).padStart(3, '0')}`,
        firstName,
        lastName: familyName,
        nickname,
        dateOfBirth: new Date(`${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`),
        gender: isMale ? "male" : "female",
        gradeLevel: grade,
        academicYear: "2025-2026",
        enrollmentTerm: "term1",
        status: "active",
        familyId,
        childOrder: c + 1,
        parents: [
          {
            id: fatherId,
            name: `${maleFirstNames[(f * 2) % maleFirstNames.length]} ${familyName}`,
            relationship: "father",
            phone: `08${1 + (f % 9)}-${String(100 + f).padStart(3, '0')}-${String(1000 + studentCounter).padStart(4, '0')}`,
            email: `${familyName.toLowerCase()}.father@email.com`,
            isPrimary: true
          },
          {
            id: motherId,
            name: `${femaleFirstNames[(f * 2) % femaleFirstNames.length]} ${familyName}`,
            relationship: "mother",
            phone: `08${1 + (f % 9)}-${String(200 + f).padStart(3, '0')}-${String(2000 + studentCounter).padStart(4, '0')}`,
            email: `${familyName.toLowerCase()}.mother@email.com`,
            isPrimary: false
          }
        ],
        enrollmentDate: new Date(`${enrollmentYear}-08-15`),
        notes: c > 0 ? "Sibling" : "",
        createdBy: "Admin",
        createdAt: new Date(`${enrollmentYear}-08-15`),
        updatedBy: "Admin",
        updatedAt: new Date("2024-01-10")
      }

      students.push(student)
      studentIds.push(studentId)
      familyStudents.push({ id: studentId, grade })
      studentCounter++
    }

    if (studentIds.length > 0) {
      families.push({
        id: familyId,
        familyCode,
        familyName,
        studentIds,
        primaryContactId: `P${String((familyCounter - 1) * 2 + 1).padStart(3, '0')}`,
        address: addresses[f % addresses.length],
        email: `${familyName.toLowerCase()}.family@email.com`,
        phone: `08${1 + (f % 9)}-${String(f + 100).padStart(3, '0')}-${String(f + 1000).padStart(4, '0')}`,
        createdAt: new Date(`2024-0${1 + (f % 9)}-${String(10 + (f % 20)).padStart(2, '0')}`)
      })
      familyCounter++
    }
  }

  // Fill remaining slots to reach 10 students per grade
  // Add additional single-child families for grades that need more students
  for (const grade of gradeLevels) {
    while (studentsPerGrade[grade] < 10) {
      const familyName = familyNames[familyCounter % familyNames.length]
      const familyId = `FAM${String(familyCounter).padStart(3, '0')}`
      const familyCode = `${familyName.substring(0, 2).toUpperCase()}2024${String(familyCounter).padStart(3, '0')}`

      const studentId = `STU${String(studentCounter).padStart(3, '0')}`
      const isMale = studentCounter % 2 === 1
      const firstName = isMale
        ? maleFirstNames[(studentCounter - 1) % maleFirstNames.length]
        : femaleFirstNames[(studentCounter - 1) % femaleFirstNames.length]
      const nickname = nicknames[firstName] || firstName.substring(0, 3)

      const birthYear = getBirthYear(grade)
      const birthMonth = ((studentCounter * 3) % 12) + 1
      const birthDay = ((studentCounter * 7) % 28) + 1
      const enrollmentYear = Math.max(2020, birthYear + 4)

      const fatherId = `P${String(parentCounter).padStart(3, '0')}`
      const motherId = `P${String(parentCounter + 1).padStart(3, '0')}`
      parentCounter += 2

      const student: Student = {
        id: studentId,
        studentId: `KC2024${String(studentCounter).padStart(3, '0')}`,
        firstName,
        lastName: familyName,
        nickname,
        dateOfBirth: new Date(`${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`),
        gender: isMale ? "male" : "female",
        gradeLevel: grade,
        academicYear: "2025-2026",
        enrollmentTerm: "term1",
        status: "active",
        familyId,
        childOrder: 1,
        parents: [
          {
            id: fatherId,
            name: `${maleFirstNames[(familyCounter * 2) % maleFirstNames.length]} ${familyName}`,
            relationship: "father",
            phone: `08${1 + (familyCounter % 9)}-${String(100 + familyCounter).padStart(3, '0')}-${String(1000 + studentCounter).padStart(4, '0')}`,
            email: `${familyName.toLowerCase()}.father@email.com`,
            isPrimary: true
          },
          {
            id: motherId,
            name: `${femaleFirstNames[(familyCounter * 2) % femaleFirstNames.length]} ${familyName}`,
            relationship: "mother",
            phone: `08${1 + (familyCounter % 9)}-${String(200 + familyCounter).padStart(3, '0')}-${String(2000 + studentCounter).padStart(4, '0')}`,
            email: `${familyName.toLowerCase()}.mother@email.com`,
            isPrimary: false
          }
        ],
        enrollmentDate: new Date(`${enrollmentYear}-08-15`),
        notes: "",
        createdBy: "Admin",
        createdAt: new Date(`${enrollmentYear}-08-15`),
        updatedBy: "Admin",
        updatedAt: new Date("2024-01-10")
      }

      students.push(student)
      studentsPerGrade[grade]++

      families.push({
        id: familyId,
        familyCode,
        familyName,
        studentIds: [studentId],
        primaryContactId: fatherId,
        address: addresses[familyCounter % addresses.length],
        email: `${familyName.toLowerCase()}.family@email.com`,
        phone: `08${1 + (familyCounter % 9)}-${String(familyCounter + 100).padStart(3, '0')}-${String(familyCounter + 1000).padStart(4, '0')}`,
        createdAt: new Date(`2024-0${1 + (familyCounter % 9)}-${String(10 + (familyCounter % 20)).padStart(2, '0')}`)
      })

      studentCounter++
      familyCounter++
    }
  }

  return { families, students }
}

// Generate sample data
const { families: sampleFamilies, students: sampleStudents } = generateMockData()

export function StudentProvider({ children }: { children: ReactNode }) {
  const [students, setStudentsState] = useState<Student[]>(() => {
    return loadStudentsFromStorage() || sampleStudents
  })
  const [families, setFamiliesState] = useState<Family[]>(() => {
    return loadFamiliesFromStorage() || sampleFamilies
  })

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveStudentsToStorage(students)
  }, [students])

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

    // Check minimum grade level requirement (Year 3+)
    // Parse grade level from student.gradeLevel (e.g., "year3" or "Year 3" -> 3)
    let studentGradeLevel = 0
    const gradeLevelLower = student.gradeLevel.toLowerCase()
    if (gradeLevelLower === "nursery" || gradeLevelLower === "reception") {
      studentGradeLevel = 0
    } else {
      const gradeLevelMatch = student.gradeLevel.match(/(\d+)/)
      studentGradeLevel = gradeLevelMatch ? parseInt(gradeLevelMatch[1]) : 0
    }

    // Must be in Year 3 or higher to receive sibling discount
    if (studentGradeLevel < 3) {
      return 0
    }

    // Get discount from Discount Options settings
    const academicYear = student.academicYear || "2025-2026"
    return getSiblingDiscountFromSettings(student.childOrder, academicYear, term)
  }

  const checkFeePrivilegeEligibility = (
    student: Student,
    currentYear: string,
    term: string
  ): { eligible: boolean; reason: string; completedYears: number } => {
    // Load waiver settings (convert term format if needed)
    const convertedTerm = convertTermFormat(term)
    const options = loadDiscountOptions(currentYear, convertedTerm)
    const waiverSettings = options?.waiverAfter3rdYear || {
      enabled: true,
      minimumGradeLevel: 3,
      minimumYears: 3,
      creditAmount: 225000,
      termsToCredit: 3,
      firstChildImmediate: true,
    }

    // Check if waiver is enabled
    if (!waiverSettings.enabled) {
      return { eligible: false, reason: "Fee waiver privilege is disabled", completedYears: 0 }
    }

    // Check if student has withdrawn sibling (no privilege for family with withdrawn student)
    if (student.familyId) {
      const familySiblings = students.filter(s => s.familyId === student.familyId)
      const hasWithdrawnSibling = familySiblings.some(s => s.status === "withdrawn")
      if (hasWithdrawnSibling) {
        return { eligible: false, reason: "Family has withdrawn student - not eligible", completedYears: 0 }
      }
    }

    // Parse grade level from student.gradeLevel (e.g., "Year 3" -> 3, "Year 10" -> 10, "Nursery" -> 0, "Reception" -> 0)
    let studentGradeLevel = 0
    if (student.gradeLevel === "Nursery" || student.gradeLevel === "Reception") {
      studentGradeLevel = 0
    } else {
      const gradeLevelMatch = student.gradeLevel.match(/(\d+)/)
      studentGradeLevel = gradeLevelMatch ? parseInt(gradeLevelMatch[1]) : 0
    }

    // Check minimum grade level requirement
    if (studentGradeLevel < waiverSettings.minimumGradeLevel) {
      return {
        eligible: false,
        reason: `Must enroll in Year ${waiverSettings.minimumGradeLevel}+ (currently Year ${studentGradeLevel})`,
        completedYears: 0
      }
    }

    // First child gets privilege immediately (if enabled)
    if (student.childOrder === 1 && waiverSettings.firstChildImmediate) {
      return { eligible: true, reason: "First child - immediate privilege", completedYears: 0 }
    }

    // For 2nd child+, calculate completed academic years
    const enrollmentYear = student.enrollmentDate
      ? student.enrollmentDate.getFullYear()
      : new Date().getFullYear()
    const currentYearNum = parseInt(currentYear.split("-")[0])

    let completedYears = currentYearNum - enrollmentYear

    // Determine enrollment term based on enrollment date month
    // Term 1: Aug-Dec, Term 2: Jan-Mar, Term 3: Apr-Jun
    if (student.enrollmentDate) {
      const enrollmentMonth = student.enrollmentDate.getMonth() + 1 // 1-12
      const isTermOne = enrollmentMonth >= 8 && enrollmentMonth <= 12
      // If not enrolled in Term 1, first year is half-term (doesn't count)
      if (!isTermOne) {
        completedYears = Math.max(0, completedYears - 1)
      }
    }

    // Check if completed minimum years
    if (completedYears >= waiverSettings.minimumYears) {
      return {
        eligible: true,
        reason: `Completed ${completedYears} academic years`,
        completedYears
      }
    }

    const yearsRemaining = waiverSettings.minimumYears - completedYears
    return {
      eligible: false,
      reason: `Need ${yearsRemaining} more year(s) (completed ${completedYears}/${waiverSettings.minimumYears})`,
      completedYears
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
      checkFeePrivilegeEligibility
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
