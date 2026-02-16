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
import { useAuth } from "./contexts/AuthContext"
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
    if (user?.role === "Approvalver") {
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
    if (user?.role === "Approvalver" && !approverAllowedPages.includes(activeSection)) {
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
    // TODO: Implement edit functionality
  }

  const handleGlobalDownload = (data: any) => {
    // TODO: Implement download functionality
  }

  const handleGlobalPrint = (data: any) => {
    // TODO: Implement print functionality
  }

  // ViewDetailsPage handlers
  const handleViewDetailsEdit = (data: any) => {
    // TODO: Implement edit functionality
    // Navigate back or to edit page based on type
    navigateBack()
  }

  const handleViewDetailsDownload = (data: any) => {
    // TODO: Implement download functionality
  }

  const handleViewDetailsPrint = (data: any) => {
    // TODO: Implement print functionality
  }

  const navigateBack = () => {
    console.log("navigateBack() called, subPageHistory:", subPageHistory)
    if (subPageHistory.length > 0) {
      const previousPage = subPageHistory[subPageHistory.length - 1]
      console.log("Navigating back to:", previousPage)
      setSubPageHistory(subPageHistory.slice(0, -1))
      setActiveSection(previousPage)
      setSubPageParams(null)
    } else {
      console.log("No history to go back, subPageHistory is empty")
    }
  }

  const isSubPage = subPageHistory.length > 0

  const renderContent = () => {
    switch (activeSection) {
      case "tuition-dashboard":
        return <ReportOverview />
      case "tuition-term-settings":
        return <TuitionTermSettings />
      case "tuition-by-year":
        return <TuitionByYear />
      case "debt-reminder-settings":
        return <DebtReminderSettings />
      case "payment-history":
        return <PaymentHistorySimple />
      case "tuition-receipts":
        return <ReceiptPage category="tuition" viewMode="receipts" />
      case "credit-notes":
        return <ReceiptPage category="tuition" viewMode="credit-notes" />
      case "tuition-invoice-management":
        return <TuitionInvoiceManagement />
      case "student-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="tuition" />
      case "student-discount-groups":
        return <DiscountManagement activeTab="student-groups" category="tuition" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "student-groups":
      case "promotional-campaigns":
        return <DiscountManagement activeTab={activeSection} category="tuition" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "discount-reports":
        return <DiscountReports />
      case "waive-fee-year-details":
        return <WaiveFeeYearDetails
          academicYear={subPageParams?.academicYear || '2024-2025'}
          onBack={navigateBack}
        />
      case "external-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="external" showTypeTabs={false} category="external" />
      case "external-item-management":
        return <ItemManagement key="external-items" onNavigateToSubPage={navigateToSubPage} invoiceType="external" />
      case "external-receipts":
        return <ReceiptPage category="external" />
      case "external-discount-groups":
        return <DiscountManagement activeTab="student-groups" category="external" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "eca-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="eca" />
      case "eca-item-management":
        return <ItemManagement key="eca-items" onNavigateToSubPage={navigateToSubPage} invoiceType="eca" />
      case "eca-receipts":
        return <ReceiptPage category="eca" />
      case "eca-discount-groups":
        return <DiscountManagement activeTab="student-groups" category="eca" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "trip-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="trip" />
      case "trip-item-management":
        return <ItemManagement key="trip-items" onNavigateToSubPage={navigateToSubPage} invoiceType="trip" />
      case "trip-receipts":
        return <ReceiptPage category="trip" />
      case "trip-discount-groups":
        return <DiscountManagement activeTab="student-groups" category="trip" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "exam-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="exam" />
      case "exam-item-management":
        return <ItemManagement key="exam-items" onNavigateToSubPage={navigateToSubPage} invoiceType="exam" />
      case "exam-receipts":
        return <ReceiptPage category="exam" />
      case "exam-discount-groups":
        return <DiscountManagement activeTab="student-groups" category="exam" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "bus-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="bus" />
      case "bus-item-management":
        return <ItemManagement key="bus-items" onNavigateToSubPage={navigateToSubPage} invoiceType="bus" />
      case "bus-receipts":
        return <ReceiptPage category="bus" />
      case "bus-discount-groups":
        return <DiscountManagement activeTab="student-groups" category="bus" onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "invoice-creation":
        return <InvoiceCreation
          defaultCategory={subPageParams?.defaultCategory}
          invoiceType={subPageParams?.invoiceType}
          category={subPageParams?.category}
          onNavigateBack={navigateBack}
          editInvoice={subPageParams?.editInvoice}
        />
      case "external-invoice-creation":
        return <ExternalInvoiceCreation
          onNavigateBack={navigateBack}
          editInvoice={subPageParams?.editInvoice}
        />
      case "item-management":
        return <ItemManagement key="tuition-items" onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} invoiceType="tuition" />
      case "email-jobs":
        return <EmailHistory />
      case "email-history-view":
        return <EmailHistoryView jobData={subPageParams?.job} onBack={navigateBack} />
      case "email-csv-export":
        return <EmailCsvExport jobData={subPageParams?.job} onBack={navigateBack} />
      case "view-details":
        return <ViewDetailsPage
          type={viewDetailsType}
          data={viewDetailsData}
          onEdit={viewDetailsData?.viewOnly ? undefined : handleViewDetailsEdit}
          onDownload={handleViewDetailsDownload}
          onPrint={handleViewDetailsPrint}
          onBack={navigateBack}
        />
      case "user-profile":
        return <UserProfile />
      case "user-settings":
        return <UserSettings />
      case "user-activity":
        return <UserActivity />
      case "user-management":
        return <UserManagement />
      case "activity-log":
        return <ActivityLog />
      case "approval-queue":
        return <ApprovalQueue />
      case "student-list":
        return <StudentList onNavigate={(sectionId: string) => setActiveSection(sectionId)} />
      case "family-groups":
        return <FamilyGroups />
      case "school-settings":
        return <SchoolSettings />

      default:
        return <ReportOverview />
    }
  }

  // Show login page if not authenticated
  if (!isAuthenticated && !needsRoleSelection) {
    return <Login />
  }

  // Show role selection if needed
  if (needsRoleSelection) {
    return <RoleSelection onSelectRole={selectRole} />
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">Schooney</h2>
                <p className="text-xs text-muted-foreground">Back Office</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {/* Standalone Menus */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: "tuition-dashboard", labelKey: "menu.dashboard", icon: BarChart3 },
                    { id: "credit-notes", labelKey: "invoice.creditNotes", icon: FileCheck },
                    { id: "discount-reports", labelKey: "menu.reports", icon: FileBarChart },
                  ].map((item) => {
                    if (!user?.role || !canAccessMenuItem(user.role, item.id)) return null;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => handleMenuItemClick(item.id)}
                          isActive={activeSection === item.id}
                        >
                          <item.icon className="w-4 h-4" />
                          <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Tuition Management */}
            {canAccessMenuSection("tuition") && (
              <Collapsible open={openGroups["tuition"]} onOpenChange={() => toggleGroup("tuition")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      Tuition
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["tuition"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("tuition").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Debt Reminder & Email History */}
            {canAccessMenuSection("debtReminder") && (
              <Collapsible open={openGroups["debtReminder"]} onOpenChange={() => toggleGroup("debtReminder")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      Payment Reminders
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["debtReminder"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("debtReminder").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* ECA */}
            {canAccessMenuSection("eca") && (
              <Collapsible open={openGroups["eca"]} onOpenChange={() => toggleGroup("eca")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.eca")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["eca"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("eca").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Trip & Activity */}
            {canAccessMenuSection("tripActivity") && (
              <Collapsible open={openGroups["tripActivity"]} onOpenChange={() => toggleGroup("tripActivity")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.tripActivity")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["tripActivity"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("tripActivity").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Exam */}
            {canAccessMenuSection("exam") && (
              <Collapsible open={openGroups["exam"]} onOpenChange={() => toggleGroup("exam")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.exam")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["exam"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("exam").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* School Bus */}
            {canAccessMenuSection("schoolBus") && (
              <Collapsible open={openGroups["schoolBus"]} onOpenChange={() => toggleGroup("schoolBus")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.schoolBus")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["schoolBus"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("schoolBus").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* External Invoice */}
            {canAccessMenuSection("externalInvoice") && (
              <Collapsible open={openGroups["externalInvoice"]} onOpenChange={() => toggleGroup("externalInvoice")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.externalInvoice")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["externalInvoice"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("externalInvoice").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Student Management */}
            {canAccessSection(user?.role || "", "studentManagement") && (
              <Collapsible open={openGroups["studentManagement"]} onOpenChange={() => toggleGroup("studentManagement")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.studentManagement")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["studentManagement"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("studentManagement").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* User Management */}
            {canAccessMenuSection("userManagement") && (
              <Collapsible open={openGroups["userManagement"]} onOpenChange={() => toggleGroup("userManagement")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.userManagement")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["userManagement"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("userManagement").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Settings */}
            {canAccessSection(user?.role || "", "settings") && (
              <Collapsible open={openGroups["settings"]} onOpenChange={() => toggleGroup("settings")}>
                <SidebarGroup>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                      {t("menu.settings")}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["settings"] ? "rotate-180" : ""}`} />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {getFilteredMenuItems("settings").map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              onClick={() => handleMenuItemClick(item.id)}
                              isActive={activeSection === item.id}
                            >
                              <item.icon className="w-4 h-4" />
                              <span>{item.id === "student-invoices" ? "Tuition Invoice" : t(item.labelKey)}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-[52px] px-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 border border-gray-200 shadow-sm hover:shadow-md group transition-all duration-200 hover:scale-[1.02]"
                >
                  <span className="font-bold text-sm text-gray-900">
                    {user?.role}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-white"
                side="right"
                align="end"
                sideOffset={8}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-gray-900">{user?.role}</p>
                </div>

                {/* Menu Items */}
                <div className="p-1">
                  <DropdownMenuItem
                    onClick={() => handleMenuItemClick("user-profile")}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <UserCog className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Profile</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleMenuItemClick("user-settings")}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleMenuItemClick("user-activity")}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Activity</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Log out</span>
                  </DropdownMenuItem>
                </div>

              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>

        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="border-b p-4 flex items-center gap-4">
            <SidebarTrigger />
            {isSubPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("common.back")}
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {(() => {
                  // 1. Invoice-related pages with category prefixes (check FIRST to override generic labels)
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
