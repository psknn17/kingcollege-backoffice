import { useEffect, useState, useRef } from "react"
import { usePersistedState } from "./hooks/usePersistedState"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "./components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar"
import { Toaster } from "./components/ui/sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu"
import { useLanguage } from "./contexts/LanguageContext"
import { useAuth, getRoleDisplayName } from "./contexts/AuthContext"
import { Button } from "./components/ui/button"
import { Globe } from "lucide-react"
import { Login } from "./components/Login"
import { RoleSelection } from "./components/RoleSelection"
import {
  BarChart3,
  Calendar,
  FileText,
  Users,
  Settings,
  CreditCard,
  GraduationCap,
  Receipt,
  Bell,
  UserCheck,

  ArrowLeft,
  RotateCcw,
  Eye,
  Send,
  CalendarDays,
  Upload,
  Clock,
  FileBarChart,
  Sun,
  Play,
  DollarSign,
  Percent,
  Tag,
  TrendingDown,
  FileCheck,
  FileText as FileInvoice,
  Building,
  Settings2,
  UsersRound,
  Shield,
  Activity,
  ClipboardCheck,
  UserCog,
  ChevronDown,
  LogOut,
  ChevronsUpDown,
  Sparkles
} from "lucide-react"
import { TuitionDashboard } from "./components/TuitionDashboard"
import { TuitionTermSettings } from "./components/TuitionTermSettings"
import { TuitionByYear } from "./components/TuitionByYear"
import { DebtReminderSettings } from "./components/DebtReminderSettings"
import { PaymentHistorySimple } from "./components/PaymentHistorySimple"
import { TuitionInvoiceManagement } from "./components/TuitionInvoiceManagement"
import { AfterSchoolDashboard } from "./components/AfterSchoolDashboard"
import { AfterSchoolSettings } from "./components/AfterSchoolSettings"
import { CourseQuotaOverview } from "./components/CourseQuotaOverview"
import { ExternalParentManagement } from "./components/ExternalParentManagement"

import { AfterSchoolReceipts } from "./components/AfterSchoolReceiptsUpdated"

import { CourseStudentReport } from "./components/CourseStudentReport"
import { EventImport } from "./components/EventImport"
import { EventPaymentDeadline } from "./components/EventPaymentDeadline"
import { EventRegistrationReports } from "./components/EventRegistrationReports"
import { EventReceipts } from "./components/EventReceiptsUpdated"
import { SummerActivitiesImport } from "./components/SummerActivitiesImport"
import { SummerRegistrationControl } from "./components/SummerRegistrationControl"
import { SummerPaymentReports } from "./components/SummerPaymentReports"
import { SummerActivitiesReceipts } from "./components/SummerActivitiesReceiptsUpdated"
import { DiscountManagement } from "./components/DiscountManagement"
import { DiscountReports } from "./components/DiscountReports"
import { InvoiceManagement } from "./components/InvoiceManagement"
import { InvoiceCreation } from "./components/InvoiceCreation"
import { ExternalInvoiceCreation } from "./components/ExternalInvoiceCreation"
import { ItemManagement } from "./components/ItemManagement"
import { ReceiptPage } from "./components/ReceiptPageUpdated"
import { EmailJobsManagement } from "./components/EmailJobsManagement"
import { EmailHistory } from "./components/EmailHistory"
import { EmailHistoryView } from "./components/EmailHistoryView"
import { EmailCsvExport } from "./components/EmailCsvExport"
import { WaiveFeeYearDetails } from "./components/WaiveFeeYearDetails"
import { UserManagement } from "./components/UserManagement"
import { RolesPermissions } from "./components/RolesPermissions"
import { ActivityLog } from "./components/ActivityLog"
import { ApprovalQueue } from "./components/ApprovalQueue"
import { logActivity } from "@/lib/activityLog"
import { StudentList } from "./components/StudentList"
import { FamilyGroups } from "./components/FamilyGroups"
import { SchoolSettings } from "./components/SchoolSettings"
import { ReportOverview } from "./components/ReportOverview"
import { UserProfile } from "./components/UserProfile"
import { UserSettings } from "./components/UserSettings"
import { UserActivity } from "./components/UserActivity"

import { ViewModal } from "./components/ViewModal"
import { ViewDetailsPage } from "./components/ViewDetailsPage"
import { canAccessSection, getAccessibleMenuItems, canAccessMenuItem } from "./utils/rolePermissions"

