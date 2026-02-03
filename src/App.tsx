import { useEffect, useState } from "react"
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
import { AcademicYearProvider } from "./contexts/AcademicYearContext"
import { StudentProvider } from "./contexts/StudentContext"
import { DiscountOptionsProvider } from "./contexts/DiscountOptionsContext"
import { useLanguage } from "./contexts/LanguageContext"
import { Button } from "./components/ui/button"
import { Globe } from "lucide-react"
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
  LogOut
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

import { ViewModal } from "./components/ViewModal"
import { ViewDetailsPage } from "./components/ViewDetailsPage"

const menuItems = {
  tuition: [
    { id: "tuition-dashboard", labelKey: "menu.dashboard", icon: BarChart3 },
    { id: "tuition-term-settings", labelKey: "menu.termSettings", icon: Calendar },
    { id: "tuition-by-year", labelKey: "menu.tuitionByYear", icon: DollarSign },
    { id: "debt-reminder-settings", labelKey: "menu.debtReminder", icon: Bell },
    { id: "student-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "discount-reports", labelKey: "menu.reports", icon: FileBarChart },
    { id: "payment-history", labelKey: "menu.paymentHistory", icon: CreditCard },
    { id: "tuition-invoice-management", labelKey: "menu.transactions", icon: FileText },
    { id: "student-invoices", labelKey: "menu.invoiceManagement", icon: FileInvoice },
    { id: "item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "email-jobs", labelKey: "menu.emailJobs", icon: Send },
  ],
  eca: [
    { id: "eca-invoices", labelKey: "menu.ecaInvoices", icon: FileInvoice },
    { id: "eca-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "eca-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  tripActivity: [
    { id: "trip-invoices", labelKey: "menu.tripInvoices", icon: FileInvoice },
    { id: "trip-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "trip-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  exam: [
    { id: "exam-invoices", labelKey: "menu.examInvoices", icon: FileInvoice },
    { id: "exam-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "exam-receipts", labelKey: "menu.receipts", icon: Receipt },
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
  ],
  userManagement: [
    { id: "user-management", labelKey: "menu.users", icon: UsersRound },
    { id: "role-management", labelKey: "menu.rolesPermissions", icon: Shield },
    { id: "activity-log", labelKey: "menu.activityLog", icon: Activity },
    { id: "approval-queue", labelKey: "menu.approvalQueue", icon: ClipboardCheck },
  ],
  studentManagement: [
    { id: "student-list", labelKey: "menu.studentList", icon: GraduationCap },
    { id: "family-groups", labelKey: "menu.familyGroups", icon: Users },
  ],
  settings: [
    { id: "school-settings", labelKey: "menu.schoolSettings", icon: Settings2 },
  ]
}

export default function App() {
  const { language, setLanguage, t } = useLanguage()
  const [activeSection, setActiveSection] = useState("tuition-dashboard")
  const [subPageHistory, setSubPageHistory] = useState<string[]>([])
  const [subPageParams, setSubPageParams] = useState<any>(null)

  // Collapsible menu state - allow multiple groups to be open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    tuition: true,
    eca: false,
    tripActivity: false,
    exam: false,
    schoolBus: false,
    externalInvoice: false,
    studentManagement: false,
    userManagement: false,
    settings: false
  })

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
      ...menuItems.eca,
      ...menuItems.tripActivity,
      ...menuItems.exam,
      ...menuItems.schoolBus,
      ...menuItems.externalInvoice,
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
    console.log("Edit:", globalViewModalType, data)
  }

  const handleGlobalDownload = (data: any) => {
    console.log("Download:", globalViewModalType, data)
  }

  const handleGlobalPrint = (data: any) => {
    console.log("Print:", globalViewModalType, data)
  }

  // ViewDetailsPage handlers
  const handleViewDetailsEdit = (data: any) => {
    console.log("Edit:", viewDetailsType, data)
    // Navigate back or to edit page based on type
    navigateBack()
  }

  const handleViewDetailsDownload = (data: any) => {
    console.log("Download:", viewDetailsType, data)
  }

  const handleViewDetailsPrint = (data: any) => {
    console.log("Print:", viewDetailsType, data)
  }

  const navigateBack = () => {
    if (subPageHistory.length > 0) {
      const previousPage = subPageHistory[subPageHistory.length - 1]
      setSubPageHistory(subPageHistory.slice(0, -1))
      setActiveSection(previousPage)
      setSubPageParams(null)
    }
  }

  const isSubPage = subPageHistory.length > 0

  const renderContent = () => {
    switch (activeSection) {
      case "tuition-dashboard":
        return <TuitionDashboard />
      case "tuition-term-settings":
        return <TuitionTermSettings />
      case "tuition-by-year":
        return <TuitionByYear />
      case "debt-reminder-settings":
        return <DebtReminderSettings />
      case "payment-history":
        return <PaymentHistorySimple />
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
      case "eca-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="eca" />
      case "eca-item-management":
        return <ItemManagement key="eca-items" onNavigateToSubPage={navigateToSubPage} invoiceType="eca" />
      case "eca-receipts":
        return <ReceiptPage category="eca" />
      case "trip-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="trip" />
      case "trip-item-management":
        return <ItemManagement key="trip-items" onNavigateToSubPage={navigateToSubPage} invoiceType="trip" />
      case "trip-receipts":
        return <ReceiptPage category="trip" />
      case "exam-invoices":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="exam" />
      case "exam-item-management":
        return <ItemManagement key="exam-items" onNavigateToSubPage={navigateToSubPage} invoiceType="exam" />
      case "exam-receipts":
        return <ReceiptPage category="exam" />
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
        return <EmailJobsManagement onNavigateToSubPage={navigateToSubPage} />
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
      case "user-management":
        return <UserManagement />
      case "role-management":
        return <RolesPermissions />
      case "activity-log":
        return <ActivityLog />
      case "approval-queue":
        return <ApprovalQueue />
      case "student-list":
        return <StudentList />
      case "family-groups":
        return <FamilyGroups />
      case "school-settings":
        return <SchoolSettings />

      default:
        return <TuitionDashboard />
    }
  }

  return (
    <AcademicYearProvider>
    <DiscountOptionsProvider>
    <StudentProvider>
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
            {/* Tuition Management */}
            <Collapsible open={openGroups["tuition"]} onOpenChange={() => toggleGroup("tuition")}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                    {t("menu.tuitionManagement")}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["tuition"] ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.tuition.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* ECA */}
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
                      {menuItems.eca.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Trip & Activity */}
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
                      {menuItems.tripActivity.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Exam */}
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
                      {menuItems.exam.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* School Bus */}
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
                      {menuItems.schoolBus.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* External Invoice */}
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
                      {menuItems.externalInvoice.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Student Management */}
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
                      {menuItems.studentManagement.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* User Management */}
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
                      {menuItems.userManagement.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Settings */}
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
                      {menuItems.settings.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

          </SidebarContent>

          <SidebarFooter className="p-4 border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => console.log("Logout")}>
                  <LogOut className="w-4 h-4" />
                  <span>{t("common.logout")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
                {menuItems.tuition.find(item => item.id === activeSection)?.label ||
                 menuItems.eca.find(item => item.id === activeSection)?.label ||
                 menuItems.tripActivity.find(item => item.id === activeSection)?.label ||
                 menuItems.exam.find(item => item.id === activeSection)?.label ||
                 menuItems.schoolBus.find(item => item.id === activeSection)?.label ||
                 menuItems.externalInvoice.find(item => item.id === activeSection)?.label ||
                 menuItems.userManagement.find(item => item.id === activeSection)?.label ||
                 menuItems.studentManagement.find(item => item.id === activeSection)?.label ||
                 (activeSection === "invoice-creation" ?
                   (subPageParams?.invoiceType === "tuition" ? "Create Tuition Invoice" :
                    subPageParams?.invoiceType === "eca" ? "Create ECA Invoice" :
                    subPageParams?.invoiceType === "trip" ? "Create Trip & Activities Invoice" :
                    "Create Invoice") :
                  activeSection === "email-history-view" ? "Email Delivery History" :
                  activeSection === "email-csv-export" ? "Export Email Logs" :
                  activeSection === "view-details" ?
                    (viewDetailsType === "invoice" ? "Invoice Details" :
                     viewDetailsType === "student" ? "Student Profile" :
                     viewDetailsType === "item" ? "Item Details" :
                     viewDetailsType === "receipt" ? "Receipt Details" :
                     viewDetailsType === "payment" ? "Payment Details" :
                     viewDetailsType === "course" ? "Course Details" :
                     viewDetailsType === "template" ? "Template Details" : "Details") :
                  activeSection === "waive-fee-year-details" ? `Waiver Details - ${subPageParams?.academicYear || 'Academic Year'}` :
                  activeSection === "item-management" ? "Items & Templates" : "Dashboard")}
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
    </StudentProvider>
    </DiscountOptionsProvider>
    </AcademicYearProvider>
  )
}
