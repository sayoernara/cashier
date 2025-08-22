import React, { useCallback, useEffect, useState } from 'react';
import './LayoutStyle.css'
import { IoMdLogOut } from 'react-icons/io';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { getGoodsList, getStorageData, logout } from '../apis/api';
import { GoodsContext } from './GoodsContext';
import { Card } from 'react-bootstrap';

function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rname = getStorageData().decryptrname;
  const loc = getStorageData().decryptloc;
  const navigate = useNavigate();
  const location = useLocation();

  const [loadingGoods, setLoadingGoods] = useState(false);
  const [errorLoadingGoods, setErrorLoadingGoods] = useState(null);
  const [goodsList, setGoodsList] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);

  const fetchGoods = useCallback(async () => {
    try {
      setLoadingGoods(true);
      const result = await getGoodsList();
      setGoodsList(result.data.goods[0]);
    } catch (err) {
      setErrorLoadingGoods(err.message);
    } finally {
      setLoadingGoods(false);
    }
  }, []);

  useEffect(() => {
    fetchGoods();
  }, [fetchGoods]);

  const groupedGoods = goodsList.reduce((acc, item) => {
    if (!acc[item.comodity]) {
      acc[item.comodity] = [];
    }
    acc[item.comodity].push(item);
    return acc;
  }, {});

  const alphabet = Array.from(
    new Set(Object.keys(groupedGoods).map(c => c[0].toUpperCase()))
  ).sort();

  React.useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  const handleLogoutClick = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, logout!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await logout();
      } catch (error) {
        console.error("Logout API error:", error);
      }

      Cookies.remove('uname');
      Cookies.remove('divAcc');
      Cookies.remove('rname');
      Cookies.remove('idloc');
      Cookies.remove('loc');
      navigate('/', { replace: true });
    }
  };

  return (
    <GoodsContext.Provider
      value={{ goodsList, groupedGoods, alphabet, selectedLetter, setSelectedLetter, loadingGoods, errorLoadingGoods }}
    >
    <div className="d-flex flex-column min-vh-100">
      {/* Navbar atas */}
      <nav
        className="navbar navbar-expand-lg shadow-sm flex items-center justify-between bg-blue-600 text-white px-4 py-2"
        style={{
          backgroundColor: 'white',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid #eaeaea',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}
      >
        <div className="container-fluid d-flex align-items-center">
          {/* Brand */}
          <NavLink
            to="/dashboard"
            className="navbar-brand fw-bold text-primary"
            style={{ letterSpacing: '1px' }}
          >
            Sayoernara | {rname} ({loc})
          </NavLink>

          <div className="flex-1 flex justify-center space-x-2 d-flex flex-wrap gap-1 ">
            {alphabet.map((letter) => (
              <Card
                key={letter}
                className={`p-2 text-center shadow-sm border ${selectedLetter === letter ? "bg-primary text-white" : ""
                  }`}
                style={{
                  width: "40px",
                  height: "40hv",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setSelectedLetter(selectedLetter === letter ? null : letter)
                }
              >
                {letter}
              </Card>
            ))}
          </div>

          {/* Logout */}
          <ul className="navbar-nav ms-auto align-items-lg-center mt-3 mt-lg-0">
            <li className="nav-item">
              <Link
                className="nav-link text-danger fw-semibold d-flex align-items-center gap-1"
                onClick={handleLogoutClick}
                style={{ cursor: 'pointer' }}
              >
                <IoMdLogOut size={20} /> 
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Konten utama */}
            <main
        className="flex-grow-1 p-0"
        style={{
          backgroundColor: '#f4f6f8',
          minHeight: 'calc(100vh - 70px)',
          paddingBottom: '70px' // tingginya kira-kira sama dengan footer
        }}
      >
        <Outlet />
      </main>


      {/* Footer menu */}
            {/* Footer menu - Fixed */}
      <footer
        className="shadow-sm"
        style={{
          backgroundColor: 'white',
          borderTop: '1px solid #eaeaea',
          padding: '0.75rem 1.5rem',
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          zIndex: 1000
        }}
      >
        <div className="d-flex justify-content-center gap-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`
            }
          >
            Regular
          </NavLink>
          <NavLink
            to="/retur"
            className={({ isActive }) =>
              `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`
            }
          >
            Retur
          </NavLink>
          <NavLink
            to="/transaksi"
            className={({ isActive }) =>
              `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`
            }
          >
            Transaksi
          </NavLink>
        </div>
      </footer>

    </div>
    </GoodsContext.Provider>
  );
}

export default MainLayout;
