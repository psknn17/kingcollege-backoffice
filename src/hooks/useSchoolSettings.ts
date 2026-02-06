import { useState, useEffect } from "react"

export interface SchoolInfo {
  schoolName: string
  schoolNameThai: string
  address: string
  addressThai: string
  phone: string
  email: string
  website: string
  taxId: string
  logoUrl: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  bankBranch: string
  swiftCode: string
}

const STORAGE_KEY = "schoolSettings"

const getDefaultSettings = (): SchoolInfo => ({
  schoolName: "King's College International School Bangkok",
  schoolNameThai: "โรงเรียนนานาชาติคิงส์คอลเลจ กรุงเทพฯ",
  address: "123 School Road, Bangkok 10110, Thailand",
  addressThai: "123 ถนนโรงเรียน แขวงสาทร เขตสาทร กรุงเทพฯ 10110",
  phone: "02-123-4567",
  email: "info@kingscollege.ac.th",
  website: "www.kingscollege.ac.th",
  taxId: "0-1234-56789-01-2",
  logoUrl: "",
  bankName: "Kasikorn Bank",
  bankAccountName: "King's College International School Bangkok",
  bankAccountNumber: "041-1-12977-2",
  bankBranch: "Sathu Pradit",
  swiftCode: "KASITHBK"
})

export const loadSchoolSettings = (): SchoolInfo => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load school settings:", error)
  }
  return getDefaultSettings()
}

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolInfo>(loadSchoolSettings())

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSettings(loadSchoolSettings())
      }
    }

    // Listen for storage changes from other tabs/windows
    window.addEventListener("storage", handleStorageChange)

    // Custom event for same-tab updates
    const handleCustomEvent = () => {
      setSettings(loadSchoolSettings())
    }
    window.addEventListener("schoolSettingsUpdated", handleCustomEvent)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("schoolSettingsUpdated", handleCustomEvent)
    }
  }, [])

  return settings
}
