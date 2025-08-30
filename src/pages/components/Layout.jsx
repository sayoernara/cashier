import React, { useCallback, useEffect, useState } from 'react';
import './LayoutStyle.css'
import { IoMdLogOut } from 'react-icons/io';
import { FaUserCircle } from 'react-icons/fa';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { getGoodsList, getStorageData, logout, saveSellTransaction, countPrice } from '../apis/api';
import { GoodsContext } from './GoodsContext';
import { Badge, Button } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';
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
    const [cart, setCart] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [resultCountPrice, setResultCounPrice] = useState([]);
    const [loadingCountPrice, setLoadingCountPrice] = useState(false);
    const [errorCountPrice, setErrorCountPrice] = useState(null);
    const [discounts, setDiscounts] = useState([]);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [loadingSaveTransaction, setLoadingSaveTransaction] = useState(false);
    const [errorSaveTransaction, setErrorSaveTransaction] = useState(null);

    const [showTransactionModal, setShowTransactionModal] = useState(false);

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
                            onClick={() => setShowTransactionModal(true)}
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
                        backgroundColor: '#f4f6f8',
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

                        <div className="d-flex justify-content-center align-items-center gap-4">
                            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
                                Regular
                            </NavLink>
                            <NavLink to="/retur" className={({ isActive }) => `nav-link ${isActive ? "fw-bold text-primary" : "text-dark"}`}>
                                Retur
                            </NavLink>
                        </div>

                        <div>
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

                {showTransactionModal && (
                    <div
                        style={{ ...modalStyles.overlay, opacity: showTransactionModal ? 1 : 0 }}
                        onClick={() => setShowTransactionModal(false)}
                    >
                        <div
                            style={{ ...modalStyles.content, ...modalStyles.visibleContent }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Transaction onClose={() => setShowTransactionModal(false)} />
                        </div>
                    </div>
                )}
            </div>
        </GoodsContext.Provider>
    );
}

export default MainLayout;