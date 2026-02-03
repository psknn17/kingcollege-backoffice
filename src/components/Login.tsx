import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Mail, ArrowRight, Globe } from "lucide-react"
import { toast } from "sonner"

export function Login() {
  const { login } = useAuth()
  const { language, setLanguage } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"email" | "password">("email")

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error(language === "en" ? "Please enter your email" : "กรุณากรอกอีเมล")
      return
    }
    setStep("password")
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      toast.error(language === "en" ? "Please enter your password" : "กรุณากรอกรหัสผ่าน")
      return
    }

    setIsLoading(true)
    try {
      const success = await login(email, password)
      if (success) {
        toast.success(language === "en" ? "Login successful!" : "เข้าสู่ระบบสำเร็จ!")
      } else {
        toast.error(language === "en" ? "Invalid email or password" : "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
      }
    } catch (error) {
      toast.error(language === "en" ? "Login failed. Please try again." : "เข้าสู่ระบบไม่สำเร็จ")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "th" : "en")
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - School Image */}
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`
        }}
      >
        {/* Logo at top */}
        <div className="absolute top-12 left-12">
          <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-xl">
            <svg className="w-12 h-12 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        {/* Text overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <h1 className="text-4xl font-bold mb-3">
            {language === "en" ? "Backoffice Portal" : "ระบบจัดการหลังบ้าน"}
          </h1>
          <p className="text-lg mb-2">
            {language === "en"
              ? "Manage your school's operations seamlessly"
              : "จัดการระบบโรงเรียนอย่างมีประสิทธิภาพ"}
          </p>
          <p className="text-sm text-gray-200 mb-8">
            {language === "en"
              ? "Secure authentication powered by your school"
              : "ระบบยืนยันตัวตนที่ปลอดภัยจากโรงเรียน"}
          </p>
          <p className="text-xs text-gray-300">
            © 2024 King's College International School Bangkok
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Language Toggle */}
        <div className="flex justify-end p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Globe className="w-4 h-4" />
            {language === "en" ? "English" : "ไทย"}
          </Button>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            {/* Logo for mobile */}
            <div className="lg:hidden flex justify-center mb-8">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-800 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    {language === "en"
                      ? "King's College International School"
                      : "โรงเรียนนานาชาติคิงส์คอลเลจ"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {language === "en" ? "Bangkok" : "กรุงเทพฯ"}
                  </p>
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {language === "en" ? "Log in" : "เข้าสู่ระบบ"}
                </h2>
                <p className="text-gray-600">
                  {language === "en"
                    ? "Welcome to backoffice portal"
                    : "ยินดีต้อนรับสู่ระบบจัดการหลังบ้าน"}
                </p>
              </div>

              {/* Form - Email Step */}
              {step === "email" && (
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {language === "en" ? "Email" : "อีเมล"}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={language === "en" ? "Enter your email address" : "กรอกอีเมลของคุณ"}
                        className="pl-11 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                  >
                    {language === "en" ? "Continue" : "ดำเนินการต่อ"}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              )}

              {/* Form - Password Step */}
              {step === "password" && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {language === "en" ? "Password" : "รหัสผ่าน"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {language === "en" ? "Change email" : "เปลี่ยนอีเมล"}
                      </button>
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={language === "en" ? "Enter your password" : "กรอกรหัสผ่านของคุณ"}
                      className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span>{language === "en" ? "Signing in..." : "กำลังเข้าสู่ระบบ..."}</span>
                    ) : (
                      <>
                        {language === "en" ? "Sign in" : "เข้าสู่ระบบ"}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Demo Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center mb-3">
                  {language === "en" ? "Demo Credentials" : "ข้อมูลทดสอบ"}
                </p>
                <div className="text-xs text-gray-600 space-y-1 text-center">
                  <p>admin@kingscollege.ac.th</p>
                  <p>{language === "en" ? "Password" : "รหัสผ่าน"}: admin123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
