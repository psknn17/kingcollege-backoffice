import { useState, useRef, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Mail, ArrowLeft, ShieldCheck, Languages } from "lucide-react"
import { toast } from "sonner"
import SchoolLogo from "@/assets/Logo.png"

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
  const [countdown, setCountdown] = useState(60)
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
      setCountdown(60)
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      {/* Language Selector */}
      <div className="absolute top-6 right-6">
        <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
          <Languages className="w-4 h-4" />
          English
        </button>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8">
          {/* School Logo */}
          <div className="flex justify-center mb-8">
            <img
              src={SchoolLogo}
              alt="King's College International School Bangkok"
              className="h-20 object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h1>
            <p className="text-sm text-gray-600">
              Enter the verification code sent to your email
            </p>
          </div>

          {/* Email Display */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">OTP code has been sent to</p>
            <p className="text-base font-semibold text-gray-900">{email}</p>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Enter OTP Code
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            className="w-full mb-4 h-12 text-base bg-blue-500 hover:bg-blue-600"
            disabled={otp.join("").length !== 6}
          >
            <ShieldCheck className="w-5 h-5 mr-2" />
            Verify
          </Button>

          {/* Resend Code */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={isResendDisabled}
              className={`text-sm font-medium ${
                isResendDisabled
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              {isResendDisabled ? `${countdown}` : ""} Resend
            </button>
          </div>

          {/* Change Email */}
          <div className="pt-4 border-t">
            <button
              onClick={onChangeEmail}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Change Email
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
