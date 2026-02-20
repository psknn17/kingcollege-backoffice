import { useAuth } from "@/contexts/AuthContext"
import { Navigate, useLocation } from "react-router-dom"
import { RoleSelection } from "./RoleSelection"

interface PrivateRouteProps {
  children: React.ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, needsRoleSelection, selectRole } = useAuth()
  const location = useLocation()

  if (!isAuthenticated && !needsRoleSelection) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (needsRoleSelection) {
    return <RoleSelection onSelectRole={selectRole} />
  }

  return <>{children}</>
}
