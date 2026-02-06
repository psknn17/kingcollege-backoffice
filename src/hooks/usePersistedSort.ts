import { usePersistedState } from "./usePersistedState"

export interface SortState {
  sortColumn: string
  sortDirection: "asc" | "desc"
}

export function usePersistedSort(
  componentKey: string,
  defaultColumn: string = "",
  defaultDirection: "asc" | "desc" = "asc"
) {
  const [state, setState, clearState] = usePersistedState<SortState>(
    `${componentKey}:sort`,
    { sortColumn: defaultColumn, sortDirection: defaultDirection }
  )

  const setSortColumn = (column: string) => {
    // Toggle direction if clicking same column, otherwise default to asc
    const newDirection =
      state.sortColumn === column && state.sortDirection === "asc"
        ? "desc"
        : "asc"
    setState({ sortColumn: column, sortDirection: newDirection })
  }

  const setSortDirection = (direction: "asc" | "desc") => {
    setState({ ...state, sortDirection: direction })
  }

  const setSort = (column: string, direction: "asc" | "desc") => {
    setState({ sortColumn: column, sortDirection: direction })
  }

  return {
    sortColumn: state.sortColumn,
    sortDirection: state.sortDirection,
    setSortColumn,
    setSortDirection,
    setSort,
    clearSort: clearState
  }
}
