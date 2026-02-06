import { usePersistedState } from "./usePersistedState"

export interface PaginationState {
  currentPage: number
  pageSize: number
}

export function usePersistedPagination(
  componentKey: string,
  defaultPage: number = 1,
  defaultPageSize: number = 10
) {
  const [state, setState, clearState] = usePersistedState<PaginationState>(
    `${componentKey}:pagination`,
    { currentPage: defaultPage, pageSize: defaultPageSize }
  )

  const setCurrentPage = (page: number) => {
    setState({ ...state, currentPage: page })
  }

  const setPageSize = (size: number) => {
    setState({ currentPage: 1, pageSize: size }) // Reset to page 1 when changing page size
  }

  const setPagination = (page: number, size: number) => {
    setState({ currentPage: page, pageSize: size })
  }

  return {
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    setCurrentPage,
    setPageSize,
    setPagination,
    clearPagination: clearState
  }
}
