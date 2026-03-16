export const gradeLevels = [
  { id: "pre-nursery", label: "Pre-Nursery" },
  { id: "nursery", label: "Nursery" },
  { id: "reception", label: "Reception" },
  { id: "year1", label: "Year 1" },
  { id: "year2", label: "Year 2" },
  { id: "year3", label: "Year 3" },
  { id: "year4", label: "Year 4" },
  { id: "year5", label: "Year 5" },
  { id: "year6", label: "Year 6" },
  { id: "year7", label: "Year 7" },
  { id: "year8", label: "Year 8" },
  { id: "year9", label: "Year 9" },
  { id: "year10", label: "Year 10" },
  { id: "year11", label: "Year 11" },
  { id: "year12", label: "Year 12" },
  { id: "year13", label: "Year 13" },
]

export const gradeProgressionMap: Record<string, string> = {
  "prenursery": "nursery",
  "nursery": "reception",
  "reception": "year1",
  "year1": "year2",
  "year2": "year3",
  "year3": "year4",
  "year4": "year5",
  "year5": "year6",
  "year6": "year7",
  "year7": "year8",
  "year8": "year9",
  "year9": "year10",
  "year10": "year11",
  "year11": "year12",
  "year12": "year13",
  "year13": "graduated"
}

export const getGradeLabel = (gradeId: string) => {
  return gradeLevels.find(g => g.id === gradeId)?.label || gradeId
}

export const getNextGrade = (currentGrade: string): string | null => {
  const normalizedGrade = currentGrade.toLowerCase().replace(/\s+/g, "")
  return gradeProgressionMap[normalizedGrade] || null
}
