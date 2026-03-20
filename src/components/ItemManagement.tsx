import { useState, useEffect } from "react"
import { PaginationBar } from "@/components/ui/pagination-bar"
import { downloadAsXlsx, parseXlsxOrCsvFile, XLSX_ACCEPT } from "@/utils/xlsxUtils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Textarea } from "./ui/textarea"
import { Search, Filter, Plus, Edit, Trash2, CheckCircle, X, Package, Tag, Bookmark, GraduationCap, Zap, MapPin, FileText, Eye, ArrowUpDown, CreditCard, Upload, FileDown, Download, Save } from "lucide-react"
import { Checkbox } from "./ui/checkbox"
import { Switch } from "./ui/switch"
import { ViewModal } from "./ViewModal"
import { toast } from "@/components/ui/sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { parseTuitionItemName } from "@/utils/itemAutoCreate"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ColumnPresets } from "@/utils/tableAlignment"
import { logActivity } from "@/lib/activityLog"

interface Item {
  id: string
  itemCode: string
  name: string
  description: string
  amount: number
  category?: string
  nominalCode?: string // Account/Nominal Code for accounting
  documentType?: string // SI (Sales Invoice) or CI (Credit Invoice)
  isActive: boolean
  applicableGrades: string[]
  appointmentDate?: string
  invoiceType?: "student" | "external" | "eca"
}

interface ItemTemplate {
  id: string
  name: string
  description: string
  items: string[] // Item IDs
  itemData?: Record<string, { name: string; amount: number; category?: string }> // Snapshot for display fallback
  applicableGrades: string[]
  isActive: boolean
  invoiceType?: "student" | "external"
}

const grades = ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
const categories = ["Tuition", "School Bus", "ECA", "Trip & Other Activity"]
const externalCategories = ["Rental", "Catering", "Service", "Event", "Other"]
const afterSchoolCategories = ["Field Trip", "Camp", "Sports Event", "Cultural Event", "Workshop"]
const eventCategories = ["International Exam", "English Proficiency", "Competition", "School Exam", "Certification"]
const summerCategories = ["Annual Service", "Term Service", "Monthly Service", "Special Service"]

const mockItems: Item[] = []

// ECA items - Music Programs
const mockECAItems: Item[] = [
  // Piano
  {
    id: "eca-item-001",
    itemCode: "ECA-001",
    name: "Piano - Term 1",
    description: "Piano lessons for Term 1 including practice materials",
    amount: 8000,
    category: "ECA",
    nominalCode: "4150001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-002",
    itemCode: "ECA-002",
    name: "Piano - Term 2",
    description: "Piano lessons for Term 2 including practice materials",
    amount: 8000,
    category: "ECA",
    nominalCode: "4150001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-003",
    itemCode: "ECA-003",
    name: "Piano - Term 3",
    description: "Piano lessons for Term 3 including practice materials",
    amount: 8000,
    category: "ECA",
    nominalCode: "4150001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Guitar
  {
    id: "eca-item-004",
    itemCode: "ECA-004",
    name: "Guitar - Term 1",
    description: "Guitar lessons for Term 1 including practice materials",
    amount: 6000,
    category: "ECA",
    nominalCode: "4150002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-005",
    itemCode: "ECA-005",
    name: "Guitar - Term 2",
    description: "Guitar lessons for Term 2 including practice materials",
    amount: 6000,
    category: "ECA",
    nominalCode: "4150002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-006",
    itemCode: "ECA-006",
    name: "Guitar - Term 3",
    description: "Guitar lessons for Term 3 including practice materials",
    amount: 6000,
    category: "ECA",
    nominalCode: "4150002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Violin
  {
    id: "eca-item-007",
    itemCode: "ECA-007",
    name: "Violin - Term 1",
    description: "Violin lessons for Term 1 including practice materials",
    amount: 7500,
    category: "ECA",
    nominalCode: "4150003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-008",
    itemCode: "ECA-008",
    name: "Violin - Term 2",
    description: "Violin lessons for Term 2 including practice materials",
    amount: 7500,
    category: "ECA",
    nominalCode: "4150003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-009",
    itemCode: "ECA-009",
    name: "Violin - Term 3",
    description: "Violin lessons for Term 3 including practice materials",
    amount: 7500,
    category: "ECA",
    nominalCode: "4150003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Drums
  {
    id: "eca-item-010",
    itemCode: "ECA-010",
    name: "Drums - Term 1",
    description: "Drum lessons for Term 1 including practice materials",
    amount: 7000,
    category: "ECA",
    nominalCode: "4150004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-011",
    itemCode: "ECA-011",
    name: "Drums - Term 2",
    description: "Drum lessons for Term 2 including practice materials",
    amount: 7000,
    category: "ECA",
    nominalCode: "4150004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-012",
    itemCode: "ECA-012",
    name: "Drums - Term 3",
    description: "Drum lessons for Term 3 including practice materials",
    amount: 7000,
    category: "ECA",
    nominalCode: "4150004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Voice/Singing
  {
    id: "eca-item-013",
    itemCode: "ECA-013",
    name: "Voice - Term 1",
    description: "Voice and singing lessons for Term 1",
    amount: 5000,
    category: "ECA",
    nominalCode: "4150005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-014",
    itemCode: "ECA-014",
    name: "Voice - Term 2",
    description: "Voice and singing lessons for Term 2",
    amount: 5000,
    category: "ECA",
    nominalCode: "4150005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-015",
    itemCode: "ECA-015",
    name: "Voice - Term 3",
    description: "Voice and singing lessons for Term 3",
    amount: 5000,
    category: "ECA",
    nominalCode: "4150005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Music Theory
  {
    id: "eca-item-016",
    itemCode: "ECA-016",
    name: "Music Theory - Term 1",
    description: "Music theory and composition lessons for Term 1",
    amount: 4500,
    category: "ECA",
    nominalCode: "4150006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-017",
    itemCode: "ECA-017",
    name: "Music Theory - Term 2",
    description: "Music theory and composition lessons for Term 2",
    amount: 4500,
    category: "ECA",
    nominalCode: "4150006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "eca-item-018",
    itemCode: "ECA-018",
    name: "Music Theory - Term 3",
    description: "Music theory and composition lessons for Term 3",
    amount: 4500,
    category: "ECA",
    nominalCode: "4150006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  }
]

const mockTemplates: ItemTemplate[] = [
  {
    id: "template-001",
    name: "Complete Tuition Package",
    description: "Full academic year tuition package for all students",
    items: ["item-001", "item-002", "item-003", "item-004"],
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"],
    isActive: true
  },
  {
    id: "template-002",
    name: "Basic Tuition Only",
    description: "Essential tuition fees only",
    items: ["item-001", "item-002", "item-003"],
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"],
    isActive: true
  },
  {
    id: "template-003",
    name: "Early Years Package",
    description: "Tuition package for Pre-Nursery to Reception",
    items: ["item-001", "item-002"],
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception"],
    isActive: true
  },
  {
    id: "template-004",
    name: "Primary School Package",
    description: "Tuition package for Year 1 to Year 6",
    items: ["item-001", "item-002", "item-003"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  },
  {
    id: "template-005",
    name: "Secondary School Package",
    description: "Tuition package for Year 7 to Year 11",
    items: ["item-001", "item-002", "item-003", "item-004"],
    applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"],
    isActive: true
  },
  {
    id: "template-006",
    name: "Sixth Form Package",
    description: "Tuition package for Year 12 and Year 13",
    items: ["item-001", "item-002", "item-003", "item-004"],
    applicableGrades: ["Year 12", "Year 13"],
    isActive: true
  }
]

// Mock data for Trip & Activity items
const mockTripItems: Item[] = [
  {
    id: "trip-item-001",
    itemCode: "TRP-001",
    name: "Science Museum Field Trip",
    description: "Day trip to Science Museum including transportation and entrance fee",
    amount: 1500,
    category: "Trip & Other Activity",
    nominalCode: "4120001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"]
  },
  {
    id: "trip-item-002",
    itemCode: "TRP-002",
    name: "Art Museum Field Trip",
    description: "Day trip to Art Museum with guided tour",
    amount: 1200,
    category: "Trip & Other Activity",
    nominalCode: "4120002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8"]
  },
  {
    id: "trip-item-003",
    itemCode: "TRP-003",
    name: "Zoo Field Trip",
    description: "Educational trip to the zoo with wildlife education program",
    amount: 1800,
    category: "Trip & Other Activity",
    nominalCode: "4120003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3"]
  },
  {
    id: "trip-item-004",
    itemCode: "TRP-004",
    name: "Historical Site Visit",
    description: "Educational trip to historical landmarks",
    amount: 2000,
    category: "Trip & Other Activity",
    nominalCode: "4120004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9"]
  },
  {
    id: "trip-item-005",
    itemCode: "TRP-005",
    name: "Overnight Camp - 2 Days",
    description: "2-day overnight camping trip with activities",
    amount: 4500,
    category: "Trip & Other Activity",
    nominalCode: "4120005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 4", "Year 5", "Year 6", "Year 7", "Year 8"]
  },
  {
    id: "trip-item-006",
    itemCode: "TRP-006",
    name: "Overnight Camp - 3 Days",
    description: "3-day overnight camping trip with outdoor activities",
    amount: 6500,
    category: "Trip & Other Activity",
    nominalCode: "4120006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"]
  },
  {
    id: "trip-item-007",
    itemCode: "TRP-007",
    name: "Sports Day Activity",
    description: "Annual sports day participation fee",
    amount: 500,
    category: "Trip & Other Activity",
    nominalCode: "4120007",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "trip-item-008",
    itemCode: "TRP-008",
    name: "Cultural Exchange Program",
    description: "International cultural exchange program fee",
    amount: 15000,
    category: "Trip & Other Activity",
    nominalCode: "4120008",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  }
]

const mockTripTemplates: ItemTemplate[] = [
  {
    id: "trip-template-001",
    name: "Primary School Trip Package",
    description: "Field trips package for primary school students",
    items: ["trip-item-001", "trip-item-002", "trip-item-003"],
    applicableGrades: ["Year 1", "Year 2", "Year 3"],
    isActive: true
  },
  {
    id: "trip-template-002",
    name: "Secondary School Trip Package",
    description: "Field trips and activities for secondary students",
    items: ["trip-item-004", "trip-item-005", "trip-item-007"],
    applicableGrades: ["Year 7", "Year 8", "Year 9"],
    isActive: true
  }
]

// Mock data for Exam items
const mockExamItems: Item[] = [
  {
    id: "exam-item-001",
    itemCode: "EXM-001",
    name: "Cambridge IGCSE Registration",
    description: "Cambridge IGCSE examination registration fee per subject",
    amount: 5500,
    category: "Exam",
    nominalCode: "4130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 10", "Year 11"]
  },
  {
    id: "exam-item-002",
    itemCode: "EXM-002",
    name: "Cambridge A-Level Registration",
    description: "Cambridge A-Level examination registration fee per subject",
    amount: 7500,
    category: "Exam",
    nominalCode: "4130002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 12", "Year 13"]
  },
  {
    id: "exam-item-003",
    itemCode: "EXM-003",
    name: "SAT Examination Fee",
    description: "SAT standardized test registration fee",
    amount: 3500,
    category: "Exam",
    nominalCode: "4130003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 11", "Year 12", "Year 13"]
  },
  {
    id: "exam-item-004",
    itemCode: "EXM-004",
    name: "IELTS Examination Fee",
    description: "IELTS English proficiency test fee",
    amount: 7500,
    category: "Exam",
    nominalCode: "4130004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "exam-item-005",
    itemCode: "EXM-005",
    name: "TOEFL Examination Fee",
    description: "TOEFL English proficiency test fee",
    amount: 6500,
    category: "Exam",
    nominalCode: "4130005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "exam-item-006",
    itemCode: "EXM-006",
    name: "Cambridge Checkpoint",
    description: "Cambridge Checkpoint assessment fee",
    amount: 3000,
    category: "Exam",
    nominalCode: "4130006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 6", "Year 9"]
  },
  {
    id: "exam-item-007",
    itemCode: "EXM-007",
    name: "Internal Examination Fee",
    description: "School internal examination administration fee",
    amount: 1500,
    category: "Exam",
    nominalCode: "4130007",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "exam-item-008",
    itemCode: "EXM-008",
    name: "Re-examination Fee",
    description: "Fee for re-sitting examinations",
    amount: 2000,
    category: "Exam",
    nominalCode: "4130008",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  }
]

