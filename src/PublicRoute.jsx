import { Navigate, useLocation } from 'react-router-dom';
import useAuth from './useAuth';

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const previousPath = location.state?.from || "/dashboard";
    return <Navigate to={previousPath} replace />;
  }

  return children;
};

export default PublicRoute;