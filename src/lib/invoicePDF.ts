import { format } from "date-fns"
import { SCHOOL_INFO, BANK_DETAILS, BILL_PAYMENT, numberToWords, getAcademicYear } from "./invoiceUtils"
import SchoolLogo from "@/assets/Logo.png"

interface InvoiceItem {
  id: string
  description: string
  amount: number
  discountPercent: number
  discountedAmount: number
  notes?: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  studentName: string
  studentId: string
  studentGrade: string
  parentName: string
  parentEmail: string
  totalAmount: number
  discountAmount: number
  finalAmount: number
  status: "draft" | "pending_approval" | "approved" | "rejected" | "sent" | "paid" | "overdue" | "cancelled"
  approvalStatus?: "wait" | "approved" | "rejected"
  issueDate?: Date | null
  dueDate: Date
  items: InvoiceItem[]
  invoiceType?: "student" | "external"
  recipientName?: string
  recipientAddress?: string
  eventName?: string
  // Additional fields for detailed breakdown
  registrationFees?: any[]
  idCharges?: number
  discounts?: Array<{ name: string; amount: number; percent?: number }>

  createdBy?: string
  approvedBy?: string
}

const escapeHtml = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value)
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const getApprovalStatus = (invoice: Invoice): "wait" | "approved" | "rejected" => {
  if (invoice.approvalStatus) return invoice.approvalStatus
  if (invoice.status === "approved" || invoice.status === "sent" || invoice.status === "paid") return "approved"
  if (invoice.status === "rejected") return "rejected"
  return "wait"
}

const displayInvoiceNumber = (invoiceNumber: string | undefined) => {
  if (!invoiceNumber || invoiceNumber.startsWith("DRAFT-")) {
    return ""
  }
  return invoiceNumber
}

