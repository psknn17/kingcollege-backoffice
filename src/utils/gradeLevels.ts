export interface GradeLevel {
    id: string
    label: string
    order: number
}

export const GRADE_LEVELS: GradeLevel[] = [
    { id: "pre-nursery", label: "Pre-Nursery", order: 1 },
    { id: "nursery", label: "Nursery", order: 2 },
    { id: "reception", label: "Reception", order: 3 },
    { id: "year1", label: "Year 1", order: 4 },
    { id: "year2", label: "Year 2", order: 5 },
    { id: "year3", label: "Year 3", order: 6 },
    { id: "year4", label: "Year 4", order: 7 },
    { id: "year5", label: "Year 5", order: 8 },
    { id: "year6", label: "Year 6", order: 9 },
    { id: "year7", label: "Year 7", order: 10 },
    { id: "year8", label: "Year 8", order: 11 },
    { id: "year9", label: "Year 9", order: 12 },
    { id: "year10", label: "Year 10", order: 13 },
    { id: "year11", label: "Year 11", order: 14 },
    { id: "year12", label: "Year 12", order: 15 },
    { id: "year13", label: "Year 13", order: 16 },
]

export const getSortedYearGroups = (availableGroups: string[]): string[] => {
    const validLabels = new Set(GRADE_LEVELS.map(g => g.label.toLowerCase()))

    // Filter out groups that don't match our official labels (case-insensitive)
    const filteredGroups = availableGroups.filter(group => {
        if (group === "All") return true
        return validLabels.has(group.toLowerCase())
    })

    const orderMap = new Map(GRADE_LEVELS.map(g => [g.label.toLowerCase(), g.order]))

    return [...filteredGroups].sort((a, b) => {
        if (a === "All") return -1
        if (b === "All") return 1

        const orderA = orderMap.get(a.toLowerCase()) || 999
        const orderB = orderMap.get(b.toLowerCase()) || 999

        return orderA - orderB
    })
}
