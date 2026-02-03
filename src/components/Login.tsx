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
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center shadow-xl">
            <svg className="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">
              {language === "en" ? "Backoffice Portal" : "ระบบจัดการหลังบ้าน"}
            </h1>
            <p className="text-xl text-blue-100">
              {language === "en"
                ? "King's College International School Bangkok"
                : "โรงเรียนนานาชาติคิงส์คอลเลจ กรุงเทพฯ"}
            </p>
          </div>

          <div className="space-y-3 text-blue-100">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-300 rounded-full" />
              {language === "en"
                ? "Manage invoices and payments"
                : "จัดการใบแจ้งหนี้และการชำระเงิน"}
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-300 rounded-full" />
              {language === "en"
                ? "Student and family information"
                : "ข้อมูลนักเรียนและครอบครัว"}
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-300 rounded-full" />
              {language === "en"
                ? "Secure access control"
                : "การควบคุมการเข้าถึงที่ปลอดภัย"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-blue-200">
          © 2024 King's College International School Bangkok
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Language Toggle */}
          <div className="flex justify-end mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              {language === "en" ? "English" : "ไทย"}
            </Button>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            {/* Logo for mobile */}
            <div className="lg:hidden flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                {language === "en" ? "Log in" : "เข้าสู่ระบบ"}
              </h2>
              <p className="text-gray-500">
                {language === "en"
                  ? "Welcome to backoffice portal"
                  : "ยินดีต้อนรับสู่ระบบจัดการหลังบ้าน"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {language === "en" ? "Email" : "อีเมล"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === "en" ? "Enter your email address" : "กรอกอีเมลของคุณ"}
                    className="pl-10 h-12"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  {language === "en" ? "Password" : "รหัสผ่าน"}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === "en" ? "Enter your password" : "กรอกรหัสผ่านของคุณ"}
                    className="pl-10 h-12"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>{language === "en" ? "Signing in..." : "กำลังเข้าสู่ระบบ..."}</span>
                ) : (
                  <>
                    {language === "en" ? "Continue" : "ดำเนินการต่อ"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 text-center mb-2">
                {language === "en" ? "Demo Credentials:" : "ข้อมูลทดสอบ:"}
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs text-gray-600">
                <p><strong>Email:</strong> admin@kingscollege.ac.th</p>
                <p><strong>{language === "en" ? "Password" : "รหัสผ่าน"}:</strong> admin123</p>
              </div>
            </div>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {language === "en"
              ? "Need help? Contact IT support"
              : "ต้องการความช่วยเหลือ? ติดต่อฝ่าย IT"}
          </p>
        </div>
      </div>
    </div>
  )
}
