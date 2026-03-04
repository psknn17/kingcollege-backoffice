// Mock data for Receipt Management

export interface MockInvoiceRow {
  id: string
  invoiceNo: string
  invoiceDate: string
  invoiceAmount: number
  receivedAmount: number
  outstandingAmount: number
}

export interface MockReceiptRecord {
  id: string
  receiptNo: string
  receiptDate: string
  clientType: "internal" | "external"
  clientNo: string
  clientName: string
  contactName: string
  yearGroup: string
  schoolYear: string
  totalAmount: number
  paymentMethod: string
  status: "generated" | "sent" | "downloaded"
  createdAt: string
  invoices: MockInvoiceRow[]
}

// Trip & Activity Receipts (afterschool)
export const mockTripActivityReceipts: MockReceiptRecord[] = [
  {
    id: "trp-001",
    receiptNo: "TRP-2501-0001",
    receiptDate: "2025-01-10T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-001",
    clientName: "Mr. Somchai Jaidee",
    contactName: "Somchai Jaidee",
    yearGroup: "Year 7",
    schoolYear: "2024/2025",
    totalAmount: 3500,
    paymentMethod: "bank_transfer",
    status: "sent",
    createdAt: "2025-01-10T09:30:00.000Z",
    invoices: [
      {
        id: "inv-trp-001",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-05T00:00:00.000Z",
        invoiceAmount: 3500,
        receivedAmount: 3500,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "trp-002",
    receiptNo: "TRP-2501-0002",
    receiptDate: "2025-01-12T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-015",
    clientName: "Mrs. Suda Rakdee",
    contactName: "Suda Rakdee",
    yearGroup: "Year 5",
    schoolYear: "2024/2025",
    totalAmount: 4500,
    paymentMethod: "qr_payment",
    status: "generated",
    createdAt: "2025-01-12T14:20:00.000Z",
    invoices: [
      {
        id: "inv-trp-002",
        invoiceNo: "20250000002",
        invoiceDate: "2025-01-08T00:00:00.000Z",
        invoiceAmount: 4500,
        receivedAmount: 4500,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "trp-003",
    receiptNo: "TRP-2501-0003",
    receiptDate: "2025-01-14T00:00:00.000Z",
    clientType: "external",
    clientNo: "EXT-2024-008",
    clientName: "Mr. John Smith",
    contactName: "John Smith",
    yearGroup: "",
    schoolYear: "2024/2025",
    totalAmount: 2800,
    paymentMethod: "credit_card",
    status: "downloaded",
    createdAt: "2025-01-14T11:00:00.000Z",
    invoices: [
      {
        id: "inv-trp-003",
        invoiceNo: "20250000003",
        invoiceDate: "2025-01-10T00:00:00.000Z",
        invoiceAmount: 2800,
        receivedAmount: 2800,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "trp-004",
    receiptNo: "TRP-2501-0004",
    receiptDate: "2025-01-15T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-022",
    clientName: "Mrs. Pornpan Srisuk",
    contactName: "Pornpan Srisuk",
    yearGroup: "Year 10",
    schoolYear: "2024/2025",
    totalAmount: 8500,
    paymentMethod: "bank_transfer",
    status: "sent",
    createdAt: "2025-01-15T10:45:00.000Z",
    invoices: [
      {
        id: "inv-trp-004a",
        invoiceNo: "20250000004",
        invoiceDate: "2025-01-12T00:00:00.000Z",
        invoiceAmount: 5000,
        receivedAmount: 5000,
        outstandingAmount: 0
      },
      {
        id: "inv-trp-004b",
        invoiceNo: "20250000005",
        invoiceDate: "2025-01-12T00:00:00.000Z",
        invoiceAmount: 3500,
        receivedAmount: 3500,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "trp-005",
    receiptNo: "TRP-2501-0005",
    receiptDate: "2025-01-15T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-033",
    clientName: "Mr. Wichai Tongdee",
    contactName: "Wichai Tongdee",
    yearGroup: "Year 3",
    schoolYear: "2024/2025",
    totalAmount: 2200,
    paymentMethod: "cash",
    status: "generated",
    createdAt: "2025-01-15T15:30:00.000Z",
    invoices: [
      {
        id: "inv-trp-005",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-14T00:00:00.000Z",
        invoiceAmount: 2200,
        receivedAmount: 2200,
        outstandingAmount: 0
      }
    ]
  }
]

// Exam Receipts (event)
export const mockExamReceipts: MockReceiptRecord[] = [
  {
    id: "exm-001",
    receiptNo: "EXM-2501-0001",
    receiptDate: "2025-01-08T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-005",
    clientName: "Mrs. Naree Sukchai",
    contactName: "Naree Sukchai",
    yearGroup: "Year 11",
    schoolYear: "2024/2025",
    totalAmount: 15000,
    paymentMethod: "bank_transfer",
    status: "sent",
    createdAt: "2025-01-08T10:00:00.000Z",
    invoices: [
      {
        id: "inv-exm-001",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-03T00:00:00.000Z",
        invoiceAmount: 15000,
        receivedAmount: 15000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "exm-002",
    receiptNo: "EXM-2501-0002",
    receiptDate: "2025-01-09T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-012",
    clientName: "Mr. Prasit Wongchai",
    contactName: "Prasit Wongchai",
    yearGroup: "Year 12",
    schoolYear: "2024/2025",
    totalAmount: 25000,
    paymentMethod: "credit_card",
    status: "downloaded",
    createdAt: "2025-01-09T14:30:00.000Z",
    invoices: [
      {
        id: "inv-exm-002a",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-05T00:00:00.000Z",
        invoiceAmount: 15000,
        receivedAmount: 15000,
        outstandingAmount: 0
      },
      {
        id: "inv-exm-002b",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-05T00:00:00.000Z",
        invoiceAmount: 10000,
        receivedAmount: 10000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "exm-003",
    receiptNo: "EXM-2501-0003",
    receiptDate: "2025-01-11T00:00:00.000Z",
    clientType: "external",
    clientNo: "EXT-2024-003",
    clientName: "Ms. Sarah Johnson",
    contactName: "Sarah Johnson",
    yearGroup: "",
    schoolYear: "2024/2025",
    totalAmount: 8500,
    paymentMethod: "qr_payment",
    status: "sent",
    createdAt: "2025-01-11T09:15:00.000Z",
    invoices: [
      {
        id: "inv-exm-003",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-08T00:00:00.000Z",
        invoiceAmount: 8500,
        receivedAmount: 8500,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "exm-004",
    receiptNo: "EXM-2501-0004",
    receiptDate: "2025-01-13T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-028",
    clientName: "Mrs. Kamolwan Petchsri",
    contactName: "Kamolwan Petchsri",
    yearGroup: "Year 13",
    schoolYear: "2024/2025",
    totalAmount: 35000,
    paymentMethod: "bank_transfer",
    status: "generated",
    createdAt: "2025-01-13T16:00:00.000Z",
    invoices: [
      {
        id: "inv-exm-004",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-10T00:00:00.000Z",
        invoiceAmount: 35000,
        receivedAmount: 35000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "exm-005",
    receiptNo: "EXM-2501-0005",
    receiptDate: "2025-01-14T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-041",
    clientName: "Mr. Tanakorn Chaiwat",
    contactName: "Tanakorn Chaiwat",
    yearGroup: "Year 10",
    schoolYear: "2024/2025",
    totalAmount: 12000,
    paymentMethod: "cash",
    status: "sent",
    createdAt: "2025-01-14T11:45:00.000Z",
    invoices: [
      {
        id: "inv-exm-005",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-12T00:00:00.000Z",
        invoiceAmount: 12000,
        receivedAmount: 12000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "exm-006",
    receiptNo: "EXM-2501-0006",
    receiptDate: "2025-01-15T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-055",
    clientName: "Mrs. Ratchanee Somjai",
    contactName: "Ratchanee Somjai",
    yearGroup: "Year 11",
    schoolYear: "2024/2025",
    totalAmount: 18500,
    paymentMethod: "qr_payment",
    status: "generated",
    createdAt: "2025-01-15T13:20:00.000Z",
    invoices: [
      {
        id: "inv-exm-006",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-13T00:00:00.000Z",
        invoiceAmount: 18500,
        receivedAmount: 18500,
        outstandingAmount: 0
      }
    ]
  }
]

// School Bus Receipts (summer)
export const mockSchoolBusReceipts: MockReceiptRecord[] = [
  {
    id: "bus-001",
    receiptNo: "BUS-2501-0001",
    receiptDate: "2025-01-06T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-003",
    clientName: "Mr. Apirak Somboon",
    contactName: "Apirak Somboon",
    yearGroup: "Year 4",
    schoolYear: "2024/2025",
    totalAmount: 45000,
    paymentMethod: "bank_transfer",
    status: "sent",
    createdAt: "2025-01-06T09:00:00.000Z",
    invoices: [
      {
        id: "inv-bus-001",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-02T00:00:00.000Z",
        invoiceAmount: 45000,
        receivedAmount: 45000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "bus-002",
    receiptNo: "BUS-2501-0002",
    receiptDate: "2025-01-07T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-009",
    clientName: "Mrs. Wilaiwan Thongkam",
    contactName: "Wilaiwan Thongkam",
    yearGroup: "Year 2",
    schoolYear: "2024/2025",
    totalAmount: 36000,
    paymentMethod: "qr_payment",
    status: "downloaded",
    createdAt: "2025-01-07T10:30:00.000Z",
    invoices: [
      {
        id: "inv-bus-002",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-04T00:00:00.000Z",
        invoiceAmount: 36000,
        receivedAmount: 36000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "bus-003",
    receiptNo: "BUS-2501-0003",
    receiptDate: "2025-01-09T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-018",
    clientName: "Mr. Kittisak Ruangrit",
    contactName: "Kittisak Ruangrit",
    yearGroup: "Year 6",
    schoolYear: "2024/2025",
    totalAmount: 52000,
    paymentMethod: "credit_card",
    status: "sent",
    createdAt: "2025-01-09T14:00:00.000Z",
    invoices: [
      {
        id: "inv-bus-003a",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-06T00:00:00.000Z",
        invoiceAmount: 26000,
        receivedAmount: 26000,
        outstandingAmount: 0
      },
      {
        id: "inv-bus-003b",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-06T00:00:00.000Z",
        invoiceAmount: 26000,
        receivedAmount: 26000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "bus-004",
    receiptNo: "BUS-2501-0004",
    receiptDate: "2025-01-10T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-025",
    clientName: "Mrs. Supaporn Jaroensuk",
    contactName: "Supaporn Jaroensuk",
    yearGroup: "Year 8",
    schoolYear: "2024/2025",
    totalAmount: 48000,
    paymentMethod: "bank_transfer",
    status: "generated",
    createdAt: "2025-01-10T11:15:00.000Z",
    invoices: [
      {
        id: "inv-bus-004",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-08T00:00:00.000Z",
        invoiceAmount: 48000,
        receivedAmount: 48000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "bus-005",
    receiptNo: "BUS-2501-0005",
    receiptDate: "2025-01-12T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-031",
    clientName: "Mr. Nattapong Weerawong",
    contactName: "Nattapong Weerawong",
    yearGroup: "Year 1",
    schoolYear: "2024/2025",
    totalAmount: 32000,
    paymentMethod: "cash",
    status: "sent",
    createdAt: "2025-01-12T09:45:00.000Z",
    invoices: [
      {
        id: "inv-bus-005",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-10T00:00:00.000Z",
        invoiceAmount: 32000,
        receivedAmount: 32000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "bus-006",
    receiptNo: "BUS-2501-0006",
    receiptDate: "2025-01-14T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-038",
    clientName: "Mrs. Jiraporn Suksan",
    contactName: "Jiraporn Suksan",
    yearGroup: "Year 9",
    schoolYear: "2024/2025",
    totalAmount: 54000,
    paymentMethod: "qr_payment",
    status: "downloaded",
    createdAt: "2025-01-14T15:30:00.000Z",
    invoices: [
      {
        id: "inv-bus-006",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-12T00:00:00.000Z",
        invoiceAmount: 54000,
        receivedAmount: 54000,
        outstandingAmount: 0
      }
    ]
  },
  {
    id: "bus-007",
    receiptNo: "BUS-2501-0007",
    receiptDate: "2025-01-15T00:00:00.000Z",
    clientType: "internal",
    clientNo: "STU-2024-045",
    clientName: "Mr. Piyawat Sriprom",
    contactName: "Piyawat Sriprom",
    yearGroup: "Year 5",
    schoolYear: "2024/2025",
    totalAmount: 42000,
    paymentMethod: "bank_transfer",
    status: "generated",
    createdAt: "2025-01-15T10:00:00.000Z",
    invoices: [
      {
        id: "inv-bus-007",
        invoiceNo: "20250000001",
        invoiceDate: "2025-01-13T00:00:00.000Z",
        invoiceAmount: 42000,
        receivedAmount: 42000,
        outstandingAmount: 0
      }
    ]
  }
]

// Function to initialize mock data in localStorage
export const initializeMockReceiptData = () => {
  const storageKeys = {
    afterschool: "receiptRecords_afterschool",
    event: "receiptRecords_event",
    summer: "receiptRecords_summer"
  }

  // Only initialize if data doesn't exist
  if (!localStorage.getItem(storageKeys.afterschool)) {
    localStorage.setItem(storageKeys.afterschool, JSON.stringify(mockTripActivityReceipts))
  }

  if (!localStorage.getItem(storageKeys.event)) {
    localStorage.setItem(storageKeys.event, JSON.stringify(mockExamReceipts))
  }

  if (!localStorage.getItem(storageKeys.summer)) {
    localStorage.setItem(storageKeys.summer, JSON.stringify(mockSchoolBusReceipts))
  }
}

// Function to reset mock data (for testing)
export const resetMockReceiptData = () => {
  localStorage.setItem("receiptRecords_afterschool", JSON.stringify(mockTripActivityReceipts))
  localStorage.setItem("receiptRecords_event", JSON.stringify(mockExamReceipts))
  localStorage.setItem("receiptRecords_summer", JSON.stringify(mockSchoolBusReceipts))
}
