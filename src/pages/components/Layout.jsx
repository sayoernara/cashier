import React, { useCallback, useEffect, useState, useContext, useMemo } from 'react';
import './LayoutStyle.css'
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { getGoodsList, getStorageData, logout, countPrice, saveSellTransaction } from '../apis/api';
import { GoodsContext } from './GoodsContext';
import { Badge, Button } from 'react-bootstrap';
import { FaUserCircle, FaRunning, FaUser, FaUserFriends, FaExchangeAlt } from 'react-icons/fa';
import Transaction from '../Transaction';
import Retur from '../Retur';
import CustomCartIcon from '../../assets/cartts.png'; 

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
  returContent: {
    backgroundColor: 'transparent', 
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1300px', 
    height: '93vh',
    display: 'flex',
    flexDirection: 'column',
    transform: 'scale(0.95)',
    transition: 'transform 0.3s ease',
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
    padding: '20px 24px',
    color: 'black',
    fontWeight: '700',
    fontSize: '1.3em',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  },
  alphabetCard: {
    backgroundColor: 'black',
    color: 'white',
    border: '1.5px solid #ffffffff',
    borderRadius: '8px',
    width: '80px',
    height: '60px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '1.7em',
    cursor: 'pointer',
  },
  alphabetCardActive: {
    backgroundColor: '#088924ff',
    color: 'white',
    border: '1.5px solid',
    borderRadius: '8px',
    width: '80px',
    height: '60px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '3em',
    cursor: 'pointer',
  }
};

function MainLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rname = getStorageData().decryptrname;
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showReturModal, setShowReturModal] = useState(false);
  const [activeView, setActiveView] = useState('regular'); 

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

      const existingItemIndex = prevCart.findIndex(
        (item) => item.comodity === comodity
      );

      let updatedCart;

      if (existingItemIndex > -1) {
        updatedCart = prevCart.map((item, index) => {
          if (index === existingItemIndex) {
            return {
              ...item,
              totalWeight: item.totalWeight + numWeight,
              totalPrice: item.totalPrice + numPrice,
            };
          }
          return item;
        });
      } else {
        const newItem = {
          id: Date.now(),
          comodity,
          id_item,
          totalWeight: numWeight,
          totalPrice: numPrice,
        };
        updatedCart = [...prevCart, newItem];
      }

      saveCartToStorage(currentCustomer, updatedCart);
      return updatedCart;
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setResultCounPrice([]);
    setDiscounts([]);
    setPaymentAmount("");
  };

  const fetchCountPrice = useCallback(async (customerIndex) => {
    const activeCustomerIndex = customerIndex !== undefined ? customerIndex : currentCustomer;
    try {
      setLoadingCountPrice(true);
      const activeCart = getCartFromStorage(activeCustomerIndex);
      if (activeCart.length === 0) {
        setResultCounPrice([]);
        if (showModal) {
            handleCloseModal();
        }
        return;
      }
      const result = await countPrice(activeCart);
      setResultCounPrice(result.data.cart);
    } catch (err) {
      setErrorCountPrice(err.message);
    } finally {
      setLoadingCountPrice(false);
    }
  }, [currentCustomer, showModal]);

  const removeFromCart = (comodityToRemove) => {
    const updatedCart = cart.filter(
      (item) => item.comodity !== comodityToRemove
    );
    setCart(updatedCart);
    saveCartToStorage(currentCustomer, updatedCart);
    
    if (showModal) {
        fetchCountPrice(currentCustomer);
    }
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
      localStorage.setItem("tradeInCarts", JSON.stringify(allCerts));
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

  const handleShowModal = () => {
    const currentRegularCart = getCartFromStorage(currentCustomer);
    if (currentRegularCart.length > 0) {
      setShowModal(true);
      fetchCountPrice(currentCustomer);
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

  const groupedGoods = useMemo(() => {
    if (!goodsList || goodsList.length === 0) return {};
    return goodsList.reduce((acc, item) => {
        if (!acc[item.comodity]) {
            acc[item.comodity] = [];
        }
        acc[item.comodity].push(item);
        return acc;
    }, {});
  }, [goodsList]);

  const alphabet = useMemo(() => {
    const letters = new Set();
    Object.keys(groupedGoods).forEach(comodity => {
        comodity.split(' ').flatMap(word => word.charAt(0).toUpperCase()).forEach(letter => {
          if (letter) {
            letters.add(letter);
          }
        });
    });
    return Array.from(letters).sort();
  }, [groupedGoods]);

  React.useEffect(() => {
    if (location.pathname.startsWith('/settings')) {
      setSettingsOpen(true);
    } else {
        if(!location.pathname.startsWith('/dashboard')) {
            navigate('/dashboard');
        }
    }
  }, [location.pathname, navigate]);

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
    resultCountPrice, loadingCountPrice, errorCountPrice, fetchCountPrice, 
    discounts, setDiscounts,
    paymentAmount, setPaymentAmount,
    fetchTransaction, loadingSaveTransaction, errorSaveTransaction, getReturSellCartFromStorage
  };

  const activeCustomerForFooter = activeView === 'retur' ? tradeInCurrentCustomer : currentCustomer;
  const cartForFooter = activeView === 'regular' ? cart : [];
  
  const badgeCount = cartForFooter.length;
  const isButtonDisabled = badgeCount === 0;

  const handleSetCustomer = (customerIndex) => {
    navigate('/dashboard');
    setActiveView('regular');
    setShowReturModal(false);
    setCurrentCustomer(customerIndex);
    setTradeInCurrentCustomer(customerIndex);
  };

  const handleReturClick = () => {
      setActiveView('retur');
      setShowReturModal(true);
  };

  const activeButtonStyle = {
    backgroundColor: 'white',
    color: '#6c757d',
    borderColor: '#dee2e6',
    borderRadius: '20px',
    padding: '20px 24px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const inactiveButtonStyle = {
    backgroundColor: 'black',
    color: 'white',
    borderColor: 'white',
    borderRadius: '20px',
    padding: '20px 24px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

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
            backgroundColor: '#2c3e50',
            padding: '0.75rem 1.5rem',
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            zIndex: 1000,
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <Link
              className="nav-link text-light fw-semibold d-flex align-items-center gap-1"
              onClick={handleLogoutClick}
              style={{ 
                cursor: 'pointer',
                border: '2px solid white',
                borderRadius: '20px',
                padding: '20px 24px',
                backgroundColor: 'black'
              }}
              to="#"
            >
              <FaRunning size={40} style={{ transform: 'scaleX(-1)' }} />
            </Link>

            <Button 
              onClick={() => handleSetCustomer(0)}
              style={activeView === 'regular' && activeCustomerForFooter === 0 ? activeButtonStyle : inactiveButtonStyle}
            >
              <FaUser size={40} />
            </Button>
            
            <Button 
              onClick={handleReturClick}
              style={activeView === 'retur' ? activeButtonStyle : inactiveButtonStyle}
            >
              <FaExchangeAlt size={40} />
            </Button>

            <Button 
              onClick={() => handleSetCustomer(1)}
              style={activeView === 'regular' && activeCustomerForFooter === 1 ? activeButtonStyle : inactiveButtonStyle}
            >
              <FaUserFriends size={40} />
            </Button>

            <Button
              onClick={handleShowModal}
              disabled={isButtonDisabled || loadingGoods || activeView === 'retur'}
              style={{
                  backgroundColor: 'black',
                  borderColor: 'white',
                  borderRadius: '20px',
                  padding: '10px 24px'
              }}
            >
              <div style={{ position: 'relative' }}>
                <img src={CustomCartIcon} alt="Pembayaran" style={{ height: '60px' }} />
                
                {badgeCount > 0 && (
                  <Badge
                    pill
                    bg="danger"
                    style={{
                      position: 'absolute',
                      top: '30%',
                      left: '56%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: '0.7rem',
                      lineHeight: '1',
                      padding: '8px 12px',
                      minWidth: '18px'
                    }}
                  >
                    {badgeCount}
                  </Badge>
                )}
              </div>
            </Button>
          </div>
        </footer>

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

        {showReturModal && (
          <div 
            style={{...modalStyles.overlay, opacity: 1}}
            onClick={() => {
                setShowReturModal(false);
                setActiveView('regular');
            }}
            >
             <div 
                style={{...modalStyles.returContent, ...modalStyles.visibleContent}}
                onClick={(e) => e.stopPropagation()}
            >
                <Retur onClose={() => {
                    setShowReturModal(false);
                    setActiveView('regular');
                }} />
            </div>
          </div>
        )}

      </div>
    </GoodsContext.Provider>
  );
}

export default MainLayout;