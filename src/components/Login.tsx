import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Mail, Lock, ArrowRight, Globe } from "lucide-react"
import { toast } from "sonner"

export function Login() {
  const { login } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    setIsLoading(true)
    try {
      const success = await login(email, password)
      if (success) {
        toast.success("Login successful!")
      } else {
        toast.error("Invalid email or password")
      }
    } catch (error) {
      toast.error("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "th" : "en")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image & Info */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 p-12 flex-col justify-between text-white overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500 opacity-10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-400 opacity-10 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Logo with glow effect */}
        <div className="relative z-10 animate-fade-in">
          <div className="w-28 h-28 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-transform duration-300 border border-white/20">
            <svg className="w-18 h-18 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        {/* Content with animation */}
        <div className="relative z-10 space-y-8 animate-slide-up">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-tight bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              {language === "en" ? "Backoffice Portal" : "ระบบจัดการหลังบ้าน"}
            </h1>
            <p className="text-xl text-blue-50 font-light">
              {language === "en"
                ? "King's College International School Bangkok"
                : "โรงเรียนนานาชาติคิงส์คอลเลจ กรุงเทพฯ"}
            </p>
          </div>

          <div className="space-y-4 text-blue-50">
            <div className="flex items-center gap-3 group hover:translate-x-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-medium">
                {language === "en"
                  ? "Manage invoices and payments"
                  : "จัดการใบแจ้งหนี้และการชำระเงิน"}
              </span>
            </div>
            <div className="flex items-center gap-3 group hover:translate-x-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="font-medium">
                {language === "en"
                  ? "Student and family information"
                  : "ข้อมูลนักเรียนและครอบครัว"}
              </span>
            </div>
            <div className="flex items-center gap-3 group hover:translate-x-2 transition-transform duration-300">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="font-medium">
                {language === "en"
                  ? "Secure access control"
                  : "การควบคุมการเข้าถึงที่ปลอดภัย"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with better styling */}
        <div className="relative z-10 text-sm text-blue-100 font-light">
          © 2024 King's College International School Bangkok
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md animate-fade-in">
          {/* Language Toggle */}
          <div className="flex justify-end mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2 hover:bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md"
            >
              <Globe className="w-4 h-4" />
              {language === "en" ? "English" : "ไทย"}
            </Button>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 space-y-6 border border-gray-100 hover:shadow-3xl transition-shadow duration-500">
            {/* Logo for mobile */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 transition-transform duration-300">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                {language === "en" ? "Log in" : "เข้าสู่ระบบ"}
              </h2>
              <p className="text-gray-600 text-base">
                {language === "en"
                  ? "Welcome to backoffice portal"
                  : "ยินดีต้อนรับสู่ระบบจัดการหลังบ้าน"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-800">
                  {language === "en" ? "Email" : "อีเมล"}
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === "en" ? "Enter your email address" : "กรอกอีเมลของคุณ"}
                    className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-all duration-300 hover:border-gray-300"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-800">
                  {language === "en" ? "Password" : "รหัสผ่าน"}
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === "en" ? "Enter your password" : "กรอกรหัสผ่านของคุณ"}
                    className="pl-12 h-14 text-base border-2 border-gray-200 focus:border-blue-500 rounded-xl transition-all duration-300 hover:border-gray-300"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{language === "en" ? "Signing in..." : "กำลังเข้าสู่ระบบ..."}</span>
                  </div>
                ) : (
                  <>
                    {language === "en" ? "Continue" : "ดำเนินการต่อ"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-600 text-center mb-3 uppercase tracking-wider">
                {language === "en" ? "Demo Credentials" : "ข้อมูลทดสอบ"}
              </p>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm text-gray-700">
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-blue-700">Email:</span>
                  <span className="font-mono text-xs bg-white px-2 py-1 rounded border">admin@kingscollege.ac.th</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-blue-700">{language === "en" ? "Password" : "รหัสผ่าน"}:</span>
                  <span className="font-mono text-xs bg-white px-2 py-1 rounded border">admin123</span>
                </p>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-600 mt-8">
            {language === "en"
              ? "Need help? Contact IT support"
              : "ต้องการความช่วยเหลือ? ติดต่อฝ่าย IT"}
          </p>
        </div>
      </div>
    </div>
  )
}
