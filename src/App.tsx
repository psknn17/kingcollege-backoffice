import { useState } from "react"
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
import { Button } from "./components/ui/button"
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
  Mail,
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

  Settings2,
  UsersRound,
  Shield,
  UserCog,
  ChevronDown,
  LogOut
} from "lucide-react"
import { TuitionDashboard } from "./components/TuitionDashboard"
import { TuitionTermSettings } from "./components/TuitionTermSettings"
import { TuitionByYear } from "./components/TuitionByYear"
import { DebtReminderSettings } from "./components/DebtReminderSettings"
import { PaymentHistory } from "./components/PaymentHistory"
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
import { DiscountOptions } from "./components/DiscountOptions"
import { DiscountReports } from "./components/DiscountReports"
import { InvoiceManagement } from "./components/InvoiceManagement"
import { InvoiceCreation } from "./components/InvoiceCreation"
import { ItemManagement } from "./components/ItemManagement"
import { EmailJobsManagement } from "./components/EmailJobsManagement"
import { EmailHistoryView } from "./components/EmailHistoryView"
import { EmailCsvExport } from "./components/EmailCsvExport"
import { WaiveFeeYearDetails } from "./components/WaiveFeeYearDetails"
import { UserManagement } from "./components/UserManagement"
import { RolesPermissions } from "./components/RolesPermissions"
import { StudentList } from "./components/StudentList"
import { FamilyGroups } from "./components/FamilyGroups"

import { ViewModal } from "./components/ViewModal"
import { ViewDetailsPage } from "./components/ViewDetailsPage"