const mockExamTemplates: ItemTemplate[] = [
  {
    id: "exam-template-001",
    name: "IGCSE Examination Package (5 subjects)",
    description: "Standard IGCSE examination package for 5 subjects",
    items: ["exam-item-001", "exam-item-001", "exam-item-001", "exam-item-001", "exam-item-001"],
    applicableGrades: ["Year 10", "Year 11"],
    isActive: true
  },
  {
    id: "exam-template-002",
    name: "A-Level Examination Package (3 subjects)",
    description: "Standard A-Level examination package for 3 subjects",
    items: ["exam-item-002", "exam-item-002", "exam-item-002"],
    applicableGrades: ["Year 12", "Year 13"],
    isActive: true
  },
  {
    id: "exam-template-003",
    name: "University Preparation Package",
    description: "SAT and IELTS package for university applications",
    items: ["exam-item-003", "exam-item-004"],
    applicableGrades: ["Year 12", "Year 13"],
    isActive: true
  }
]

// Mock data for School Bus items
const mockBusItems: Item[] = [
  {
    id: "bus-item-001",
    itemCode: "BUS-001",
    name: "School Bus - Term 1 (Zone A)",
    description: "School bus service for Term 1 - Zone A (0-5 km)",
    amount: 8000,
    category: "School Bus",
    nominalCode: "4140001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-002",
    itemCode: "BUS-002",
    name: "School Bus - Term 1 (Zone B)",
    description: "School bus service for Term 1 - Zone B (5-10 km)",
    amount: 10000,
    category: "School Bus",
    nominalCode: "4140002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-003",
    itemCode: "BUS-003",
    name: "School Bus - Term 1 (Zone C)",
    description: "School bus service for Term 1 - Zone C (10-15 km)",
    amount: 12000,
    category: "School Bus",
    nominalCode: "4140003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-004",
    itemCode: "BUS-004",
    name: "School Bus - Term 2 (Zone A)",
    description: "School bus service for Term 2 - Zone A (0-5 km)",
    amount: 8000,
    category: "School Bus",
    nominalCode: "4140001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-005",
    itemCode: "BUS-005",
    name: "School Bus - Term 2 (Zone B)",
    description: "School bus service for Term 2 - Zone B (5-10 km)",
    amount: 10000,
    category: "School Bus",
    nominalCode: "4140002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-006",
    itemCode: "BUS-006",
    name: "School Bus - Term 2 (Zone C)",
    description: "School bus service for Term 2 - Zone C (10-15 km)",
    amount: 12000,
    category: "School Bus",
    nominalCode: "4140003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-007",
    itemCode: "BUS-007",
    name: "School Bus - Term 3 (Zone A)",
    description: "School bus service for Term 3 - Zone A (0-5 km)",
    amount: 8000,
    category: "School Bus",
    nominalCode: "4140001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-008",
    itemCode: "BUS-008",
    name: "School Bus - Term 3 (Zone B)",
    description: "School bus service for Term 3 - Zone B (5-10 km)",
    amount: 10000,
    category: "School Bus",
    nominalCode: "4140002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-009",
    itemCode: "BUS-009",
    name: "School Bus - Term 3 (Zone C)",
    description: "School bus service for Term 3 - Zone C (10-15 km)",
    amount: 12000,
    category: "School Bus",
    nominalCode: "4140003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-010",
    itemCode: "BUS-010",
    name: "School Bus - Annual (Zone A)",
    description: "Annual school bus service - Zone A (0-5 km) - 10% discount",
    amount: 21600,
    category: "School Bus",
    nominalCode: "4140004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-011",
    itemCode: "BUS-011",
    name: "School Bus - Annual (Zone B)",
    description: "Annual school bus service - Zone B (5-10 km) - 10% discount",
    amount: 27000,
    category: "School Bus",
    nominalCode: "4140005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "bus-item-012",
    itemCode: "BUS-012",
    name: "School Bus - Annual (Zone C)",
    description: "Annual school bus service - Zone C (10-15 km) - 10% discount",
    amount: 32400,
    category: "School Bus",
    nominalCode: "4140006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  }
]

const mockBusTemplates: ItemTemplate[] = [
  {
    id: "bus-template-001",
    name: "Zone A - Full Year Package",
    description: "Complete school bus service for Zone A (0-5 km) all terms",
    items: ["bus-item-001", "bus-item-004", "bus-item-007"],
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  },
  {
    id: "bus-template-002",
    name: "Zone B - Full Year Package",
    description: "Complete school bus service for Zone B (5-10 km) all terms",
    items: ["bus-item-002", "bus-item-005", "bus-item-008"],
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  },
  {
    id: "bus-template-003",
    name: "Zone C - Full Year Package",
    description: "Complete school bus service for Zone C (10-15 km) all terms",
    items: ["bus-item-003", "bus-item-006", "bus-item-009"],
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  }
]

// Mock data for External Invoice items
const mockExternalItems: Item[] = [
  {
    id: "ext-item-001",
    itemCode: "EXT-001",
    name: "Conference Room Rental",
    description: "Full day conference room rental with AV equipment",
    amount: 15000,
    category: "Rental",
    nominalCode: "4210001",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-002",
    itemCode: "EXT-002",
    name: "Event Catering - Standard",
    description: "Standard catering package per person",
    amount: 350,
    category: "Catering",
    nominalCode: "4220001",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-003",
    itemCode: "EXT-003",
    name: "Event Catering - Premium",
    description: "Premium catering package per person",
    amount: 550,
    category: "Catering",
    nominalCode: "4220002",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-004",
    itemCode: "EXT-004",
    name: "Auditorium Rental - Half Day",
    description: "Auditorium rental for 4 hours with basic setup",
    amount: 25000,
    category: "Rental",
    nominalCode: "4210002",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-005",
    itemCode: "EXT-005",
    name: "Auditorium Rental - Full Day",
    description: "Auditorium rental for 8 hours with full setup",
    amount: 45000,
    category: "Rental",
    nominalCode: "4210003",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-006",
    itemCode: "EXT-006",
    name: "Sports Field Rental",
    description: "Sports field rental per hour",
    amount: 5000,
    category: "Rental",
    nominalCode: "4210004",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-007",
    itemCode: "EXT-007",
    name: "Swimming Pool Rental",
    description: "Swimming pool rental per hour",
    amount: 8000,
    category: "Rental",
    nominalCode: "4210005",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-008",
    itemCode: "EXT-008",
    name: "Parking Fee",
    description: "Event parking fee per vehicle",
    amount: 200,
    category: "Service",
    nominalCode: "4230001",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-009",
    itemCode: "EXT-009",
    name: "Technical Support",
    description: "On-site technical support per hour",
    amount: 1500,
    category: "Service",
    nominalCode: "4230002",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-010",
    itemCode: "EXT-010",
    name: "Event Coordination Fee",
    description: "Event coordination and management fee",
    amount: 10000,
    category: "Service",
    nominalCode: "4230003",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-011",
    itemCode: "EXT-011",
    name: "Holiday Camp - Full Program",
    description: "Complete holiday camp program including activities, meals, and materials",
    amount: 15000,
    category: "Event",
    nominalCode: "4240001",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-012",
    itemCode: "EXT-012",
    name: "Holiday Camp - Half Day",
    description: "Half day holiday camp program (morning or afternoon session)",
    amount: 8000,
    category: "Event",
    nominalCode: "4240002",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-013",
    itemCode: "EXT-013",
    name: "Training Course - Professional Development",
    description: "Professional development training course for educators and staff",
    amount: 12000,
    category: "Service",
    nominalCode: "4230004",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-014",
    itemCode: "EXT-014",
    name: "Training Workshop - Specialized Skills",
    description: "Specialized skills training workshop (per participant)",
    amount: 5000,
    category: "Service",
    nominalCode: "4230005",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-015",
    itemCode: "EXT-015",
    name: "Gap Year Exam - SAT",
    description: "SAT examination fee for gap year students",
    amount: 18000,
    category: "Event",
    nominalCode: "4240003",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-016",
    itemCode: "EXT-016",
    name: "Gap Year Exam - IELTS",
    description: "IELTS examination fee for gap year students",
    amount: 7500,
    category: "Event",
    nominalCode: "4240004",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  },
  {
    id: "ext-item-017",
    itemCode: "EXT-017",
    name: "Gap Year Exam - TOEFL",
    description: "TOEFL examination fee for gap year students",
    amount: 6500,
    category: "Event",
    nominalCode: "4240005",
    isActive: true,
    applicableGrades: [],
    invoiceType: "external"
  }
]

// Mock templates for External Invoice
const mockExternalTemplates: ItemTemplate[] = [
  {
    id: "ext-template-001",
    name: "Conference Package - Standard",
    description: "Standard conference room with basic catering",
    items: ["ext-item-001", "ext-item-002", "ext-item-008"],
    applicableGrades: [],
    isActive: true,
    invoiceType: "external"
  },
  {
    id: "ext-template-002",
    name: "Conference Package - Premium",
    description: "Conference room with premium catering and tech support",
    items: ["ext-item-001", "ext-item-003", "ext-item-008", "ext-item-009"],
    applicableGrades: [],
    isActive: true,
    invoiceType: "external"
  },
  {
    id: "ext-template-003",
    name: "Large Event Package",
    description: "Auditorium with full services",
    items: ["ext-item-005", "ext-item-003", "ext-item-008", "ext-item-009", "ext-item-010"],
    applicableGrades: [],
    isActive: true,
    invoiceType: "external"
  },
  {
    id: "ext-template-004",
    name: "Holiday Camp - Complete Package",
    description: "Full day holiday camp with meals and coordination",
    items: ["ext-item-011", "ext-item-002", "ext-item-010"],
    applicableGrades: [],
    isActive: true,
    invoiceType: "external"
  },
  {
    id: "ext-template-005",
    name: "Professional Training Package",
    description: "Training course with technical support and coordination",
    items: ["ext-item-013", "ext-item-009", "ext-item-010"],
    applicableGrades: [],
    isActive: true,
    invoiceType: "external"
  }
]

// Mock data for Trip & Activity (afterschool) items
const mockAfterSchoolItems: Item[] = [
  {
    id: "trip-item-001",
    itemCode: "TRP-001",
    name: "Bangkok City Tour",
    description: "Full day educational tour to historical sites in Bangkok",
    amount: 2500,
    category: "Field Trip",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-002",
    itemCode: "TRP-002",
    name: "Science Museum Visit",
    description: "Interactive science learning experience at the museum",
    amount: 1800,
    category: "Field Trip",
    nominalCode: "2130002",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-003",
    itemCode: "TRP-003",
    name: "Beach Camp - 3 Days",
    description: "Three-day beach camping trip with outdoor activities",
    amount: 8500,
    category: "Camp",
    nominalCode: "2130003",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-004",
    itemCode: "TRP-004",
    name: "Mountain Adventure Camp",
    description: "Adventure camp with hiking and nature exploration",
    amount: 9500,
    category: "Camp",
    nominalCode: "2130004",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-005",
    itemCode: "ACT-001",
    name: "Swimming Competition",
    description: "Inter-school swimming competition registration",
    amount: 500,
    category: "Sports Event",
    nominalCode: "2220001",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-006",
    itemCode: "ACT-002",
    name: "Football Tournament",
    description: "Annual football tournament participation fee",
    amount: 800,
    category: "Sports Event",
    nominalCode: "2220002",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-007",
    itemCode: "ACT-003",
    name: "Annual Sports Day",
    description: "Sports day event participation and uniform",
    amount: 350,
    category: "Sports Event",
    nominalCode: "2220003",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-008",
    itemCode: "ACT-004",
    name: "Music Concert",
    description: "Annual music concert participation fee",
    amount: 1200,
    category: "Cultural Event",
    nominalCode: "2220004",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-009",
    itemCode: "ACT-005",
    name: "Art Exhibition",
    description: "Student art exhibition entry and materials",
    amount: 600,
    category: "Cultural Event",
    nominalCode: "2220005",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "trip-item-010",
    itemCode: "ACT-006",
    name: "Drama Performance",
    description: "School drama show participation and costume",
    amount: 1500,
    category: "Cultural Event",
    nominalCode: "2220006",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  }
]

// Mock templates for Trip & Activity
const mockAfterSchoolTemplates: ItemTemplate[] = [
  {
    id: "trip-template-001",
    name: "Primary Field Trip Package",
    description: "Educational field trips for primary students",
    items: ["trip-item-001", "trip-item-002"],
    applicableGrades: [],
    isActive: true
  },
  {
    id: "trip-template-002",
    name: "Adventure Camp Package",
    description: "Outdoor camping and adventure activities",
    items: ["trip-item-003", "trip-item-004"],
    applicableGrades: [],
    isActive: true
  },
  {
    id: "trip-template-003",
    name: "Sports Event Bundle",
    description: "All sports events and competitions",
    items: ["trip-item-005", "trip-item-006", "trip-item-007"],
    applicableGrades: [],
    isActive: true
  }
]

// Mock data for Exam (event) items
const mockEventItems: Item[] = [
  {
    id: "exam-item-001",
    itemCode: "EXM-001",
    name: "Cambridge IGCSE Registration",
    description: "Cambridge IGCSE examination registration fee",
    amount: 8500,
    category: "International Exam",
    nominalCode: "2130005",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-002",
    itemCode: "EXM-002",
    name: "Cambridge A-Level Registration",
    description: "Cambridge A-Level examination registration fee",
    amount: 9500,
    category: "International Exam",
    nominalCode: "2130006",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-003",
    itemCode: "EXM-003",
    name: "IELTS Preparation Test",
    description: "IELTS mock examination and preparation",
    amount: 3500,
    category: "English Proficiency",
    nominalCode: "2130007",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-004",
    itemCode: "EXM-004",
    name: "TOEFL Junior Test",
    description: "TOEFL Junior examination fee",
    amount: 2800,
    category: "English Proficiency",
    nominalCode: "2130008",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-005",
    itemCode: "EXM-005",
    name: "SAT Registration",
    description: "SAT examination registration fee",
    amount: 4500,
    category: "International Exam",
    nominalCode: "2130009",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-006",
    itemCode: "EXM-006",
    name: "Math Olympiad Entry",
    description: "Mathematics Olympiad competition entry fee",
    amount: 1200,
    category: "Competition",
    nominalCode: "2220007",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-007",
    itemCode: "EXM-007",
    name: "Science Olympiad Entry",
    description: "Science Olympiad competition entry fee",
    amount: 1200,
    category: "Competition",
    nominalCode: "2220008",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-008",
    itemCode: "EXM-008",
    name: "Spelling Bee Registration",
    description: "National Spelling Bee competition registration",
    amount: 800,
    category: "Competition",
    nominalCode: "2220009",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-009",
    itemCode: "EXM-009",
    name: "Mid-Term Exam Materials",
    description: "Mid-term examination answer sheets and materials",
    amount: 150,
    category: "School Exam",
    nominalCode: "2130010",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "exam-item-010",
    itemCode: "EXM-010",
    name: "Final Exam Materials",
    description: "Final examination answer sheets and materials",
    amount: 150,
    category: "School Exam",
    nominalCode: "2130011",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  }
]

// Mock templates for Exam
const mockEventTemplates: ItemTemplate[] = [
  {
    id: "exam-template-001",
    name: "Cambridge Full Package",
    description: "IGCSE and A-Level examination bundle",
    items: ["exam-item-001", "exam-item-002"],
    applicableGrades: [],
    isActive: true
  },
  {
    id: "exam-template-002",
    name: "English Proficiency Bundle",
    description: "All English proficiency tests",
    items: ["exam-item-003", "exam-item-004"],
    applicableGrades: [],
    isActive: true
  },
  {
    id: "exam-template-003",
    name: "Academic Competition Package",
    description: "Math and Science Olympiad entries",
    items: ["exam-item-006", "exam-item-007", "exam-item-008"],
    applicableGrades: [],
    isActive: true
  }
]

// Mock data for School Bus (summer) items
const mockSummerItems: Item[] = [
  {
    id: "bus-item-001",
    itemCode: "BUS-001",
    name: "Zone 1 - Round Trip (Annual)",
    description: "Annual school bus service for Zone 1, morning and afternoon",
    amount: 45000,
    category: "Annual Service",
    nominalCode: "2220010",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-002",
    itemCode: "BUS-002",
    name: "Zone 1 - One Way Morning (Annual)",
    description: "Annual school bus service for Zone 1, morning only",
    amount: 28000,
    category: "Annual Service",
    nominalCode: "2220011",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-003",
    itemCode: "BUS-003",
    name: "Zone 1 - One Way Afternoon (Annual)",
    description: "Annual school bus service for Zone 1, afternoon only",
    amount: 28000,
    category: "Annual Service",
    nominalCode: "2220012",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-004",
    itemCode: "BUS-004",
    name: "Zone 2 - Round Trip (Annual)",
    description: "Annual school bus service for Zone 2, morning and afternoon",
    amount: 55000,
    category: "Annual Service",
    nominalCode: "2220013",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-005",
    itemCode: "BUS-005",
    name: "Zone 2 - One Way Morning (Annual)",
    description: "Annual school bus service for Zone 2, morning only",
    amount: 35000,
    category: "Annual Service",
    nominalCode: "2220014",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-006",
    itemCode: "BUS-006",
    name: "Zone 3 - Round Trip (Annual)",
    description: "Annual school bus service for Zone 3, morning and afternoon",
    amount: 65000,
    category: "Annual Service",
    nominalCode: "2220015",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-007",
    itemCode: "BUS-007",
    name: "Monthly Bus Pass - Zone 1",
    description: "Monthly school bus service for Zone 1",
    amount: 4500,
    category: "Monthly Service",
    nominalCode: "2220016",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-008",
    itemCode: "BUS-008",
    name: "Monthly Bus Pass - Zone 2",
    description: "Monthly school bus service for Zone 2",
    amount: 5500,
    category: "Monthly Service",
    nominalCode: "2220017",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-009",
    itemCode: "BUS-009",
    name: "Term 1 Bus Service - Zone 1",
    description: "Term 1 school bus service for Zone 1",
    amount: 15000,
    category: "Term Service",
    nominalCode: "2220018",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  },
  {
    id: "bus-item-010",
    itemCode: "BUS-010",
    name: "Special Trip Transportation",
    description: "Transportation for special school events and field trips",
    amount: 500,
    category: "Special Service",
    nominalCode: "2220019",
    documentType: "SI",
    isActive: true,
    applicableGrades: []
  }
]

// Mock templates for ECA
const mockECATemplates: ItemTemplate[] = [
  {
    id: "eca-template-001",
    name: "Primary ECA Music Bundle - Term 1",
    description: "Popular music courses for primary students - Term 1",
    items: ["eca-item-001", "eca-item-004", "eca-item-007"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  },
  {
    id: "eca-template-002",
    name: "Full Year Piano Course",
    description: "Complete piano lessons for all 3 terms",
    items: ["eca-item-001", "eca-item-002", "eca-item-003"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"],
    isActive: true
  },
  {
    id: "eca-template-003",
    name: "Full Year Guitar Course",
    description: "Complete guitar lessons for all 3 terms",
    items: ["eca-item-004", "eca-item-005", "eca-item-006"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"],
    isActive: true
  }
]

// Mock templates for School Bus
const mockSummerTemplates: ItemTemplate[] = [
  {
    id: "bus-template-001",
    name: "Zone 1 Complete Package",
    description: "All Zone 1 transportation options",
    items: ["bus-item-001", "bus-item-002", "bus-item-003"],
    applicableGrades: [],
    isActive: true
  },
  {
    id: "bus-template-002",
    name: "Annual Service Bundle",
    description: "Annual round-trip services for all zones",
    items: ["bus-item-001", "bus-item-004", "bus-item-006"],
    applicableGrades: [],
    isActive: true
  },
  {
    id: "bus-template-003",
    name: "Monthly Pass Package",
    description: "Monthly bus passes for Zone 1 and 2",
    items: ["bus-item-007", "bus-item-008"],
    applicableGrades: [],
    isActive: true
  }
]

// Get mock items based on category
const getMockItems = (category: string): Item[] => {
  switch (category) {
    case "external":
      return mockExternalItems
    case "afterschool":
      return mockAfterSchoolItems
    case "event":
      return mockEventItems
    case "summer":
      return mockSummerItems
    case "eca":
      return mockECAItems
    case "trip":
      return mockTripItems
    case "exam":
      return mockExamItems
    case "bus":
      return mockBusItems
    case "tuition":
    case "student":
    default:
      return mockItems
  }
}

// Get mock templates based on category
const getMockTemplates = (category: string): ItemTemplate[] => {
  switch (category) {
    case "external":
      return mockExternalTemplates
    case "afterschool":
      return mockAfterSchoolTemplates
    case "event":
      return mockEventTemplates
    case "summer":
      return mockSummerTemplates
    case "eca":
      return mockECATemplates
    case "trip":
      return mockTripTemplates
    case "exam":
      return mockExamTemplates
    case "bus":
      return mockBusTemplates
    case "tuition":
    case "student":
    default:
      return mockTemplates
  }
}

// Get storage key based on invoice category
const getItemsStorageKey = (category: string): string => {
  switch (category) {
    case "afterschool":
      return "afterschoolItems"
    case "event":
      return "eventItems"
    case "summer":
      return "summerItems"
    case "external":
      return "externalItems"
    case "eca":
      return "ecaItems"
    case "trip":
      return "tripItems"
    case "exam":
      return "examItems"
    case "bus":
      return "busItems"
    case "tuition":
      return "invoiceItems"
    default:
      return "invoiceItems" // student/tuition items
  }
}

const getTemplatesStorageKey = (category: string): string => {
  switch (category) {
    case "afterschool":
      return "afterschoolTemplates"
    case "event":
      return "eventTemplates"
    case "summer":
      return "summerTemplates"
    case "external":
      return "externalTemplates"
    case "eca":
      return "ecaTemplates"
    case "trip":
      return "tripTemplates"
    case "exam":
      return "examTemplates"
    case "bus":
      return "busTemplates"
    case "tuition":
      return "invoiceTemplates"
    default:
      return "invoiceTemplates" // student/tuition templates
  }
}

// Data version for tracking - no longer clears data on version change
const DATA_VERSION = "2.0.0"

// Update version marker without clearing existing data
const updateVersionMarker = () => {
  const storedVersion = localStorage.getItem("itemManagementDataVersion")
  if (storedVersion !== DATA_VERSION) {
    // Just update the version marker - DO NOT delete user data
    localStorage.setItem("itemManagementDataVersion", DATA_VERSION)

  }
}

// Run version update on module load
updateVersionMarker()

// Generate item code based on category
const generateItemCode = (category: string, index: number): string => {
  const prefix = category === "Tuition" ? "TUI" :
    category === "ECA" ? "ECA" :
      category === "Trip & Other Activity" ? "TRP" :
        category === "School Bus" ? "BUS" :
          category === "Sports & Activities" ? "SPT" :
            category === "Academic Programs" ? "ACA" :
              category === "Creative Arts" ? "ART" :
                category === "Technology" ? "TEC" :
                  category === "Educational Activities" ? "EDU" :
                    category === "School Supplies" ? "SUP" :
                      category === "Transportation" ? "TRN" :
                        category === "Meals" ? "MEA" :
                          "ITM"
  return `${prefix}-${String(index).padStart(3, '0')}`
}

// Check if stored items belong to the correct category
const isValidStoredData = (storedItems: Item[], invoiceCategory: string): boolean => {
  if (storedItems.length === 0) return false

  // Check if items have correct ID prefix based on category
  switch (invoiceCategory) {
    case "external":
      // External items should have IDs starting with "ext-"
      return storedItems.some(item => item.id.startsWith("ext-") || item.invoiceType === "external")

    case "eca":
      // ECA items should have IDs starting with "eca-item-"
      return storedItems.some(item => item.id.startsWith("eca-item-"))

    case "trip":
      // Trip items should have IDs starting with "trip-item-"
      return storedItems.some(item => item.id.startsWith("trip-item-"))

    case "exam":
      // Exam items should have IDs starting with "exam-item-"
      return storedItems.some(item => item.id.startsWith("exam-item-"))

    case "bus":
      // Bus items should have IDs starting with "bus-item-"
      return storedItems.some(item => item.id.startsWith("bus-item-"))

    case "tuition":
    case "student":
      // Tuition/Student items should have IDs starting with "item-" (not eca-, trip-, exam-, bus-, ext-)
      return storedItems.some(item =>
        item.id.startsWith("item-") &&
        !item.id.startsWith("eca-item-") &&
        !item.id.startsWith("trip-item-") &&
        !item.id.startsWith("exam-item-") &&
        !item.id.startsWith("bus-item-") &&
        !item.id.startsWith("ext-item-")
      )

    // Legacy categories (kept for backwards compatibility)
    case "afterschool":
      return storedItems.some(item => item.id.startsWith("trip-"))
    case "event":
      return storedItems.some(item => item.id.startsWith("exam-"))
    case "summer":
      return storedItems.some(item => item.id.startsWith("bus-"))

    default:
      return true
  }
}

// Get storage key for deleted items
const getDeletedItemsStorageKey = (category: string) => `deletedItems_${category}`

// Load deleted item IDs from localStorage
const loadDeletedItemIds = (invoiceCategory: string = "student"): Set<string> => {
  try {
    const stored = localStorage.getItem(getDeletedItemsStorageKey(invoiceCategory))
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch (error) {
    console.error("Failed to load deleted items:", error)
  }
  return new Set()
}

// Save deleted item IDs to localStorage
const saveDeletedItemIds = (deletedIds: Set<string>, invoiceCategory: string = "student") => {
  try {
    localStorage.setItem(getDeletedItemsStorageKey(invoiceCategory), JSON.stringify(Array.from(deletedIds)))
  } catch (error) {
    console.error("Failed to save deleted items:", error)
  }
}

// Load items from localStorage and merge with category-specific mock items
const loadItemsFromStorage = (invoiceCategory: string = "student"): Item[] => {
  const categoryMockItems = getMockItems(invoiceCategory)
  const storageKey = getItemsStorageKey(invoiceCategory)
  const deletedItemIds = loadDeletedItemIds(invoiceCategory)

  // Define allowed categories for each invoice type
  const getAllowedCategories = (category: string): string[] | null => {
    switch (category) {
      case "student":
      case "tuition":
        return ["Tuition"] // Only Tuition items for student/tuition invoices
      case "eca":
        return ["ECA", "Music", "Arts", "Sports", "Academic", "Other"]
      case "trip":
      case "afterschool":
        return ["Trip & Other Activity", "Field Trip", "Camp", "Sports Event", "Cultural Event", "Workshop"]
      case "exam":
      case "event":
        return ["Exam", "International Exam", "English Proficiency", "Competition", "School Exam", "Certification"]
      case "bus":
      case "summer":
        return ["School Bus", "Annual Service", "Term Service", "Monthly Service", "Special Service"]
      default:
        return null // No filter for external and other types
    }
  }

  const allowedCategories = getAllowedCategories(invoiceCategory)

  try {
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) {
      const storedItems = JSON.parse(stored)

      // Explicitly cleared (empty array written by reset) — return empty, no mock fallback
      if (storedItems.length === 0) return []

      // Validate stored data belongs to correct category
      if (!isValidStoredData(storedItems, invoiceCategory)) {
        // Invalid data - clear and return mock items (excluding deleted ones)
        localStorage.removeItem(getItemsStorageKey(invoiceCategory))
        return categoryMockItems.filter(item => !deletedItemIds.has(item.id))
      }

      // Ensure all items have itemCode
      const itemsWithCode = storedItems.map((item: any, index: number) => ({
        ...item,
        itemCode: item.itemCode || generateItemCode(item.category || "Other", index + 1)
      }))

      // For all categories: sync amounts, names, descriptions from mock data and merge new items
      // Map through stored items and update properties for standard mock items if they match
      const updatedItems = itemsWithCode.map((item: Item) => {
        const mockMatch = categoryMockItems.find(m => m.id === item.id);
        if (mockMatch) {
          return {
            ...item,
            amount: mockMatch.amount,
            name: mockMatch.name,
            description: mockMatch.description,
            category: mockMatch.category,
            itemCode: mockMatch.itemCode || item.itemCode,
            nominalCode: mockMatch.nominalCode || item.nominalCode,
            documentType: mockMatch.documentType || item.documentType || "SI"
          };
        }
        return item;
      });

      // Merge: add any mockItems that don't exist in stored items AND haven't been deleted
      const updatedIds = new Set(updatedItems.map((item: Item) => item.id))
      const newMockItems = categoryMockItems.filter(mockItem =>
        !updatedIds.has(mockItem.id) && !deletedItemIds.has(mockItem.id)
      )

      let finalItems = newMockItems.length > 0 ? [...updatedItems, ...newMockItems] : updatedItems

      // Filter by allowed categories if applicable
      if (allowedCategories) {
        finalItems = finalItems.filter((item: Item) => allowedCategories.includes(item.category || ""))
      }

      return finalItems
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
  }
  // Filter out deleted items from mock items before returning
  return categoryMockItems.filter(item => !deletedItemIds.has(item.id))
}

// Save items to localStorage
const saveItemsToStorage = (items: Item[], invoiceCategory: string = "student") => {
  try {
    localStorage.setItem(getItemsStorageKey(invoiceCategory), JSON.stringify(items))
  } catch (error) {
    console.error("Failed to save items to localStorage:", error)
  }
}

// Load templates from localStorage
const loadTemplatesFromStorage = (invoiceCategory: string = "student"): ItemTemplate[] | null => {
  try {
    const stored = localStorage.getItem(getTemplatesStorageKey(invoiceCategory))
    if (stored !== null) {
      // Trust stored data completely — including empty array (user deleted all templates)
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load templates from localStorage:", error)
  }
  // null = nothing ever saved → caller should use mock templates and persist them
  return null
}

// Save templates to localStorage
const saveTemplatesToStorage = (templates: ItemTemplate[], invoiceCategory: string = "student") => {
  try {
    localStorage.setItem(getTemplatesStorageKey(invoiceCategory), JSON.stringify(templates))
  } catch (error) {
    console.error("Failed to save templates to localStorage:", error)
  }
}

interface ItemManagementProps {
  onNavigateToSubPage?: (subPage: string, params?: any) => void
  onNavigateToView?: (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => void
  invoiceType?: "student" | "external" | "afterschool" | "event" | "summer" | "tuition" | "eca" | "trip" | "exam" | "bus"
}

export function ItemManagement({ onNavigateToSubPage, onNavigateToView, invoiceType = "student" }: ItemManagementProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)

  // Confirmation dialog hooks
  const addConfirmDialog = useConfirmDialog()
  const editConfirmDialog = useConfirmDialog()
  const importConfirmDialog = useConfirmDialog()
  const deleteConfirmDialog = useConfirmDialog()

  const isExternalView = invoiceType === "external"
  const isCategoryView = ["afterschool", "event", "summer", "eca", "trip", "exam", "bus"].includes(invoiceType)
  const isSimplifiedView = isExternalView || isCategoryView
  const currentCategories = invoiceType === "external" ? externalCategories :
    invoiceType === "afterschool" ? afterSchoolCategories :
      invoiceType === "event" ? eventCategories :
        invoiceType === "summer" ? summerCategories :
          categories
  const [activeTab, setActiveTab] = useState<"items" | "templates">("items")

  // Load items and templates for this specific category
  const [items, setItems] = useState<Item[]>(() => loadItemsFromStorage(invoiceType))
  const [templates, setTemplates] = useState<ItemTemplate[]>(() => {
    const stored = loadTemplatesFromStorage(invoiceType)
    if (stored !== null) return stored
    // First time: initialize from mock templates and persist immediately
    const initial = getMockTemplates(invoiceType)
    saveTemplatesToStorage(initial, invoiceType)
    return initial
  })

  // Manual save function
  const handleSaveChanges = () => {
    saveItemsToStorage(items, invoiceType)
    saveTemplatesToStorage(templates, invoiceType)
    toast.success(t("item.changesSaved"))
    logActivity({ action: "Save", module: "Items & Templates", detail: `Saved all changes for ${invoiceType} items and templates` })
  }

  // Items state
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [searchItemTerm, setSearchItemTerm] = invoiceType === "tuition"
    ? useState<string>("")
    : useState("")
  const [selectedCategory, setSelectedCategory] = invoiceType === "tuition"
    ? useState<string>("all")
    : useState("all")
  const [selectedDocType, setSelectedDocType] = useState("all")

  // Multi-select for bulk delete
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Sorting states
  const [sortColumn, setSortColumn] = invoiceType === "tuition"
    ? useState<string>("")
    : useState<string>("")
  const [sortDirection, setSortDirection] = invoiceType === "tuition"
    ? useState<"asc" | "desc">("asc")
    : useState<"asc" | "desc">("asc")
  // Templates state
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ItemTemplate | null>(null)
  const [searchTemplateTerm, setSearchTemplateTerm] = useState("")
  const [itemSearchTerm, setItemSearchTerm] = useState("") // New state for searching items in template modal
  const [selectedItemsForTemplate, setSelectedItemsForTemplate] = useState<string[]>([])

  // View Modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewModalData, setViewModalData] = useState<any>(null)
  const [viewModalType, setViewModalType] = useState<"item" | "template">("item")

  // Usage detail popup state
  const [usageDialogItem, setUsageDialogItem] = useState<Item | null>(null)
  const [usageDialogFilter, setUsageDialogFilter] = useState<"all" | "paid">("all")

  // Load invoices from localStorage and compute usage stats for an item
  const getItemUsageData = (item: Item) => {
    try {
      const stored = localStorage.getItem("createdInvoices")
      if (!stored) return []
      const invoices: any[] = JSON.parse(stored)
      return invoices.filter(inv => {
        if (!inv.items || !Array.isArray(inv.items)) return false
        return inv.items.some((li: any) =>
          (li.itemCode && li.itemCode === item.itemCode) ||
          (li.description && li.description === item.name)
        )
      })
    } catch {
      return []
    }
  }

  const getUsageCount = (item: Item) => getItemUsageData(item).length
  const getPaidCount = (item: Item) => getItemUsageData(item).filter(inv => inv.status === "paid").length

  // Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importError, setImportError] = useState<string>("")
  const [showAllImportPreview, setShowAllImportPreview] = useState(false)

  // New item form state
  const [newItem, setNewItem] = useState({
    itemCode: "",
    name: "",
    description: "",
    amount: "",
    category: "",
    nominalCode: "",
    documentType: "SI",
    applicableGrades: [] as string[],
    isActive: true
  })

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    applicableGrades: [] as string[]
  })

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchItemTerm, selectedCategory])

  // One-time cleanup: remove auto-generated tuition items (TUI-T{n}-{GRADE})
  useEffect(() => {
    const cleanupKey = "autoSyncItemsCleanedUp"
    if (localStorage.getItem(cleanupKey)) return

    try {
      const storageKey = "invoiceItems"
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const allItems = JSON.parse(raw)
        const filtered = allItems.filter((item: any) => !/^TUI-T\d+-/i.test(item.itemCode))
        if (filtered.length < allItems.length) {
          localStorage.setItem(storageKey, JSON.stringify(filtered))
          setItems(filtered)

        }
      }
    } catch (e) {
      console.error("[Cleanup] Failed:", e)
    }
    localStorage.setItem(cleanupKey, "true")
  }, [])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString()
  }

  const invoiceTypes = [
    {
      id: "tuition",
      title: "Tuition Invoice",
      description: "Create invoice for tuition fees and academic essentials",
      icon: GraduationCap,
      color: "blue",
      defaultCategory: "Tuition"
    },
    {
      id: "eca",
      title: "ECA Invoice",
      description: "Create invoice for extra-curricular activities",
      icon: Zap,
      color: "green",
      defaultCategory: "ECA"
    },
    {
      id: "trip",
      title: "Trip & Activities Invoice",
      description: "Create invoice for field trips and special events",
      icon: MapPin,
      color: "orange",
      defaultCategory: "Trip & Other Activity"
    }
  ]

  const handleCreateInvoice = (type: string) => {
    const invoiceType = invoiceTypes.find(t => t.id === type)
    if (onNavigateToSubPage && invoiceType) {
      onNavigateToSubPage("invoice-creation", {
        defaultCategory: invoiceType.defaultCategory,
        invoiceType: type
      })
    }
  }

  // Item functions
  const generateRandomNominalCode = () => {
    return Math.floor(1000000 + Math.random() * 9000000).toString()
  }

  const openCreateItemModal = () => {
    setNewItem({
      itemCode: "",
      name: "",
      description: "",
      amount: "",
      category: "",
      nominalCode: (invoiceType === "external" || invoiceType === "eca") ? generateRandomNominalCode() : "",
      documentType: "SI",
      applicableGrades: [],
      isActive: true
    })
    setEditingItem(null)
    setIsCreateItemModalOpen(true)
  }

  // Ensure random code is generated when modal opens for external or eca items
  useEffect(() => {
    if (isCreateItemModalOpen && !editingItem && (invoiceType === "external" || invoiceType === "eca") && !newItem.nominalCode) {
      setNewItem(prev => ({ ...prev, nominalCode: generateRandomNominalCode() }))
    }
  }, [isCreateItemModalOpen, editingItem, invoiceType])

  const openEditItemModal = (item: Item) => {
    setNewItem({
      itemCode: item.itemCode,
      name: item.name,
      description: item.description,
      amount: item.amount.toString(),
      category: item.category || "",
      nominalCode: item.nominalCode || "",
      documentType: item.documentType || "SI",
      applicableGrades: item.applicableGrades,
      isActive: item.isActive !== false
    })
    setEditingItem(item)
    setIsCreateItemModalOpen(true)
  }

  const closeItemModal = () => {
    setIsCreateItemModalOpen(false)
    setEditingItem(null)
  }

  const performSaveItem = () => {
    // Applicable grades are now optional
    if (!newItem.itemCode || !newItem.name || newItem.amount === undefined || newItem.amount === null || newItem.amount === '') {
      toast.error(t("item.fillRequiredFields"))
      return
    }

    const amount = parseFloat(newItem.amount)
    if (isNaN(amount)) {
      toast.error(t("item.enterValidAmount"))
      return
    }

    // Allow amount = 0 for tuition fee items
    // These items are templates - price comes from TuitionByYear data
    // Check if item code starts with "TUI-T" OR if it's a tuition category item with "tuition fee" in name
    const isTuitionTemplate =
      newItem.itemCode.toUpperCase().startsWith('TUI-T') ||
      (newItem.category === 'Tuition' && newItem.name.toLowerCase().includes('tuition fee'))

    if (!isTuitionTemplate && amount <= 0) {
      toast.error(t("item.enterValidAmountPositive"))
      return
    }

    // Set default category based on invoiceType if not provided
    const getDefaultCategory = (type: string): string => {
      switch (type) {
        case "tuition":
        case "student":
          return "Tuition"
        case "bus":
        case "summer":
          return "School Bus"
        case "eca":
          return "ECA"
        case "trip":
        case "afterschool":
          return "Trip & Other Activity"
        case "exam":
        case "event":
          return "Exam"
        case "external":
          return "Rental"
        default:
          return "Tuition"
      }
    }

    const itemData: Item = {
      id: editingItem?.id || `item-${Date.now()}`,
      itemCode: newItem.itemCode,
      name: newItem.name,
      description: newItem.description,
      amount: amount,
      category: newItem.category || getDefaultCategory(invoiceType),
      nominalCode: newItem.nominalCode || undefined,
      documentType: newItem.documentType || "SI",
      applicableGrades: newItem.applicableGrades,
      isActive: newItem.isActive,
      invoiceType: (editingItem?.invoiceType || invoiceType) as Item["invoiceType"]
    }

    if (editingItem) {
      const updatedItems = items.map(item => item.id === editingItem.id ? itemData : item)
      setItems(updatedItems)
      saveItemsToStorage(updatedItems, invoiceType)
      toast.success(t("item.itemUpdated"))
      logActivity({ action: "Update", module: "Items & Templates", detail: `Updated item "${itemData.name}" (${itemData.itemCode})` })
    } else {
      const updatedItems = [...items, itemData]
      setItems(updatedItems)
      saveItemsToStorage(updatedItems, invoiceType)
      toast.success(t("item.itemCreated"))
      logActivity({ action: "Create", module: "Items & Templates", detail: `Created item "${itemData.name}" (${itemData.itemCode})` })
    }

    closeItemModal()
  }

  const handleSaveItem = () => {
    const isEditing = !!editingItem
    const dialog = isEditing ? editConfirmDialog : addConfirmDialog
    dialog.confirm(() => {
      performSaveItem()
    })
  }

  const handleDeleteItem = (itemId: string) => {
    const deletedItem = items.find(item => item.id === itemId)
    // Remove item from items list
    const updatedItems = items.filter(item => item.id !== itemId)
    setItems(updatedItems)

    // Remove item from all templates that contain it
    const updatedTemplates = templates.map(template => ({
      ...template,
      items: template.items.filter(item => item !== itemId)
    }))
    setTemplates(updatedTemplates)

    // Add to deleted items list to prevent it from being re-added on reload
    const deletedIds = loadDeletedItemIds(invoiceType)
    deletedIds.add(itemId)
    saveDeletedItemIds(deletedIds, invoiceType)

    // Save to localStorage immediately
    saveItemsToStorage(updatedItems, invoiceType)
    saveTemplatesToStorage(updatedTemplates, invoiceType)

    toast.success(t("item.itemDeleted"))
    logActivity({ action: "Delete", module: "Items & Templates", detail: `Deleted item "${deletedItem?.name || itemId}"` })
  }

  const handleBulkDelete = () => {
    if (selectedItemIds.size === 0) return

    const idsToDelete = Array.from(selectedItemIds)
    const updatedItems = items.filter(item => !idsToDelete.includes(item.id))
    setItems(updatedItems)

    // Remove from all templates
    const updatedTemplates = templates.map(template => ({
      ...template,
      items: template.items.filter(item => !idsToDelete.includes(item))
    }))
    setTemplates(updatedTemplates)

    // Add to deleted items list
    const deletedIds = loadDeletedItemIds(invoiceType)
    idsToDelete.forEach(id => deletedIds.add(id))
    saveDeletedItemIds(deletedIds, invoiceType)

    saveItemsToStorage(updatedItems, invoiceType)
    saveTemplatesToStorage(updatedTemplates, invoiceType)

    setSelectedItemIds(new Set())
    toast.success(t("item.bulkDeleted").replace("{count}", String(idsToDelete.length)))
    logActivity({ action: "Delete", module: "Items & Templates", detail: `Bulk deleted ${idsToDelete.length} items` })
  }

  // Import functions
  const downloadTemplate = () => {
    const headers = [
      "Item Code",
      "Name",
      "Description",
      "Amount",
      "Category",
      "Nominal Code",
      "Document Type",
      "Status"
    ]

    const exampleRow = [
      "ITEM-001",
      "Sample Item",
      "This is a sample item description",
      "50000",
      categories[0],
      "4110001",
      "SI",
      "active"
    ]

    downloadAsXlsx(headers, [exampleRow], "item_import_template")

    toast.success(t("item.templateDownloaded"))
    logActivity({ action: "Export", module: "Items & Templates", detail: `Downloaded item import template (${invoiceType})` })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const rows = await parseXlsxOrCsvFile(file)
      if (rows.length === 0) {
        setImportError(t("item.fileHasNoData"))
        return
      }

      const requiredHeaders = ["Item Code", "Name", "Amount"]
      const fileHeaders = Object.keys(rows[0])
      const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h))

      if (missingHeaders.length > 0) {
        setImportError(`Missing required columns: ${missingHeaders.join(", ")}. Found columns: ${fileHeaders.join(", ")}`)
        return
      }

      const parsed = rows.map((row, index) => ({ ...row, _rowIndex: index + 2 }))

      setImportPreview(parsed)
      setImportError("")
      setShowAllImportPreview(false)
    } catch {
      setImportError(t("item.failedToParseFile"))
    }
  }

  const performConfirmImport = () => {
    if (importPreview.length === 0) {
      toast.error(t("item.noDataToImport"))
      return
    }

    let imported = 0
    let skipped = 0
    let updatedItems = [...items]

    importPreview.forEach(row => {
      // Check if item already exists (check against running list)
      const existingItem = updatedItems.find(item => item.itemCode === row["Item Code"])
      if (existingItem) {
        skipped++
        return
      }

      const newItem: Item = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemCode: row["Item Code"],
        name: row["Name"],
        description: row["Description"] || "",
        amount: parseFloat(row["Amount"]) || 0,
        category: row["Category"] || categories[0],
        nominalCode: row["Nominal Code"] || "",
        documentType: (row["Document Type"] === "CI" ? "CI" : "SI") as "SI" | "CI",
        isActive: (row["Status"] || "active").toLowerCase() === "active",
        applicableGrades: grades, // Apply to all grades by default
        invoiceType: invoiceType as "student" | "external" | "eca"
      }

      updatedItems = [...updatedItems, newItem]
      imported++
    })

    // Save once after all items are accumulated
    setItems(updatedItems)
    saveItemsToStorage(updatedItems, invoiceType)
    setIsImportDialogOpen(false)
    toast.success(
      skipped > 0
        ? t("item.importedWithSkipped").replace("{imported}", String(imported)).replace("{skipped}", String(skipped))
        : t("item.importedItems").replace("{imported}", String(imported))
    )
    logActivity({ action: "Import", module: "Items & Templates", detail: `Imported ${imported} items${skipped > 0 ? ` (${skipped} skipped)` : ""} for ${invoiceType}` })
  }

  const handleImport = () => {
    setImportPreview([])
    setImportError("")
    setIsImportDialogOpen(true)
  }

  const handleConfirmImport = () => {
    importConfirmDialog.confirm(() => {
      performConfirmImport()
    })
  }

  const handleToggleGrade = (grade: string) => {
    if (newItem.applicableGrades.includes(grade)) {
      setNewItem({
        ...newItem,
        applicableGrades: newItem.applicableGrades.filter(g => g !== grade)
      })
    } else {
      setNewItem({
        ...newItem,
        applicableGrades: [...newItem.applicableGrades, grade]
      })
    }
  }

  // Sync Tuition Fees function
  const handleSyncTuitionFees = () => {
    if (invoiceType !== "tuition" && invoiceType !== "student") {
      toast.error(t("item.syncTuitionOnly"))
      return
    }

    try {
      // Load tuition data from localStorage (from TuitionByYear component)
      const tuitionDataRaw = localStorage.getItem("tuitionByYearData")
      if (!tuitionDataRaw) {
        toast.error(t("item.noTuitionData"))
        return
      }

      const tuitionData: Record<string, any[]> = JSON.parse(tuitionDataRaw)

      // Get the most recent academic year
      const years = Object.keys(tuitionData).sort((a, b) => b.localeCompare(a))
      if (years.length === 0) {
        toast.error(t("item.noTuitionData"))
        return
      }

      const latestYear = years[0]
      const gradeData = tuitionData[latestYear]

      let created = 0
      let updated = 0
      const updatedItems = [...items]

      // For each grade level, create/update items for Term 1, 2, 3
      // Priority: 1) Match imported items by name parsing  2) Match by auto-generated itemCode  3) Create new
      gradeData.forEach((grade: any, index: number) => {
        const gradeLevel = grade.gradeLevel // e.g., "Year 1"
        const gradeOrder = grade.gradeLevelOrder || (index + 1)
        const sharedNominalCode = `411${String(gradeOrder).padStart(4, '0')}`

        for (let term = 1; term <= 3; term++) {
          const amount = grade[`term${term}Amount`] || 0
          if (amount <= 0) continue

          // 1) Try to find imported item by name matching (e.g., "Tuition fee - Term 1 / Year 5")
          const importedItem = updatedItems.find(item => {
            if (item.category !== "Tuition") return false
            const parsed = parseTuitionItemName(item.name)
            return parsed.term === term && parsed.gradeId === grade.id
          })

          if (importedItem) {
            // Found imported item → update only amount, keep itemCode & nominalCode
            importedItem.amount = amount
            importedItem.applicableGrades = [gradeLevel]
            updated++
            continue
          }

          // 2) Fallback: match by auto-generated itemCode
          const autoItemCode = `TUI-T${term}-${grade.id.toUpperCase()}`
          const autoItem = updatedItems.find(item => item.itemCode === autoItemCode)

          if (autoItem) {
            autoItem.amount = amount
            autoItem.name = `Term ${term} Tuition Fee - ${gradeLevel}`
            autoItem.applicableGrades = [gradeLevel]
            autoItem.nominalCode = sharedNominalCode
            updated++
          } else {
            // 3) No match → create new auto-generated item
            updatedItems.push({
              id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              itemCode: autoItemCode,
              name: `Term ${term} Tuition Fee - ${gradeLevel}`,
              description: `Term ${term} tuition fee for ${gradeLevel} (${latestYear})`,
              amount,
              category: "Tuition",
              nominalCode: sharedNominalCode,
              documentType: "SI",
              isActive: true,
              applicableGrades: [gradeLevel],
              invoiceType: "student"
            })
            created++
          }
        }
      })

      setItems(updatedItems)
      saveItemsToStorage(updatedItems, invoiceType)

      // Only show toast if items were created or updated
      if (created > 0 || updated > 0) {

        toast.success(t("item.syncedTuitionFees").replace("{created}", String(created)).replace("{updated}", String(updated)).replace("{year}", latestYear))
        logActivity({ action: "Sync", module: "Items & Templates", detail: `Synced tuition fees for ${latestYear}: ${created} created, ${updated} updated` })
      }
    } catch (error) {
      console.error("Failed to sync tuition fees:", error)
      // Silent fail for auto-sync, only log error
    }
  }

  // Template functions
  const openCreateTemplateModal = () => {
    setNewTemplate({
      name: "",
      description: "",
      applicableGrades: []
    })
    setSelectedItemsForTemplate([])
    setEditingTemplate(null)
    setIsCreateTemplateModalOpen(true)
  }

  const openEditTemplateModal = (template: ItemTemplate) => {
    setNewTemplate({
      name: template.name,
      description: template.description,
      applicableGrades: template.applicableGrades
    })
    setSelectedItemsForTemplate(template.items)
    setEditingTemplate(template)
    setIsCreateTemplateModalOpen(true)
  }

  const closeTemplateModal = () => {
    setIsCreateTemplateModalOpen(false)
    setNewTemplate({ name: "", description: "", applicableGrades: [] })
    setEditingTemplate(null)
    setSelectedItemsForTemplate([])
    setItemSearchTerm("") // Reset search term
  }

  const handleSaveTemplate = () => {
    // Applicable grades are now optional
    if (!newTemplate.name || selectedItemsForTemplate.length === 0) {
      toast.error(t("item.provideTemplateName"))
      return
    }

    // For external and exam templates, set applicableGrades to empty array (not grade-specific)
    const applicableGrades = invoiceType === "external" || invoiceType === "exam"
      ? []
      : newTemplate.applicableGrades

    // Build item snapshot so templates can display name/price even if item is later deleted
    const itemData: Record<string, { name: string; amount: number; category?: string }> = {}
    selectedItemsForTemplate.forEach(itemId => {
      const found = items.find(i => i.id === itemId)
      if (found) {
        itemData[itemId] = { name: found.name, amount: found.amount, category: found.category }
      }
    })

    const templateData: ItemTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      items: selectedItemsForTemplate,
      itemData,
      applicableGrades: applicableGrades,
      isActive: true,
      invoiceType: (editingTemplate?.invoiceType || invoiceType) as ItemTemplate["invoiceType"]
    }

    if (editingTemplate) {
      setTemplates(templates.map(template => template.id === editingTemplate.id ? templateData : template))
      toast.success(t("item.templateUpdated"))
      logActivity({ action: "Update", module: "Items & Templates", detail: `Updated template "${templateData.name}" with ${selectedItemsForTemplate.length} items` })
    } else {
      setTemplates([...templates, templateData])
      toast.success(t("item.templateCreated"))
      logActivity({ action: "Create", module: "Items & Templates", detail: `Created template "${templateData.name}" with ${selectedItemsForTemplate.length} items` })
    }

    closeTemplateModal()
  }

  const handleDeleteTemplate = (templateId: string) => {
    const deletedTemplate = templates.find(template => template.id === templateId)
    const updated = templates.filter(template => template.id !== templateId)
    setTemplates(updated)
    saveTemplatesToStorage(updated, invoiceType)
    toast.success(t("item.templateDeleted"))
    logActivity({ action: "Delete", module: "Items & Templates", detail: `Deleted template "${deletedTemplate?.name || templateId}"` })
  }

  // View Modal functions
  const openItemViewModal = (item: Item) => {
    setViewModalData(item)
    setViewModalType("item")
    setIsViewModalOpen(true)
  }

  const openTemplateViewModal = (template: ItemTemplate) => {
    const templateData = {
      ...template,
      totalAmount: template.items.reduce((sum, itemId) => {
        const item = items.find(i => i.id === itemId)
        return sum + (item?.amount || 0)
      }, 0),
      itemsList: template.items.map(itemId => {
        const item = items.find(i => i.id === itemId)
        return item ? {
          name: item.name,
          description: item.description,
          amount: item.amount,
          category: item.category
        } : null
      }).filter(Boolean)
    }
    setViewModalData(templateData)
    setViewModalType("template")
    setIsViewModalOpen(true)
  }

  const handleEditFromModal = (data: any) => {
    setIsViewModalOpen(false)
    if (viewModalType === "item") {
      openEditItemModal(data)
    } else {
      const template = templates.find(t => t.id === data.id)
      if (template) {
        openEditTemplateModal(template)
      }
    }
  }

  const handleToggleItemForTemplate = (itemId: string) => {
    if (selectedItemsForTemplate.includes(itemId)) {
      setSelectedItemsForTemplate(selectedItemsForTemplate.filter(id => id !== itemId))
    } else {
      setSelectedItemsForTemplate([...selectedItemsForTemplate, itemId])
    }
  }

  const handleToggleGradeForTemplate = (grade: string) => {
    if (newTemplate.applicableGrades.includes(grade)) {
      setNewTemplate({
        ...newTemplate,
        applicableGrades: newTemplate.applicableGrades.filter(g => g !== grade)
      })
    } else {
      setNewTemplate({
        ...newTemplate,
        applicableGrades: [...newTemplate.applicableGrades, grade]
      })
    }
  }

  // Sorting functions
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Filter functions
  const filteredItems = items.filter(item => {
    const searchLower = searchItemTerm.toLowerCase().trim()
    const matchesSearch = !searchLower ||
      item.itemCode.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      (item.category || "").toLowerCase().includes(searchLower) ||
      (item.nominalCode || "").toLowerCase().includes(searchLower) ||
      (item.documentType || "").toLowerCase().includes(searchLower) ||
      item.applicableGrades.some(grade => grade.toLowerCase() === searchLower) ||
      item.applicableGrades.some(grade => grade.toLowerCase().startsWith(searchLower))
    const matchesCategory = !selectedCategory || selectedCategory === "all" || item.category === selectedCategory
    const matchesDocType = selectedDocType === "all" || item.documentType === selectedDocType
    return matchesSearch && matchesCategory && matchesDocType
  })

  // Sort filtered items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortColumn) return 0
    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case "itemCode":
        aValue = a.itemCode
        bValue = b.itemCode
        break
      case "name":
        aValue = a.name
        bValue = b.name
        break
      case "category":
        aValue = a.category || ""
        bValue = b.category || ""
        break
      case "amount":
        aValue = a.amount
        bValue = b.amount
        break
      case "isActive":
        aValue = a.isActive ? 1 : 0
        bValue = b.isActive ? 1 : 0
        break
      default:
        return 0
    }

    if (typeof aValue === "string") {
      const comparison = aValue.localeCompare(bValue)
      return sortDirection === "asc" ? comparison : -comparison
    } else {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize)
  const paginatedItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTemplateTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTemplateTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {activeTab === "items" 
              ? (isExternalView ? t("item.externalItems") : t("item.manageItems"))
              : (isExternalView ? t("item.externalTemplates") : t("item.manageTemplates"))
            }
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeTab === "items"
              ? (isSimplifiedView ? t("item.manageActivityItemsDesc") : t("item.manageItemsDesc"))
              : (isSimplifiedView ? t("item.manageActivityTemplatesDesc") : t("item.manageTemplatesDesc"))
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "items" ? (
            <>
              <Button
                variant="outline"
                disabled={!userCanEdit}
                onClick={handleImport}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {t("common.import")}
              </Button>
              <Button 
                disabled={!userCanEdit} 
                onClick={openCreateItemModal}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t("item.createItem")}
              </Button>
            </>
          ) : (
            <Button 
              disabled={!userCanEdit} 
              onClick={openCreateTemplateModal}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("item.createTemplate")}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "items" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("items")}
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          {t("tabs.items")}
        </Button>
        <Button
          variant={activeTab === "templates" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("templates")}
          className="flex items-center gap-2"
        >
          <Bookmark className="w-4 h-4" />
          {t("tabs.templates")}
        </Button>
      </div>

      {/* Items Tab */}
      {activeTab === "items" && (
        <Card>
          <CardContent className="pt-6">
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Input
                  placeholder={t("item.searchItemsPlaceholder")}
                  value={searchItemTerm}
                  onChange={(e) => { setSearchItemTerm(e.target.value); setCurrentPage(1) }}
                  className=""
                  disabled={!userCanEdit}
                />
              </div>
              <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setCurrentPage(1) }} disabled={!userCanEdit}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("item.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("item.allCategories")}</SelectItem>
                  {Array.from(new Set(items.map(item => item.category).filter((c): c is string => Boolean(c)))).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDocType} onValueChange={(val) => { setSelectedDocType(val); setCurrentPage(1) }} disabled={!userCanEdit}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t("item.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("item.allTypes")}</SelectItem>
                  <SelectItem value="SI">SI</SelectItem>
                  <SelectItem value="CI">CI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Delete Bar */}
            {selectedItemIds.size > 0 && (
              <div className="flex items-center justify-end gap-3 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm font-medium text-red-800">
                  {t("item.itemsSelected").replace("{count}", String(selectedItemIds.size))}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!userCanEdit}
                  onClick={() => deleteConfirmDialog.confirm(() => handleBulkDelete())}
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t("item.deleteSelected")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItemIds(new Set())}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            )}

            {/* Items Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Checkbox - center aligned */}
                    <TableHead align="center" className="w-10">
                      <Checkbox
                        checked={paginatedItems.length > 0 && paginatedItems.every(item => selectedItemIds.has(item.id))}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedItemIds)
                          if (checked) {
                            paginatedItems.forEach(item => newSet.add(item.id))
                          } else {
                            paginatedItems.forEach(item => newSet.delete(item.id))
                          }
                          setSelectedItemIds(newSet)
                        }}
                        disabled={!userCanEdit}
                      />
                    </TableHead>
                    {/* Item Code - left aligned */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("itemCode")}>
                      <div className="flex items-center gap-1">
                        {t("table.itemCode")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Item Name/Description - left aligned */}
                    <TableHead align="left" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        {t("table.itemName")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Nominal Code - left aligned */}
                    <TableHead align="left">{t("item.nominalCode")}</TableHead>
                    {/* Type - left aligned */}
                    <TableHead align="left">{t("item.type")}</TableHead>
                    {/* Amount - right aligned (currency) */}
                    <TableHead align="right" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center justify-end gap-1">
                        {t("table.amountTHB")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Status - center aligned (badge) */}
                    <TableHead align="center" className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("isActive")}>
                      <div className="flex items-center justify-center gap-1">
                        {t("table.status")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    {/* Actions - center aligned */}
                    <TableHead align="center">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id} className={selectedItemIds.has(item.id) ? "bg-red-50/50" : ""}>
                      {/* Checkbox - center aligned */}
                      <TableCell align="center">
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedItemIds)
                            if (checked) {
                              newSet.add(item.id)
                            } else {
                              newSet.delete(item.id)
                            }
                            setSelectedItemIds(newSet)
                          }}
                          disabled={!userCanEdit}
                        />
                      </TableCell>
                      {/* Item Code - left aligned */}
                      <TableCell align="left">
                        <Badge variant="outline" className="font-mono">
                          {item.itemCode}
                        </Badge>
                      </TableCell>
                      {/* Item Name/Description - left aligned */}
                      <TableCell align="left">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </TableCell>
                      {/* Nominal Code - left aligned */}
                      <TableCell align="left" className="text-muted-foreground font-mono text-sm">
                        {item.nominalCode || "-"}
                      </TableCell>
                      {/* Type - left aligned */}
                      <TableCell align="left" className="text-sm">
                        <Badge variant="outline" className="font-mono">
                          {item.documentType || "SI"}
                        </Badge>
                      </TableCell>
                      {/* Amount - right aligned (currency) */}
                      <TableCell align="right" className="font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      {/* Status - center aligned (badge) */}
                      <TableCell align="center">
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </TableCell>
                      {/* Actions - center aligned */}
                      <TableCell align="center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setUsageDialogItem(item); setUsageDialogFilter("all") }}
                            title="View Usage"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!userCanEdit}
                            onClick={() => openEditItemModal(item)}
                            title="Edit Item"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!userCanEdit}
                            onClick={() => deleteConfirmDialog.confirm(() => handleDeleteItem(item.id))}
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <PaginationBar
              currentPage={currentPage}
              pageSize={pageSize}
              totalCount={filteredItems.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <Card>
          <CardContent className="pt-6">
            {/* Template Search */}
            <div className="mb-6">
              <div className="relative">
                <Input
                  placeholder={t("item.searchTemplates")}
                  value={searchTemplateTerm}
                  onChange={(e) => setSearchTemplateTerm(e.target.value)}
                  className=""
                  disabled={!userCanEdit}
                />
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-primary" />
                        <h3 className="font-medium">{template.name}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTemplateViewModal(template)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!userCanEdit}
                          onClick={() => openEditTemplateModal(template)}
                          title="Edit Template"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!userCanEdit}
                          onClick={() => deleteConfirmDialog.confirm(() => handleDeleteTemplate(template.id))}
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                    {/* Applicable Grades - Hide for External and Exam (not grade-specific) */}
                    {invoiceType !== "external" && invoiceType !== "exam" && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">{t("item.applicableGrades")}:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.applicableGrades.length === grades.length ? (
                            <Badge variant="secondary" className="text-xs">{t("item.allGrades")}</Badge>
                          ) : template.applicableGrades.length > 5 ? (
                            <>
                              {template.applicableGrades.slice(0, 3).map(grade => (
                                <Badge key={grade} variant="outline" className="text-xs">{grade}</Badge>
                              ))}
                              <Badge variant="secondary" className="text-xs">+{template.applicableGrades.length - 3} more</Badge>
                            </>
                          ) : (
                            template.applicableGrades.map(grade => (
                              <Badge key={grade} variant="outline" className="text-xs">{grade}</Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("item.templateItemCount").replace("{count}", String(template.items.length))}</p>
                      <div className="space-y-1">
                        {template.items.map(itemId => {
                          const liveItem = items.find(i => i.id === itemId)
                          const snapshot = template.itemData?.[itemId]
                          const displayItem = liveItem || (snapshot ? { name: snapshot.name, amount: snapshot.amount } : null)
                          return displayItem ? (
                            <div key={itemId} className="flex justify-between text-sm">
                              <span>{displayItem.name}</span>
                              <span className="font-medium">{formatCurrency(displayItem.amount)}</span>
                            </div>
                          ) : (
                            <div key={itemId} className="flex justify-between text-sm text-muted-foreground italic">
                              <span>{t("item.itemRemovedReEdit")}</span>
                              <span className="font-medium">—</span>
                            </div>
                          )
                        })}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>{t("common.total")}:</span>
                        <span>
                          {formatCurrency(
                            template.items.reduce((sum, itemId) => {
                              const liveItem = items.find(i => i.id === itemId)
                              const snapshot = template.itemData?.[itemId]
                              return sum + (liveItem?.amount ?? snapshot?.amount ?? 0)
                            }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Item Modal */}
      <Dialog open={isCreateItemModalOpen} onOpenChange={closeItemModal}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>{editingItem ? t("item.editItem") : t("item.createNewItem")}</DialogTitle>
            <DialogDescription>
              {editingItem ? t("item.editItemDesc") : t("item.createNewItemDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium">{t("item.itemCodeRequired")}</label>
                <Input
                  placeholder="TUI-001"
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium">{t("item.itemNameRequired")}</label>
                <Input
                  placeholder="Swimming Program Fee"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium">{t("item.nominalCode")}</label>
                <Input
                  placeholder="2130001"
                  value={newItem.nominalCode}
                  onChange={(e) => setNewItem({ ...newItem, nominalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium">{t("item.type")}</label>
                <Input
                  value="SI"
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-medium">{t("item.description")}</label>
              <Textarea
                placeholder={t("item.descriptionPlaceholder")}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="font-medium">{t("item.amountRequired")}</label>
              <Input
                type="number"
                placeholder="50000"
                value={newItem.amount}
                onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
              />
              {newItem.amount && !isNaN(parseFloat(newItem.amount)) && (
                <p className="text-sm text-muted-foreground">
                  {t("item.amountLabel")}: {formatCurrency(parseFloat(newItem.amount))}
                </p>
              )}
            </div>

            {editingItem && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <label className="font-medium text-sm">{t("table.status")}</label>
                  <p className="text-xs text-muted-foreground">
                    {newItem.isActive ? t("item.statusActiveDesc") : t("item.statusInactiveDesc")}
                  </p>
                </div>
                <Switch
                  checked={newItem.isActive}
                  onCheckedChange={(checked) => setNewItem({ ...newItem, isActive: checked })}
                  disabled={!userCanEdit}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveItem} className="flex-1">
                {editingItem ? t("item.updateItem") : t("item.createItem")}
              </Button>
              <Button variant="outline" onClick={closeItemModal}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Modal */}
      <Dialog open={isCreateTemplateModalOpen} onOpenChange={closeTemplateModal}>
        <DialogContent className="max-w-3xl p-6">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? t("item.editTemplate") : t("item.createNewTemplate")}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? t("item.editTemplateDesc") : t("item.createNewTemplateDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium">{t("item.templateNameRequired")}</label>
                <Input
                  placeholder="Year 1 Essential"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium">{t("item.description")}</label>
                <Input
                  placeholder="Essential items for Year 1 students"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                />
              </div>
            </div>

            {/* Hide Applicable Grades for External and Exam templates (not grade-specific) */}
            {invoiceType !== "external" && invoiceType !== "exam" && (
              <div className="space-y-2">
                <label className="font-medium">{t("item.applicableGrades") || "Applicable Grades"}</label>
                <div className="flex flex-wrap gap-2">
                  {grades.map((grade) => (
                    <Badge
                      key={grade}
                      variant={newTemplate.applicableGrades.includes(grade) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleToggleGradeForTemplate(grade)}
                    >
                      {grade}
                    </Badge>
                  ))}
                </div>
                {newTemplate.applicableGrades.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("item.gradesSelected").replace("{count}", String(newTemplate.applicableGrades.length))}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="font-medium">{t("item.selectItemsRequired")}</label>

              {/* Search Items Input */}
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("item.searchItems")}
                  value={itemSearchTerm}
                  onChange={(e) => setItemSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {items
                  .filter(item =>
                    item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                    item.itemCode.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                    (item.category && item.category.toLowerCase().includes(itemSearchTerm.toLowerCase()))
                  )
                  .map(item => (
                    <div
                      key={item.id}
                      className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${selectedItemsForTemplate.includes(item.id) ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      onClick={() => handleToggleItemForTemplate(item.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {selectedItemsForTemplate.includes(item.id) && (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(item.amount)}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                              item.category === "ECA" ? "border-green-300 text-green-700" :
                                item.category === "Trip & Other Activity" ? "border-orange-300 text-orange-700" :
                                  ""
                              }`}
                          >
                            {item.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {selectedItemsForTemplate.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {t("item.templateItemsSelectedTotal").replace("{count}", String(selectedItemsForTemplate.length)).replace("{total}", formatCurrency(
                    selectedItemsForTemplate.reduce((sum, itemId) => {
                      const item = items.find(i => i.id === itemId)
                      return sum + (item?.amount || 0)
                    }, 0)
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveTemplate} className="flex-1">
                {editingTemplate ? t("item.updateTemplate") : t("item.createTemplate")}
              </Button>
              <Button variant="outline" onClick={closeTemplateModal}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        type={viewModalType}
        data={viewModalData}
        onEdit={handleEditFromModal}
      />

      {/* Add Item Confirmation Dialog */}
      <ConfirmDialog
        open={addConfirmDialog.isOpen}
        onOpenChange={addConfirmDialog.setIsOpen}
        onConfirm={addConfirmDialog.handleConfirm}
        titleKey="confirmDialog.createTitle"
        descriptionKey="confirmDialog.createDescription"
        confirmTextKey="common.create"
      />

      {/* Edit Item Confirmation Dialog */}
      <ConfirmDialog
        open={editConfirmDialog.isOpen}
        onOpenChange={editConfirmDialog.setIsOpen}
        onConfirm={editConfirmDialog.handleConfirm}
        titleKey="confirmDialog.editTitle"
        descriptionKey="confirmDialog.editDescription"
        confirmTextKey="common.save"
      />

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] flex flex-col max-h-[90vh] p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>{t("item.importItems")}</DialogTitle>
              <DialogDescription>
                {t("item.importItemsDesc")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{t("student.excelTemplate")}</p>
                <p className="text-sm text-muted-foreground">{t("item.downloadTemplateDesc")}</p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                {t("student.downloadTemplate")}
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csvFile">{t("student.uploadFile")} <span className="text-destructive">*</span></Label>
              <Input
                id="csvFile"
                type="file"
                accept={XLSX_ACCEPT}
                onChange={handleFileUpload}
                className="cursor-pointer"
                disabled={!userCanEdit}
              />
            </div>

            {/* Error Display */}
            {importError && (
              <div className="p-3 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm">
                {importError}
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && (() => {
              const duplicateRows = importPreview.filter(row => items.some(item => item.itemCode === row["Item Code"]))
              const PREVIEW_LIMIT = 5
              const visibleRows = showAllImportPreview ? importPreview : importPreview.slice(0, PREVIEW_LIMIT)
              const hiddenCount = importPreview.length - PREVIEW_LIMIT
              return (
                <div className="space-y-2">
                  <Label>{t("item.previewItems").replace("{count}", String(importPreview.length))}</Label>

                  {/* Duplicate warning */}
                  {duplicateRows.length > 0 && (
                    <div className="p-3 border border-yellow-300 bg-yellow-50 rounded-lg text-yellow-800 text-sm space-y-1">
                      <p className="font-semibold">⚠ พบ {duplicateRows.length} รายการซ้ำ — จะถูกข้ามการ import</p>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {duplicateRows.map((row, i) => (
                          <li key={i}>
                            <span className="font-mono">{row["Item Code"]}</span> — {row["Name"]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead align="left" className="w-32">{t("table.itemCode")}</TableHead>
                          <TableHead align="left">{t("table.itemName")}</TableHead>
                          <TableHead align="right" className="w-32">{t("table.amount")}</TableHead>
                          <TableHead align="left" className="w-32">{t("table.category")}</TableHead>
                          <TableHead align="center" className="w-24">{t("table.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRows.map((row, index) => {
                          const isDuplicate = items.some(item => item.itemCode === row["Item Code"])
                          return (
                            <TableRow key={index} className={isDuplicate ? "bg-yellow-50" : ""}>
                              <TableCell align="left" className="font-mono text-sm whitespace-nowrap">
                                {row["Item Code"]}
                                {isDuplicate && <span className="ml-1 text-xs text-yellow-700">(ซ้ำ)</span>}
                              </TableCell>
                              <TableCell align="left" className={`max-w-xs ${isDuplicate ? "text-yellow-700" : ""}`}>
                                <span className="block truncate" title={row["Name"]}>{row["Name"]}</span>
                              </TableCell>
                              <TableCell align="right" className="whitespace-nowrap">{parseFloat(row["Amount"] || "0").toLocaleString()}</TableCell>
                              <TableCell align="left" className="whitespace-nowrap">
                                <Badge variant="outline">{row["Category"] || "-"}</Badge>
                              </TableCell>
                              <TableCell align="center" className="whitespace-nowrap">
                                <Badge variant="outline">{row["Status"] || "active"}</Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {!showAllImportPreview && hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllImportPreview(true)}
                      className="w-full text-sm text-muted-foreground hover:text-foreground py-2 border border-dashed rounded-lg hover:bg-accent transition-colors"
                    >
                      + ดูอีก {hiddenCount} รายการ (ทั้งหมด {importPreview.length} รายการ)
                    </button>
                  )}
                  {showAllImportPreview && importPreview.length > PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAllImportPreview(false)}
                      className="w-full text-sm text-muted-foreground hover:text-foreground py-2 border border-dashed rounded-lg hover:bg-accent transition-colors"
                    >
                      ย่อรายการ
                    </button>
                  )}
                </div>
              )
            })()}
          </div>

          <div className="p-6 pt-4 border-t flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={!userCanEdit || importPreview.length === 0 || !!importError}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importPreview.length > 0 ? t("item.importCount").replace("{count}", String(importPreview.length)) : t("common.import")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Confirmation Dialog */}
      <ConfirmDialog
        open={importConfirmDialog.isOpen}
        onOpenChange={importConfirmDialog.setIsOpen}
        onConfirm={importConfirmDialog.handleConfirm}
        titleKey="confirmDialog.importTitle"
        descriptionKey="confirmDialog.importDescription"
        confirmTextKey="common.import"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={deleteConfirmDialog.setIsOpen}
        onConfirm={deleteConfirmDialog.handleConfirm}
        titleKey="confirmDialog.deleteTitle"
        descriptionKey="confirmDialog.deleteDescription"
        confirmTextKey="common.delete"
        variant="destructive"
      />

      {/* Usage Detail Popup */}
      <Dialog open={!!usageDialogItem} onOpenChange={(open) => { if (!open) setUsageDialogItem(null) }}>
        <DialogContent style={{ maxWidth: "540px" }} className="p-6">
          <DialogHeader>
            <DialogTitle>{t("item.itemUsageDetail")}</DialogTitle>
          </DialogHeader>

          {/* Item info summary */}
          {usageDialogItem && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("item.codeLabel")}</span>
                <span className="font-mono font-medium">{usageDialogItem.itemCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("item.nameLabel")}</span>
                <span className="font-medium">{usageDialogItem.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("item.amountLabel")}</span>
                <span className="font-medium">{usageDialogItem.amount.toLocaleString()} THB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("item.enrolledPaid")}</span>
                <span>
                  <span className="text-blue-600 font-semibold">{getUsageCount(usageDialogItem)}</span>
                  {" / "}
                  <span className="text-green-600 font-semibold">{getPaidCount(usageDialogItem)}</span>
                </span>
              </div>
            </div>
          )}


          {/* Filter tabs */}
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setUsageDialogFilter("all")}
              className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${usageDialogFilter === "all" ? "bg-blue-100 text-blue-700" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("common.all")}
            </button>
            <button
              onClick={() => setUsageDialogFilter("paid")}
              className={`text-sm px-3 py-1 rounded-md font-medium transition-colors ${usageDialogFilter === "paid" ? "bg-green-100 text-green-700" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("item.paidOnly")}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {usageDialogItem && (() => {
              const invoices = getItemUsageData(usageDialogItem)
              const filtered = usageDialogFilter === "paid" ? invoices.filter(inv => inv.status === "paid") : invoices
              if (filtered.length === 0) {
                return (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    {t("item.noRecordsFound")}
                  </div>
                )
              }
              return (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("table.student")}</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">{t("item.invoiceNo")}</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">{t("table.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv: any, idx: number) => (
                      <tr key={inv.id || idx} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2">
                          <div className="font-medium">{inv.studentName || "-"}</div>
                          <div className="text-xs text-muted-foreground">{inv.studentId || ""}</div>
                        </td>
                        <td className="py-2 font-mono text-xs">{inv.invoiceNumber || "-"}</td>
                        <td className="py-2 text-center">
                          {inv.status === "paid"
                            ? <span className="inline-flex items-center gap-1 text-green-700 font-medium"><span>✓</span> {t("item.paid")}</span>
                            : inv.status === "cancelled"
                            ? <span className="text-gray-400">{t("item.cancelled")}</span>
                            : <span className="text-orange-600">{t("item.unpaid")}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialogItem(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}