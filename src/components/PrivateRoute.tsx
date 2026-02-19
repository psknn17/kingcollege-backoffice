import { useAuth } from "@/contexts/AuthContext"
import { Login } from "./Login"
import { RoleSelection } from "./RoleSelection"

interface PrivateRouteProps {
  children: React.ReactNode
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, needsRoleSelection, selectRole } = useAuth()

  if (!isAuthenticated && !needsRoleSelection) {
    return <Login />
  }

  if (needsRoleSelection) {
    return <RoleSelection onSelectRole={selectRole} />
  }

  return <>{children}</>
}
