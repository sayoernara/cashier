import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from './useAuth';
import PropTypes from 'prop-types';
import { logout as apiLogout } from './pages/apis/api';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth(); 
  const location = useLocation();
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      (async () => {
        try {
          await apiLogout();
        } catch (error) {
          console.error("Gagal logout:", error);
        } finally {
          setRedirect(true);
        }
      })();
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (redirect) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return isAuthenticated ? children : null;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;
