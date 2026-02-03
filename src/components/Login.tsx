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
      toast.error("Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left Section - Background Image */}
      <div
        className="w-1/2 relative bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')`
        }}
      >
        {/* Logo - Top Left */}
        <div className="absolute top-8 left-8">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        {/* Text - Bottom Left */}
        <div className="absolute bottom-8 left-8 text-white">
          <h1 className="text-3xl font-semibold mb-2">Parent Portal</h1>
          <p className="text-base mb-1">Manage your child's education journey</p>
          <p className="text-sm mb-6">Secure authentication powered by your school</p>
          <p className="text-xs">© 2024 Schooney Educational System</p>
        </div>
      </div>

      {/* Right Section - Login Card */}
      <div className="w-1/2 bg-white flex items-center justify-center">
        {/* Language Toggle - Top Right */}
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setLanguage(language === "en" ? "th" : "en")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Globe className="w-4 h-4" />
            {language === "en" ? "English" : "ไทย"}
          </button>
        </div>

        {/* Login Card */}
        <div className="w-[380px] bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <svg className="w-16 h-16 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-semibold text-[#111827] text-center mb-2">Log in</h2>

          {/* Subtext */}
          <p className="text-sm text-[#6B7280] text-center mb-6">Welcome to parent portal</p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Label */}
            <label className="block text-sm font-medium text-[#111827] mb-2">Email</label>

            {/* Email Input */}
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full h-11 pl-10 border-gray-300 rounded-lg"
              />
            </div>

            {/* Password Input (hidden initially, shown after email) */}
            {email && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#111827] mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 border-gray-300 rounded-lg"
                />
              </div>
            )}

            {/* Primary Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg"
            >
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          {/* Footer Text */}
          <p className="text-sm text-[#6B7280] text-center mt-6">
            Don't have an account?{" "}
            <a href="#" className="text-[#3B82F6] hover:underline">
              Sign up here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
