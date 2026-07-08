import { useEffect } from "react"
import { useStudents } from "@/contexts/StudentContext"
import { injectMockInvoices } from "@/utils/injectMockInvoices"

export function DevInvoiceSeeder() {
  const { students } = useStudents()
  useEffect(() => {
    // clear old sentinel so per-student tracking takes over
    localStorage.removeItem("__mockInvoicesInjected_v2__")
    if (students.length > 0) injectMockInvoices(students)
  }, [students])
  return null
}
