import { useNavigate, useLocation } from "react-router-dom"
import { useCallback } from "react"

export function useAppNavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  // Same API as old navigateToSubPage()
  const navigateToSubPage = useCallback(
    (subPage: string, params?: any) => {
      navigate(`/${subPage}`, {
        state: { params, fromPath: location.pathname }
      })
    },
    [navigate, location.pathname]
  )

  // Same API as old navigateBack()
  const navigateBack = useCallback(() => {
    const state = location.state as { fromPath?: string } | null
    if (state?.fromPath) {
      navigate(state.fromPath)
    } else {
      navigate(-1)
    }
  }, [navigate, location.state])

  // For sidebar/menu clicks — no fromPath tracking
  const handleMenuItemClick = useCallback(
    (itemId: string) => {
      navigate(`/${itemId}`)
    },
    [navigate]
  )

  // activeSection derived from URL (replaces useState)
  const activeSection = location.pathname.replace(/^\//, "") || "tuition-dashboard"

  // subPageParams from location.state (replaces useState)
  const subPageParams = (location.state as any)?.params ?? null

  // isSubPage: navigated here via navigateToSubPage (has fromPath in state)
  const isSubPage = !!(location.state as any)?.fromPath

  return {
    navigateToSubPage,
    navigateBack,
    handleMenuItemClick,
    activeSection,
    isSubPage,
    subPageParams,
  }
}
