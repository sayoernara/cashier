import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import MainLayout from './pages/components/Layout'
import packageJson  from '../package.json';
import NotFound from './pages/404';
import PublicRoute from './PublicRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PrivateRoute from './PrivateRoute';

function App() {
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    document.title = `Sayoernara | Cashier ${packageJson.version}`;
  }, []);
 
  return (
      <Router>
        {redirect && <Navigate to="/" replace />}
        <Routes>
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          </Route>
          <Route path='*' element={<NotFound />}></Route>
          <Route path='/404' element={<NotFound />}></Route>
        </Routes>
      </Router>
  );
}

export default App;