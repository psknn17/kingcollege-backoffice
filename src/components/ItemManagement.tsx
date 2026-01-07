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
import { toast } from "sonner"
import { useDiscountOptions } from "../contexts/DiscountOptionsContext"
import { useAcademicYears } from "../contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"

interface Item {
  id: string
  itemCode: string
  name: string
  description: string
  amount: number
  category: string
  isActive: boolean
  applicableGrades: string[]
}

interface ItemTemplate {
  id: string
  name: string
  description: string
  items: string[] // Item IDs
  applicableGrades: string[]
  isActive: boolean
}

const grades = ["Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
const categories = ["Tuition", "School Bus", "ECA", "Trip & Other Activity"]

const mockItems: Item[] = [
  // Tuition items
  {
    id: "item-001",
    itemCode: "TUI-001",
    name: "Term 1 Tuition Fee",
    description: "First term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-002",
    itemCode: "TUI-002",
    name: "Term 2 Tuition Fee",
    description: "Second term tuition payment for academic year",
    amount: 150000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-003",
    itemCode: "TUI-003",
    name: "Registration Fee",
    description: "Annual registration and administrative fee",
    amount: 25000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-004",
    itemCode: "TUI-004",
    name: "Uniform & Textbooks",
    description: "School uniform and required textbooks",
    amount: 15000,
    category: "Tuition",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // ECA items
  {
    id: "item-005",
    itemCode: "ECA-001",
    name: "Swimming Program",
    description: "Swimming lessons and pool maintenance fee",
    amount: 80000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-006",
    itemCode: "ECA-002",
    name: "Football Training",
    description: "Professional football coaching and equipment",
    amount: 60000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  {
    id: "item-007",
    itemCode: "ECA-003",
    name: "Music Lessons",
    description: "Individual and group music instruction",
    amount: 35000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10"]
  },
  {
    id: "item-008",
    itemCode: "ECA-004",
    name: "Art & Craft Program",
    description: "Art supplies and creative activities",
    amount: 42000,
    category: "ECA",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7"]
  },
  // Trip & Other Activity items
  {
    id: "item-009",
    itemCode: "TRP-001",
    name: "Bangkok City Tour",
    description: "Educational city tour and cultural experience",
    amount: 80000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10"]
  },
  {
    id: "item-010",
    itemCode: "TRP-002",
    name: "Science Museum Trip",
    description: "Interactive science learning experience",
    amount: 45000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8"]
  },
  {
    id: "item-011",
    itemCode: "TRP-003",
    name: "Annual Sports Day",
    description: "School sports competition and activities",
    amount: 15000,
    category: "Trip & Other Activity",
    isActive: true,
    applicableGrades: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]
  },
  // School Bus items
  {
    id: "item-012",
    itemCode: "BUS-001",
    name: "Annual school bus service fee - zone 1 (one-way afternoon)",
    description: "School bus service for zone 1, one-way afternoon route",
    amount: 65000,
    category: "School Bus",
    isActive: true,
    applicableGrades: ["Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-013",
    itemCode: "BUS-002",
    name: "Annual school bus service fee - zone 1 (round-trip)",
    description: "School bus service for zone 1, round-trip",
    amount: 55000,
    category: "School Bus",
    isActive: true,
    applicableGrades: ["Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
  },
  {
    id: "item-014",
    itemCode: "BUS-003",
    name: "Annual school bus service fee - zone 2 (one-way morning)",
    description: "School bus service for zone 2, one-way morning route",
    amount: 90000,
    category: "School Bus",
    isActive: true,
    applicableGrades: ["Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"]
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
  },
  {
    id: "template-003",
    name: "Primary ECA Bundle",
    description: "Popular ECA activities for primary students",
    items: ["item-005", "item-007", "item-008"],
    applicableGrades: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    isActive: true
  },
  {
    id: "template-004",
    name: "Annual Bus Service Package",
    description: "Transportation package for all zones",
    items: ["item-012", "item-013", "item-014"],
    applicableGrades: grades,
    isActive: true
  }
]

// localStorage keys
const ITEMS_STORAGE_KEY = "invoiceItems"
const TEMPLATES_STORAGE_KEY = "invoiceTemplates"

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

// Load items from localStorage and merge with mockItems
const loadItemsFromStorage = (): Item[] => {
  try {
    const stored = localStorage.getItem(ITEMS_STORAGE_KEY)
    if (stored) {
      const storedItems = JSON.parse(stored)
      // Ensure all items have itemCode
      const itemsWithCode = storedItems.map((item: any, index: number) => ({
        ...item,
        itemCode: item.itemCode || generateItemCode(item.category || "Other", index + 1)
      }))

      // Map through stored items and update properties for standard mock items if they match
      const updatedItems = itemsWithCode.map((item: Item) => {
        const mockMatch = mockItems.find(m => m.id === item.id);
        if (mockMatch) {
          return {
            ...item,
            amount: mockMatch.amount,
            name: mockMatch.name,
            description: mockMatch.description,
            category: mockMatch.category,
            itemCode: mockMatch.itemCode || item.itemCode
          };
        }
        return item;
      });

      // Merge: add any mockItems that don't exist in stored items
      const updatedIds = new Set(updatedItems.map((item: Item) => item.id))
      const newMockItems = mockItems.filter(mockItem => !updatedIds.has(mockItem.id))

      if (newMockItems.length > 0) {
        return [...updatedItems, ...newMockItems]
      }
      return updatedItems
    }
  } catch (error) {
    console.error("Failed to load items from localStorage:", error)
  }
  return mockItems
}

// Save items to localStorage
const saveItemsToStorage = (items: Item[]) => {
  try {
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items))
  } catch (error) {
    console.error("Failed to save items to localStorage:", error)
  }
}

// Load templates from localStorage
const loadTemplatesFromStorage = (): ItemTemplate[] | null => {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
    if (stored) {
      const storedTemplates = JSON.parse(stored)
      // Merge: add any mockTemplates that don't exist in stored templates
      const storedIds = new Set(storedTemplates.map((t: ItemTemplate) => t.id))
      const newMockTemplates = mockTemplates.filter(mockT => !storedIds.has(mockT.id))

      if (newMockTemplates.length > 0) {
        return [...storedTemplates, ...newMockTemplates]
      }
      return storedTemplates
    }
  } catch (error) {
    console.error("Failed to load templates from localStorage:", error)
  }
  return null
}

// Save templates to localStorage
const saveTemplatesToStorage = (templates: ItemTemplate[]) => {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  } catch (error) {
    console.error("Failed to save templates to localStorage:", error)
  }
}

