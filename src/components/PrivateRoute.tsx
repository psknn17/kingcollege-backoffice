import { useAuth } from "@/contexts/AuthContext"
import { Navigate, useLocation } from "react-router-dom"
import { RoleSelection } from "./RoleSelection"

interface PrivateRouteProps {
  children: React.ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, needsRoleSelection, selectRole, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">Initializing session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated && !needsRoleSelection) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (needsRoleSelection) {
    return <RoleSelection onSelectRole={selectRole} />
  }

  return <>{children}</>
}
