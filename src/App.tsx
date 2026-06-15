import { useEffect, useRef, useState } from "react"
import { Routes, Route, useNavigate, Navigate } from "react-router-dom"
import { useAppNavigation } from "./hooks/useAppNavigation"
import { PrivateRoute } from "./components/PrivateRoute"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./components/ui/dialog"
import { Globe } from "lucide-react"
import {
  BarChart3,
  Calendar,
  FileText,
  Users,
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
  Sparkles,
  Landmark,
  Search
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
import { ActivityLog } from "./components/ActivityLog"
import { ApprovalQueue } from "./components/ApprovalQueue"
import { StudentList } from "./components/StudentList"
import { FamilyGroups } from "./components/FamilyGroups"
import { SchoolSettings } from "./components/SchoolSettings"
import { ReportOverview } from "./components/ReportOverview"
import { UserProfile } from "./components/UserProfile"
import { BankSettings } from "./components/BankSettings"
import { ClientList } from "./components/ClientList"
import { InvoiceReceiptTemplate } from "./components/InvoiceReceiptTemplate"
import { Login } from "./components/Login"

import { CashierDashboard } from "./components/CashierDashboard"
import { CashierStudentSearch } from "./components/CashierStudentSearch"
import { CashierPaymentPage } from "./components/CashierPaymentPage"
import { CombinedInvoicePage } from "./components/CombinedInvoicePage"
import { CombinedReceiptPage } from "./components/CombinedReceiptPage"
import { ViewModal } from "./components/ViewModal"
import { ViewDetailsPage } from "./components/ViewDetailsPage"
import { canAccessSection, getAccessibleMenuItems, canAccessMenuItem } from "./utils/rolePermissions"
const menuItems = {
  general: [
    { id: "tuition-dashboard", labelKey: "menu.dashboard", icon: BarChart3 },
    { id: "approval-queue", labelKey: "menu.approvalQueue", icon: ClipboardCheck },
    { id: "debt-reminder-settings", labelKey: "menu.debtReminderSettings", icon: Bell },
    { id: "payment-history", labelKey: "menu.paymentHistory", icon: CreditCard },
    { id: "email-jobs", labelKey: "menu.emailHistoryView", icon: Send },
    { id: "discount-reports", labelKey: "menu.reports", icon: FileBarChart },
{ id: "tuition-term-settings", labelKey: "menu.termSettings", icon: Calendar },
    { id: "bank-settings", labelKey: "school.bankSettings", icon: Landmark },
    { id: "all-invoices", labelKey: "menu.allInvoices", icon: FileInvoice },
    { id: "all-receipts", labelKey: "menu.allReceipts", icon: Receipt },
  ],
  tuition: [
    { id: "tuition-by-year", labelKey: "menu.tuitionByYear", icon: DollarSign },
    { id: "item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "student-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "student-invoices", labelKey: "menu.invoiceManagement", icon: FileInvoice },
    { id: "tuition-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  eca: [
    { id: "eca-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "eca-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "eca-invoices", labelKey: "menu.ecaInvoices", icon: FileInvoice },
    { id: "eca-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  tripActivity: [
    { id: "trip-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "trip-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "trip-invoices", labelKey: "menu.tripInvoices", icon: FileInvoice },
    { id: "trip-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  exam: [
    { id: "exam-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "exam-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "exam-invoices", labelKey: "menu.examInvoices", icon: FileInvoice },
    { id: "exam-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  schoolBus: [
    { id: "bus-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "bus-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "bus-invoices", labelKey: "menu.busInvoices", icon: FileInvoice },
    { id: "bus-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  externalInvoice: [
    { id: "client-list", labelKey: "menu.clientList", icon: Users },
    { id: "external-item-management", labelKey: "menu.itemsTemplates", icon: Tag },
    { id: "external-discount-groups", labelKey: "menu.studentGroups", icon: Users },
    { id: "external-invoices", labelKey: "menu.externalInvoices", icon: Building },
    { id: "external-receipts", labelKey: "menu.receipts", icon: Receipt },
  ],
  report: [],
  userManagement: [
    { id: "user-management", labelKey: "menu.users", icon: UsersRound },
    { id: "activity-log", labelKey: "menu.activityLog", icon: Activity },
  ],
  studentManagement: [
    { id: "student-list", labelKey: "menu.studentList", icon: GraduationCap },
    { id: "family-groups", labelKey: "menu.familyGroups", icon: Users },
    { id: "credit-notes", labelKey: "invoice.creditNotes", icon: FileCheck },
  ],
  cashier: [
    { id: "cashier-dashboard", labelKey: "menu.cashierDashboard", icon: BarChart3 },
    { id: "cashier-student-search", labelKey: "menu.cashierStudentSearch", icon: Search },
  ],
}

export default function App() {
  const { language, setLanguage, t } = useLanguage()
  const { isAuthenticated, user, logout, needsRoleSelection } = useAuth()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const navigate = useNavigate()

  const {
    navigateToSubPage,
    navigateBack,
    handleMenuItemClick,
    activeSection,
    isSubPage,
    subPageParams,
  } = useAppNavigation()

  const hasResetToDashboard = useRef(false)

  // No forced reset to dashboard - let router handle last visited path
  useEffect(() => {
    if (!isAuthenticated) {
      hasResetToDashboard.current = false
    }
  }, [isAuthenticated])

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

  // Collapsible menu state - allow multiple groups to be open
  const getInitialOpenGroups = () => {
    if (user?.role === "approver") {
      return {
        general: true,
        tuition: false,
        eca: false,
        tripActivity: false,
        exam: false,
        schoolBus: false,
        externalInvoice: false,
        report: false,
        studentManagement: false,
        userManagement: true,
        cashier: true,
      }
    }
    return {
      general: true,
      tuition: true,
      eca: false,
      tripActivity: false,
      exam: false,
      schoolBus: false,
      externalInvoice: false,
      report: false,
      studentManagement: false,
      userManagement: false,
      cashier: true,
    }
  }

  const [openGroups, setOpenGroups] = usePersistedState<Record<string, boolean>>("app:openGroups", getInitialOpenGroups())

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  // Global View Modal state
  const [isGlobalViewModalOpen, setIsGlobalViewModalOpen] = useState(false)
  const [globalViewModalData, setGlobalViewModalData] = useState<any>(null)
  const [globalViewModalType, setGlobalViewModalType] = useState<"invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template">("invoice")


  // Redirect Approver role to approval-queue (allow profile/settings/activity)
  const approverAllowedPages = ["approval-queue", "user-profile"]
  useEffect(() => {
    if (user?.role === "approver" && !approverAllowedPages.includes(activeSection)) {
      navigate("/approval-queue", { replace: true })
    }
  }, [user, activeSection, navigate])

  // Navigate to View Details Page
  const navigateToViewDetails = (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => {
    navigateToSubPage("view-details", { type, data })
  }

  // Global View Modal functions
  const openGlobalViewModal = (type: "invoice" | "student" | "item" | "receipt" | "payment" | "course" | "template", data: any) => {
    setGlobalViewModalType(type)
    setGlobalViewModalData(data)
    setIsGlobalViewModalOpen(true)
  }

  const handleGlobalEdit = (_data: any) => {
    setIsGlobalViewModalOpen(false)
  }

  const handleGlobalDownload = (_data: any) => { }

  const handleGlobalPrint = (_data: any) => { }

  // ViewDetailsPage handlers
  const handleViewDetailsEdit = (_data: any) => {
    navigateBack()
  }

  const handleViewDetailsDownload = (_data: any) => { }

  const handleViewDetailsPrint = (_data: any) => { }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<PrivateRoute>
          <SidebarProvider>
            <div className="flex h-screen w-full overflow-x-clip">
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
                  {/* General */}
                  {canAccessMenuSection("general") && (
                    <Collapsible open={openGroups["general"]} onOpenChange={() => toggleGroup("general")}>
                      <SidebarGroup>
                        <CollapsibleTrigger className="w-full">
                          <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                            {t("menu.general")}
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["general"] ? "rotate-180" : ""}`} />
                          </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarGroupContent>
                            <SidebarMenu>
                              {getFilteredMenuItems("general").map((item) => (
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
                  )}

                  {/* Tuition Management */}
                  {canAccessMenuSection("tuition") && (
                    <Collapsible open={openGroups["tuition"]} onOpenChange={() => toggleGroup("tuition")}>
                      <SidebarGroup>
                        <CollapsibleTrigger className="w-full">
                          <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                            {t("menu.tuition")}
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
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
                                    <span>{t(item.labelKey)}</span>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              ))}
                            </SidebarMenu>
                          </SidebarGroupContent>
                        </CollapsibleContent>
                      </SidebarGroup>
                    </Collapsible>
                  )}

                  {/* Cashier */}
                  {canAccessMenuSection("cashier") && (
                    <Collapsible open={openGroups["cashier"]} onOpenChange={() => toggleGroup("cashier")}>
                      <SidebarGroup>
                        <CollapsibleTrigger className="w-full">
                          <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 text-sm font-semibold">
                            {t("menu.cashier")}
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openGroups["cashier"] ? "rotate-180" : ""}`} />
                          </SidebarGroupLabel>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarGroupContent>
                            <SidebarMenu>
                              {getFilteredMenuItems("cashier").map((item) => (
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
                          {getRoleDisplayName(user?.role || "")}
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
                      <div className="px-4 py-3 border-b">
                        <p className="text-sm font-semibold text-gray-900">{getRoleDisplayName(user?.role || "")}</p>
                      </div>

                      <div className="p-1">
                        <DropdownMenuItem
                          onClick={() => handleMenuItemClick("user-profile")}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                        >
                          <UserCog className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Profile</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => setIsLogoutDialogOpen(true)}
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

              <main className="flex-1 min-w-0 overflow-x-clip flex flex-col">
                <header className="border-b p-2 md:p-4 flex items-center gap-2 md:gap-4">
                  <SidebarTrigger />
                  {isSubPage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateBack}
                      className="flex items-center gap-1 md:gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">{t("common.back")}</span>
                    </Button>
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-sm md:text-lg font-semibold truncate">
                      {(() => {
                        // 1. Invoice-related pages with category prefixes (check FIRST to override generic labels)
                        if (activeSection === "student-invoices") return "Tuition Invoice";
                        if (activeSection === "item-management") return "Manage Items & Templates";
                        if (activeSection === "tuition-receipts") return "Tuition Receipts";
                        if (activeSection === "student-discount-groups") return "Tuition Discount Groups";

                        if (activeSection === "external-item-management") return "Manage Items & Templates";
                        if (activeSection === "external-receipts") return "External Receipts";
                        if (activeSection === "external-discount-groups") return "External Discount Groups";

                        if (activeSection === "eca-item-management") return "Manage Items & Templates";
                        if (activeSection === "eca-receipts") return "ECA Receipts";
                        if (activeSection === "eca-discount-groups") return "ECA Discount Groups";

                        if (activeSection === "trip-item-management") return "Manage Items & Templates";
                        if (activeSection === "trip-receipts") return "Trip Receipts";
                        if (activeSection === "trip-discount-groups") return "Trip Discount Groups";

                        if (activeSection === "exam-item-management") return "Manage Items & Templates";
                        if (activeSection === "exam-receipts") return "Exam Receipts";
                        if (activeSection === "exam-discount-groups") return "Exam Discount Groups";

                        if (activeSection === "bus-item-management") return "Manage Items & Templates";
                        if (activeSection === "bus-receipts") return "School Bus Receipts";
                        if (activeSection === "bus-discount-groups") return "School Bus Discount Groups";

                        // 2. Check standard menu items
                        const allMenuItems = Object.values(menuItems).flat();
                        const menuItem = allMenuItems.find(item => item.id === activeSection);
                        if (menuItem) return t(menuItem.labelKey);

                        // 3. Check standalone items
                        if (activeSection === "cashier-dashboard") return "แดชบอร์ด";
                        if (activeSection === "cashier-student-search") return "ค้นหานักเรียน";
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
                          const vdType = subPageParams?.type
                          if (vdType === "invoice") return "Invoice Details";
                          if (vdType === "student") return "Student Profile";
                          if (vdType === "item") return "Item Details";
                          if (vdType === "receipt") return "Receipt Details";
                          if (vdType === "payment") return "Payment Details";
                          if (vdType === "course") return "Course Details";
                          if (vdType === "template") return "Template Details";
                          return "Details";
                        }
                        if (activeSection === "waive-fee-year-details") return `Waiver Details - ${subPageParams?.academicYear || 'Academic Year'}`;

                        // 5. Default
                        return "";
                      })()}
                    </h1>
                  </div>

                  {/* Language Switcher */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLanguage(language === 'en' ? 'th' : 'en')}
                    className="flex items-center gap-1 md:gap-2 shrink-0"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="hidden sm:inline">{language === 'en' ? 'EN' : 'TH'}</span>
                  </Button>

                </header>

                <div className="flex-1 min-h-0 min-w-0 p-3 md:p-6 flex flex-col" data-content-area>
                  <Routes>
                    {/* Dashboard */}
                    <Route path="/" element={<ReportOverview />} />
                    <Route path="/tuition-dashboard" element={<ReportOverview />} />
                    <Route path="/discount-reports" element={<DiscountReports />} />

                    {/* Debt Reminder */}
                    <Route path="/debt-reminder-settings" element={<DebtReminderSettings />} />
                    <Route path="/invoice-receipt-template" element={<InvoiceReceiptTemplate />} />
                    <Route path="/payment-history" element={<PaymentHistorySimple />} />
                    <Route path="/email-jobs" element={<EmailHistory />} />

                    {/* Tuition */}
                    <Route path="/tuition-by-year" element={<TuitionByYear />} />
                    <Route path="/tuition-term-settings" element={<TuitionTermSettings />} />
                    <Route path="/tuition-receipts" element={<ReceiptPage category="tuition" viewMode="receipts" />} />
                    <Route path="/credit-notes" element={<ReceiptPage category="tuition" viewMode="credit-notes" />} />
                    <Route path="/tuition-invoice-management" element={<TuitionInvoiceManagement />} />
                    <Route path="/student-invoices" element={
                      <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="tuition" />
                    } />
                    <Route path="/student-discount-groups" element={
                      <DiscountManagement activeTab="student-groups" category="tuition" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />
                    <Route path="/student-groups" element={
                      <DiscountManagement activeTab="student-groups" category="tuition" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />
                    <Route path="/item-management" element={
                      <ItemManagement key="tuition-items" onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} invoiceType="tuition" />
                    } />

                    {/* ECA */}
                    <Route path="/eca-invoices" element={
                      <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="eca" />
                    } />
                    <Route path="/eca-item-management" element={
                      <ItemManagement key="eca-items" onNavigateToSubPage={navigateToSubPage} invoiceType="eca" />
                    } />
                    <Route path="/eca-receipts" element={<ReceiptPage category="eca" />} />
                    <Route path="/eca-discount-groups" element={
                      <DiscountManagement activeTab="student-groups" category="eca" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />

                    {/* Trip & Activity */}
                    <Route path="/trip-invoices" element={
                      <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="trip" />
                    } />
                    <Route path="/trip-item-management" element={
                      <ItemManagement key="trip-items" onNavigateToSubPage={navigateToSubPage} invoiceType="trip" />
                    } />
                    <Route path="/trip-receipts" element={<ReceiptPage category="trip" />} />
                    <Route path="/trip-discount-groups" element={
                      <DiscountManagement activeTab="student-groups" category="trip" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />

                    {/* Exam */}
                    <Route path="/exam-invoices" element={
                      <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="exam" />
                    } />
                    <Route path="/exam-item-management" element={
                      <ItemManagement key="exam-items" onNavigateToSubPage={navigateToSubPage} invoiceType="exam" />
                    } />
                    <Route path="/exam-receipts" element={<ReceiptPage category="exam" />} />
                    <Route path="/exam-discount-groups" element={
                      <DiscountManagement activeTab="student-groups" category="exam" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />

                    {/* School Bus */}
                    <Route path="/bus-invoices" element={
                      <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="student" showTypeTabs={false} category="bus" />
                    } />
                    <Route path="/bus-item-management" element={
                      <ItemManagement key="bus-items" onNavigateToSubPage={navigateToSubPage} invoiceType="bus" />
                    } />
                    <Route path="/bus-receipts" element={<ReceiptPage category="bus" />} />
                    <Route path="/bus-discount-groups" element={
                      <DiscountManagement activeTab="student-groups" category="bus" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />

                    {/* External Invoice */}
                    <Route path="/external-invoices" element={
                      <InvoiceManagement onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} defaultTab="external" showTypeTabs={false} category="external" />
                    } />
                    <Route path="/client-list" element={<ClientList />} />
                    <Route path="/external-item-management" element={
                      <ItemManagement key="external-items" onNavigateToSubPage={navigateToSubPage} invoiceType="external" />
                    } />
                    <Route path="/external-receipts" element={<ReceiptPage category="external" />} />
                    <Route path="/external-discount-groups" element={
                      <DiscountManagement activeTab="student-groups" category="external" onNavigateToSubPage={navigateToSubPage} onTabChange={handleMenuItemClick} />
                    } />

                    <Route path="/all-invoices" element={
                      <CombinedInvoicePage onNavigateToSubPage={navigateToSubPage} onNavigateToView={navigateToViewDetails} />
                    } />
                    <Route path="/all-receipts" element={<CombinedReceiptPage onNavigateToSubPage={navigateToSubPage} />} />

                    {/* Sub-pages with params from location.state */}
                    <Route path="/invoice-creation" element={
                      <InvoiceCreation
                        defaultCategory={subPageParams?.defaultCategory}
                        invoiceType={subPageParams?.invoiceType}
                        category={subPageParams?.category}
                        onNavigateBack={navigateBack}
                        editInvoice={subPageParams?.editInvoice}
                      />
                    } />
                    <Route path="/external-invoice-creation" element={
                      <ExternalInvoiceCreation
                        onNavigateBack={navigateBack}
                        editInvoice={subPageParams?.editInvoice}
                      />
                    } />
                    <Route path="/email-history-view" element={
                      <EmailHistoryView jobData={subPageParams?.job} onBack={navigateBack} />
                    } />
                    <Route path="/email-csv-export" element={
                      <EmailCsvExport jobData={subPageParams?.job} onBack={navigateBack} />
                    } />
                    <Route path="/waive-fee-year-details" element={
                      <WaiveFeeYearDetails
                        academicYear={subPageParams?.academicYear || '2024/2025'}
                        onBack={navigateBack}
                      />
                    } />
                    <Route path="/view-details" element={
                      <ViewDetailsPage
                        type={subPageParams?.type || "invoice"}
                        data={subPageParams?.data}
                        onEdit={subPageParams?.data?.viewOnly ? undefined : handleViewDetailsEdit}
                        onDownload={handleViewDetailsDownload}
                        onPrint={handleViewDetailsPrint}
                        onBack={navigateBack}
                      />
                    } />

                    {/* Student Management */}
                    <Route path="/student-list" element={<StudentList onNavigate={handleMenuItemClick} />} />
                    <Route path="/family-groups" element={<FamilyGroups />} />

                    {/* User Management */}
                    <Route path="/user-management" element={<UserManagement />} />
                    <Route path="/activity-log" element={<ActivityLog />} />
                    <Route path="/approval-queue" element={<ApprovalQueue />} />

                    {/* Cashier */}
                    <Route path="/cashier-dashboard" element={<CashierDashboard />} />
                    <Route path="/cashier-student-search" element={<CashierStudentSearch />} />
                    <Route path="/cashier-payment" element={<CashierPaymentPage />} />

                    {/* Settings */}
                    <Route path="/bank-settings" element={<BankSettings />} />

                    {/* Profile */}
                    <Route path="/user-profile" element={<UserProfile />} />

                    {/* Fallback - Redirect to Dashboard if no path or invalid path */}
                    <Route path="/" element={<Navigate to="/tuition-dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/tuition-dashboard" replace />} />
                  </Routes>
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
        </PrivateRoute>} />
      </Routes>

      {/* Logout Confirmation Dialog — outside SidebarProvider so overlay covers full screen */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="max-w-xs p-8">
          <DialogHeader>
            <DialogTitle>Log Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setIsLogoutDialogOpen(false); logout() }}
            >
              Log Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
