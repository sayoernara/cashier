import React, { useCallback, useEffect, useState, useContext } from 'react';
import './LayoutStyle.css'
import { IoMdLogOut } from 'react-icons/io';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { getGoodsList, getStorageData, logout, saveSellTransaction, countPrice, saveReturTransaction } from '../apis/api';
import { GoodsContext } from './GoodsContext';
import { Badge, Button, Card } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';
import { FaUserCircle } from 'react-icons/fa';
import Transaction from '../Transaction';

const modalStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(5px)', transition: 'opacity 0.3s ease',
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '800px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    transform: 'scale(0.95)',
    transition: 'transform 0.3s ease',
    overflow: 'hidden'
  },
  visibleContent: {
    transform: 'scale(1)',
  },
};

const headerStyles = {
  cashierButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 18px',
    color: 'black',
    fontWeight: '700',
    fontSize: '1.1em',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  alphabetCard: {
    backgroundColor: 'black',
    color: 'white',
    border: '2px solid #6c757d',
    borderRadius: '8px',
    width: '60px',
    height: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '1.1em',
    cursor: 'pointer',
  },
  alphabetCardActive: {
    backgroundColor: '#007bff',
    color: 'white',
    border: '2px solid #007bff',
    borderRadius: '8px',
    width: '60px',
    height: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '1.1em',
    cursor: 'pointer',
  }
};

