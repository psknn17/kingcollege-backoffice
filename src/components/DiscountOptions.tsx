import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Switch } from "./ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Badge } from "./ui/badge"
import {
  Save,
  Users,
  CreditCard,
  Gift,
  Shield,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { useAcademicYears } from "@/contexts/AcademicYearContext"

// Storage key for discount options
const DISCOUNT_OPTIONS_STORAGE_KEY = "discountOptions"

interface SiblingDiscount {
  childOrder: string
  label: string
  percentage: number
  enabled: boolean
}

interface LatePaymentSettings {
  chargePercentage: number
  chargeFrequency: "monthly" | "weekly"
  gracePeriodDays: number
  enabled: boolean
}

interface RegistrationFeeSettings {
  applicationFee: number
  registrationFee: number
  securityDeposit: number
  waitListFee: number
  applicationFeeRefundable: boolean
  registrationFeeRefundable: boolean
  securityDepositRefundable: boolean
}

interface RegistrationPrivilege {
  id: string
  condition: string
  privilege: string
  enabled: boolean
}

interface DiscountOptionsData {
  academicYear: string
  siblingDiscounts: SiblingDiscount[]
  latePayment: LatePaymentSettings
  registrationFees: RegistrationFeeSettings
  registrationPrivileges: RegistrationPrivilege[]
  waiverAfter3rdYear: {
    enabled: boolean
    minimumGradeLevel: number
    minimumYears: number
    creditAmount: number
    termsToCredit: number
    firstChildImmediate: boolean
  }
  waiverImmediate: {
    enabled: boolean
    creditAmount: number
    termsToCredit: number
    limitedFamilies: number
  }
}

const defaultSiblingDiscounts: SiblingDiscount[] = [
  { childOrder: "first", label: "First Child", percentage: 0, enabled: true },
  { childOrder: "second", label: "Second Child", percentage: 0, enabled: true },
  { childOrder: "third", label: "Third Child", percentage: 5, enabled: true },
  { childOrder: "fourth", label: "Fourth Child", percentage: 10, enabled: true },
  { childOrder: "fifth", label: "Fifth Child and subsequent", percentage: 20, enabled: true },
]

const defaultLatePayment: LatePaymentSettings = {
  chargePercentage: 1.5,
  chargeFrequency: "monthly",
  gracePeriodDays: 0,
  enabled: true,
}

const defaultRegistrationFees: RegistrationFeeSettings = {
  applicationFee: 5000,
  registrationFee: 225000,
  securityDeposit: 200000,
  waitListFee: 225000,
  applicationFeeRefundable: false,
  registrationFeeRefundable: false,
  securityDepositRefundable: true,
}

const defaultRegistrationPrivileges: RegistrationPrivilege[] = [
  {
    id: "1",
    condition: "First child enrolled in academic year 2025-2026 or 2026-2027",
    privilege: "Registration fee waiver after the 3rd year",
    enabled: true,
  },
  {
    id: "2",
    condition: "Any subsequent child or children enrolled at the same time",
    privilege: "Registration fee waiver (limited to first 100 families)",
    enabled: true,
  },
  {
    id: "3",
    condition: "Child enrolled for Year 3-12 for the academic year",
    privilege: "Registration fee waiver after the 3rd year",
    enabled: true,
  },
]

const createDefaultData = (academicYear: string): DiscountOptionsData => ({
  academicYear,
  siblingDiscounts: defaultSiblingDiscounts,
  latePayment: defaultLatePayment,
  registrationFees: defaultRegistrationFees,
  registrationPrivileges: defaultRegistrationPrivileges,
  waiverAfter3rdYear: {
    enabled: true,
    minimumGradeLevel: 3,
    minimumYears: 3,
    creditAmount: 225000,
    termsToCredit: 3,
    firstChildImmediate: true,
  },
  waiverImmediate: {
    enabled: true,
    creditAmount: 225000,
    termsToCredit: 3,
    limitedFamilies: 100,
  },
})

const loadFromStorage = (): Record<string, DiscountOptionsData> | null => {
  try {
    const stored = localStorage.getItem(DISCOUNT_OPTIONS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Failed to load discount options from localStorage:", error)
  }
  return null
}

const saveToStorage = (data: Record<string, DiscountOptionsData>) => {
  try {
    localStorage.setItem(DISCOUNT_OPTIONS_STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error("Failed to save discount options to localStorage:", error)
  }
}

export function DiscountOptions() {
  const { academicYears } = useAcademicYears()
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [selectedTerm, setSelectedTerm] = useState<string>("")
  const [allData, setAllData] = useState<Record<string, DiscountOptionsData>>(() => {
    return loadFromStorage() || {}
  })
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("sibling")

  const availableYears = academicYears.map(y => y.id).sort((a, b) => b.localeCompare(a))

  // Get terms for selected year
  const selectedYearData = academicYears.find(y => y.id === selectedYear)
  const availableTerms = selectedYearData?.terms || []

  // Create storage key combining year and term
  const storageKey = selectedYear && selectedTerm ? `${selectedYear}_${selectedTerm}` : ""

  // Set default year
  useEffect(() => {
    if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  // Set default term when year changes
  useEffect(() => {
    if (availableTerms.length > 0 && (!selectedTerm || !availableTerms.find(t => t.id === selectedTerm))) {
      setSelectedTerm(availableTerms[0].id)
    }
  }, [availableTerms, selectedTerm, selectedYear])

  // Initialize data for year + term
  useEffect(() => {
    if (storageKey && !allData[storageKey]) {
      setAllData(prev => ({
        ...prev,
        [storageKey]: createDefaultData(selectedYear)
      }))
    }
  }, [storageKey, allData, selectedYear])

  // Save to localStorage
  useEffect(() => {
    if (Object.keys(allData).length > 0) {
      saveToStorage(allData)
    }
  }, [allData])

  const currentData = storageKey ? (allData[storageKey] || createDefaultData(selectedYear)) : createDefaultData(selectedYear)

  const updateCurrentData = (updates: Partial<DiscountOptionsData>) => {
    if (!storageKey) return
    setAllData(prev => ({
      ...prev,
      [storageKey]: { ...currentData, ...updates }
    }))
  }

  const updateSiblingDiscount = (index: number, updates: Partial<SiblingDiscount>) => {
    const newDiscounts = [...currentData.siblingDiscounts]
    newDiscounts[index] = { ...newDiscounts[index], ...updates }
    updateCurrentData({ siblingDiscounts: newDiscounts })
  }

  const updateLatePayment = (updates: Partial<LatePaymentSettings>) => {
    updateCurrentData({ latePayment: { ...currentData.latePayment, ...updates } })
  }

  const updateRegistrationFees = (updates: Partial<RegistrationFeeSettings>) => {
    updateCurrentData({ registrationFees: { ...currentData.registrationFees, ...updates } })
  }

  const updatePrivilege = (index: number, updates: Partial<RegistrationPrivilege>) => {
    const newPrivileges = [...currentData.registrationPrivileges]
    newPrivileges[index] = { ...newPrivileges[index], ...updates }
    updateCurrentData({ registrationPrivileges: newPrivileges })
  }

  const handleSaveAll = () => {
    saveToStorage(allData)
    const termName = availableTerms.find(t => t.id === selectedTerm)?.name || selectedTerm
    toast.success(`Discount options saved for ${selectedYear} - ${termName}`)
    setIsSaveDialogOpen(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Discount Options</h2>
          <p className="text-sm text-muted-foreground">
            Configure sibling discounts, late payment charges, and registration fee privileges
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Academic Year:</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Term:</Label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {availableTerms.map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsSaveDialogOpen(true)} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">King's College International School Bangkok</p>
              <p className="text-sm text-blue-700">
                Fees and Tuition Information - Academic Year {selectedYear} - {availableTerms.find(t => t.id === selectedTerm)?.name || ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sibling" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sibling Discounts
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Registration Fees
          </TabsTrigger>
        </TabsList>

        {/* Sibling Discounts Tab */}
        <TabsContent value="sibling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sibling Discounts
              </CardTitle>
              <CardDescription>
                Siblings in the School at the same time are eligible for a discount on tuition fees.
                In cases that the eldest sibling graduates at the end of Year 13, the younger siblings will maintain their sibling rights.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Enabled</TableHead>
                    <TableHead>Child Order</TableHead>
                    <TableHead className="w-[200px]">Discount Percentage</TableHead>
                    <TableHead className="w-[150px] text-right">Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.siblingDiscounts.map((discount, index) => (
                    <TableRow key={discount.childOrder}>
                      <TableCell>
                        <Switch
                          checked={discount.enabled}
                          onCheckedChange={(checked) => updateSiblingDiscount(index, { enabled: checked })}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{discount.label}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={discount.percentage}
                            onChange={(e) => updateSiblingDiscount(index, { percentage: parseFloat(e.target.value) || 0 })}
                            className="w-24"
                            min={0}
                            max={100}
                            disabled={!discount.enabled}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {discount.percentage > 0 ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {discount.percentage}% off
                          </Badge>
                        ) : (
                          <Badge variant="outline">No discount</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registration Fees Tab */}
        <TabsContent value="fees" className="space-y-6">
          {/* Fee Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Application & Registration Fees
              </CardTitle>
              <CardDescription>Configure initial charges for new applicants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Fee Type</TableHead>
                    <TableHead className="w-[250px]">Amount (THB)</TableHead>
                    <TableHead className="w-[120px]">Refundable</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Application Fee</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentData.registrationFees.applicationFee}
                        onChange={(e) => updateRegistrationFees({ applicationFee: parseFloat(e.target.value) || 0 })}
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">No</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Non-refundable/non-transferable</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Registration Fee</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentData.registrationFees.registrationFee}
                        onChange={(e) => updateRegistrationFees({ registrationFee: parseFloat(e.target.value) || 0 })}
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">No</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Non-refundable/non-transferable</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Security Deposit</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentData.registrationFees.securityDeposit}
                        onChange={(e) => updateRegistrationFees({ securityDeposit: parseFloat(e.target.value) || 0 })}
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-600">Yes</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Refundable upon graduation and withdrawal</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Wait List Fee</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={currentData.registrationFees.waitListFee}
                        onChange={(e) => updateRegistrationFees({ waitListFee: parseFloat(e.target.value) || 0 })}
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Conditional</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Acts as registration fee when place becomes available</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Security Deposit Refund Conditions */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                Security Deposit Refund Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-sm font-bold">1</span>
                  </div>
                  <p className="text-sm text-green-800">Upon the student's graduation (completion of Year 13) from the school</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-sm font-bold">2</span>
                  </div>
                  <p className="text-sm text-green-800">When advance written notice is received at least one full term's notice before the child leaves</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-100">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 text-sm font-bold">3</span>
                  </div>
                  <p className="text-sm text-green-800">When the school requires the applicant's departure for reasons other than disciplinary</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Fee Waiver Program */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Registration Fee Waiver Program</CardTitle>
                    <CardDescription>Configure waiver eligibility and credit distribution</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={currentData.waiverAfter3rdYear.enabled}
                  onCheckedChange={(checked) => updateCurrentData({
                    waiverAfter3rdYear: { ...currentData.waiverAfter3rdYear, enabled: checked }
                  })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Min Grade Level (Year)</Label>
                  <Input
                    type="number"
                    value={currentData.waiverAfter3rdYear.minimumGradeLevel}
                    onChange={(e) => updateCurrentData({
                      waiverAfter3rdYear: { ...currentData.waiverAfter3rdYear, minimumGradeLevel: parseInt(e.target.value) || 3 }
                    })}
                    disabled={!currentData.waiverAfter3rdYear.enabled}
                    min={1}
                    max={13}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Min Years (2nd child+)</Label>
                  <Input
                    type="number"
                    value={currentData.waiverAfter3rdYear.minimumYears}
                    onChange={(e) => updateCurrentData({
                      waiverAfter3rdYear: { ...currentData.waiverAfter3rdYear, minimumYears: parseInt(e.target.value) || 3 }
                    })}
                    disabled={!currentData.waiverAfter3rdYear.enabled}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Credit Amount (THB)</Label>
                  <Input
                    type="number"
                    value={currentData.waiverAfter3rdYear.creditAmount}
                    onChange={(e) => updateCurrentData({
                      waiverAfter3rdYear: { ...currentData.waiverAfter3rdYear, creditAmount: parseFloat(e.target.value) || 0 }
                    })}
                    disabled={!currentData.waiverAfter3rdYear.enabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Terms to Credit</Label>
                  <Input
                    type="number"
                    value={currentData.waiverAfter3rdYear.termsToCredit}
                    onChange={(e) => updateCurrentData({
                      waiverAfter3rdYear: { ...currentData.waiverAfter3rdYear, termsToCredit: parseInt(e.target.value) || 3 }
                    })}
                    disabled={!currentData.waiverAfter3rdYear.enabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div>
                  <Label className="text-sm font-medium text-purple-900">First Child Gets Privilege Immediately</Label>
                  <p className="text-sm text-purple-700 mt-1">Skip minimum years requirement for first child</p>
                </div>
                <Switch
                  checked={currentData.waiverAfter3rdYear.firstChildImmediate}
                  onCheckedChange={(checked) => updateCurrentData({
                    waiverAfter3rdYear: { ...currentData.waiverAfter3rdYear, firstChildImmediate: checked }
                  })}
                  disabled={!currentData.waiverAfter3rdYear.enabled}
                />
              </div>

              {/* Eligibility Summary */}
              {currentData.waiverAfter3rdYear.enabled && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h5 className="text-sm font-medium mb-3">Eligibility Summary</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>Year {currentData.waiverAfter3rdYear.minimumGradeLevel}+ students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>1st child: {currentData.waiverAfter3rdYear.firstChildImmediate ? "Immediate" : `After ${currentData.waiverAfter3rdYear.minimumYears} years`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>2nd child+: After {currentData.waiverAfter3rdYear.minimumYears} years</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>Credit: {formatCurrency(currentData.waiverAfter3rdYear.creditAmount)}/{currentData.waiverAfter3rdYear.termsToCredit} terms</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Save Confirmation Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save Changes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to save all discount options for academic year {selectedYear} - {availableTerms.find(t => t.id === selectedTerm)?.name || ""}?
            </p>
            <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
              <p className="text-sm">
                <span className="font-medium">Sibling Discounts:</span>{" "}
                {currentData.siblingDiscounts.filter(d => d.enabled && d.percentage > 0).length} configured
              </p>
              <p className="text-sm">
                <span className="font-medium">Late Payment:</span>{" "}
                {currentData.latePayment.enabled ? `${currentData.latePayment.chargePercentage}% per ${currentData.latePayment.chargeFrequency === "monthly" ? "month" : "week"}` : "Disabled"}
              </p>
              <p className="text-sm">
                <span className="font-medium">Total Initial Fees:</span>{" "}
                {formatCurrency(
                  currentData.registrationFees.applicationFee +
                  currentData.registrationFees.registrationFee +
                  currentData.registrationFees.securityDeposit
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAll}>
              Confirm Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
