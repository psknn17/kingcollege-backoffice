import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { CalendarIcon, Save, Plus, Trash2, GraduationCap, ChevronDown, CheckCircle2, X } from "lucide-react"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
import { cn } from "./ui/utils"
import { toast } from "@/components/ui/sonner"
import { Badge } from "./ui/badge"
import { useAcademicYears, Term, AcademicYear } from "@/contexts/AcademicYearContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAuth } from "@/contexts/AuthContext"
import { canPerformActions } from "@/utils/rolePermissions"
import { formatAcademicYear } from "@/utils/xlsxUtils"
import { usePersistedState } from "@/hooks/usePersistedState"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useConfirmDialog } from "@/hooks/useConfirmDialog"
import { ColumnPresets } from "@/utils/tableAlignment"

export function TuitionTermSettings() {
  const { academicYears, setAcademicYears, deleteAcademicYear: deleteYear, saveAcademicYears } = useAcademicYears()
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const userCanEdit = canPerformActions(user?.role)
  const confirmDialog = useConfirmDialog()
  const deleteDialog = useConfirmDialog()
  const locale = language === "th" ? th : enUS
  const [expandedYears, setExpandedYears] = usePersistedState<string[]>("tuition-term-settings:expandedYears", ["2025/2026"])
  const [isAddYearDialogOpen, setIsAddYearDialogOpen] = useState(false)

  // Helper function to deep clone academic year with proper Date objects
  const cloneAcademicYear = (year: AcademicYear): AcademicYear => {
    return {
      ...year,
      terms: year.terms.map(term => ({
        ...term,
        startDate: term.startDate ? new Date(term.startDate) : null,
        endDate: term.endDate ? new Date(term.endDate) : null,
        paymentDeadline: term.paymentDeadline ? new Date(term.paymentDeadline) : null
      }))
    }
  }

  // Local state for editing - changes only saved when user clicks Save
  // Initialize with academicYears immediately to prevent white screen
  const [editedYears, setEditedYears] = useState<Record<string, AcademicYear>>(() => {
    const initial: Record<string, AcademicYear> = {}
    academicYears.forEach(year => {
      initial[year.id] = cloneAcademicYear(year)
    })
    return initial
  })

  // Update edited years when academicYears changes
  useEffect(() => {
    const initial: Record<string, AcademicYear> = {}
    academicYears.forEach(year => {
      initial[year.id] = cloneAcademicYear(year)
    })
    setEditedYears(initial)
  }, [academicYears])

  // Calculate next valid year (must be consecutive)
  const getNextValidYear = (): number => {
    if (academicYears.length === 0) {
      return new Date().getFullYear()
    }
    // Get the latest year's end year (supports both "2025/2026" and "2025-2026" formats)
    const latestYear = academicYears.sort((a, b) => b.id.localeCompare(a.id))[0]
    const endYear = parseInt(latestYear.id.split(/[-/]/)[1])
    return endYear
  }

  const [newYearStart, setNewYearStart] = useState<string>("")

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
    const yearId = `${startYear}/${endYear}`

    // Check if year already exists
    if (academicYears.find(y => y.id === yearId)) {
      toast.error(t("termSettings.yearAlreadyExists"))
      return
    }

    // Validate consecutive year
    const nextValidYear = getNextValidYear()
    if (startYear !== nextValidYear) {
      toast.error(`${t("termSettings.mustCreateConsecutive")} ${nextValidYear}-${nextValidYear + 1}`)
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

    // Also add to editedYears
    setEditedYears(prev => ({
      ...prev,
      [yearId]: cloneAcademicYear(newYear)
    }))

    setExpandedYears(prev => [...prev, yearId])
    setIsAddYearDialogOpen(false)
    setNewYearStart("")

    // Save immediately after creating new year
    setTimeout(() => {
      saveAcademicYears()
    }, 100)

    toast.success(`${t("termSettings.academicYear")} ${formatAcademicYear(yearId)} ${t("termSettings.yearCreated")}`)
  }

  const deleteAcademicYear = (yearId: string) => {
    if (academicYears.length <= 1) return
    deleteDialog.confirm(() => {
      deleteYear(yearId)

      // Also remove from editedYears
      setEditedYears(prev => {
        const newEdited = { ...prev }
        delete newEdited[yearId]
        return newEdited
      })

      setExpandedYears(prev => prev.filter(id => id !== yearId))
      toast.success(t("termSettings.yearDeleted"))
    })
  }

  const updateTermsForYear = (yearId: string, newTerms: Term[]) => {
    // Update local state only - not context
    setEditedYears(prev => {
      if (!prev[yearId]) return prev // Safety check
      return {
        ...prev,
        [yearId]: { ...prev[yearId], terms: newTerms }
      }
    })
  }

  const MAX_TERMS_PER_YEAR = 3

  const addNewTerm = (yearId: string) => {
    const year = editedYears[yearId]
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
    // Use edited year instead of academicYears
    const year = editedYears[yearId]
    if (!year) return

    const currentTerm = year.terms.find(t => t.id === termId)
    if (!currentTerm) return

    if (field === 'startDate' || field === 'endDate') {
      const newStart = field === 'startDate' ? value : currentTerm.startDate
      const newEnd = field === 'endDate' ? value : currentTerm.endDate

      if (newStart && newEnd) {
        if (newStart > newEnd) {
          toast.error(t("termSettings.invalidDateRange"), {
            description: t("termSettings.startBeforeEnd")
          })
          return
        }

        const overlappingTerms = getOverlappingTerms(year.terms, termId, newStart, newEnd)
        if (overlappingTerms.length > 0) {
          toast.error(t("termSettings.dateOverlap"), {
            description: `${t("termSettings.overlapsWith")} ${overlappingTerms.join(", ")}`
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
    const year = editedYears[yearId]
    if (!year) return
    deleteDialog.confirm(() => {
      updateTermsForYear(yearId, year.terms.filter(term => term.id !== termId))
      toast.success(t("termSettings.termDeleted"))
    })
  }

  const handleSaveYear = (yearId: string) => {
    // Update context with edited changes, then save to localStorage
    const editedYear = editedYears[yearId]
    if (!editedYear) return

    const updatedYears = academicYears.map(y =>
      y.id === yearId ? editedYear : y
    )
    setAcademicYears(updatedYears)

    // Save to localStorage after a brief delay to ensure state is updated
    setTimeout(() => {
      saveAcademicYears()
      toast.success(t("termSettings.changesSaved"))
    }, 100)
  }

  const handleSaveYearClick = (yearId: string) => {
    confirmDialog.confirm(() => {
      handleSaveYear(yearId)
    })
  }

  const handleDiscardChanges = (yearId: string) => {
    // Reset edited year to original from context
    const originalYear = academicYears.find(y => y.id === yearId)
    if (originalYear) {
      setEditedYears(prev => ({
        ...prev,
        [yearId]: cloneAcademicYear(originalYear)
      }))
      toast.success(t("termSettings.changesDiscarded") || "Changes discarded")
    }
  }

  const hasUnsavedChanges = (yearId: string): boolean => {
    const original = academicYears.find(y => y.id === yearId)
    const edited = editedYears[yearId]
    if (!original || !edited) return false
    return JSON.stringify(original) !== JSON.stringify(edited)
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
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("termSettings.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("termSettings.subtitle")}
          </p>
        </div>
        <Button onClick={() => setIsAddYearDialogOpen(true)} disabled={!userCanEdit}>
          <Plus className="w-4 h-4 mr-2" />
          {t("termSettings.addAcademicYear")}
        </Button>
      </div>

      {/* Academic Years List */}
      <div className="space-y-4">
        {academicYears.map((year) => {
          const editedYear = editedYears[year.id] || year
          const { allComplete, termCount } = getYearStatus(editedYear)
          const isExpanded = expandedYears.includes(year.id)
          const hasChanges = hasUnsavedChanges(year.id)

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
                          <CardTitle className="text-lg text-black">{t("termSettings.academicYear")} {formatAcademicYear(year.name)}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">{termCount} {t("termSettings.terms")}</span>
                            <Badge variant={allComplete ? "default" : "secondary"} className={cn(
                              "text-xs",
                              allComplete ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700"
                            )}>
                              {allComplete ? t("termSettings.complete") : t("termSettings.incomplete")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-8 px-3"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSaveYearClick(year.id)
                          }}
                          disabled={!userCanEdit}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        {academicYears.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAcademicYear(year.id)
                            }}
                            disabled={!userCanEdit}
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
                            {/* Term Name - text column */}
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[200px]">{t("termSettings.termName")}</th>
                            {/* Start Date - date column */}
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">{t("termSettings.startDate")}</th>
                            {/* End Date - date column */}
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">{t("termSettings.endDate")}</th>
                            {/* Duration - text column */}
                            <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[100px]">{t("termSettings.duration")}</th>
                            {/* Actions - center aligned */}
                            <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3 w-[60px]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {editedYear.terms.map((term) => {
                            const duration = getDuration(term.startDate, term.endDate)
                            const isComplete = term.startDate && term.endDate

                            return (
                              <tr key={term.id} className="hover:bg-gray-50">
                                {/* Term Name - text column */}
                                <td className="text-left px-4 py-3">
                                  <span className="text-sm font-medium text-black">{term.name}</span>
                                </td>
                                {/* Start Date - date column */}
                                <td className="text-left px-4 py-3">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 px-2 text-sm font-normal justify-start hover:bg-gray-100"
                                        disabled={!userCanEdit}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        <span className="text-black">
                                          {term.startDate ? format(term.startDate, "MMM d, yyyy", { locale }) : t("termSettings.selectDate")}
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
                                {/* End Date - date column */}
                                <td className="text-left px-4 py-3">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="h-8 px-2 text-sm font-normal justify-start hover:bg-gray-100"
                                        disabled={!userCanEdit}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        <span className="text-black">
                                          {term.endDate ? format(term.endDate, "MMM d, yyyy", { locale }) : t("termSettings.selectDate")}
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
                                {/* Duration - text column */}
                                <td className="text-left px-4 py-3">
                                  <span className="text-sm text-gray-600">
                                    {duration ? `${duration} ${t("termSettings.days")}` : "-"}
                                  </span>
                                </td>
                                {/* Actions - center aligned */}
                                <td className="text-center px-4 py-3">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => deleteTerm(year.id, term.id)}
                                    disabled={!userCanEdit}
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
                    {editedYear.terms.length < MAX_TERMS_PER_YEAR && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-dashed text-gray-500 hover:text-gray-700"
                        onClick={() => addNewTerm(year.id)}
                        disabled={!userCanEdit}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t("termSettings.addTerm")}
                      </Button>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      {/* Add Academic Year Dialog */}
      <Dialog open={isAddYearDialogOpen} onOpenChange={(open) => {
        setIsAddYearDialogOpen(open)
        if (!open) setNewYearStart("")
      }}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t("termSettings.addNewAcademicYear")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="startYear">{t("termSettings.startingYear")}</Label>
            <Input
              id="startYear"
              type="number"
              placeholder="e.g., 2026"
              value={newYearStart}
              onChange={(e) => setNewYearStart(e.target.value)}
              min="2020"
              max="2050"
              className={cn("mt-2", newYearStart && parseInt(newYearStart) !== getNextValidYear() && "border-red-500 focus-visible:ring-red-500")}
              disabled={!userCanEdit}
            />
            {newYearStart && parseInt(newYearStart) !== getNextValidYear() && (
              <p className="text-sm text-red-500 mt-2">
                {t("termSettings.mustCreateConsecutive")} {getNextValidYear()}-{getNextValidYear() + 1}
              </p>
            )}
            {(!newYearStart || parseInt(newYearStart) === getNextValidYear()) && (
              <p className="text-sm text-gray-500 mt-2">
                {t("termSettings.willCreateYear")} {newYearStart ? `${newYearStart}/${parseInt(newYearStart) + 1}` : "YYYY/YYYY"} {t("termSettings.withDefaultTerms")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddYearDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={addNewAcademicYear}
              disabled={!userCanEdit || !newYearStart || parseInt(newYearStart) !== getNextValidYear()}
            >
              {t("termSettings.createYear")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        onConfirm={confirmDialog.handleConfirm}
        titleKey="confirmDialog.saveTitle"
        descriptionKey="confirmDialog.saveDescription"
      />
      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.setIsOpen}
        onConfirm={deleteDialog.handleConfirm}
        titleKey="confirmDialog.deleteTitle"
        descriptionKey="confirmDialog.deleteDescription"
      />
    </div>
  )
}
