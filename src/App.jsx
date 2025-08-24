import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import MainLayout from './pages/components/Layout'
import packageJson from '../package.json';
import NotFound from './pages/404';
import PublicRoute from './PublicRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PrivateRoute from './PrivateRoute';
import { io } from 'socket.io-client';
import { getStorageData, logout, startSessionChecker } from './pages/apis/api';
import Swal from 'sweetalert2';
import Retur from './pages/Retur';
import Transaction from './pages/Transaction';

export const socket = io("https://nss.sayoernara.com", {
  withCredentials: false,
  autoConnect: false,
});

function App() {
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    document.title = `Sayoernara | Cashier ${packageJson.version}`;
  }, []);

  useEffect(() => {
  const { decryptuname } = getStorageData();

  if (decryptuname) {
    startSessionChecker(async () => {
      await logout();
      Swal.fire({
        title: 'Session Expired',
        icon: 'warning',
        text: "Session expired, silakan login lagi.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
        }
      });
    });
  }
}, []);


  return (
    <Router>
      {redirect && <Navigate to="/" replace />}
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/retur" element={<PrivateRoute><Retur /></PrivateRoute>} />
          <Route path="/transaksi" element={<PrivateRoute><Transaction /></PrivateRoute>} />
        </Route>
        <Route path='*' element={<NotFound />}></Route>
        <Route path='/404' element={<NotFound />}></Route>
      </Routes>
    </Router>
  );
}

export default App;