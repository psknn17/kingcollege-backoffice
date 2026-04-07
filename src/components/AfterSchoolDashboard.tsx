import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts"
import { Clock } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

const ECA_INVOICES_KEY = "createdInvoices_eca"
const ECA_COURSES_KEY = "afterschool_courses"

const registrationData = [
  { month: "Aug", registrations: 145, revenue: 58000 },
  { month: "Sep", registrations: 128, revenue: 51200 },
  { month: "Oct", registrations: 167, revenue: 66800 },
  { month: "Nov", registrations: 189, revenue: 75600 },
  { month: "Dec", registrations: 134, revenue: 53600 },
  { month: "Jan", registrations: 156, revenue: 62400 }
]

const activityPopularityData = [
  { name: "Swimming", students: 85, color: "#8884d8" },
  { name: "Football", students: 72, color: "#82ca9d" },
  { name: "Art & Craft", students: 68, color: "#ffc658" },
  { name: "Music", students: 54, color: "#ff7300" },
  { name: "Basketball", students: 47, color: "#00ff88" },
  { name: "Drama", students: 38, color: "#8dd1e1" },
  { name: "Chess", students: 32, color: "#d084d0" },
  { name: "Coding", students: 29, color: "#ffb347" }
]

const weeklyAttendanceData = [
  { day: "Mon", attendance: 92 },
  { day: "Tue", attendance: 88 },
  { day: "Wed", attendance: 95 },
  { day: "Thu", attendance: 91 },
  { day: "Fri", attendance: 87 }
]

const revenueByActivityData = [
  { activity: "Swimming", revenue: 25500, sessions: 85 },
  { activity: "Football", revenue: 21600, sessions: 72 },
  { activity: "Art", revenue: 20400, sessions: 68 },
  { activity: "Music", revenue: 16200, sessions: 54 },
  { activity: "Basketball", revenue: 14100, sessions: 47 },
  { activity: "Drama", revenue: 11400, sessions: 38 }
]

