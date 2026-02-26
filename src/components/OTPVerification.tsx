import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import SchoolLogo from "@/assets/Logo.png"
import SchoolImage from "@/assets/school-bg.jpg"

interface OTPVerificationProps {
  email: string
  onVerify?: (otp: string) => void
  onChangeEmail?: () => void
  onResend?: () => void
}

export function OTPVerification({
  email,
  onVerify,
  onChangeEmail,
  onResend
}: OTPVerificationProps) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [countdown, setCountdown] = useState(57)
  const [isResendDisabled, setIsResendDisabled] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0 && isResendDisabled) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setIsResendDisabled(false)
    }
  }, [countdown, isResendDisabled])

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    const newOtp = pastedData.split("").filter(char => /^\d$/.test(char))

    if (newOtp.length > 0) {
      const updatedOtp = [...otp]
      newOtp.forEach((digit, i) => {
        if (i < 6) updatedOtp[i] = digit
      })
      setOtp(updatedOtp)

      // Focus on next empty input or last input
      const nextEmptyIndex = updatedOtp.findIndex(val => !val)
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus()
      } else {
        inputRefs.current[5]?.focus()
      }
    }
  }

  const handleVerify = () => {
    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      toast.error("Please enter all 6 digits")
      return
    }

    if (onVerify) {
      onVerify(otpCode)
    } else {
      // Mock verification
      toast.success("OTP verified successfully!")
    }
  }

  const handleResend = () => {
    if (!isResendDisabled) {
      setCountdown(57)
      setIsResendDisabled(true)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()

      if (onResend) {
        onResend()
      }
      toast.success("New OTP code sent to your email")
    }
  }

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Left Side - Hero Image */}
      <div
        style={{
          width: "65%",
          height: "100%",
          position: "relative",
          backgroundImage: `url(${SchoolImage})`,
          backgroundSize: "cover",
          backgroundPosition: "50% center",
          backgroundRepeat: "no-repeat"
        }}
      >
      </div>

      {/* Right Side - OTP Form */}
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
        {/* OTP Card */}
        <div
          style={{
            width: "450px",
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
            padding: "48px 40px"
          }}
        >
          {/* School Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
            <img src={SchoolLogo} alt="King's College" style={{ height: "200px", width: "auto", marginBottom: "0px" }} />
          </div>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: "600", color: "#111827", marginBottom: "8px" }}>Verify OTP</h1>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Enter the verification code sent to your email</p>
          </div>

          {/* Email Display */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#DBEAFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px"
            }}>
              <Mail style={{ width: "32px", height: "32px", color: "#60A5FA" }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>OTP code has been sent to</p>
            <p style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>{email}</p>
          </div>

          {/* OTP Input */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "12px", textAlign: "center" }}>
              Enter OTP Code
            </label>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }} onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  style={{
                    width: "48px",
                    height: "56px",
                    textAlign: "center",
                    fontSize: "20px",
                    fontWeight: "600",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    backgroundColor: "white",
                    outline: "none",
                    transition: "all 0.2s"
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#93A5FC"
                    e.target.style.boxShadow = "0 0 0 3px rgba(147, 165, 252, 0.1)"
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db"
                    e.target.style.boxShadow = "none"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={otp.join("").length !== 6}
            style={{
              width: "100%",
              height: "48px",
              fontSize: "15px",
              fontWeight: "500",
              backgroundColor: otp.join("").length === 6 ? "#93A5FC" : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: "12px",
              cursor: otp.join("").length === 6 ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "16px"
            }}
          >
            <ShieldCheck style={{ width: "20px", height: "20px" }} strokeWidth={2} />
            Verify
          </Button>

          {/* Resend Code */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={isResendDisabled}
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#93A5FC",
                backgroundColor: "transparent",
                border: "none",
                cursor: isResendDisabled ? "not-allowed" : "pointer",
                padding: "0"
              }}
            >
              {isResendDisabled ? `${countdown} ` : ""}Resendin
            </button>
          </div>

          {/* Change Email */}
          <div>
            <button
              onClick={onChangeEmail}
              style={{
                width: "100%",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "14px",
                color: "#374151",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                cursor: "pointer"
              }}
            >
              <ArrowLeft style={{ width: "16px", height: "16px" }} strokeWidth={2} />
              Change Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