interface ItemManagementProps {
  onNavigateToSubPage?: (subPage: string, params?: any) => void
  onNavigateToView?: (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => void
}

export function ItemManagement({ onNavigateToSubPage, onNavigateToView }: ItemManagementProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<"items" | "templates">("items")
  const [items, setItems] = useState<Item[]>(() => loadItemsFromStorage())
  const [templates, setTemplates] = useState<ItemTemplate[]>(() => loadTemplatesFromStorage() || mockTemplates)

  // Discount options context for Registration Fees
  const { getRegistrationFees, updateRegistrationFees } = useDiscountOptions()
  const { academicYears } = useAcademicYears()

  // Get current academic year
  const getCurrentAcademicYear = () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    if (month >= 5) {
      return `${year}-${year + 1}`
    } else {
      return `${year - 1}-${year}`
    }
  }

  const currentAcademicYear = academicYears[0]?.id || getCurrentAcademicYear()
  const registrationFees = getRegistrationFees(currentAcademicYear, "1")

  // Update registration fee
  const handleRegistrationFeeChange = (feeType: string, value: number) => {
    updateRegistrationFees(currentAcademicYear, "1", {
      [feeType]: value
    })
  }

  // Save items to localStorage when changed
  useEffect(() => {
    saveItemsToStorage(items)
  }, [items])

  // Save templates to localStorage when changed
  useEffect(() => {
    saveTemplatesToStorage(templates)
  }, [templates])

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
  const openCreateItemModal = () => {
    setNewItem({
      itemCode: "",
      name: "",
      description: "",
      amount: "",
      category: "",
      applicableGrades: []
    })
    setEditingItem(null)
    setIsCreateItemModalOpen(true)
  }

