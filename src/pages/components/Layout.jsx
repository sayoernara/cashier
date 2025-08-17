import React, { useState } from 'react';
import './LayoutStyle.css'
import { IoMdLogOut } from 'react-icons/io';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { getStorageData, logout } from '../apis/api';

function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rname = getStorageData().decryptrname;
  const channel = new BroadcastChannel("auth_channel");
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleSettings = () => {
    setSettingsOpen(!settingsOpen);
  };

  const location = useLocation();


  React.useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    `list-group-item list-group-item-action py-2 ${isActive ? 'active' : ''}`;

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
      navigate('/', { replace: true });
    }
  };

  return (
    <div>
      <nav
        className="navbar navbar-expand-lg shadow-sm"
        style={{
          backgroundColor: 'white',
          padding: '0.75rem 0.5rem',
          borderBottom: '1px solid #eaeaea',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}
      >
        <div className="container-fluid">
          <NavLink
            to="/dashboard"
            className="navbar-brand fw-bold text-primary"
            style={{ letterSpacing: '1px' }}
          >
            Sayoernara | {rname}
          </NavLink>

          {/* Navbar Content */}
          <div className="collapse navbar-collapse" id="navbarContent">
            <ul className="navbar-nav ms-auto align-items-lg-center mt-3 mt-lg-0">
              <li className="nav-item">
                <Link
                  className="nav-link text-danger fw-semibold d-flex align-items-center gap-1"
                  onClick={handleLogoutClick}
                  style={{ cursor: 'pointer' }}
                >
                  <IoMdLogOut size={20} /> Logout
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>



      {/* Layout container */}
      <div className="d-flex">
        {/* Main content */}
        <main
          className="flex-grow-1 p-0"
          style={{
            backgroundColor: '#f4f6f8',
            minHeight: 'calc(100vh - 70px)', 
          }}
        >
          <Outlet />
        </main>


      </div>
    </div>
  );
}

export default MainLayout;
