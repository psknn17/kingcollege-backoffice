import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Separator } from "./ui/separator"
import { Textarea } from "./ui/textarea"
import { Search, Filter, Plus, Edit, Trash2, CheckCircle, X, Package, Tag, Bookmark, GraduationCap, Zap, MapPin, FileText, Eye, ArrowUpDown, CreditCard } from "lucide-react"
import { ViewModal } from "./ViewModal"
import { toast } from "@/components/ui/sonner"
import { useLanguage } from "@/contexts/LanguageContext"

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

const mockItems: Item[] = [
  // Tuition items
  {
    id: "item-001",
    itemCode: "TUI-001",
    name: "Application Fee",
    description: "Non-refundable application fee for new students",
    amount: 5000,
    category: "Tuition",
    nominalCode: "4110001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-002",
    itemCode: "TUI-002",
    name: "Registration Fee",
    description: "Non-refundable registration fee for enrolled students",
    amount: 225000,
    category: "Tuition",
    nominalCode: "4110002",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-030",
    itemCode: "TUI-006",
    name: "Security Deposit",
    description: "Refundable security deposit upon graduation or withdrawal",
    amount: 200000,
    category: "Tuition",
    nominalCode: "2130006",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Pre-Nursery", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-003",
    itemCode: "TUI-003",
    name: "Term 1 Tuition Fee",
    description: "First term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    nominalCode: "4110003",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-004",
    itemCode: "TUI-004",
    name: "Term 2 Tuition Fee",
    description: "Second term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    nominalCode: "4110004",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-031",
    itemCode: "TUI-007",
    name: "Term 3 Tuition Fee",
    description: "Third term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    nominalCode: "4110007",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-029",
    itemCode: "TUI-005",
    name: "Uniform & Textbooks",
    description: "School uniform and required textbooks",
    amount: 15000,
    category: "Tuition",
    nominalCode: "4110005",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  }
]