export function AfterSchoolDashboard() {
  const { t } = useLanguage()

  // Load ECA invoices and courses from localStorage
  const [ecaInvoices, setEcaInvoices] = useState<any[]>([])
  const [ecaCourses, setEcaCourses] = useState<any[]>([])

  const loadData = useCallback(() => {
    try {
      const storedInv = localStorage.getItem(ECA_INVOICES_KEY)
      setEcaInvoices(storedInv ? JSON.parse(storedInv) : [])
    } catch { setEcaInvoices([]) }
    try {
      const storedCourses = localStorage.getItem(ECA_COURSES_KEY)
      setEcaCourses(storedCourses ? JSON.parse(storedCourses) : [])
    } catch { setEcaCourses([]) }
  }, [])

  useEffect(() => {
    loadData()
    const handleFocus = () => loadData()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [loadData])

  // Calculate stats from real data
  const dashboardStats = useMemo(() => {
    const totalRegistrations = ecaInvoices.length
    const totalRevenue = ecaInvoices.reduce((sum: number, inv: any) => {
      return sum + (inv.netAmount ?? inv.subtotal ?? inv.finalAmount ?? inv.totalAmount ?? 0)
    }, 0)
    const activeCourses = ecaCourses.filter((c: any) => c.isActive !== false).length
    // Average attendance: mock 90.6% if no real data
    const avgAttendance = 90.6
    return { totalRegistrations, totalRevenue, activeCourses, avgAttendance }
  }, [ecaInvoices, ecaCourses])

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("afterschool.totalRegistrations")}</p>
            <p className="text-2xl font-bold">{dashboardStats.totalRegistrations.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("dashboard.totalRevenue")}</p>
            <p className="text-2xl font-bold">฿{dashboardStats.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("afterschool.activeActivities")}</p>
            <p className="text-2xl font-bold">{dashboardStats.activeCourses}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl gap-0">
          <CardContent className="p-4 pb-4">
            <p className="text-sm text-muted-foreground">{t("afterschool.averageAttendance")}</p>
            <p className="text-2xl font-bold">{dashboardStats.avgAttendance}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts - 4 Customizable Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Registration & Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle>{t("afterschool.registrationTrend")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("afterschool.registrationTrendDesc")}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === "registrations" ? value : `₿${value.toLocaleString()}`,
                    name === "registrations" ? "Registrations" : "Revenue"
                  ]}
                />
                <Area yAxisId="left" type="monotone" dataKey="registrations" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 2. Activity Popularity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("afterschool.activityPopularity")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("afterschool.activityPopularityDesc")}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityPopularityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="students"
                  label={({ name, students }) => `${name}: ${students}`}
                >
                  {activityPopularityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Weekly Attendance Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>{t("afterschool.weeklyAttendance")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("afterschool.weeklyAttendanceDesc")}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyAttendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[80, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Attendance Rate"]} />
                <Line 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  dot={{ fill: "#8884d8", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 4. Revenue by Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t("afterschool.revenueByActivity")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("afterschool.revenueByActivityDesc")}</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByActivityData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="activity" width={80} />
                <Tooltip formatter={(value) => [`₿${value.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Overview */}
        <Card>
          <CardHeader>
            <CardTitle>{t("afterschool.capacityOverview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { activity: "Swimming Pool", enrolled: 85, capacity: 100, utilization: 85 },
                { activity: "Football Field", enrolled: 72, capacity: 80, utilization: 90 },
                { activity: "Art Studio", enrolled: 68, capacity: 75, utilization: 91 },
                { activity: "Music Room", enrolled: 54, capacity: 60, utilization: 90 },
                { activity: "Basketball Court", enrolled: 47, capacity: 50, utilization: 94 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item.activity}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.enrolled}/{item.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.utilization >= 95 ? 'bg-red-500' :
                          item.utilization >= 85 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${item.utilization}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Registrations */}
        <Card>
          <CardHeader>
            <CardTitle>{t("afterschool.recentRegistrations")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { student: "Emma Johnson", activity: "Swimming", time: "2 hours ago", amount: 300 },
                { student: "Liam Chen", activity: "Football", time: "4 hours ago", amount: 250 },
                { student: "Sophia Williams", activity: "Art & Craft", time: "6 hours ago", amount: 200 },
                { student: "Noah Brown", activity: "Music", time: "8 hours ago", amount: 280 },
                { student: "Olivia Davis", activity: "Basketball", time: "1 day ago", amount: 220 }
              ].map((registration, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{registration.student}</p>
                    <p className="text-sm text-muted-foreground">{registration.activity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₿{registration.amount}</p>
                    <p className="text-sm text-muted-foreground">{registration.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("afterschool.performanceAlerts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800">{t("afterschool.highDemand")}</h4>
              <p className="text-sm text-red-600 mt-1">
                {t("afterschool.highDemandDesc")}
              </p>
              <ul className="text-xs text-red-600 mt-2 space-y-1">
                <li>• {t("activity.basketball")} (94% {t("afterschool.full")})</li>
                <li>• {t("activity.artStudio")} (91% {t("afterschool.full")})</li>
                <li>• {t("activity.football")} (90% {t("afterschool.full")})</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800">{t("afterschool.lowRegistration")}</h4>
              <p className="text-sm text-yellow-600 mt-1">
                {t("afterschool.lowRegistrationDesc")}
              </p>
              <ul className="text-xs text-yellow-600 mt-2 space-y-1">
                <li>• {t("activity.chess")} (32 {t("afterschool.students")})</li>
                <li>• {t("activity.coding")} (29 {t("afterschool.students")})</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800">{t("afterschool.topPerformers")}</h4>
              <p className="text-sm text-green-600 mt-1">
                {t("afterschool.topPerformersDesc")}
              </p>
              <ul className="text-xs text-green-600 mt-2 space-y-1">
                <li>• {t("activity.swimming")} (฿25,500)</li>
                <li>• {t("activity.football")} (฿21,600)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}