import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useNavigate, useLocation } from "react-router-dom"
import { Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import SchoolLogo from "@/assets/Logo.png"
import SchoolImage from "@/assets/school-bg.jpg"
import { OTPVerification } from "./OTPVerification"

type LoginStep = "email" | "otp"

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loginStep, setLoginStep] = useState<LoginStep>("email")

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
      const success = await login(email, password)
      if (success) {
        toast.success("Login successful!")
        const from = (location.state as any)?.from || "/tuition-dashboard"
        navigate(from, { replace: true })
      } else {
        toast.error("Invalid credentials")
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

  const handleResendOTP = async () => {
    try {
      // Simulate resending OTP
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("New OTP sent to your email!")
    } catch (error) {
      toast.error("Failed to resend OTP")
    }
  }

  // Show OTP verification screen if on OTP step
  if (loginStep === "otp") {
    return <OTPVerification email={email} onVerify={handleVerifyOTP} onChangeEmail={handleChangeEmail} onResend={handleResendOTP} />
  }

  // Show email login form
  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
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
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white"
        }}
      >
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <div className="rounded-xl ring-1 ring-white/20 backdrop-blur-sm bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-2">
              <img
                src={SchoolLogo}
                alt="King's College"
                style={{ height: "280px", width: "auto", display: "block" }}
                className="rounded-lg"
              />
            </div>
          </div>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#111827", marginBottom: "8px" }}>Log in</h1>
            <p style={{ fontSize: "16px", color: "#6b7280" }}>Welcome to Finance Backoffice</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="email" style={{ display: "block", fontSize: "15px", fontWeight: "500", color: "#111827", marginBottom: "10px" }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af" }} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  style={{ width: "100%", height: "48px", paddingLeft: "44px", fontSize: "15px" }}
                  className="border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "24px" }}>
              <label htmlFor="password" style={{ display: "block", fontSize: "15px", fontWeight: "500", color: "#111827", marginBottom: "10px" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: "#9ca3af" }} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ width: "100%", height: "48px", paddingLeft: "44px", fontSize: "15px" }}
                  className="border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Continue Button */}
            <Button
              type="submit"
              disabled={isLoading}
              style={{ width: "100%", height: "48px", backgroundColor: "#3b82f6", fontSize: "15px", fontWeight: "500" }}
              className="rounded-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>



          {/* Info Text */}
          <div style={{ marginTop: "32px", textAlign: "center", color: "#6b7280", paddingTop: "32px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "#111827" }}>Finance Backoffice</h2>
            <p style={{ fontSize: "13px", marginBottom: "4px" }}>Invoice & Accounting Management System</p>
            <p style={{ fontSize: "12px", marginBottom: "16px" }}>Secure authentication powered by your school</p>
            <p style={{ fontSize: "11px", opacity: 0.7 }}>© 2024 Schooney Educational System</p>
          </div>
        </div>
      </div>
    </div>
  )
}