export const downloadInvoicePDF = async (invoice: Invoice) => {
  if (!invoice) {
    throw new Error("No invoice to download")
  }

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas")
  ])

  // Check if this is an External Invoice
  const isExternalInvoice = invoice.invoiceType === "external" || invoice.studentId === "EXTERNAL"

  // Build the invoice HTML element
  const container = document.createElement("div")
  container.style.width = "794px"
  container.style.padding = "16px 48px 24px 48px"
  container.style.background = "white"
  container.style.color = "black"
  container.style.fontFamily = "Arial, sans-serif"
  container.style.fontSize = "12px"
  container.style.boxSizing = "border-box"

  const invoiceNumberDisplay = (invoice.status === 'sent' || getApprovalStatus(invoice) === 'approved')
    ? (displayInvoiceNumber(invoice.invoiceNumber) || "-")
    : "Pending Approval"

  if (isExternalInvoice) {
    // External Invoice Format — mirrors Student template visually, uses Client fields
    const itemsRows = invoice.items.map((item, index) => `
      <tr>
        <td style="padding:10px 10px; text-align:center; vertical-align:top; border-right:1px solid #000;">${index + 1}</td>
        <td style="padding:10px 14px; vertical-align:top; border-right:1px solid #000;">
          ${escapeHtml(item.description)}
          ${item.notes ? `<div style="font-size:10px; color:#6b7280; margin-top:4px;">${escapeHtml(item.notes)}</div>` : ''}
        </td>
        <td style="padding:10px 14px; text-align:right; vertical-align:top;">${item.discountedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join("")

    // Calculate empty rows to fill table space
    const minRows = 5
    const emptyRowCount = Math.max(0, minRows - invoice.items.length)
    const emptyRows = Array(emptyRowCount).fill('<tr><td style="padding:10px; border-right:1px solid #000;">&nbsp;</td><td style="border-right:1px solid #000;"></td><td></td></tr>').join("")

    container.innerHTML = `
      <div style="text-align:center; margin-bottom:6px;">
        <img src="${SchoolLogo}" style="height:70px; margin:0 auto 4px; display:block;" alt="School Logo" />
        <p style="font-size:11px; font-weight:700; letter-spacing:0.1em; margin:2px 0 0 0;">KING'S COLLEGE INTERNATIONAL SCHOOL</p>
        <p style="font-size:10px; letter-spacing:0.05em; margin:1px 0 0 0;">BANGKOK</p>
      </div>

      <div style="text-align:center; margin:8px 0 14px 0;">
        <h1 style="font-family:'Times New Roman', Times, serif; font-size:36px; font-weight:700; letter-spacing:0.08em; margin:0;">INVOICE</h1>
      </div>

      <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
        <tr>
          <td style="padding:10px 16px; width:19%;">Client no.</td>
          <td style="padding:10px 8px; width:31%;">000000</td>
          <td style="padding:10px 16px; width:19%;">Invoice no.</td>
          <td style="padding:10px 8px; width:31%;">${escapeHtml(invoiceNumberDisplay || '-')}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;">Client name</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.recipientName || invoice.studentName)}</td>
          <td style="padding:10px 16px;">Invoice date</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.issueDate ? format(invoice.issueDate, 'dd MMMM yyyy') : 'Pending Approval')}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;">Contact name</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.parentName || '-')}</td>
          <td style="padding:10px 16px;">Due date</td>
          <td style="padding:10px 8px;">${escapeHtml(format(invoice.dueDate, 'dd MMMM yyyy'))}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px; vertical-align:top;">Address</td>
          <td colspan="3" style="padding:10px 8px; vertical-align:top; white-space:pre-line;">${escapeHtml(invoice.recipientAddress || '-')}</td>
        </tr>
      </table>

      <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:4px; font-size:11px;">
        <thead>
          <tr style="border-bottom:1px solid #000;">
            <th style="padding:8px 10px; text-align:center; font-weight:600; width:40px; border-right:1px solid #000;">No.</th>
            <th style="padding:8px 14px; text-align:center; font-weight:600; border-right:1px solid #000;">Description</th>
            <th style="padding:8px 14px; text-align:center; font-weight:600; width:120px;">Amount<br/>(THB)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${emptyRows}

          <tr style="border-top:1px solid #000;">
            <td colspan="2" style="padding:10px 14px; font-weight:700; border-right:1px solid #000;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:10px; font-weight:700;">${escapeHtml(numberToWords(invoice.finalAmount))}</span>
                <span>TOTAL</span>
              </div>
            </td>
            <td style="padding:10px 14px; text-align:right; font-weight:700;">${invoice.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size:9px; line-height:1.4; margin-bottom:12px; color:#444;">
        <p style="margin:0;">Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.</p>
      </div>

      <div style="page-break-inside:avoid; break-inside:avoid; padding-bottom:12px;">
        <div style="font-size:10px; line-height:1.6;">
          <p style="font-weight:700; margin:0 0 8px 0;">Payment methods</p>

          <div style="margin-bottom:8px;">
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">Cheque:</span> Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only. Please deliver cheques to the Finance &amp; Accounting Department.
            </div></div>
          </div>

          <div style="margin-bottom:8px;">
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">Bank Transfer:</span> Further bank details are provided below. Kindly email your name and invoice number to ${escapeHtml(SCHOOL_INFO.email)} with proof of payment attached upon completion of the transfer process. Please ensure that your payment covers all bank charges.
              <table style="margin-top:6px; margin-left:24px; font-size:10px;">
                <tr><td style="padding:2px 24px 2px 0;">Account name</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.accountName)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Account number</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.accountNumber)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Bank name</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.bankName)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Branch</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.branch)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Swift code</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.swiftCode)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Bank address</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.bankAddress)}</td></tr>
              </table>
            </div></div>
          </div>

          <!-- Removed Bill Payment and Online Credit Card per user request -->

          <div>
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">On-site credit card payment:</span> Credit cards issued by both local and overseas banks (VISA, Mastercard, JCB, UnionPay, and Alipay) are accepted. Please note that a bank fee may be applied, subject to your bank. The applicable rate can be viewed at the Cashier.
            </div></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:36px; padding:0 40px; font-size:11px;">
          <div style="text-align:center; width:200px;">
            <p style="margin-bottom:24px;">${escapeHtml(invoice.createdBy || "")}</p>
            <div style="border-top:1px solid black; margin:0 auto 4px;"></div>
            <p style="margin-top:4px;">Prepared by</p>
          </div>
          <div style="text-align:center; width:200px;">
            <p style="margin-bottom:24px;">${escapeHtml(invoice.approvedBy || "")}</p>
            <div style="border-top:1px solid black; margin:0 auto 4px;"></div>
            <p style="margin-top:2px;">Authorised officer</p>
            <p style="margin-top:1px; font-size:10px;">Head of Finance and Accounting</p>
          </div>
        </div>

        <div style="text-align:center; margin-top:24px; font-size:8px; color:#666; border-top:1px solid #ddd; padding-top:8px;">
          <p style="margin:0;">${escapeHtml(SCHOOL_INFO.name)}, ${escapeHtml(SCHOOL_INFO.address)}</p>
          <p style="margin:2px 0 0 0;">${escapeHtml(SCHOOL_INFO.phone)}, ${escapeHtml(SCHOOL_INFO.email)}, ${escapeHtml(SCHOOL_INFO.website)}</p>
        </div>
      </div>
    `
  } else {
    // Student Invoice Format — matches official template exactly
    const itemsRows = invoice.items.map((item, index) => `
      <tr>
        <td style="padding:10px 10px; text-align:center; vertical-align:top; border-right:1px solid #000;">${index + 1}</td>
        <td style="padding:10px 14px; vertical-align:top; border-right:1px solid #000;">
          ${escapeHtml(item.description)}
          ${item.notes ? `<div style="font-size:10px; color:#6b7280; margin-top:4px;">${escapeHtml(item.notes)}</div>` : ''}
        </td>
        <td style="padding:10px 14px; text-align:right; vertical-align:top;">${item.discountedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join("")

    // Calculate empty rows to fill table space
    const minRows = 5
    const emptyRowCount = Math.max(0, minRows - invoice.items.length - (invoice.discounts?.length || 0))
    const emptyRows = Array(emptyRowCount).fill('<tr><td style="padding:10px; border-right:1px solid #000;">&nbsp;</td><td style="border-right:1px solid #000;"></td><td></td></tr>').join("")

    container.innerHTML = `
      <div style="text-align:center; margin-bottom:6px;">
        <img src="${SchoolLogo}" style="height:70px; margin:0 auto 4px; display:block;" alt="School Logo" />
        <p style="font-size:11px; font-weight:700; letter-spacing:0.1em; margin:2px 0 0 0;">KING'S COLLEGE INTERNATIONAL SCHOOL</p>
        <p style="font-size:10px; letter-spacing:0.05em; margin:1px 0 0 0;">BANGKOK</p>
      </div>

      <div style="text-align:center; margin:8px 0 14px 0;">
        <h1 style="font-family:'Times New Roman', Times, serif; font-size:36px; font-weight:700; letter-spacing:0.08em; margin:0;">INVOICE</h1>
      </div>

      <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:12px; font-size:11px;">
        <tr>
          <td style="padding:10px 16px; width:19%;">Student ID no.</td>
          <td style="padding:10px 8px; width:31%;">${escapeHtml(invoice.studentId)}</td>
          <td style="padding:10px 16px; width:19%;">Invoice no.</td>
          <td style="padding:10px 8px; width:31%;">${escapeHtml(invoiceNumberDisplay || '-')}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;">Student name</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.studentName)}</td>
          <td style="padding:10px 16px;">Invoice date</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.issueDate ? format(invoice.issueDate, 'dd MMMM yyyy') : 'Pending Approval')}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;">Year group</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.studentGrade)}</td>
          <td style="padding:10px 16px;">Due date</td>
          <td style="padding:10px 8px;">${escapeHtml(format(invoice.dueDate, 'dd MMMM yyyy'))}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;">Contact name</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.parentName)}</td>
          <td style="padding:10px 16px;">School year</td>
          <td style="padding:10px 8px;">${escapeHtml(invoice.issueDate ? getAcademicYear(invoice.issueDate) : '-')}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px; vertical-align:top;">Address</td>
          <td colspan="3" style="padding:10px 8px; vertical-align:top; white-space:pre-line;">${escapeHtml(invoice.recipientAddress || '-')}</td>
        </tr>
      </table>

      <table style="width:100%; border:1px solid #000; border-collapse:collapse; margin-bottom:4px; font-size:11px;">
        <thead>
          <tr style="border-bottom:1px solid #000;">
            <th style="padding:8px 10px; text-align:center; font-weight:600; width:40px; border-right:1px solid #000;">No.</th>
            <th style="padding:8px 14px; text-align:center; font-weight:600; border-right:1px solid #000;">Description</th>
            <th style="padding:8px 14px; text-align:center; font-weight:600; width:120px;">Amount<br/>(THB)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}

          ${(() => {
        let additionalRows = ''
        if (invoice.discounts && invoice.discounts.length > 0) {
          invoice.discounts.forEach(discount => {
            additionalRows += `
                  <tr>
                    <td style="border-right:1px solid #000;"></td>
                    <td style="padding:8px 14px; color:#666; border-right:1px solid #000;">
                      ${escapeHtml(discount.name)}${discount.percent ? ` (${discount.percent}%)` : ''}
                    </td>
                    <td style="padding:8px 14px; text-align:right; color:#ef4444;">-${discount.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>`
          })
        }
        if (invoice.registrationFees && invoice.registrationFees.length > 0) {
          invoice.registrationFees.forEach((fee: any) => {
            additionalRows += `
                  <tr>
                    <td style="border-right:1px solid #000;"></td>
                    <td style="padding:8px 14px; color:#ea580c; border-right:1px solid #000;">${escapeHtml(fee.name)}</td>
                    <td style="padding:8px 14px; text-align:right; color:#ea580c;">+${fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>`
          })
        }
        if (invoice.idCharges && invoice.idCharges > 0) {
          additionalRows += `
                <tr>
                  <td style="border-right:1px solid #000;"></td>
                  <td style="padding:8px 14px; color:#9333ea; border-right:1px solid #000;">ID Charges (3%)</td>
                  <td style="padding:8px 14px; text-align:right; color:#9333ea;">+${invoice.idCharges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>`
        }
        return additionalRows
      })()}

          ${emptyRows}

          <tr style="border-top:1px solid #000;">
            <td colspan="2" style="padding:10px 14px; font-weight:700; border-right:1px solid #000;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:10px; font-weight:700;">${escapeHtml(numberToWords(invoice.finalAmount))}</span>
                <span>TOTAL</span>
              </div>
            </td>
            <td style="padding:10px 14px; text-align:right; font-weight:700;">${invoice.finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size:9px; line-height:1.4; margin-bottom:12px; color:#444;">
        <p style="margin:0;">Late payment charges of 1.5% per month or part thereof will be applied to payments made after the invoice due date.</p>
        <p style="margin:2px 0 0 0;">The condition for refund of the security deposit is subject to the terms and conditions of King's College International School Bangkok.</p>
      </div>

      <div style="page-break-inside:avoid; break-inside:avoid; padding-bottom:12px;">
        <div style="font-size:10px; line-height:1.6;">
          <p style="font-weight:700; margin:0 0 8px 0;">Payment methods</p>

          <div style="margin-bottom:8px;">
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">Cheque:</span> Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only. Please deliver cheques to the Finance &amp; Accounting Department.
            </div></div>
          </div>

          <div style="margin-bottom:8px;">
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">Bank Transfer:</span> Further bank details are provided below. Kindly email your child's name, ID number, and invoice number to ${escapeHtml(SCHOOL_INFO.email)} with proof of payment attached upon completion of the transfer process. Please ensure that your payment covers all bank charges.
              <table style="margin-top:6px; margin-left:24px; font-size:10px;">
                <tr><td style="padding:2px 24px 2px 0;">Account name</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.accountName)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Account number</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.accountNumber)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Bank name</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.bankName)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Branch</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.branch)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Swift code</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.swiftCode)}</td></tr>
                <tr><td style="padding:2px 24px 2px 0;">Bank address</td><td style="padding:2px 0;">${escapeHtml(BANK_DETAILS.bankAddress)}</td></tr>
              </table>
            </div></div>
          </div>

          <div style="margin-bottom:8px;">
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div style="flex:1;">
              <span style="font-weight:600;">Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter:</span> Please use the QR code provided below to scan for payment. Kindly note that bank charges will apply to payments made via ATM or at the bank counter.
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-top:6px;">
                <table style="margin-left:24px; font-size:10px;">
                  <tr><td style="padding:2px 24px 2px 0;">Biller ID no.</td><td style="padding:2px 0;">${escapeHtml(BILL_PAYMENT.billerId)}</td></tr>
                  <tr><td style="padding:2px 24px 2px 0;">Reference no. (Ref 1)</td><td style="padding:2px 0;">${escapeHtml(invoice.studentId)}</td></tr>
                  <tr><td style="padding:2px 24px 2px 0;">Reference no. (Ref 2)</td><td style="padding:2px 0;">${escapeHtml(invoiceNumberDisplay || '-')}</td></tr>
                </table>
                <div style="width:64px; height:64px; border:1px solid #000; display:flex; align-items:center; justify-content:center; background:#f3f4f6; flex-shrink:0;">
                  <span style="font-size:8px; color:#6b7280;">QR</span>
                </div>
              </div>
            </div></div>
          </div>

          <div style="margin-bottom:8px;">
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">Credit card:</span> The online payment link will be provided on the parent portal. Visa &amp; Mastercard issued by local banks in Thailand are accepted. Kindly note that a 1.3% bank fee will be applied to individual online payment transaction.
            </div></div>
          </div>

          <div>
            <div style="display:flex;"><span style="margin-right:6px;">-</span><div>
              <span style="font-weight:600;">On-site credit card payment:</span> Credit cards issued by both local and overseas banks (VISA, Mastercard, JCB, UnionPay, and Alipay) are accepted. Please note that a bank fee may be applied, subject to your bank. The applicable rate can be viewed at the Cashier.
            </div></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:36px; padding:0 40px; font-size:11px;">
          <div style="text-align:center; width:200px;">
            <p style="margin-bottom:24px;">${escapeHtml(invoice.createdBy || "")}</p>
            <div style="border-top:1px solid black; margin:0 auto 4px;"></div>
            <p style="margin-top:4px;">Prepared by</p>
          </div>
          <div style="text-align:center; width:200px;">
            <p style="margin-bottom:24px;">${escapeHtml(invoice.approvedBy || "")}</p>
            <div style="border-top:1px solid black; margin:0 auto 4px;"></div>
            <p style="margin-top:2px;">Authorised officer</p>
            <p style="margin-top:1px; font-size:10px;">Head of Finance and Accounting</p>
          </div>
        </div>

        <div style="text-align:center; margin-top:24px; font-size:8px; color:#666; border-top:1px solid #ddd; padding-top:8px;">
          <p style="margin:0;">${escapeHtml(SCHOOL_INFO.name)}, ${escapeHtml(SCHOOL_INFO.address)}</p>
          <p style="margin:2px 0 0 0;">${escapeHtml(SCHOOL_INFO.phone)}, ${escapeHtml(SCHOOL_INFO.email)}, ${escapeHtml(SCHOOL_INFO.website)}</p>
        </div>
      </div>
    `
  }

  container.style.position = "fixed"
  container.style.left = "-10000px"
  container.style.top = "0"
  container.style.pageBreakInside = "avoid"
  document.body.appendChild(container)

  // Wait for images to load
  const images = Array.from(container.querySelectorAll("img"))
  await Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve()
    return new Promise<void>(resolve => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
  }))

  // Generate PDF
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff"
  })
  document.body.removeChild(container)

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const maxWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin * 2
  const imgData = canvas.toDataURL("image/png")

  // Fit content on a single A4 page (matches sample template) — scale down proportionally if needed
  let drawWidth = maxWidth
  let drawHeight = (canvas.height * drawWidth) / canvas.width
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight
    drawWidth = (canvas.width * drawHeight) / canvas.height
  }
  const offsetX = (pageWidth - drawWidth) / 2
  const offsetY = (pageHeight - drawHeight) / 2
  doc.addImage(imgData, "PNG", offsetX, offsetY, drawWidth, drawHeight)

  const safeName = (invoice.invoiceNumber || invoice.id)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
  doc.save(`${safeName}.pdf`)
}