const menuItems = {
  tuition: [
    { id: "tuition-by-year", labelKey: "menu.tuitionByYear", icon: DollarSign },
    { id: "student-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "tuition-receipts", labelKey: "menu.receipts", icon: Receipt },
    { id: "student-invoices", labelKey: "menu.invoiceManagement", icon: FileInvoice },
    { id: "item-management", labelKey: "menu.itemsTemplates", icon: Tag },
  ],
  debtReminder: [
    { id: "debt-reminder-settings", labelKey: "menu.debtReminderSettings", icon: Bell },
    { id: "email-jobs", labelKey: "menu.emailHistoryView", icon: Send },
    { id: "payment-history", labelKey: "menu.paymentHistory", icon: CreditCard },
  ],
  eca: [
    { id: "eca-invoices", labelKey: "menu.ecaInvoices", icon: FileInvoice },
    { id: "eca-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "eca-receipts", labelKey: "menu.receipts", icon: Receipt },
    { id: "eca-discount-groups", labelKey: "menu.studentGroups", icon: Users },
  ],
  tripActivity: [
    { id: "trip-invoices", labelKey: "menu.tripInvoices", icon: FileInvoice },
    { id: "trip-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "trip-receipts", labelKey: "menu.receipts", icon: Receipt },
    { id: "trip-discount-groups", labelKey: "menu.studentGroups", icon: Users },
  ],
  exam: [
    { id: "exam-invoices", labelKey: "menu.examInvoices", icon: FileInvoice },
    { id: "exam-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "exam-receipts", labelKey: "menu.receipts", icon: Receipt },
    { id: "exam-discount-groups", labelKey: "menu.studentGroups", icon: Users },
  ],
  schoolBus: [
    { id: "bus-invoices", labelKey: "menu.busInvoices", icon: FileInvoice },
    { id: "bus-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "bus-receipts", labelKey: "menu.receipts", icon: Receipt },
    { id: "bus-discount-groups", labelKey: "menu.studentGroups", icon: Users },
  ],
  externalInvoice: [
    { id: "external-invoices", labelKey: "menu.externalInvoices", icon: Building },
    { id: "external-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "external-receipts", labelKey: "menu.receipts", icon: Receipt },
    { id: "external-discount-groups", labelKey: "menu.studentGroups", icon: Users },
  ],
  report: [],
  userManagement: [
    { id: "user-management", labelKey: "menu.users", icon: UsersRound },
    { id: "activity-log", labelKey: "menu.activityLog", icon: Activity },
    { id: "approval-queue", labelKey: "menu.approvalQueue", icon: ClipboardCheck },
  ],
  studentManagement: [
    { id: "student-list", labelKey: "menu.studentList", icon: GraduationCap },
    { id: "family-groups", labelKey: "menu.familyGroups", icon: Users },
    { id: "credit-notes", labelKey: "invoice.creditNotes", icon: FileCheck },
  ],
  settings: [
    { id: "school-settings", labelKey: "menu.schoolSettings", icon: Settings2 },
    { id: "tuition-term-settings", labelKey: "menu.termSettings", icon: Calendar },
  ]
}

export default function App() {
  const { language, setLanguage, t } = useLanguage()
  const { isAuthenticated, user, logout, needsRoleSelection, selectRole } = useAuth()
  // Initialize activeSection with check for sub-pages
  const getInitialActiveSection = () => {
    const stored = localStorage.getItem("app:activeSection")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const subPages = ['invoice-creation', 'external-invoice-creation', 'email-history-view', 'email-csv-export', 'view-details', 'waive-fee-year-details']
        // If stored value is a sub-page, reset to default
        if (subPages.includes(parsed)) {
          return "tuition-dashboard"
        }
        return parsed
      } catch {
        return "tuition-dashboard"
      }
    }
    return "tuition-dashboard"
  }

  const [activeSection, setActiveSection] = usePersistedState("app:activeSection", getInitialActiveSection())
  const [subPageHistory, setSubPageHistory] = useState<string[]>([])
  const hasResetToDashboard = useRef(false)

  // Reset to dashboard when user first logs in
  useEffect(() => {
    if (isAuthenticated && !needsRoleSelection && !hasResetToDashboard.current) {
      setActiveSection("tuition-dashboard")
      setSubPageHistory([])
      hasResetToDashboard.current = true
    }
    // Reset flag when user logs out
    if (!isAuthenticated) {
      hasResetToDashboard.current = false
    }
  }, [isAuthenticated, needsRoleSelection])

  // Filter menu items based on user role
  const getFilteredMenuItems = (section: string) => {
    if (!user?.role) return []
    return getAccessibleMenuItems(user.role, section, menuItems[section as keyof typeof menuItems] || [])
  }

  // Check if user can access a section
  const canAccessMenuSection = (section: string) => {
    if (!user?.role) return false
    return canAccessSection(user.role, section)
  }
  const [subPageParams, setSubPageParams] = useState<any>(null)

  // Collapsible menu state - allow multiple groups to be open
  const getInitialOpenGroups = () => {
    // For Approver role, only show User Management section open
    if (user?.role === "approver") {
      return {
        tuition: false,
        debtReminder: false,
        eca: false,
        tripActivity: false,
        exam: false,
        schoolBus: false,
        externalInvoice: false,
        report: false,
        studentManagement: false,
        userManagement: true,
        settings: false
      }
    }
    // Default for other roles
    return {
      tuition: true,
      debtReminder: false,
      eca: false,
      tripActivity: false,
      exam: false,
      schoolBus: false,
      externalInvoice: false,
      report: false,
      studentManagement: false,
      userManagement: false,
      settings: false
    }
  }

  const [openGroups, setOpenGroups] = usePersistedState<Record<string, boolean>>("app:openGroups", getInitialOpenGroups())

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  const handleMenuItemClick = (itemId: string) => {
    setActiveSection(itemId)
  }

  // Global View Modal state (keeping for backward compatibility)
  const [isGlobalViewModalOpen, setIsGlobalViewModalOpen] = useState(false)
  const [globalViewModalData, setGlobalViewModalData] = useState<any>(null)
  const [globalViewModalType, setGlobalViewModalType] = useState<"invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template">("invoice")

  // ViewDetailsPage state
  const [viewDetailsData, setViewDetailsData] = useState<any>(null)

  const getModuleName = (section: string) => {
    const sections = [
      ...menuItems.tuition,
      ...menuItems.debtReminder,
      ...menuItems.eca,
      ...menuItems.tripActivity,
      ...menuItems.exam,
      ...menuItems.schoolBus,
      ...menuItems.externalInvoice,
      ...menuItems.report,
      ...menuItems.userManagement,
      ...menuItems.studentManagement,
      ...menuItems.settings
    ]
    const matched = sections.find(item => item.id === section)
    if (matched) return t(matched.labelKey)
    if (section === "approval-queue") return "Approval Queue"
    if (section === "activity-log") return "Activity Log"
    if (section === "invoice-creation") return "Invoice Creation"
    if (section === "external-invoice-creation") return "External Invoice Creation"
    if (section === "view-details") return "View Details"
    return section
  }

  useEffect(() => {
    const moduleName = getModuleName(activeSection)
    logActivity({
      action: `Viewed ${moduleName}`,
      module: moduleName,
      detail: `Menu: ${activeSection}`
    })
  }, [activeSection, t])

  // Redirect Approver role to approval-queue (allow profile/settings/activity)
  const approverAllowedPages = ["approval-queue", "user-profile", "user-settings", "user-activity"]
  useEffect(() => {
    if (user?.role === "approver" && !approverAllowedPages.includes(activeSection)) {
      setActiveSection("approval-queue")
    }
  }, [user, activeSection])

  const [viewDetailsType, setViewDetailsType] = useState<"invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template">("invoice")

  const navigateToSubPage = (subPage: string, params?: any) => {
    setSubPageHistory([...subPageHistory, activeSection])
    setActiveSection(subPage)
    setSubPageParams(params)
  }

  // Navigate to View Details Page
  const navigateToViewDetails = (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => {
    setViewDetailsType(type)
    setViewDetailsData(data)
    setSubPageHistory([...subPageHistory, activeSection])
    setActiveSection("view-details")
    setSubPageParams({ type, data })
  }

  // Global View Modal functions
  const openGlobalViewModal = (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => {
    setGlobalViewModalType(type)
    setGlobalViewModalData(data)
    setIsGlobalViewModalOpen(true)
  }

  const handleGlobalEdit = (data: any) => {
    setIsGlobalViewModalOpen(false)
    // Handle edit based on type

  }

  const handleGlobalDownload = (data: any) => {

  }

  const handleGlobalPrint = (data: any) => {

  }

  // ViewDetailsPage handlers
  const handleViewDetailsEdit = (data: any) => {

    // Navigate back or to edit page based on type
    navigateBack()
  }

  const handleViewDetailsDownload = (data: any) => {

  }

  const handleViewDetailsPrint = (data: any) => {

  }

  const navigateBack = () => {
      setActiveSection(previousPage)
      setSubPageParams(null)
    } else {
                  if (activeSection === "student-invoices") return "Tuition Invoice";
                  if (activeSection === "item-management") return "Tuition Items & Templates";
                  if (activeSection === "tuition-receipts") return "Tuition Receipts";
                  if (activeSection === "student-discount-groups") return "Tuition Discount Groups";

                  if (activeSection === "external-item-management") return "External Items & Templates";
                  if (activeSection === "external-receipts") return "External Receipts";
                  if (activeSection === "external-discount-groups") return "External Discount Groups";

                  if (activeSection === "eca-item-management") return "ECA Items & Templates";
                  if (activeSection === "eca-receipts") return "ECA Receipts";
                  if (activeSection === "eca-discount-groups") return "ECA Discount Groups";

                  if (activeSection === "trip-item-management") return "Trip Items & Templates";
                  if (activeSection === "trip-receipts") return "Trip Receipts";
                  if (activeSection === "trip-discount-groups") return "Trip Discount Groups";

                  if (activeSection === "exam-item-management") return "Exam Items & Templates";
                  if (activeSection === "exam-receipts") return "Exam Receipts";
                  if (activeSection === "exam-discount-groups") return "Exam Discount Groups";

                  if (activeSection === "bus-item-management") return "School Bus Items & Templates";
                  if (activeSection === "bus-receipts") return "School Bus Receipts";
                  if (activeSection === "bus-discount-groups") return "School Bus Discount Groups";

                  // 2. Check standard menu items
                  const allMenuItems = Object.values(menuItems).flat();
                  const menuItem = allMenuItems.find(item => item.id === activeSection);
                  if (menuItem) return t(menuItem.labelKey);

                  // 3. Check standalone items
                  if (activeSection === "tuition-dashboard") return t("menu.dashboard");
                  if (activeSection === "tuition-term-settings") return t("menu.termSettings");
                  if (activeSection === "payment-history") return t("menu.paymentHistory");
                  if (activeSection === "credit-notes") return "Credit Notes";
                  if (activeSection === "discount-reports") return t("menu.reports");

                  // 4. Special cases
                  if (activeSection === "invoice-creation") {
                    if (subPageParams?.invoiceType === "tuition") return "Create Tuition Invoice";
                    if (subPageParams?.invoiceType === "eca") return "Create ECA Invoice";
                    if (subPageParams?.invoiceType === "trip") return "Create Trip & Activities Invoice";
                    return "Create Invoice";
                  }
                  if (activeSection === "email-history-view") return "Email Delivery History";
                  if (activeSection === "email-csv-export") return "Export Email Logs";
                  if (activeSection === "view-details") {
                    if (viewDetailsType === "invoice") return "Invoice Details";
                    if (viewDetailsType === "student") return "Student Profile";
                    if (viewDetailsType === "item") return "Item Details";
                    if (viewDetailsType === "receipt") return "Receipt Details";
                    if (viewDetailsType === "payment") return "Payment Details";
                    if (viewDetailsType === "course") return "Course Details";
                    if (viewDetailsType === "template") return "Template Details";
                    return "Details";
                  }
                  if (activeSection === "waive-fee-year-details") return `Waiver Details - ${subPageParams?.academicYear || 'Academic Year'}`;

                  // 5. Default - return empty instead of "Dashboard"
                  return "";
                })()}
              </h1>
            </div>

            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
              className="flex items-center gap-2"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'TH' : 'EN'}
            </Button>

          </header>

          <div className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      <Toaster position="top-right" richColors />

      {/* Global View Modal */}
      <ViewModal
        isOpen={isGlobalViewModalOpen}
        onClose={() => setIsGlobalViewModalOpen(false)}
        type={globalViewModalType}
        data={globalViewModalData}
        onEdit={handleGlobalEdit}
        onDownload={handleGlobalDownload}
        onPrint={handleGlobalPrint}
      />
    </SidebarProvider>
  )
}
