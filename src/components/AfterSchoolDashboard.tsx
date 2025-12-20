import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts"
import { Users, DollarSign, Calendar, BookOpen, TrendingUp, Clock } from "lucide-react"

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
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,219</div>
            <p className="text-xs text-muted-foreground">
              +15% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₿367,600</div>
            <p className="text-xs text-muted-foreground">
              +8% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Activities</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Across 8 categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">90.6%</div>
            <p className="text-xs text-muted-foreground">
              +2.4% this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts - 4 Customizable Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Registration & Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Registration & Revenue Trends</CardTitle>
            <p className="text-sm text-muted-foreground">Monthly registration count and revenue correlation</p>
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
            <CardTitle>Activity Popularity</CardTitle>
            <p className="text-sm text-muted-foreground">Student enrollment by activity type</p>
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
            <CardTitle>Weekly Attendance Pattern</CardTitle>
            <p className="text-sm text-muted-foreground">Average attendance rate by day of week</p>
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
            <CardTitle>Revenue by Activity</CardTitle>
            <p className="text-sm text-muted-foreground">Top performing activities by revenue generation</p>
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
            <CardTitle>Capacity Overview</CardTitle>
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
            <CardTitle>Recent Registrations</CardTitle>
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
            Performance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800">High Demand Activities</h4>
              <p className="text-sm text-red-600 mt-1">
                3 activities are at 90%+ capacity. Consider adding more sessions.
              </p>
              <ul className="text-xs text-red-600 mt-2 space-y-1">
                <li>• Basketball (94% full)</li>
                <li>• Art Studio (91% full)</li>
                <li>• Football (90% full)</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800">Low Registration</h4>
              <p className="text-sm text-yellow-600 mt-1">
                2 activities have low enrollment. Marketing needed.
              </p>
              <ul className="text-xs text-yellow-600 mt-2 space-y-1">
                <li>• Chess (32 students)</li>
                <li>• Coding (29 students)</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800">Top Performers</h4>
              <p className="text-sm text-green-600 mt-1">
                Best revenue-generating activities this month.
              </p>
              <ul className="text-xs text-green-600 mt-2 space-y-1">
                <li>• Swimming (₿25,500)</li>
                <li>• Football (₿21,600)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}