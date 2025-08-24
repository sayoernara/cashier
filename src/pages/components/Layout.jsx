import React, { useCallback, useEffect, useState } from 'react';
import './LayoutStyle.css'
import { IoMdLogOut } from 'react-icons/io';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { getGoodsList, getStorageData, logout, saveSellTransaction, countPrice } from '../apis/api';
import { GoodsContext } from './GoodsContext';
import { Badge, Button, Card } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';

function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rname = getStorageData().decryptrname;
  const loc = getStorageData().decryptloc;
  const navigate = useNavigate();
  const location = useLocation();

  // State yang diangkat dari Dashboard.jsx
  const [goodsList, setGoodsList] = useState([]);
  const [loadingGoods, setLoadingGoods] = useState(false);
  const [errorLoadingGoods, setErrorLoadingGoods] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);

  const [currentCustomer, setCurrentCustomer] = useState(0);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [resultCountPrice, setResultCounPrice] = useState([]);
  const [loadingCountPrice, setLoadingCountPrice] = useState(false);
  const [errorCountPrice, setErrorCountPrice] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loadingSaveTransaction, setLoadingSaveTransaction] = useState(false);
  const [errorSaveTransaction, setErrorSaveTransaction] = useState(null);

  const getCartFromStorage = (customerIndex) => {
    const carts = JSON.parse(localStorage.getItem("carts") || "{}");
    return carts[customerIndex] || [];
  };

  const saveCartToStorage = (customerIndex, cartData) => {
    const carts = JSON.parse(localStorage.getItem("carts") || "{}");
    carts[customerIndex] = cartData;
    localStorage.setItem("carts", JSON.stringify(carts));
  };

  useEffect(() => {
    setCart(getCartFromStorage(currentCustomer));
  }, [currentCustomer]);


  // Fungsi yang diangkat dari Dashboard.jsx
  const addToCart = (comodity, id_item, weight, price) => {
    setCart((prevCart) => {
      const numWeight = parseInt(weight, 10);
      const numPrice = parseInt(price, 10);

      const existingItemIndex = prevCart.findIndex(
        (item) => item.comodity === comodity && item.id_item === id_item
      );

      let updatedCart;
      if (existingItemIndex > -1) {
        updatedCart = prevCart.map((item, index) =>
          index === existingItemIndex ?
            { ...item, totalWeight: item.totalWeight + numWeight, totalPrice: item.totalPrice + numPrice, } :
            item
        );
      } else {
        updatedCart = [...prevCart, { comodity, id_item, totalWeight: numWeight, totalPrice: numPrice, },];
      }

      saveCartToStorage(currentCustomer, updatedCart);
      return updatedCart;
    });
  };

  const removeFromCart = (comodityToRemove) => {
    const updatedCart = cart.filter((item) => item.comodity !== comodityToRemove);
    setCart(updatedCart);
    saveCartToStorage(currentCustomer, updatedCart);
  };

  const fetchCountPrice = useCallback(async () => {
    try {
      setLoadingCountPrice(true);
      const carts = getCartFromStorage(currentCustomer);
      if (carts.length === 0) return;
      const result = await countPrice(carts);
      setResultCounPrice(result.data.cart);
    } catch (err) {
      setErrorCountPrice(err.message);
    } finally {
      setLoadingCountPrice(false);
    }
  }, [currentCustomer]);

  const handleShowModal = () => {
    if (cart.length > 0) {
      setShowModal(true);
      fetchCountPrice();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setResultCounPrice([]);
    setDiscounts([]);
    setPaymentAmount("");
  };

  const fetchTransaction = async (summaryData) => {
    setLoadingSaveTransaction(true);
    const transactionPayload = {
      customerIndex: currentCustomer,
      items: resultCountPrice.map((item, index) => ({
        comodity: item.comodity,
        breakdown: item.breakdown,
        id_item: item.id_item,
        totalWeight: item.totalWeight,
        originalPrice: item.totalPrice,
        discount: discounts[index] || 0,
        finalPrice: item.totalPrice - (discounts[index] || 0),
      })),
      summary: summaryData,
      location: getStorageData().decryptidloc,
      cashier: getStorageData().decryptuname,
      transactionDate: new Date().toISOString(),
    };
    try {
      await saveSellTransaction(transactionPayload);
      // Clear cart for the current customer after successful transaction
      const updatedCart = [];
      setCart(updatedCart);
      saveCartToStorage(currentCustomer, updatedCart);

    } catch (error) {
      setErrorSaveTransaction(error.message);
      Swal.fire('Error', 'Gagal menyimpan transaksi.', 'error');
    } finally {
      handleCloseModal();
      setLoadingSaveTransaction(false);
    }
  };

  // Fetching data untuk list barang
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

  const contextValue = {
    // State dan fungsi yang akan dibagikan
    goodsList, groupedGoods, alphabet, selectedLetter, setSelectedLetter,
    loadingGoods, errorLoadingGoods,
    currentCustomer, setCurrentCustomer,
    cart, setCart, addToCart, removeFromCart,
    showModal, setShowModal, handleShowModal, handleCloseModal,
    resultCountPrice, loadingCountPrice, errorCountPrice,
    discounts, setDiscounts,
    paymentAmount, setPaymentAmount,
    fetchTransaction, loadingSaveTransaction, errorSaveTransaction
  };

  return (
    <GoodsContext.Provider
      value={contextValue}
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
            backgroundColor: 'white', borderTop: '1px solid #eaeaea', padding: '0.75rem 1.5rem',
            position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 1000
          }}
        >
          <div className="d-flex justify-content-center align-items-center gap-4 position-relative">
            {/* Menu utama */}
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
              Regular
            </NavLink>
            <NavLink to="/retur" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
              Retur
            </NavLink>
            <NavLink to="/transaksi" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
              Daftar Transaksi
            </NavLink>

            {/* Tombol Keranjang/Selesaikan Pesanan yang baru */}
            <div style={{ position: 'absolute', right: '20px' }}>
              <Button
                variant="success"
                className="d-flex align-items-center gap-2"
                onClick={handleShowModal}
                disabled={cart.length === 0 || loadingGoods}
              >
                <BiCart size={24} />
                <span className="fw-bold">
                  Selesaikan Pesanan
                </span>
                {cart.length > 0 && (
                  <Badge pill bg="danger">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </footer>

      </div>
    </GoodsContext.Provider>
  );
}

export default MainLayout;