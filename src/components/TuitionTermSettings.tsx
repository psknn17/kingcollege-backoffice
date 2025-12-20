import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { CalendarIcon, Save, Plus, Trash2, GraduationCap, ChevronDown, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { cn } from "./ui/utils"
import { toast } from "sonner"
import { Badge } from "./ui/badge"
import { useAcademicYears, Term, AcademicYear } from "@/contexts/AcademicYearContext"

export function TuitionTermSettings() {
  const { academicYears, setAcademicYears, deleteAcademicYear: deleteYear } = useAcademicYears()
  const [expandedYears, setExpandedYears] = useState<string[]>(["2025-2026"])
  const [isAddYearDialogOpen, setIsAddYearDialogOpen] = useState(false)
  const [isSaveConfirmDialogOpen, setIsSaveConfirmDialogOpen] = useState(false)
  const [newYearStart, setNewYearStart] = useState<string>(new Date().getFullYear().toString())

  const toggleYearExpanded = (yearId: string) => {
    setExpandedYears(prev =>
      prev.includes(yearId)
        ? prev.filter(id => id !== yearId)
        : [...prev, yearId]
    )
  }

  const addNewAcademicYear = () => {
    if (!newYearStart) return

    const startYear = parseInt(newYearStart)
    const endYear = startYear + 1
    const yearId = `${startYear}-${endYear}`

    if (academicYears.find(y => y.id === yearId)) {
      return
    }

    const newYear: AcademicYear = {
      id: yearId,
      name: yearId,
      terms: [
        {
          id: "1",
          name: "Term 1",
          startDate: new Date(`${startYear}-08-15`),
          endDate: new Date(`${startYear}-12-20`),
          paymentDeadline: null
        },
        {
          id: "2",
          name: "Term 2",
          startDate: new Date(`${endYear}-01-08`),
          endDate: new Date(`${endYear}-03-20`),
          paymentDeadline: null
        },
        {
          id: "3",
          name: "Term 3",
          startDate: new Date(`${endYear}-04-01`),
          endDate: new Date(`${endYear}-06-15`),
          paymentDeadline: null
        }
      ]
    }

    const updatedYears = [...academicYears, newYear].sort((a, b) => b.id.localeCompare(a.id))
    setAcademicYears(updatedYears)
    setExpandedYears(prev => [...prev, yearId])
    setIsAddYearDialogOpen(false)
    setNewYearStart("")
    toast.success(`Academic Year ${yearId} created`)
  }

  const deleteAcademicYear = (yearId: string) => {
    if (academicYears.length <= 1) return
    deleteYear(yearId)
    setExpandedYears(prev => prev.filter(id => id !== yearId))
    toast.success("Academic year deleted")
  }

  const updateTermsForYear = (yearId: string, newTerms: Term[]) => {
    setAcademicYears(academicYears.map(y =>
      y.id === yearId ? { ...y, terms: newTerms } : y
    ))
  }

  const MAX_TERMS_PER_YEAR = 3

  const addNewTerm = (yearId: string) => {
    const year = academicYears.find(y => y.id === yearId)
    if (!year || year.terms.length >= MAX_TERMS_PER_YEAR) return

    const newTerm: Term = {
      id: Date.now().toString(),
      name: `Term ${year.terms.length + 1}`,
      startDate: null,
      endDate: null,
      paymentDeadline: null
    }
    updateTermsForYear(yearId, [...year.terms, newTerm])
  }

  const checkDateOverlap = (
    start1: Date | null,
    end1: Date | null,
    start2: Date | null,
    end2: Date | null
  ): boolean => {
    if (!start1 || !end1 || !start2 || !end2) return false
    return start1 <= end2 && end1 >= start2
  }

  const getOverlappingTerms = (terms: Term[], currentTermId: string, newStart: Date | null, newEnd: Date | null): string[] => {
    const overlappingTerms: string[] = []
    for (const term of terms) {
      if (term.id === currentTermId) continue
      if (checkDateOverlap(newStart, newEnd, term.startDate, term.endDate)) {
        overlappingTerms.push(term.name)
      }
    }
    return overlappingTerms
  }

  const updateTerm = (yearId: string, termId: string, field: keyof Term, value: any) => {
    const year = academicYears.find(y => y.id === yearId)
    if (!year) return

    const currentTerm = year.terms.find(t => t.id === termId)
    if (!currentTerm) return

    if (field === 'startDate' || field === 'endDate') {
      const newStart = field === 'startDate' ? value : currentTerm.startDate
      const newEnd = field === 'endDate' ? value : currentTerm.endDate

      if (newStart && newEnd) {
        if (newStart > newEnd) {
          toast.error("Invalid date range", {
            description: "Start date must be before end date"
          })
          return
        }

        const overlappingTerms = getOverlappingTerms(year.terms, termId, newStart, newEnd)
        if (overlappingTerms.length > 0) {
          toast.error("Date overlap detected", {
            description: `This date range overlaps with: ${overlappingTerms.join(", ")}`
          })
          return
        }
      }
    }

    const newTerms = year.terms.map(term =>
      term.id === termId ? { ...term, [field]: value } : term
    )
    updateTermsForYear(yearId, newTerms)
  }

  const deleteTerm = (yearId: string, termId: string) => {
    const year = academicYears.find(y => y.id === yearId)
    if (!year) return
    updateTermsForYear(yearId, year.terms.filter(term => term.id !== termId))
    toast.success("Term deleted")
  }

  const handleSaveAllChanges = () => {
    console.log("Saving all changes", academicYears)
    setIsSaveConfirmDialogOpen(false)
    toast.success("All changes saved successfully")
  }

  const getYearStatus = (year: AcademicYear) => {
    const allComplete = year.terms.every(t => t.startDate && t.endDate)
    const termCount = year.terms.length
    return { allComplete, termCount }
  }

  const getDuration = (startDate: Date | null, endDate: Date | null) => {
    if (!startDate || !endDate) return null
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-black">Term Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure semester start and end dates for each academic year
          </p>
        </div>
        <Button onClick={() => setIsAddYearDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Academic Year
        </Button>
      </div>

      {/* Academic Years List */}
      <div className="space-y-4">
        {academicYears.map((year) => {
          const { allComplete, termCount } = getYearStatus(year)
          const isExpanded = expandedYears.includes(year.id)

          return (
            <Collapsible
              key={year.id}
              open={isExpanded}
              onOpenChange={() => toggleYearExpanded(year.id)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-black">Academic Year {year.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">{termCount} terms</span>
                            <Badge variant={allComplete ? "default" : "secondary"} className={cn(
                              "text-xs",
                              allComplete ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700"
                            )}>
                              {allComplete ? "Complete" : "Incomplete"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {academicYears.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAcademicYear(year.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <ChevronDown className={cn(
                          "w-5 h-5 text-gray-400 transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-6">
                    {/* Terms Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[200px]">Term Name</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Start Date</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">End Date</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[100px]">Duration</th>
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[100px]">Status</th>
                            <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[60px]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {year.terms.map((term) => {
                            const duration = getDuration(term.startDate, term.endDate)
                            const isComplete = term.startDate && term.endDate

                            return (
                              <tr key={term.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <Input
                                    value={term.name}
                                    onChange={(e) => updateTerm(year.id, term.id, "name", e.target.value)}
                                    className="border-0 p-0 h-auto text-sm font-medium text-black focus-visible:ring-0 bg-transparent"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 px-2 text-sm font-normal justify-start hover:bg-gray-100"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        <span className="text-black">
                                          {term.startDate ? format(term.startDate, "MMM d, yyyy") : "Select date"}
                                        </span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={term.startDate || undefined}
                                        onSelect={(date) => updateTerm(year.id, term.id, "startDate", date)}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </td>
                                <td className="px-4 py-3">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 px-2 text-sm font-normal justify-start hover:bg-gray-100"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        <span className="text-black">
                                          {term.endDate ? format(term.endDate, "MMM d, yyyy") : "Select date"}
                                        </span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={term.endDate || undefined}
                                        onSelect={(date) => updateTerm(year.id, term.id, "endDate", date)}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-600">
                                    {duration ? `${duration} days` : "-"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {isComplete ? (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span className="text-xs font-medium">Done</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-amber-600 font-medium">Pending</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => deleteTerm(year.id, term.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Term Button */}
                    {year.terms.length < MAX_TERMS_PER_YEAR && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-dashed text-gray-500 hover:text-gray-700"
                        onClick={() => addNewTerm(year.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Term
                      </Button>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      {/* Save All Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={() => setIsSaveConfirmDialogOpen(true)}>
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {/* Add Academic Year Dialog */}
      <Dialog open={isAddYearDialogOpen} onOpenChange={setIsAddYearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Academic Year</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="startYear">Starting Year</Label>
            <Input
              id="startYear"
              type="number"
              placeholder="e.g., 2026"
              value={newYearStart}
              onChange={(e) => setNewYearStart(e.target.value)}
              min="2020"
              max="2050"
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-2">
              This will create academic year {newYearStart ? `${newYearStart}-${parseInt(newYearStart) + 1}` : "YYYY-YYYY"} with 3 default terms.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddYearDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addNewAcademicYear} disabled={!newYearStart}>
              Create Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={isSaveConfirmDialogOpen} onOpenChange={setIsSaveConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save Changes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to save all changes to the term settings? This will update {academicYears.length} academic year(s).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAllChanges}>
              Confirm Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