// ECA items - Music Programs
const mockECAItems: Item[] = [
  // Piano
  {
    id: "item-005",
    itemCode: "ECA-001",
    name: "Piano - Term 1",
    description: "Piano lessons for Term 1 including practice materials",
    amount: 8000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-006",
    itemCode: "ECA-002",
    name: "Piano - Term 2",
    description: "Piano lessons for Term 2 including practice materials",
    amount: 8000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-007",
    itemCode: "ECA-003",
    name: "Piano - Term 3",
    description: "Piano lessons for Term 3 including practice materials",
    amount: 8000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Guitar
  {
    id: "item-008",
    itemCode: "ECA-004",
    name: "Guitar - Term 1",
    description: "Guitar lessons for Term 1 including practice materials",
    amount: 6000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-009",
    itemCode: "ECA-005",
    name: "Guitar - Term 2",
    description: "Guitar lessons for Term 2 including practice materials",
    amount: 6000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-010",
    itemCode: "ECA-006",
    name: "Guitar - Term 3",
    description: "Guitar lessons for Term 3 including practice materials",
    amount: 6000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Violin
  {
    id: "item-011",
    itemCode: "ECA-007",
    name: "Violin - Term 1",
    description: "Violin lessons for Term 1 including practice materials",
    amount: 7500,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-012",
    itemCode: "ECA-008",
    name: "Violin - Term 2",
    description: "Violin lessons for Term 2 including practice materials",
    amount: 7500,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-013",
    itemCode: "ECA-009",
    name: "Violin - Term 3",
    description: "Violin lessons for Term 3 including practice materials",
    amount: 7500,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Drums
  {
    id: "item-014",
    itemCode: "ECA-010",
    name: "Drums - Term 1",
    description: "Drum lessons for Term 1 including practice materials",
    amount: 7000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-015",
    itemCode: "ECA-011",
    name: "Drums - Term 2",
    description: "Drum lessons for Term 2 including practice materials",
    amount: 7000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-016",
    itemCode: "ECA-012",
    name: "Drums - Term 3",
    description: "Drum lessons for Term 3 including practice materials",
    amount: 7000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Voice/Singing
  {
    id: "item-017",
    itemCode: "ECA-013",
    name: "Voice - Term 1",
    description: "Voice and singing lessons for Term 1",
    amount: 5000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-018",
    itemCode: "ECA-014",
    name: "Voice - Term 2",
    description: "Voice and singing lessons for Term 2",
    amount: 5000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-019",
    itemCode: "ECA-015",
    name: "Voice - Term 3",
    description: "Voice and singing lessons for Term 3",
    amount: 5000,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // Music Theory
  {
    id: "item-020",
    itemCode: "ECA-016",
    name: "Music Theory - Term 1",
    description: "Music theory and composition lessons for Term 1",
    amount: 4500,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-021",
    itemCode: "ECA-017",
    name: "Music Theory - Term 2",
    description: "Music theory and composition lessons for Term 2",
    amount: 4500,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-022",
    itemCode: "ECA-018",
    name: "Music Theory - Term 3",
    description: "Music theory and composition lessons for Term 3",
    amount: 4500,
    category: "ECA",
    nominalCode: "2130001",
    documentType: "SI",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  }
]

const mockTemplates: ItemTemplate[] = [
  {
    id: "template-001",
    name: "Year 1 Complete Package",
    description: "Full academic year package for Year 1 students",
    items: ["item-001", "item-002", "item-003", "item-004"],
    applicableGrades: ["Year 1"],
    isActive: true
  },
  {
    id: "template-002",
    name: "Year 1 Basic Tuition",
    description: "Essential tuition fees only for Year 1",
    items: ["item-001", "item-002", "item-003"],
    applicableGrades: ["Year 1"],
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
    items: ["item-005", "item-008", "item-011"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
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
    default:
      return "invoiceTemplates" // student/tuition templates
  }
}

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

  // Check if items have correct invoiceType or correct ID prefix
  if (invoiceCategory === "external") {
    // External items should have IDs starting with "ext-" or invoiceType="external"
    return storedItems.some(item => item.id.startsWith("ext-") || item.invoiceType === "external")
  }

  // For afterschool/Trip & Activity, check for "trip-" prefix
  if (invoiceCategory === "afterschool") {
    return storedItems.some(item => item.id.startsWith("trip-"))
  }

  // For event/Exam, check for "exam-" prefix
  if (invoiceCategory === "event") {
    return storedItems.some(item => item.id.startsWith("exam-"))
  }

  // For summer/School Bus, check for "bus-" prefix
  if (invoiceCategory === "summer") {
    return storedItems.some(item => item.id.startsWith("bus-"))
  }

  // For student, check if items have standard item IDs (not ext-, trip-, exam-, bus-)
  if (invoiceCategory === "student") {
    return storedItems.some(item =>
      !item.id.startsWith("ext-") &&
      !item.id.startsWith("trip-") &&
      !item.id.startsWith("exam-") &&
      !item.id.startsWith("bus-")
    )
  }

  return true
}

// Load items from localStorage and merge with category-specific mock items
const loadItemsFromStorage = (invoiceCategory: string = "student"): Item[] => {
  const categoryMockItems = getMockItems(invoiceCategory)

  try {
    const stored = localStorage.getItem(getItemsStorageKey(invoiceCategory))
    if (stored) {
      const storedItems = JSON.parse(stored)

      // Validate stored data belongs to correct category
      if (!isValidStoredData(storedItems, invoiceCategory)) {
        // Invalid data - clear and return mock items
        localStorage.removeItem(getItemsStorageKey(invoiceCategory))
        return categoryMockItems
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

      // Merge: add any mockItems that don't exist in stored items
      const updatedIds = new Set(updatedItems.map((item: Item) => item.id))
      const newMockItems = categoryMockItems.filter(mockItem => !updatedIds.has(mockItem.id))

      if (newMockItems.length > 0) {
        return [...updatedItems, ...newMockItems]
      }
      return updatedItems
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
  }
  return categoryMockItems
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
const loadTemplatesFromStorage = (invoiceCategory: string = "student", currentItems: Item[]): ItemTemplate[] | null => {
  const categoryMockTemplates = getMockTemplates(invoiceCategory)

  try {
    const stored = localStorage.getItem(getTemplatesStorageKey(invoiceCategory))
    if (stored) {
      const storedTemplates = JSON.parse(stored)

      // Validate: check if all template items exist in current items array
      const itemIds = new Set(currentItems.map(item => item.id))
      const isValid = storedTemplates.every((template: ItemTemplate) =>
        template.items.every(itemId => itemIds.has(itemId))
      )

      // If validation fails, clear localStorage and return null to use mock templates
      if (!isValid) {
        console.warn("Stored templates reference non-existent items. Clearing and using mock templates.")
        localStorage.removeItem(getTemplatesStorageKey(invoiceCategory))
        return null
      }

      // For student category only: merge with mock templates
      if (invoiceCategory === "student") {
        const storedIds = new Set(storedTemplates.map((t: ItemTemplate) => t.id))
        const newMockTemplates = categoryMockTemplates.filter(mockT => !storedIds.has(mockT.id))

        if (newMockTemplates.length > 0) {
          return [...storedTemplates, ...newMockTemplates]
        }
      }

      return storedTemplates
    }
  } catch (error) {
    console.error("Failed to load templates from localStorage:", error)
  }
  // Return category-specific mock templates or null
  return categoryMockTemplates.length > 0 ? null : []
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
  invoiceType?: "student" | "external" | "afterschool" | "event" | "summer"
}

export function ItemManagement({ onNavigateToSubPage, onNavigateToView, invoiceType = "student" }: ItemManagementProps) {
  const { t } = useLanguage()
  const isExternalView = invoiceType === "external"
  const isCategoryView = ["afterschool", "event", "summer"].includes(invoiceType)
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
    const loadedItems = loadItemsFromStorage(invoiceType)
    return loadTemplatesFromStorage(invoiceType, loadedItems) || getMockTemplates(invoiceType)
  })

  // Save items to localStorage when changed
  useEffect(() => {
    saveItemsToStorage(items, invoiceType)
  }, [items, invoiceType])

  // Save templates to localStorage when changed
  useEffect(() => {
    saveTemplatesToStorage(templates, invoiceType)
  }, [templates, invoiceType])

  // Items state
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [searchItemTerm, setSearchItemTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
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

  // New item form state
  const [newItem, setNewItem] = useState({
    itemCode: "",
    name: "",
    description: "",
    amount: "",
    category: "",
    nominalCode: "",
    documentType: "SI",
    applicableGrades: [] as string[]
  })

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    applicableGrades: [] as string[]
  })

  const formatCurrency = (amount: number) => {
    return `฿${amount.toLocaleString()}`
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
      applicableGrades: []
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
      category: item.category,
      nominalCode: item.nominalCode || "",
      documentType: item.documentType || "SI",
      applicableGrades: item.applicableGrades
    })
    setEditingItem(item)
    setIsCreateItemModalOpen(true)
  }

  const closeItemModal = () => {
    setIsCreateItemModalOpen(false)
    setEditingItem(null)
  }

  const handleSaveItem = () => {
    // Applicable grades are now optional
    if (!newItem.itemCode || !newItem.name || !newItem.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = parseFloat(newItem.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const itemData: Item = {
      id: editingItem?.id || `item-${Date.now()}`,
      itemCode: newItem.itemCode,
      name: newItem.name,
      description: newItem.description,
      amount: amount,
      category: newItem.category,
      nominalCode: newItem.nominalCode || undefined,
      documentType: newItem.documentType || "SI",
      applicableGrades: newItem.applicableGrades,
      isActive: true,
      invoiceType: editingItem?.invoiceType || invoiceType
    }

    if (editingItem) {
      setItems(items.map(item => item.id === editingItem.id ? itemData : item))
      toast.success("Item updated successfully")
    } else {
      setItems([...items, itemData])
      toast.success("Item created successfully")
    }

    closeItemModal()
  }

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId))
    toast.success("Item deleted successfully")
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
      toast.error("Please provide template name and select at least one item")
      return
    }

    const templateData: ItemTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      items: selectedItemsForTemplate,
      applicableGrades: newTemplate.applicableGrades,
      isActive: true,
      invoiceType: editingTemplate?.invoiceType || invoiceType
    }

    if (editingTemplate) {
      setTemplates(templates.map(template => template.id === editingTemplate.id ? templateData : template))
      toast.success("Template updated successfully")
    } else {
      setTemplates([...templates, templateData])
      toast.success("Template created successfully")
    }

    closeTemplateModal()
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(template => template.id !== templateId))
    toast.success("Template deleted successfully")
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
      item.applicableGrades.some(grade => grade.toLowerCase() === searchLower) ||
      item.applicableGrades.some(grade => grade.toLowerCase().startsWith(searchLower))
    const matchesCategory = !selectedCategory || selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
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

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTemplateTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTemplateTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Create Invoice Section - Hide for external and category views */}
      {!isSimplifiedView && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("invoiceCreate.title")}
            </CardTitle>
            <p className="text-muted-foreground">
              {t("item.chooseInvoiceType")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {invoiceTypes.map((type) => (
                <Card
                  key={type.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-105 group"
                  onClick={() => handleCreateInvoice(type.id)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className={`p-3 rounded-full ${type.color === "blue" ? "bg-blue-100 text-blue-600" :
                        type.color === "green" ? "bg-green-100 text-green-600" :
                          "bg-orange-100 text-orange-600"
                        }`}>
                        <type.icon className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-medium group-hover:text-primary transition-colors">
                          {type.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${type.color === "blue" ? "bg-blue-50 text-blue-700" :
                        type.color === "green" ? "bg-green-50 text-green-700" :
                          "bg-orange-50 text-orange-700"
                        }`}>
                        {type.defaultCategory}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{isExternalView ? "External Items" : isSimplifiedView ? "Activity Items" : "Manage Items"}</CardTitle>
                <p className="text-muted-foreground">{isSimplifiedView ? "Create and manage items for activities and events" : "Create and manage invoice items"}</p>
              </div>
              <Button onClick={openCreateItemModal}>
                <Plus className="w-4 h-4 mr-2" />
                Create Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Input
                  placeholder={isSimplifiedView ? "Search by code, name, category..." : "Search by code, name, category, grade..."}
                  value={searchItemTerm}
                  onChange={(e) => setSearchItemTerm(e.target.value)}
                  className=""
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {currentCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("itemCode")}>
                      <div className="flex items-center gap-1">
                        {t("table.itemCode")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        {t("table.itemName")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>

                    <TableHead>Nominal Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        {t("table.amountTHB")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("isActive")}>
                      <div className="flex items-center gap-1">
                        {t("table.status")}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {item.itemCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {item.nominalCode || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="font-mono">
                          {item.documentType || "SI"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "secondary"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openItemViewModal(item)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditItemModal(item)}
                            title="Edit Item"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
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
          </CardContent>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{isExternalView ? "External Templates" : isSimplifiedView ? "Activity Templates" : "Manage Templates"}</CardTitle>
                <p className="text-muted-foreground">{isSimplifiedView ? "Create shortcuts for commonly used activity item combinations" : "Create shortcuts for commonly used item combinations"}</p>
              </div>
              <Button onClick={openCreateTemplateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Template Search */}
            <div className="mb-6">
              <div className="relative">
                <Input
                  placeholder="Search templates..."
                  value={searchTemplateTerm}
                  onChange={(e) => setSearchTemplateTerm(e.target.value)}
                  className=""
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
                          onClick={() => openEditTemplateModal(template)}
                          title="Edit Template"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">{template.items.length} items:</p>
                      <div className="space-y-1">
                        {template.items.map(itemId => {
                          const item = items.find(i => i.id === itemId)
                          return item ? (
                            <div key={itemId} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span className="font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                          ) : (
                            <div key={itemId} className="flex justify-between text-sm text-red-500">
                              <span>Item not found (ID: {itemId})</span>
                              <span className="font-medium">฿0</span>
                            </div>
                          )
                        })}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>
                          {formatCurrency(
                            template.items.reduce((sum, itemId) => {
                              const item = items.find(i => i.id === itemId)
                              return sum + (item?.amount || 0)
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
            <DialogTitle>{editingItem ? "Edit Item" : "Create New Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the item information" : "Add a new item to the system"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium">Item Code *</label>
                <Input
                  placeholder="TUI-001"
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium">Item Name *</label>
                <Input
                  placeholder="Swimming Program Fee"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium">Nominal Code</label>
                <Input
                  placeholder="2130001"
                  value={newItem.nominalCode}
                  onChange={(e) => setNewItem({ ...newItem, nominalCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium">Type</label>
                <Input
                  value="SI"
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Description</label>
              <Textarea
                placeholder="Brief description of the item"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="font-medium">Amount (Thai Baht) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">฿</span>
                <Input
                  type="number"
                  placeholder="50000"
                  value={newItem.amount}
                  onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                  className=""
                />
              </div>
              {newItem.amount && !isNaN(parseFloat(newItem.amount)) && (
                <p className="text-sm text-muted-foreground">
                  Amount: {formatCurrency(parseFloat(newItem.amount))}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveItem} className="flex-1">
                {editingItem ? "Update Item" : "Create Item"}
              </Button>
              <Button variant="outline" onClick={closeItemModal}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Modal */}
      <Dialog open={isCreateTemplateModalOpen} onOpenChange={closeTemplateModal}>
        <DialogContent className="max-w-3xl p-6">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update the template information" : "Create a shortcut for commonly used item combinations"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium">Template Name *</label>
                <Input
                  placeholder="Year 1 Essential"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium">Description</label>
                <Input
                  placeholder="Essential items for Year 1 students"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Select Items *</label>

              {/* Search Items Input */}
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
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
                  {selectedItemsForTemplate.length} items selected - Total: {formatCurrency(
                    selectedItemsForTemplate.reduce((sum, itemId) => {
                      const item = items.find(i => i.id === itemId)
                      return sum + (item?.amount || 0)
                    }, 0)
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveTemplate} className="flex-1">
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
              <Button variant="outline" onClick={closeTemplateModal}>
                Cancel
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
    </div>
  )
}