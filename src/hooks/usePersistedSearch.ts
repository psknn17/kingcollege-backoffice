import { usePersistedState } from "./usePersistedState"

export interface SearchState {
  searchTerm: string
}

export function usePersistedSearch(componentKey: string, defaultSearchTerm: string = "") {
  const [state, setState, clearState] = usePersistedState<SearchState>(
    `${componentKey}:search`,
    { searchTerm: defaultSearchTerm }
  )

  const setSearchTerm = (searchTerm: string) => {
    setState({ searchTerm })
  }

  return {
    searchTerm: state.searchTerm,
    setSearchTerm,
    clearSearch: clearState
  }
}