  const openEditItemModal = (item: Item) => {
    setNewItem({
      itemCode: item.itemCode,
      name: item.name,
      description: item.description,
      amount: item.amount.toString(),
      category: item.category,
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
    if (!newItem.itemCode || !newItem.name || !newItem.amount || !newItem.category || newItem.applicableGrades.length === 0) {
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
      applicableGrades: newItem.applicableGrades,
      isActive: true
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
    setEditingTemplate(null)
  }

  const handleSaveTemplate = () => {
    if (!newTemplate.name || selectedItemsForTemplate.length === 0 || newTemplate.applicableGrades.length === 0) {
      toast.error("Please provide template name, select at least one item, and select applicable grades")
      return
    }

    const templateData: ItemTemplate = {
      id: editingTemplate?.id || `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      items: selectedItemsForTemplate,
      applicableGrades: newTemplate.applicableGrades,
      isActive: true
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
      item.category.toLowerCase().includes(searchLower) ||
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
        aValue = a.category
        bValue = b.category
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
      {/* Create Invoice Section */}
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

      {/* Application & Registration Fees */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Application & Registration Fees</CardTitle>
              <p className="text-sm text-muted-foreground">Configure initial charges for new applicants</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Fee Type</TableHead>
                <TableHead className="w-[200px]">Amount (THB)</TableHead>
                <TableHead className="w-[150px]">Refundable</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Application Fee</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={registrationFees.applicationFee}
                    onChange={(e) => handleRegistrationFeeChange('applicationFee', Number(e.target.value))}
                    className="w-[150px]"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">No</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">Non-refundable/non-transferable</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Registration Fee</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={registrationFees.registrationFee}
                    onChange={(e) => handleRegistrationFeeChange('registrationFee', Number(e.target.value))}
                    className="w-[150px]"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">No</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">Non-refundable/non-transferable</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Security Deposit</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={registrationFees.securityDeposit}
                    onChange={(e) => handleRegistrationFeeChange('securityDeposit', Number(e.target.value))}
                    className="w-[150px]"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Yes</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">Refundable upon graduation and withdrawal</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Wait List Fee</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={registrationFees.waitListFee}
                    onChange={(e) => handleRegistrationFeeChange('waitListFee', Number(e.target.value))}
                    className="w-[150px]"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Conditional</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">Acts as registration fee when place becomes available</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Security Deposit Refund Conditions */}
          <div className="mt-6 p-4 border border-green-200 rounded-lg bg-green-50/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium text-green-900">Security Deposit Refund Conditions</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium flex-shrink-0">1</span>
                <p className="text-green-800">Upon the student's graduation (completion of Year 13) from the school</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-800 text-xs font-medium flex-shrink-0">2</span>
                <p className="text-green-800">When advance written notice is received at least one full term's notice before the child leaves</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs font-medium flex-shrink-0">3</span>
                <p className="text-green-800">When the school requires the applicant's departure for reasons other than disciplinary</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "items" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("items")}
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          Items
        </Button>
        <Button
          variant={activeTab === "templates" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("templates")}
          className="flex items-center gap-2"
        >
          <Bookmark className="w-4 h-4" />
          Templates
        </Button>
      </div>

      {/* Items Tab */}
      {activeTab === "items" && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Manage Items</CardTitle>
                <p className="text-muted-foreground">Create and manage invoice items</p>
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
                  placeholder="Search by code, name, category, grade..."
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
                  {categories.map(category => (
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
                        Item Code
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        Item Name
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("category")}>
                      <div className="flex items-center gap-1">
                        Category
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("amount")}>
                      <div className="flex items-center gap-1">
                        Amount (THB)
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Applicable Year Groups</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("isActive")}>
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
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
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${item.category === "Tuition" ? "border-blue-300 text-blue-700" :
                            item.category === "ECA" ? "border-green-300 text-green-700" :
                              item.category === "Trip & Other Activity" ? "border-orange-300 text-orange-700" :
                                ""
                            }`}
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.applicableGrades.slice(0, 3).map(grade => (
                            <Badge key={grade} variant="secondary" className="text-xs">
                              {grade}
                            </Badge>
                          ))}
                          {item.applicableGrades.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.applicableGrades.length - 3}
                            </Badge>
                          )}
                        </div>
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
                <CardTitle>Manage Templates</CardTitle>
                <p className="text-muted-foreground">Create shortcuts for commonly used item combinations</p>
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

                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.applicableGrades.slice(0, 3).map(grade => (
                        <Badge key={grade} variant="secondary" className="text-xs">
                          {grade}
                        </Badge>
                      ))}
                      {template.applicableGrades.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.applicableGrades.length - 3}
                        </Badge>
                      )}
                    </div>

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
                          ) : null
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

            <div className="space-y-2">
              <label className="font-medium">Category *</label>
              <Select
                value={newItem.category}
                onValueChange={(value) => setNewItem({ ...newItem, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <label className="font-medium">Applicable Year Groups *</label>
              <div className="grid grid-cols-4 gap-2">
                {grades.map(grade => (
                  <Button
                    key={grade}
                    variant={newItem.applicableGrades.includes(grade) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleGrade(grade)}
                    className="justify-start"
                  >
                    {newItem.applicableGrades.includes(grade) && (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    {grade}
                  </Button>
                ))}
              </div>
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
              <label className="font-medium">Applicable Year Groups *</label>
              <div className="grid grid-cols-4 gap-2">
                {grades.map(grade => (
                  <Button
                    key={grade}
                    variant={newTemplate.applicableGrades.includes(grade) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleGradeForTemplate(grade)}
                    className="justify-start"
                  >
                    {newTemplate.applicableGrades.includes(grade) && (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    {grade}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-medium">Select Items *</label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {items.map(item => (
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