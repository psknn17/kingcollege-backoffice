// Invoice Utility Functions and Constants

// ============================================
// School Information
// ============================================
export const SCHOOL_INFO = {
  name: "King's College International School Bangkok",
  address: "727 Ratchadapisek Road, Bang Phongphang, Yannawa, Bangkok 10120, Thailand",
  phone: "+66 (0) 2481 9955",
  email: "finance@kingsbangkok.ac.th",
  website: "www.kingsbangkok.ac.th",
}

// ============================================
// Bank Transfer Details
// ============================================
export const BANK_DETAILS = {
  accountName: "King's College International School Bangkok",
  accountNumber: "041-1-12977-2",
  bankName: "Kasikorn Bank (bank code 004)",
  branch: "Sathu Pradit (branch code 0041)",
  swiftCode: "KASITHBK",
  bankAddress: "400/22 Phahon Yothin Road, Samsen Nai, Phayathai District, Bangkok 10400, Thailand",
}

// ============================================
// Bill Payment Details
// ============================================
export const BILL_PAYMENT = {
  billerId: "099-4-00259063-3",
}

// ============================================
// Invoice Notes
// ============================================
export const INVOICE_NOTES = {
  refundCondition: "The condition for refund of the security deposit is subject to the terms and conditions of King's College International School Bangkok.",
  chequeInstruction: "Cheque: Cheques must be made payable to King's College International School Bangkok and marked A/C Payee Only. Please deliver cheques to the Finance & Accounting Department.",
  bankTransferInstruction: "Bank Transfer: Further bank details are provided below. Kindly email your child's name, ID number, and invoice number to finance@kingsbangkok.ac.th with proof of payment attached upon completion of the transfer process. Please ensure that your payment covers all bank charges.",
  billPaymentInstruction: "Bill Payment via Mobile Banking, Internet Banking, ATM or Bank Counter: Please use the QR code provided below to scan for payment. Kindly note that bank charges will apply to payments made via ATM or at the bank counter.",
  creditCardNote: "Credit card: The online payment link will be provided on the payment portal. Visa & Mastercard issued by banks in Thailand.",
}

// ============================================
// Number to Words Function
// ============================================
const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
]

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
]

const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion']

function convertHundreds(num: number): string {
  let result = ''

  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred'
    num %= 100
    if (num > 0) result += ' And '
  }

  if (num >= 20) {
    result += tens[Math.floor(num / 10)]
    num %= 10
    if (num > 0) result += '-' + ones[num]
  } else if (num > 0) {
    result += ones[num]
  }

  return result
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Baht Only'

  // Handle negative numbers
  const isNegative = amount < 0
  amount = Math.abs(amount)

  // Split into integer and decimal parts
  const integerPart = Math.floor(amount)
  const decimalPart = Math.round((amount - integerPart) * 100)

  if (integerPart === 0 && decimalPart === 0) return 'Zero Baht Only'

  let words = ''
  let scaleIndex = 0
  let remaining = integerPart

  // Process groups of three digits
  const groups: string[] = []

  while (remaining > 0) {
    const group = remaining % 1000
    if (group > 0) {
      const groupWords = convertHundreds(group)
      if (scales[scaleIndex]) {
        groups.unshift(groupWords + ' ' + scales[scaleIndex])
      } else {
        groups.unshift(groupWords)
      }
    }
    remaining = Math.floor(remaining / 1000)
    scaleIndex++
  }

  words = groups.join(' ')

  // Add "Baht"
  if (integerPart > 0) {
    words += ' Baht'
  }

  // Add decimal part (Satang)
  if (decimalPart > 0) {
    if (integerPart > 0) {
      words += ' And '
    }
    words += convertHundreds(decimalPart) + ' Satang'
  }

  words += ' Only'

  if (isNegative) {
    words = 'Minus ' + words
  }

  return words
}

// ============================================
// Format Currency
// ============================================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ============================================
// Get Academic Year from Date
// ============================================
export function getAcademicYear(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // JavaScript months are 0-indexed

  // Academic year typically starts in August/September
  if (month >= 8) {
    return `${year}/${year + 1}`
  } else {
    return `${year - 1}/${year}`
  }
}
// ============================================
// Invoice Number Generation
// ============================================

/**
 * Extract the start year from academic year string (e.g., "2025/2026" or "2025/2026" -> "2025")
 */
export function getFormattedAcademicYear(academicYear: string | undefined): string {
  if (!academicYear) return new Date().getFullYear().toString()
  const match = academicYear.match(/(\d{4})/)
  return match ? match[1] : new Date().getFullYear().toString()
}

/**
 * Generate the next invoice number based on academic year and running number in localStorage
 */
export function generateNextInvoiceNumber(academicYear: string | undefined): string {
  const year = getFormattedAcademicYear(academicYear)
  const storageKey = `invoice_running_no_${year}`

  // Get current running number from localStorage
  const currentNoStr = localStorage.getItem(storageKey)
  let nextNo = 1

  if (currentNoStr) {
    nextNo = parseInt(currentNoStr, 10) + 1
  }

  // Update localStorage with the new running number
  localStorage.setItem(storageKey, nextNo.toString())

  // Return formatted number: [Year][7-digit running number]
  return `${year}${String(nextNo).padStart(7, '0')}`
}

/**
 * Peek at the next invoice number without incrementing
 */
export function peekNextInvoiceNumber(academicYear: string | undefined): string {
  const year = getFormattedAcademicYear(academicYear)
  const storageKey = `invoice_running_no_${year}`

  const currentNoStr = localStorage.getItem(storageKey)
  const nextNo = currentNoStr ? parseInt(currentNoStr, 10) + 1 : 1

  return `${year}${String(nextNo).padStart(7, '0')}`
}