const menuItems = {
  tuition: [
    { id: "tuition-dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "tuition-term-settings", label: "Term Settings", icon: Calendar },
    { id: "tuition-by-year", label: "Tuition by Year", icon: DollarSign },
    { id: "debt-reminder-settings", label: "Debt Reminders", icon: Bell },
    { id: "payment-history", label: "Payment History", icon: CreditCard },
    { id: "tuition-invoice-management", label: "Transaction Management", icon: FileText },
  ],
  afterSchool: [
    { id: "afterschool-dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "afterschool-settings", label: "Registration Settings", icon: Settings },
    { id: "afterschool-payment-history", label: "Payment History", icon: CreditCard },
    { id: "course-quota-overview", label: "Course & Quota", icon: GraduationCap },
    { id: "external-parent-management", label: "External Parents", icon: UserCheck },
    { id: "afterschool-receipts", label: "Receipts", icon: Receipt },
  ],
  eventManagement: [
    { id: "event-import", label: "Event Import", icon: Upload },
    { id: "event-payment-deadline", label: "Payment Deadline", icon: Clock },
    { id: "event-registration-reports", label: "Registration Reports", icon: FileBarChart },
    { id: "event-receipts", label: "Receipts", icon: Receipt },
  ],
  summerActivities: [
    { id: "summer-activities-import", label: "Summer Activities Import", icon: Upload },
    { id: "summer-registration-control", label: "Registration Control", icon: Play },
    { id: "summer-payment-reports", label: "Payment Reports", icon: DollarSign },
    { id: "summer-activities-receipts", label: "Receipts", icon: Receipt },
  ],
  discountManagement: [
    { id: "discount-overview", label: "Discount Overview", icon: Percent },
    { id: "discount-options", label: "Discount Options", icon: Settings2 },
    { id: "student-groups", label: "Student Groups", icon: Users },
    { id: "waive-fee", label: "Waive Fee", icon: TrendingDown },
    { id: "discount-reports", label: "Discount Reports", icon: FileBarChart },
  ],
  invoiceManagement: [
    { id: "invoice-management", label: "Invoices", icon: FileInvoice },
    { id: "item-management", label: "Items & Templates", icon: Tag },
    { id: "email-jobs", label: "Email Jobs", icon: Mail },
  ],
  userManagement: [
    { id: "user-management", label: "Users", icon: UsersRound },
    { id: "role-management", label: "Roles & Permissions", icon: Shield },
  ],
  studentManagement: [
    { id: "student-list", label: "Student List", icon: GraduationCap },
    { id: "family-groups", label: "Family Groups", icon: Users },
  ]
}

export default function App() {
  const [activeSection, setActiveSection] = useState("tuition-dashboard")
  const [subPageHistory, setSubPageHistory] = useState<string[]>([])
  const [subPageParams, setSubPageParams] = useState<any>(null)

  // Collapsible menu state - allow multiple groups to be open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    tuition: true,
    afterSchool: false,
    eventManagement: false,
    summerActivities: false,
    discountManagement: false,
    invoiceManagement: false,
    studentManagement: false,
    userManagement: false
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
        return <PaymentHistory />
      case "tuition-invoice-management":
        return <TuitionInvoiceManagement />
      case "afterschool-dashboard":
        return <AfterSchoolDashboard />
      case "afterschool-settings":
        return <AfterSchoolSettings />
      case "afterschool-payment-history":
        return <PaymentHistory type="afterschool" />
      case "course-quota-overview":
        return <CourseQuotaOverview onNavigateToSubPage={navigateToSubPage} />
      case "course-student-report":
        return <CourseStudentReport />
      case "external-parent-management":
        return <ExternalParentManagement />
      case "afterschool-receipts":
        return <AfterSchoolReceipts />
      case "event-import":
        return <EventImport />
      case "event-payment-deadline":
        return <EventPaymentDeadline />
      case "event-registration-reports":
        return <EventRegistrationReports />
      case "event-receipts":
        return <EventReceipts />
      case "summer-activities-import":
        return <SummerActivitiesImport />
      case "summer-registration-control":
        return <SummerRegistrationControl />
      case "summer-payment-reports":
        return <SummerPaymentReports />
      case "summer-activities-receipts":
        return <SummerActivitiesReceipts />
      case "discount-overview":
      case "student-groups":
      case "promotional-campaigns":
      case "waive-fee":
        return <DiscountManagement activeTab={activeSection} onNavigateToSubPage={navigateToSubPage} onTabChange={setActiveSection} />
      case "discount-reports":
        return <DiscountReports />
      case "discount-options":
        return <DiscountOptions />
      case "waive-fee-year-details":
        return <WaiveFeeYearDetails 
          academicYear={subPageParams?.academicYear || '2024-2025'}
          onBack={navigateBack}
        />
      case "invoice-management":
        return <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} />
      case "invoice-creation":
        return <InvoiceCreation
          defaultCategory={subPageParams?.defaultCategory}
          invoiceType={subPageParams?.invoiceType}
          onNavigateBack={navigateBack}
        />
      case "item-management":
        return <ItemManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} />
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
      case "student-list":
        return <StudentList />
      case "family-groups":
        return <FamilyGroups />

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
                    Tuition Management
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
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* After School */}
            <Collapsible open={openGroups["afterSchool"]} onOpenChange={() => toggleGroup("afterSchool")}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                    After School
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["afterSchool"] ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.afterSchool.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Event Management */}
            <Collapsible open={openGroups["eventManagement"]} onOpenChange={() => toggleGroup("eventManagement")}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                    Event Management
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["eventManagement"] ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.eventManagement.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Summer Activities */}
            <Collapsible open={openGroups["summerActivities"]} onOpenChange={() => toggleGroup("summerActivities")}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                    Summer Activities
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["summerActivities"] ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.summerActivities.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Discount Management */}
            <Collapsible open={openGroups["discountManagement"]} onOpenChange={() => toggleGroup("discountManagement")}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                    Discount Management
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["discountManagement"] ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.discountManagement.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

            {/* Invoice Management */}
            <Collapsible open={openGroups["invoiceManagement"]} onOpenChange={() => toggleGroup("invoiceManagement")}>
              <SidebarGroup>
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                    Invoice Management
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["invoiceManagement"] ? "rotate-180" : ""}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {menuItems.invoiceManagement.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleMenuItemClick(item.id)}
                            isActive={activeSection === item.id}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
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
                    Student Management
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
                            <span>{item.label}</span>
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
                    User Management
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
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>

          </SidebarContent>

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
                Back
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {menuItems.tuition.find(item => item.id === activeSection)?.label ||
                 menuItems.afterSchool.find(item => item.id === activeSection)?.label ||
                 menuItems.eventManagement.find(item => item.id === activeSection)?.label ||
                 menuItems.summerActivities.find(item => item.id === activeSection)?.label ||
                 menuItems.discountManagement.find(item => item.id === activeSection)?.label ||
                 menuItems.invoiceManagement.find(item => item.id === activeSection)?.label ||
                 menuItems.userManagement.find(item => item.id === activeSection)?.label ||
                 menuItems.studentManagement.find(item => item.id === activeSection)?.label ||
                 (activeSection === "invoice-creation" ? 
                   (subPageParams?.invoiceType === "tuition" ? "Create Tuition Invoice" :
                    subPageParams?.invoiceType === "eca" ? "Create ECA Invoice" :
                    subPageParams?.invoiceType === "trip" ? "Create Trip & Activities Invoice" :
                    "Create Invoice") :
                  activeSection === "email-jobs" ? "Email Jobs" :
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