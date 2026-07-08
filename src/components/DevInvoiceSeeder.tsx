import { useEffect } from "react"
import { useStudents } from "@/contexts/StudentContext"
import { injectMockInvoices } from "@/utils/injectMockInvoices"

export function DevInvoiceSeeder() {
  const { students } = useStudents()
  useEffect(() => {
    if (students.length > 0) injectMockInvoices(students)
  }, [students])
  return null
}
