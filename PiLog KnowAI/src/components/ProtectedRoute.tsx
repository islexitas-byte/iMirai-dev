import { Navigate, useLocation } from "react-router-dom";
import type { LoginUser } from "../pages/LoginPage";

interface ProtectedRouteProps {
  user: LoginUser | null;
  children: React.ReactNode;
}

export default function ProtectedRoute({ user, children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!user) {
    // Redirect to login but save the attempted location
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}