// --- KOMPONEN POPOVER KERANJANG BELANJA ---
const CartPopover = ({ cart, onRemove, onCheckout, grandTotal }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '80px',
      right: '20px',
      width: '380px',
      maxHeight: 'calc(100vh - 100px)',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #ddd'
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        <h5 className="mb-0 fw-bold">Keranjang Belanja</h5>
      </div>
      {cart.length === 0 ? (
        <p className="text-muted small fst-italic m-3 text-center">Belum ada item</p>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: '0.5rem 1rem' }}>
          <ul className="list-group list-group-flush small rounded">
            {[...cart].reverse().map((item, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                <div>
                  <strong className="d-block">{item.comodity}</strong>
                  <span className="text-muted">{item.totalWeight} gr</span>
                  <strong className="d-block mt-1" style={{ color: '#007bff' }}>
                    Rp {item.totalPrice.toLocaleString('id-ID')}
                  </strong>
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => onRemove(item.comodity)}>
                  Hapus
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {cart.length > 0 && (
        <div style={{ padding: '1rem', borderTop: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
          <div className='d-flex justify-content-between align-items-center mb-3'>
            <span className='fw-bold'>Total</span>
            <span className='fw-bold fs-5'>Rp {grandTotal.toLocaleString('id-ID')}</span>
          </div>
          <Button variant="success" className="w-100 fw-bold" onClick={onCheckout}>
            Lanjutkan ke Pembayaran
          </Button>
        </div>
      )}
    </div>
  );
};

// --- KOMPONEN UTAMA LAYOUT ---
function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rname = getStorageData().decryptrname;
  const loc = getStorageData().decryptloc;
  const navigate = useNavigate();
  const location = useLocation();

  const [goodsList, setGoodsList] = useState([]);
  const [loadingGoods, setLoadingGoods] = useState(false);
  const [errorLoadingGoods, setErrorLoadingGoods] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);

  const [currentCustomer, setCurrentCustomer] = useState(0);
  const [tradeInCurrentCustomer, setTradeInCurrentCustomer] = useState(0);

  const [cart, setCart] = useState([]);
  const [tradeInCart, setTradeInCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [resultCountPrice, setResultCounPrice] = useState([]);
  const [loadingCountPrice, setLoadingCountPrice] = useState(false);
  const [errorCountPrice, setErrorCountPrice] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loadingSaveTransaction, setLoadingSaveTransaction] = useState(false);
  const [errorSaveTransaction, setErrorSaveTransaction] = useState(null);
  const [showHistoryTransactionModal, setShowHistoryTransactionModal] = useState(false);
  const [isCartVisible, setIsCartVisible] = useState(false);

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


  const addToCart = (comodity, id_item, weight, price) => {
    setCart((prevCart) => {
      const numWeight = parseInt(weight, 10);
      const numPrice = parseInt(price, 10);

      const newItem = {
        id: Date.now(),
        comodity,
        id_item,
        totalWeight: numWeight,
        totalPrice: numPrice,
      };

      const updatedCart = [...prevCart, newItem];
      saveCartToStorage(currentCustomer, updatedCart);
      return updatedCart;
    });
  };

  const removeFromCart = (comodityToRemove) => {
    const updatedCart = cart.filter((item) => item.comodity !== comodityToRemove);
    setCart(updatedCart);
    saveCartToStorage(currentCustomer, updatedCart);
  };

  const getTradeInCartFromStorage = (customerIndex) => {
    try {
      const allCarts = JSON.parse(localStorage.getItem("tradeInCarts") || "{}");
      return allCarts[customerIndex] || [];
    } catch (error) {
      console.error("Gagal mengambil keranjang tukar tambah:", error);
      return [];
    }
  };

  const saveTradeInCartToStorage = (customerIndex, cartData) => {
    try {
      const allCarts = JSON.parse(localStorage.getItem("tradeInCarts") || "{}");
      allCarts[customerIndex] = cartData;
      localStorage.setItem("tradeInCarts", JSON.stringify(allCarts));
    } catch (error) {
      console.error("Gagal menyimpan keranjang tukar tambah:", error);
    }
  };

  useEffect(() => {
    setTradeInCart(getTradeInCartFromStorage(tradeInCurrentCustomer));
  }, [tradeInCurrentCustomer]);

  const addToTradeInCart = (item) => {
    setTradeInCart((prevCart) => {
      const updatedCart = [...prevCart, item];
      saveTradeInCartToStorage(tradeInCurrentCustomer, updatedCart);
      return updatedCart;
    });
  };

  const removeFromTradeInCart = (indexToRemove) => {
    setTradeInCart((prevCart) => {
      const updatedCart = prevCart.filter((_, index) => index !== indexToRemove);
      saveTradeInCartToStorage(tradeInCurrentCustomer, updatedCart);
      return updatedCart;
    });
  };

  const fetchCountPrice = useCallback(async (customerIndex) => {
    const activeCustomerIndex = customerIndex !== undefined ? customerIndex : currentCustomer;
    try {
      setLoadingCountPrice(true);
      const activeCart = getCartFromStorage(activeCustomerIndex);
      if (activeCart.length === 0) {
        setResultCounPrice([]);
        return;
      }
      const result = await countPrice(activeCart);
      setResultCounPrice(result.data.cart);
    } catch (err) {
      setErrorCountPrice(err.message);
    } finally {
      setLoadingCountPrice(false);
    }
  }, [currentCustomer]);

  const handleShowModal = () => {
    const isReturPage = location.pathname.startsWith('/retur');

    if (isReturPage) {
      const currentTradeInCart = getTradeInCartFromStorage(tradeInCurrentCustomer);
      const returSellCart = getReturSellCartFromStorage(tradeInCurrentCustomer);

      if (currentTradeInCart.length > 0 || returSellCart.length > 0) {
        setShowModal(true);

        const markedTradeInCart = currentTradeInCart.map(item => ({
          ...item,
          source: "retur"
        }));

        const markedReturSellCart = returSellCart.map(item => ({
          ...item,
          source: "penjualan"
        }));

        const mergedCart = [...markedReturSellCart, ...markedTradeInCart].reduce((acc, item) => {
          const key = `${item.comodity}-${item.source}`;
          const existing = acc.find(x => `${x.comodity}-${x.source}` === key);

          if (existing) {
            existing.totalWeight += item.totalWeight;
            existing.totalPrice += item.totalPrice;
          } else {
            acc.push({ ...item });
          }

          return acc;
        }, []);

        setResultCounPrice(mergedCart);
      }
    } else {
      const currentRegularCart = getCartFromStorage(currentCustomer);
      if (currentRegularCart.length > 0) {
        setShowModal(true);
        fetchCountPrice(currentCustomer);
      }
    }
  };

  const getReturSellCartFromStorage = (tradeInCurrentCustomer) => {
    try {
      const key = `retur_sell_${tradeInCurrentCustomer}`;
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
      console.error("Gagal mengambil keranjang retur:", error);
      return [];
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
      const response = await saveSellTransaction(transactionPayload);
      if (response && response.data && response.data.message.number) {
        const updatedCart = [];
        setCart(updatedCart);
        saveCartToStorage(currentCustomer, updatedCart);

        return {
          success: true,
          transactionNumber: response.data.message.number,
        };
      } else {
        throw new Error("Respons dari server tidak valid atau tidak menyertakan nomor transaksi.");
      }

    } catch (error) {
      setErrorSaveTransaction(error.message);
      Swal.fire('Error', `Gagal menyimpan transaksi: ${error.message}`, 'error');
      throw error;

    } finally {
      handleCloseModal();
      setLoadingSaveTransaction(false);
    }
  };

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
    goodsList, groupedGoods, alphabet, selectedLetter, setSelectedLetter,
    loadingGoods, errorLoadingGoods,
    currentCustomer, setCurrentCustomer,
    cart, setCart, addToCart, removeFromCart,
    tradeInCurrentCustomer, setTradeInCurrentCustomer,
    tradeInCart, setTradeInCart, addToTradeInCart, removeFromTradeInCart,
    showModal, setShowModal, handleShowModal, handleCloseModal,
    resultCountPrice, loadingCountPrice, errorCountPrice,
    discounts, setDiscounts,
    paymentAmount, setPaymentAmount,
    fetchTransaction, loadingSaveTransaction, errorSaveTransaction, getReturSellCartFromStorage
  };

  const isReturPage = location.pathname.startsWith('/retur');
  const activeCustomerForFooter = isReturPage ? tradeInCurrentCustomer : currentCustomer;
  const cartForFooter = cart;
  const tradeInCartForFooter = isReturPage ? getTradeInCartFromStorage(activeCustomerForFooter) : [];
  const badgeCount = cartForFooter.length + tradeInCartForFooter.length;
  const isButtonDisabled = badgeCount === 0;

  const handleNextCustomer = () => {
    if (isReturPage) {
      if (tradeInCurrentCustomer < 4) {
        setTradeInCurrentCustomer(prev => prev + 1);
      }
    } else {
      if (currentCustomer < 4) {
        setCurrentCustomer(prev => prev + 1);
      }
    }
  };

  const handlePrevCustomer = () => {
    if (isReturPage) {
      if (tradeInCurrentCustomer > 0) {
        setTradeInCurrentCustomer(prev => prev - 1);
      }
    } else {
      if (currentCustomer > 0) {
        setCurrentCustomer(prev => prev - 1);
      }
    }
  };

  const grandTotalInCart = cartForFooter.reduce((total, item) => total + item.totalPrice, 0);

  return (
    <GoodsContext.Provider
      value={contextValue}
    >
      <div className="d-flex flex-column min-vh-100">
        <nav
          className="navbar navbar-expand-lg shadow-sm"
          style={{
            backgroundColor: '#2c3e50',
            padding: '10px 25px',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}
        >
          <div className="container-fluid d-flex align-items-center justify-content-between">
            <div
              onClick={() => setShowHistoryTransactionModal(true)}
              style={headerStyles.cashierButton}
            >
              <FaUserCircle size={24} />
              <span>{rname}</span>
            </div>
            <div className="d-flex flex-wrap justify-content-center flex-grow-1 gap-2">
              {alphabet.map((letter) => (
                <div
                  key={letter}
                  style={selectedLetter === letter ? headerStyles.alphabetCardActive : headerStyles.alphabetCard}
                  onClick={() =>
                    setSelectedLetter(selectedLetter === letter ? null : letter)
                  }
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </nav>

        <main
          className="flex-grow-1 p-0"
          style={{
            backgroundColor: '#000000ff',
            minHeight: 'calc(100vh - 70px)',
            paddingBottom: '70px'
          }}
        >
          <Outlet />
        </main>

        <footer
          className="shadow-sm"
          style={{
            backgroundColor: 'white', borderTop: '1px solid #eaeaea', padding: '0.75rem 1.5rem',
            position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 1000
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Link
                className="nav-link text-danger fw-semibold d-flex align-items-center gap-1"
                onClick={handleLogoutClick}
                style={{ cursor: 'pointer' }}
                to="#"
              >
                <IoMdLogOut size={24} />
              </Link>
            </div>

            <div className="d-flex justify-content-center align-items-center gap-3">
              <Button variant="secondary" size="sm" onClick={handlePrevCustomer} disabled={activeCustomerForFooter === 0}>
                &laquo; Prev Customer
              </Button>
              <div className="d-flex flex-column align-items-center">
                <div className='d-flex gap-4'>
                  <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
                    Regular
                  </NavLink>
                  <NavLink to="/retur" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
                    Retur
                  </NavLink>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={handleNextCustomer} disabled={activeCustomerForFooter >= 4}>
                Next Customer &raquo;
              </Button>
            </div>

            <div>
              {!isReturPage ? (
                <Button
                  variant="success"
                  className="d-flex align-items-center gap-2"
                  onClick={() => setIsCartVisible(!isCartVisible)}
                  disabled={loadingGoods}
                  style={{ minWidth: "120px", justifyContent: "center" }}
                >
                  <BiCart size={24} />
                  <span className="fw-bold">Keranjang</span>
                  {badgeCount > 0 && (
                    <Badge pill bg="danger">
                      {badgeCount}
                    </Badge>
                  )}
                </Button>
              ) : (
                // placeholder kosong dengan ukuran sama supaya gak geser
                <div style={{ minWidth: "120px", height: "38px" }} />
              )}
            </div>

          </div>
        </footer>

        {isCartVisible && (
          <CartPopover
            cart={cartForFooter}
            onRemove={removeFromCart}
            grandTotal={grandTotalInCart}
            onCheckout={() => {
              setIsCartVisible(false);
              handleShowModal();
            }}
          />
        )}

        {showHistoryTransactionModal && (
          <div
            style={{ ...modalStyles.overlay, opacity: showHistoryTransactionModal ? 1 : 0 }}
            onClick={() => setShowHistoryTransactionModal(false)}
          >
            <div
              style={{ ...modalStyles.content, ...modalStyles.visibleContent }}
              onClick={(e) => e.stopPropagation()}
            >
              <Transaction onClose={() => setShowHistoryTransactionModal(false)} />
            </div>
          </div>
        )}
      </div>
    </GoodsContext.Provider>
  );
}

export default MainLayout;