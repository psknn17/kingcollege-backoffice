import { useEffect } from "react"
import { useStudents } from "@/contexts/StudentContext"
import { injectMockInvoices } from "@/utils/injectMockInvoices"

export function DevInvoiceSeeder() {
  const { students } = useStudents()
  useEffect(() => {
    localStorage.removeItem("__mockInvoicesInjected_v2__")
    if (students.length > 0) {
      try { injectMockInvoices(students) }
      catch (e) { console.warn("Mock invoice seeder skipped:", e) }
    }
  }, [students])
  return null
}
