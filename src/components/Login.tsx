import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { Mail, Lock, ArrowRight, ArrowLeft, Globe } from "lucide-react"
import { toast } from "sonner"
import { logActivity } from "@/lib/activityLog"
import SchoolLogo from "@/assets/Logo.png"
import SchoolImage from "@/assets/school-bg.jpg"
import { OTPVerification } from "./OTPVerification"

type LoginStep = "email" | "otp" | "forgot"

const translations = {
  EN: {
    title: "Log in",
    subtitle: "Welcome to Finance Backoffice",
    email: "Email",
    emailPlaceholder: "Enter your email address",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    forgotPassword: "Forgot password?",
    continue: "Continue",
    signingIn: "Signing in...",
    footerTitle: "Finance Backoffice · Invoice & Accounting Management System",
    footerCopy: "© 2024 Schooney Educational System",
    forgotTitle: "Forgot Password",
    forgotSubtitle: "Enter your email to receive a reset link",
    sendReset: "Send Reset Link",
    sending: "Sending...",
    backToLogin: "Back to login",
  },
  TH: {
    title: "เข้าสู่ระบบ",
    subtitle: "ยินดีต้อนรับสู่ระบบการเงิน",
    email: "อีเมล",
    emailPlaceholder: "กรอกอีเมลของคุณ",
    password: "รหัสผ่าน",
    passwordPlaceholder: "กรอกรหัสผ่านของคุณ",
    forgotPassword: "ลืมรหัสผ่าน?",
    continue: "ดำเนินการต่อ",
    signingIn: "กำลังเข้าสู่ระบบ...",
    footerTitle: "ระบบการเงิน · จัดการใบแจ้งหนี้และบัญชี",
    footerCopy: "© 2024 Schooney Educational System",
    forgotTitle: "ลืมรหัสผ่าน",
    forgotSubtitle: "กรอกอีเมลเพื่อรับลิงก์รีเซ็ตรหัสผ่าน",
    sendReset: "ส่งลิงก์รีเซ็ต",
    sending: "กำลังส่ง...",
    backToLogin: "กลับสู่หน้าเข้าสู่ระบบ",
  },
}

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loginStep, setLoginStep] = useState<LoginStep>("email")
  const [language, setLanguage] = useState<"EN" | "TH">("EN")
  const t = translations[language]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter both email and password")
      return
    }

    setIsLoading(true)
    try {
      // Simulate network delay for a better UX
      await new Promise(resolve => setTimeout(resolve, 800))

      // Whitelist check (Disabled for development as requested)
      /*
      if (email !== "admin@kingscollege.ac.th" || password !== "admin123") {
        toast.error("Invalid credentials or unauthorized email")
        setIsLoading(false)
        return
      }
      */

      // Simulate sending OTP (already had a delay above, so we can proceed)
      toast.success("OTP sent to your email!")
      logActivity({ action: "Send OTP", module: "Authentication", detail: `OTP sent to ${email}` })
      setLoginStep("otp")
    } catch (error) {
      toast.error("Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (otp: string) => {
    setIsLoading(true)
    try {
      // Simulate OTP verification
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Complete login after OTP verification using the entered password
      const result = await login(email, password)
      if (result.success) {
        toast.success("Login successful!")
        logActivity({ action: "Login", module: "Authentication", detail: `User ${email} logged in successfully` })
        // Check for stored lastPath, otherwise default to "from" or dashboard
        const lastPath = localStorage.getItem('lastPath')
        const from = lastPath || (location.state as any)?.from || "/tuition-dashboard"
        
        // Clear lastPath so it doesn't persist across fresh logins
        localStorage.removeItem('lastPath')
        
        navigate(from, { replace: true })
      } else {
        toast.error(result.error || "Invalid credentials")
      }
    } catch (error) {
      toast.error("OTP verification failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeEmail = () => {
    setLoginStep("email")
    setEmail("")
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error("Please enter your email address")
      return
    }
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      toast.success("Password reset email sent!")
      logActivity({ action: "Password Reset", module: "Authentication", detail: `Password reset link sent to ${email}` })
      setLoginStep("email")
      setEmail("")
    } catch (error) {
      toast.error("Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      // Simulate resending OTP
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("New OTP sent to your email!")
      logActivity({ action: "Send OTP", module: "Authentication", detail: `OTP resent to ${email}` })
    } catch (error) {
      toast.error("Failed to resend OTP")
    }
  }

  // Show OTP verification screen if on OTP step
  if (loginStep === "otp") {
    return <OTPVerification email={email} onVerify={handleVerifyOTP} onChangeEmail={handleChangeEmail} onResend={handleResendOTP} />
  }

  // Show forgot password screen
  if (loginStep === "forgot") {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", overflowX: "hidden" }}>
        <div style={{ width: "65%", height: "100%", position: "relative", overflow: "hidden" }}>
          <img src={SchoolImage} alt="School Background" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        </div>
        <div style={{ width: "35%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: "white", overflowY: "auto", position: "relative" }}>
          {/* Language Switcher */}
          <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", fontSize: "13px", fontFamily: "'Lato', sans-serif" }}>
              <Globe style={{ width: "14px", height: "14px", color: "#6b7280" }} />
              <button onClick={() => setLanguage("TH")} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "13px", fontFamily: "'Lato', sans-serif", fontWeight: language === "TH" ? "700" : "400", color: language === "TH" ? "#111827" : "#9ca3af" }}>TH</button>
              <span style={{ color: "#e5e7eb" }}>|</span>
              <button onClick={() => setLanguage("EN")} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "13px", fontFamily: "'Lato', sans-serif", fontWeight: language === "EN" ? "700" : "400", color: language === "EN" ? "#111827" : "#9ca3af" }}>EN</button>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "400px", backgroundColor: "white", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "48px 40px" }}>
              {/* Logo */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0px" }}>
                <img src={SchoolLogo} alt="King's College" style={{ height: "225px", width: "auto", display: "block" }} />
              </div>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: "12px", fontFamily: "'Lato', sans-serif" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>{t.forgotTitle}</h1>
                <p style={{ fontSize: "14px", fontWeight: "400", color: "#6b7280" }}>{t.forgotSubtitle}</p>
              </div>
              {/* Form */}
              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: "24px" }}>
                  <label htmlFor="reset-email" style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "10px", fontFamily: "'Lato', sans-serif" }}>
                    {t.email}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af" }} />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      style={{ width: "100%", height: "48px", paddingLeft: "44px", fontSize: "14px", fontWeight: "400", fontFamily: "'Lato', sans-serif" }}
                      className="border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  style={{ width: "100%", height: "48px", backgroundColor: "#3b82f6", fontSize: "15px", fontWeight: "600", fontFamily: "'Lato', sans-serif" }}
                  className="rounded-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.sending}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {t.sendReset}
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>
              </form>
              {/* Back to login */}
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <button
                  onClick={() => { setLoginStep("email"); setEmail("") }}
                  style={{ fontSize: "14px", fontWeight: "400", fontFamily: "'Lato', sans-serif", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.backToLogin}
                </button>
              </div>
            </div>
          </div>
          <div style={{ height: "58px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderTop: "1px solid #f3f4f6", color: "#6b7280", gap: "3px" }}>
            <p style={{ fontSize: "12px", fontWeight: "400", fontFamily: "'Lato', sans-serif", margin: 0 }}>{t.footerTitle}</p>
            <p style={{ fontSize: "12px", fontWeight: "400", fontFamily: "'Lato', sans-serif", margin: 0, opacity: 0.7 }}>{t.footerCopy}</p>
          </div>
        </div>
      </div>
    )
  }

  // Show email login form
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflowX: "hidden" }}>
      {/* Left Side - Hero Image */}
      <div
        style={{
          width: "65%",
          height: "100%",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <img
          src={SchoolImage}
          alt="School Background"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center"
          }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div
        style={{
          width: "35%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
          overflowY: "auto",
          position: "relative"
        }}
      >
        {/* Language Switcher */}
        <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "white",
              fontSize: "13px",
              fontFamily: "'Lato', sans-serif",
            }}
          >
            <Globe style={{ width: "14px", height: "14px", color: "#6b7280" }} />
            <button
              onClick={() => setLanguage("TH")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "13px", fontFamily: "'Lato', sans-serif", fontWeight: language === "TH" ? "700" : "400", color: language === "TH" ? "#111827" : "#9ca3af" }}
            >TH</button>
            <span style={{ color: "#e5e7eb" }}>|</span>
            <button
              onClick={() => setLanguage("EN")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "13px", fontFamily: "'Lato', sans-serif", fontWeight: language === "EN" ? "700" : "400", color: language === "EN" ? "#111827" : "#9ca3af" }}
            >EN</button>
          </div>
        </div>

        {/* Card Area - centers the card vertically */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Login Card */}
          <div
            style={{
              width: "400px",
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
              padding: "48px 40px"
            }}
          >
            {/* Logo */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0px", marginTop: "0px" }}>
              <img
                src={SchoolLogo}
                alt="King's College"
                style={{ height: "225px", width: "auto", display: "block" }}
              />
            </div>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "12px", fontFamily: "'Lato', sans-serif" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>{t.title}</h1>
              <p style={{ fontSize: "14px", fontWeight: "400", color: "#6b7280" }}>{t.subtitle}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ fontFamily: "'Lato', sans-serif" }}>
              {/* Email */}
              <div style={{ marginBottom: "20px" }}>
                <label htmlFor="email" style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "10px" }}>
                  {t.email}
                </label>
                <div style={{ position: "relative" }}>
                  <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af" }} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    style={{ width: "100%", height: "48px", paddingLeft: "44px", fontSize: "14px", fontWeight: "400", fontFamily: "'Lato', sans-serif" }}
                    className="border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: "8px" }}>
                <label htmlFor="password" style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#111827", marginBottom: "10px" }}>
                  {t.password}
                </label>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af" }} />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    style={{ width: "100%", height: "48px", paddingLeft: "44px", fontSize: "14px", fontWeight: "400", fontFamily: "'Lato', sans-serif" }}
                    className="border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Forgot Password Link */}
              <div style={{ textAlign: "right", marginBottom: "20px" }}>
                <button
                  type="button"
                  onClick={() => setLoginStep("forgot")}
                  style={{ fontSize: "14px", fontWeight: "400", fontFamily: "'Lato', sans-serif", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {t.forgotPassword}
                </button>
              </div>

              {/* Continue Button */}
              <Button
                type="submit"
                disabled={isLoading}
                style={{ width: "100%", height: "48px", backgroundColor: "#3b82f6", fontSize: "15px", fontWeight: "600", fontFamily: "'Lato', sans-serif" }}
                className="rounded-lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.signingIn}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {t.continue}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            height: "58px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "1px solid #f3f4f6",
            color: "#6b7280",
            gap: "3px"
          }}
        >
          <p style={{ fontSize: "12px", fontWeight: "400", fontFamily: "'Lato', sans-serif", margin: 0 }}>{t.footerTitle}</p>
          <p style={{ fontSize: "12px", fontWeight: "400", fontFamily: "'Lato', sans-serif", margin: 0, opacity: 0.7 }}>{t.footerCopy}</p>
        </div>
      </div>
    </div>
  )
}
