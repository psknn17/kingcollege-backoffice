import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { Mail, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import SchoolLogo from "@/assets/Logo.png"
import SchoolBg from "@/assets/school-bg.jpg"

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error("Please enter email")
      return
    }
    setIsLoading(true)
    try {
      const success = await login(email, "password")
      if (success) {
        toast.success("Login successful!")
      } else {
        toast.error("Invalid email")
      }
    } catch (error) {
      toast.error("Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Left Side - Hero Image */}
      <div
        style={{
          width: "50%",
          height: "100%",
          position: "relative",
          backgroundImage: `url(${SchoolLogo})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#f8f9fa"
        }}
      >
      </div>

      {/* Right Side - Login Form */}
      <div
        style={{
          width: "50%",
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
            border: "1px solid #e5e7eb",
            padding: "48px 40px"
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
            <img src={SchoolLogo} alt="King's College" style={{ height: "120px", width: "auto" }} />
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

          {/* Sign Up Link */}
          <p style={{ textAlign: "center", fontSize: "15px", color: "#6b7280", marginTop: "32px" }}>
            Don't have an account?{" "}
            <a href="#" style={{ color: "#3b82f6", fontWeight: "500" }}>
              Sign up here
            </a>
          </p>

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
