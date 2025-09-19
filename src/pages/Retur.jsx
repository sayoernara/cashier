import React, { useCallback, useState, useContext, useMemo, useEffect } from 'react';
import { getGoodsPricePerGram, getStorageData, saveReturTransaction } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal, Form, InputGroup, ListGroup, Table, Container } from 'react-bootstrap';
import { BiPlus, BiTransfer, BiCheckCircle, BiX, BiArrowBack } from 'react-icons/bi';
import { CiImageOff } from 'react-icons/ci';
import { GoodsContext } from './components/GoodsContext';
import { FaShoppingBag, FaBalanceScale } from 'react-icons/fa';
import './Dashboard.css';
import Swal from 'sweetalert2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const printReceipt = async (receiptData , number) => {
  try {
    const { items, summary } = receiptData;
    const transactionNumber = number;
    const line = '--------------------------------\n';
    let receiptText = '';
    receiptText += '       Sayoernara\n';
    receiptText += `No: ${transactionNumber}\n`;
    receiptText += `Tgl: ${new Date().toLocaleString('id-ID')}\n`;
    receiptText += line;
    items.forEach(item => {
      const priceAfterDiscount = item.totalPrice - (item.discount || 0);
      const itemName = `${item.comodity} (${item.totalWeight} gr)`;
      const itemPrice = `Rp ${priceAfterDiscount.toLocaleString('id-ID')}`;
      const type = item.type;
      const receiptWidth = 32;
      const spaces = receiptWidth - itemName.length - itemPrice.length;
      receiptText += `${type} --> ${itemName}${' '.repeat(Math.max(0, spaces))}${itemPrice}\n`;
    });
    receiptText += line;
    const formatSummaryLine = (label, value) => {
      const receiptWidth = 32;
      const formattedValue = `Rp ${value.toLocaleString('id-ID')}`;
      const spaces = receiptWidth - label.length - formattedValue.length;
      return `${label}${' '.repeat(Math.max(0, spaces))}${formattedValue}\n`;
    }
    receiptText += formatSummaryLine('Subtotal', summary.subtotal);
    if (summary.totalDiscount > 0) {
      receiptText += formatSummaryLine('Diskon', -summary.totalDiscount);
    }
    receiptText += formatSummaryLine('Grand Total', summary.grandTotal);
    receiptText += line;
    receiptText += formatSummaryLine('Bayar', summary.paymentAmount);
    receiptText += formatSummaryLine('Kembali', summary.change);
    receiptText += '\nTerima Kasih!\n\n';
    const cutCommand = '\x1D\x56\x42\x00';
    receiptText += cutCommand;
    const base64String = btoa(receiptText);
    window.location.href = `rawbt:base64,${base64String}`;
  } catch (error) {
    console.error("Gagal mencetak struk:", error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Mencetak',
      text: 'Pastikan aplikasi RawBT sudah terinstall dan berjalan dengan baik di perangkat Anda.',
    });
  }
};

const CustomRangeSlider = ({ label, value, min, max, step, onChange, price, unit, iconType, onRelease }) => {
    const [tooltipActive, setTooltipActive] = useState(false);
    const bars = useMemo(() => Array.from({ length: 20 }), []);
    const percentage = max > min ? ((value - min) * 100) / (max - min) : 0;
  
    const handleInteraction = (e) => {
      onChange(e);
      setTooltipActive(true);
    };
  
    const handleMouseUp = () => {
      setTooltipActive(false);
      if (onRelease) {
        onRelease();
      }
    };
  
    const renderIcon = () => {
      if (iconType === 'kg') return <FaShoppingBag className="me-3" />;
      if (iconType === 'gr') return <FaBalanceScale className="me-3" />;
      return null;
    };
  
    return (
      <div className="slider-group">
        <div className="volume-bar-container">
          {bars.map((_, index) => {
            const barPercentage = (index / (bars.length - 1)) * 100;
            const isActive = barPercentage <= percentage;
            const height = 10 + barPercentage;
            return <div key={index} className={`bar ${isActive ? 'active' : ''}`} style={{ height: `${height}%` }} ></div>;
          })}
        </div>
        <label>{renderIcon()}{label}</label>
        <div className="custom-slider-container">
          <div className="custom-slider-track-bg"></div>
          <div className="custom-slider-track-volume" style={{ width: `${percentage}%` }}></div>
          <input
            type="range"
            min={min} max={max} step={step} value={value}
            className="custom-slider-input"
            onChange={handleInteraction} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp}
          />
          <div className={`slider-tooltip ${tooltipActive ? 'active' : ''}`} style={{ left: `${percentage}%` }}>
            {value} {unit}
            <span className="tooltip-price">Rp {price.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    );
};


function Retur() {
    const {
        groupedGoods, selectedLetter, loadingGoods, errorLoadingGoods,
        tradeInCurrentCustomer, setTradeInCurrentCustomer,
        tradeInCart, setTradeInCart, addToTradeInCart, removeFromTradeInCart,
        showModal, handleShowModal, handleCloseModal,
        resultCountPrice, loadingCountPrice, errorCountPrice,
        discounts, setDiscounts,
        paymentAmount, setPaymentAmount,
        fetchTransaction, loadingSaveTransaction
    } = useContext(GoodsContext);

    const [returSellCart, setReturSellCart] = useState([]);
    const [selectedIdItem, setSelectedIdItem] = useState('');
    const [selectedItemNm, setSelectedItemNm] = useState('');
    const [errorGoodsPrice, setErrorGoodsPrice] = useState(null);
    const [loadingGoodsPrice, setLoadingGoodsPrice] = useState(false);
    const [goodsPrice, setGoodsPrice] = useState([]);
    const [kgValue, setKgValue] = useState(0);
    const [gramValue, setGramValue] = useState(0);
    const DISCOUNT_STEP = 500;
    const [currentView, setCurrentView] = useState('transaction');
    const [selectionMode, setSelectionMode] = useState('jual');
    
    // State baru untuk trigger konfirmasi otomatis
    const [isConfirming, setIsConfirming] = useState(false);

    const resetWeightSelectionState = () => {
        setKgValue(0);
        setGramValue(0);
        setGoodsPrice([]);
    };

    const navigateTo = (view) => {
        if (view === 'transaction') {
            resetWeightSelectionState();
            setSelectedIdItem('');
            setSelectedItemNm('');
        }
        if (view === 'productSelection') {
            resetWeightSelectionState();
        }
        setCurrentView(view);
    };

    useEffect(() => {
        const cartKey = `retur_sell_${tradeInCurrentCustomer}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setReturSellCart(savedCart);
    }, [tradeInCurrentCustomer]);

    const handleSelectProduct = (id, itemnm, mode) => {
        setSelectionMode(mode);
        setSelectedIdItem(id);
        setSelectedItemNm(itemnm);
        fetchGoodsPricePerGram(id);
        navigateTo('weightSelection');
    };

    const addToReturSellCart = (comodity, id_item, weight, price) => {
        setReturSellCart((prevCart) => {
            const numWeight = parseInt(weight, 10);
            const numPrice = parseInt(price, 10);
            const existingItemIndex = prevCart.findIndex((item) => item.comodity === comodity && item.id_item === id_item);
            let updatedCart;
            if (existingItemIndex > -1) {
                updatedCart = prevCart.map((item, index) =>
                    index === existingItemIndex ? { ...item, totalWeight: item.totalWeight + numWeight, totalPrice: item.totalPrice + numPrice } : item
                );
            } else {
                updatedCart = [...prevCart, { comodity, id_item, totalWeight: numWeight, totalPrice: numPrice, type: 'PENJUALAN' }];
            }
            const cartKey = `retur_sell_${tradeInCurrentCustomer}`;
            localStorage.setItem(cartKey, JSON.stringify(updatedCart));
            return updatedCart;
        });
    };
    
    const removeFromReturSellCart = (comodityToRemove) => {
        const updatedCart = returSellCart.filter((item) => item.comodity !== comodityToRemove);
        setReturSellCart(updatedCart);
        const cartKey = `retur_sell_${tradeInCurrentCustomer}`;
        localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    };

    const handleRemoveTradeIn = (index) => {
        removeFromTradeInCart(index);
    };

    const handleConfirmWeight = () => {
        const totalWeight = (kgValue * 1000) + gramValue;
        const priceKg = kgValue > 0 ? getPrice(kgValue * 1000) : 0;
        const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
        const totalPrice = priceKg + priceGram;

        if (totalWeight > 0 && totalPrice > 0) {
            if (selectionMode === 'jual') {
                addToReturSellCart(selectedItemNm, selectedIdItem, totalWeight, totalPrice);
            } else {
                const tradeInItem = { id_item: selectedIdItem, comodity: selectedItemNm, totalWeight, totalPrice, type: 'PENGEMBALIAN' };
                addToTradeInCart(tradeInItem);
            }
        }
        navigateTo('transaction');
    };
    
    const handlePresetAddToCart = (item, weight, price) => {
        if (selectionMode === 'jual') {
          addToReturSellCart(item.comodity, item.id_item, weight, price);
        } else { 
          const tradeInItem = { id_item: item.id_item, comodity: item.comodity, totalWeight: weight, totalPrice: price, type: 'PENGEMBALIAN' };
          addToTradeInCart(tradeInItem);
        }
        navigateTo('transaction');
    };
    
    const handlePresetClick = (weight, price) => {
        if (weight > 0 && price > 0) {
            if (selectionMode === 'jual') {
                addToReturSellCart(selectedItemNm, selectedIdItem, weight, price);
            } else {
                const tradeInItem = { id_item: selectedIdItem, comodity: selectedItemNm, totalWeight: weight, totalPrice: price, type: 'PENGEMBALIAN' };
                addToTradeInCart(tradeInItem);
            }
        }
        navigateTo('transaction');
    };

    const fetchGoodsPricePerGram = useCallback(async (selectedIdItem) => {
        try {
            setLoadingGoodsPrice(true);
            const result = await getGoodsPricePerGram(selectedIdItem);
            setGoodsPrice(result.data.price[0] || []);
        } catch (err) {
            setErrorGoodsPrice(err.message);
        } finally {
            setLoadingGoodsPrice(false);
        }
    }, []);

    const filteredComodities = Object.keys(groupedGoods).filter((comodity) => {
        if (!selectedLetter) return true;
        return comodity.toUpperCase().startsWith(selectedLetter);
    });

    const getPrice = (weight) => {
        if (!goodsPrice || goodsPrice.length === 0) return 0;
        const found = goodsPrice.find((g) => parseInt(g.weight_Gr, 10) === weight);
        if (found) return parseInt(found.price_per_Gr, 10);
        const validPrices = goodsPrice.filter(g => parseInt(g.weight_Gr, 10) > 0);
        if (validPrices.length === 0) return 0;
        const smallestUnit = validPrices.reduce((min, p) => 
            parseInt(p.weight_Gr, 10) < parseInt(min.weight_Gr, 10) ? p : min
        );
        if (smallestUnit) {
            const pricePerGram = parseInt(smallestUnit.price_per_Gr, 10) / parseInt(smallestUnit.weight_Gr, 10);
            const calculatedPrice = Math.round(pricePerGram * weight);
            return calculatedPrice;
        }
        return 0;
    };

    const fetchdummy = async (summaryData) => {
        const allItems = [
            ...returSellCart.map((item, index) => ({
                comodity: item.comodity, id_item: item.id_item, totalWeight: item.totalWeight,
                originalPrice: item.totalPrice, discount: discounts[index] || 0,
                finalPrice: item.totalPrice - (discounts[index] || 0), type: item.type || "PENJUALAN",
            })),
            ...tradeInCart.map((item) => ({
                comodity: item.comodity, id_item: item.id_item, totalWeight: item.totalWeight,
                originalPrice: item.totalPrice, discount: item.totalPrice,
                finalPrice: 0, type: item.type || "PENGEMBALIAN",
            })),
        ];
        const mergedItems = Object.values(allItems.reduce((acc, item) => {
            const key = `${item.id_item}-${item.comodity}`;
            if (!acc[key]) { acc[key] = { ...item }; } else {
                acc[key].totalWeight += item.totalWeight; acc[key].originalPrice += item.originalPrice;
                acc[key].discount += item.discount; acc[key].finalPrice += item.finalPrice;
            }
            return acc;
        }, {}));
        const transactionPayload = {
            customerIndex: tradeInCurrentCustomer, items: mergedItems, summary: summaryData,
            location: getStorageData().decryptidloc, cashier: getStorageData().decryptuname,
            transactionDate: new Date().toISOString(),
        };
        fetchReturTransaction(transactionPayload);
    };

    const fetchReturTransaction = async (transactionPayload) => {
        try {
            const response = await saveReturTransaction(transactionPayload);
            Swal.fire({
                title: 'Sukses!',
                text: `Transaksi berhasil dengan nomor: ${response.data.message.number}`,
                icon: 'success',
                confirmButtonText: 'OK'
            }).then((result) => {
                if (result.isConfirmed) {
                    printReceipt(transactionPayload, response.data.message.number);
                    localStorage.setItem("tradeInCarts", JSON.stringify([]));
                    localStorage.setItem("retur_sell_0", JSON.stringify([]));
                    setReturSellCart([]); 
                    setTradeInCart([]);
                }
            });
        } catch (error) {
            Swal.fire('Error', `Gagal menyimpan transaksi: ${error.message}`, 'error');
        }
    }
    
    const total_kembali = tradeInCart.reduce((sum, item) => sum + parseInt(item.totalPrice, 10), 0);
    const total_baru = returSellCart.reduce((sum, item) => sum + parseInt(item.totalPrice, 10), 0);
    const total_berat_baru_kg = returSellCart.reduce((sum, item) => sum + item.totalWeight, 0) / 1000;
    const selisih = total_baru - total_kembali;
    const bisa_selesai = tradeInCart.length > 0 || returSellCart.length > 0;
    const subtotal = returSellCart.reduce((sum, item) => sum + parseInt(item.totalPrice, 10), 0);
    const totalDiscount = discounts.reduce((sum, current) => sum + (current || 0), 0);
    const tradeInTotal = tradeInCart.reduce((sum, item) => sum + parseInt(item.totalPrice, 10), 0);
    const grandTotal = subtotal - totalDiscount - tradeInTotal;
    const change = parseInt(paymentAmount || 0, 10) - grandTotal;

    const handleConfirmTransaction = async () => {
        const summaryData = { subtotal, totalDiscount, tradeInTotal, grandTotal, paymentAmount: parseInt(paymentAmount || 0, 10), change };
        fetchdummy(summaryData);
    };

    const handleDirectConfirm = () => {
        if (grandTotal > 0) {
            setPaymentAmount(grandTotal.toString());
        } else {
            setPaymentAmount('0');
        }
        setIsConfirming(true);
    };
    
    useEffect(() => {
        if (isConfirming) {
            handleConfirmTransaction();
            setIsConfirming(false);
        }
    }, [isConfirming, paymentAmount, change]);

    const handleDiscountChange = (index, operation, itemPrice) => {
        const newDiscounts = [...discounts];
        const currentDiscount = parseInt(newDiscounts[index] || 0, 10);
        const price = parseInt(itemPrice, 10);
        let newValue = currentDiscount;
        if (operation === 'increase') { newValue = Math.min(currentDiscount + DISCOUNT_STEP, price); } 
        else if (operation === 'decrease') { newValue = Math.max(currentDiscount - DISCOUNT_STEP, 0); }
        newDiscounts[index] = newValue;
        setDiscounts(newDiscounts);
    };

    const handlePaymentChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, "");
        setPaymentAmount(value);
    };
    
    const mergedResult = useMemo(() => {
        const sellItems = returSellCart.map((item, index) => ({...item, source: 'penjualan', originalIndex: index}));
        const returnItems = tradeInCart.map(item => ({...item, source: 'retur'}));
        return [...sellItems, ...returnItems];
    }, [returSellCart, tradeInCart]);
    
    const itemsPerPage = 8;
    const pages = useMemo(() => {
        const result = [];
        for (let i = 0; i < filteredComodities.length; i += itemsPerPage) {
        result.push(filteredComodities.slice(i, i + itemsPerPage));
        }
        return result;
    }, [filteredComodities]);

    const styles = {
        page: { fontFamily: "'Inter', sans-serif", backgroundColor: "#FFFFFF", minHeight: "100vh", padding: '1rem' },
        transactionCard: { width: '100%', maxWidth: '1200px', margin: 'auto', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', overflow: 'hidden' },
        cardContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '1.5rem', padding: '1.5rem', minHeight: '90vh' },
        box: { flex: 8, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', display: 'flex', flexDirection: 'column', padding: '1.5rem', textAlign: 'center' },
        controlsContainer: { flex: 9, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '2rem' },
        boxContent: { flexGrow: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 },
        boxHeader: {
            width: 'fit-content',
            margin: '0 auto 1rem auto',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#4B5563',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            border: '2px solid black',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#FFF'
        },
        priceDisplay: { fontSize: '2.5rem', fontWeight: 700, margin: '1rem 0' },
        actionButton: { textDecoration: 'none', backgroundColor: '#4F46E5', color: 'white', padding: '1rem 2rem', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 600, transition: 'all 0.2s ease', width: '100%', marginTop: 'auto', border: 'none', cursor: 'pointer' },
        itemsList: { overflowY: 'auto', textAlign: 'left', width: '100%', flexGrow: 1, minHeight: 0, paddingRight: '10px' },
        listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #E5E7EB' },
        totalRow: { fontWeight: 600, width: '100%', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #E5E7EB', flexShrink: 0, fontSize: '1rem' },
        resultLabel: { fontSize: '1rem', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' },
        resultBox: { fontSize: '2.5rem', fontWeight: 700, margin: '0.5rem 0 1.5rem 0' },
        finishButton: { width: '100%', maxWidth: '400px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', fontSize: '1.2rem', fontWeight: 600, backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
        itemName: { fontWeight: 'bold', fontSize: '1.1rem', color: '#1F2937' },
        itemDetails: { fontSize: '0.9rem', color: '#9CA3AF' },
        itemPrice: { fontWeight: 'bold', fontSize: '1.1rem', color: '#4F46E5' },
        itemPriceContainer: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
        headerContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #dee2e6'
        },
        headerTitle: {
            fontSize: '1.75rem',
            fontWeight: 'bold',
            margin: 0,
        },
        backButton: {
            backgroundColor: '#5a6268',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.6rem 1rem',
            fontSize: '0.9rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
        }
    };

    if (currentView === 'productSelection') {
        return (
            <div className="container-fluid" style={styles.page}>
                <div style={styles.headerContainer}>
                    <h2 style={styles.headerTitle}>
                        {selectionMode === 'jual' ? 'Pilih Item Baru' : 'Pilih item yang Dikembalikan'}
                    </h2>
                    <button style={styles.backButton} onClick={() => navigateTo('transaction')}>
                        <BiArrowBack /> Kembali ke Dasboard Tukar
                    </button>
                </div>
                {loadingGoods ? (<div className="text-center p-5"><Spinner animation="border" /></div>) : (
                    <Swiper
                        modules={[Pagination]}
                        spaceBetween={20}
                        slidesPerView={1}
                        pagination={{ clickable: true }}
                        className="swiper-container"
                    >
                        {pages.map((page, pageIndex) => (
                            <SwiperSlide key={pageIndex} className="goods-page-grid">
                            <Row className="g-1">
                                {page.map((comodity) => {
                                const representativeItem = groupedGoods[comodity]?.[0];
                                return (
                                    <Col key={comodity} xs={6} sm={4} lg={3} className="product-card-wrapper">
                                        <Card className="shadow-sm border-0 product-card-small">
                                            <Card.Body>
                                                <div className="item-image-container" onClick={() => handleSelectProduct(representativeItem.id_item, comodity, selectionMode)}>
                                                    {representativeItem.img ? (
                                                    <img
                                                        src={representativeItem.img}
                                                        alt={comodity}
                                                        className="img-fluid item-img-small"
                                                    />
                                                    ) : (
                                                    <CiImageOff size={100} className="text-secondary item-img-small-placeholder"/>
                                                    )}
                                                </div>
                                                <Card.Title className="product-title-small text-center" onClick={() => handleSelectProduct(representativeItem.id_item, comodity, selectionMode)}>
                                                    {comodity}
                                                </Card.Title>
                                                <div className="weight-buttons-container d-flex flex-wrap gap-1 mt-2">
                                                    {groupedGoods[comodity].map((sub, i) => {
                                                    const isHighlighted = sub.weight_txt === "Kg";
                                                    return (
                                                        <Card
                                                        key={i}
                                                        className={`text-center flex-fill border-0 shadow-sm overflow-hidden weight-card-small weight-btn-${sub.weight_txt.replace('/', '-')}`}
                                                        onClick={() => handlePresetAddToCart(sub, sub.weight_Gr, sub.price_per_Gr)}
                                                        >
                                                        <div className="weight-card-header">
                                                            {sub.weight_txt}
                                                        </div>
                                                        <div className={`weight-card-body ${isHighlighted ? 'highlighted' : ''}`}>
                                                            <div className="fw-bolder h5 m-0 lh-1">{sub.stock}</div>
                                                            <div className="price-text">
                                                                {parseInt(sub.price_per_Gr, 10) / 1000}
                                                            </div>
                                                        </div>
                                                        </Card>
                                                    );
                                                    })}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                );
                                })}
                            </Row>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </div>
        );
    }
    
    if (currentView === 'weightSelection') {
        const sliderWeight = (kgValue * 1000) + gramValue;
        const priceKg = kgValue > 0 ? getPrice(kgValue * 1000) : 0;
        const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
        const sliderPrice = priceKg + priceGram;

        const displayWeight = sliderWeight > 950
            ? `${(sliderWeight / 1000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} KG`
            : `${sliderWeight} GR`;

        const presetWeights = [ { label: '50 gr', value: 50 }, { label: '100 gr', value: 100 }, { label: '250 gr', value: 250 }, { label: '500 gr', value: 500 }, { label: '750 gr', value: 750 }, { label: '1 kg', value: 1000 }, ];

        return (
            <div className="container-fluid d-flex flex-column" style={styles.page}>
                <div className='flex-grow-1 d-flex align-items-center justify-content-center'>
                    <Card className="p-2 p-md-4" style={{width: '100%', maxWidth: '900px'}}>
                        <Card.Body>
                            {loadingGoodsPrice ? (<div className="text-center p-5"><Spinner animation="border" /></div>) : (
                            <>
                                <div className="d-flex flex-wrap justify-content-center mb-3">
                                {presetWeights.map((preset) => {
                                    const presetPrice = getPrice(preset.value);
                                    return (
                                    <Button
                                        key={preset.value} variant="dark"
                                        className="m-2 d-flex flex-column justify-content-center align-items-center preset-weight-btn"
                                        onClick={() => handlePresetClick(preset.value, presetPrice)}
                                        disabled={presetPrice === 0 || loadingGoodsPrice}
                                    >
                                        <span className="fw-bold" style={{ fontSize: '1rem' }}>{preset.label}</span>
                                        {presetPrice > 0 ? <small style={{ fontSize: '0.85rem' }}>Rp {presetPrice.toLocaleString('id-ID')}</small> : <small className="text-muted">N/A</small>}
                                    </Button>
                                    );
                                })}
                                </div>
                                <hr />

                                <div className='sliders-container'>
                                <CustomRangeSlider
                                    label={`Kelipatan 1 Kg (0 - 20 Kg)`} value={kgValue}
                                    min={0} max={20} step={1}
                                    onChange={(e) => setKgValue(parseInt(e.target.value, 10))}
                                    price={priceKg} unit="kg" iconType="kg"
                                />
                                <CustomRangeSlider
                                    label={`Kelipatan 50 gr (0 - 950 gr)`} value={gramValue}
                                    min={0} max={950} step={50}
                                    onChange={(e) => setGramValue(parseInt(e.target.value, 10))}
                                    price={priceGram} unit="gr" iconType="gr"
                                />
                                </div>

                                <div className="modal-bottom-container mt-4">
                                    <div className="added-items-container">
                                    </div>
                                    <div className="total-summary-box">
                                        <div className="total-summary-header">{selectedItemNm}</div>
                                        <div className="total-summary-row">
                                        <span className="total-summary-value">{displayWeight}</span>
                                        </div>
                                        <div className="total-summary-row price">
                                        <span className="total-summary-value">{sliderPrice.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="d-grid mt-4">
                                    <Button variant={selectionMode === 'jual' ? 'primary' : 'success'} size="lg" onClick={handleConfirmWeight} disabled={sliderWeight <= 0 || sliderPrice <= 0}>
                                        {selectionMode === 'jual' ? 'Tambahkan ke Keranjang' : 'Konfirmasi Tukar Tambah'}
                                    </Button>
                                </div>
                            </>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            </div>
        );
    }
    
    return (
        <div style={styles.page}>
            <div style={styles.transactionCard}>
                <div style={styles.cardContent}>
                    <div style={styles.box}>
                        <h3 style={styles.boxHeader}>Item Dikembalikan</h3>
                        <div style={styles.boxContent}>
                            <div style={styles.itemsList}>
                                {tradeInCart.length === 0 ? <p className='text-muted fst-italic'>Belum ada item</p> :
                                    tradeInCart.map((item, index) => (
                                        <div key={`tradein-${index}`} style={styles.listItem}>
                                            <div>
                                                <div style={styles.itemName}>{item.comodity}</div>
                                                <div style={styles.itemDetails}>{(item.totalWeight / 1000).toFixed(1)} kg</div>
                                            </div>
                                            <div style={styles.itemPriceContainer}>
                                                <div style={styles.itemPrice}>{parseInt(item.totalPrice, 10).toLocaleString('id-ID')}</div>
                                                <Button variant="link" className="text-secondary p-1" onClick={() => handleRemoveTradeIn(index)}>
                                                    <BiX size={24} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div style={styles.totalRow}><div style={{ ...styles.priceDisplay, color: '#EF4444' }}>- {total_kembali.toLocaleString('id-ID')}</div></div>
                        <button style={styles.actionButton} onClick={() => { setSelectionMode('tukarTambah'); navigateTo('productSelection'); }}>
                            <BiTransfer className='me-2' /> Tambah Item Kembali
                        </button>
                    </div>

                    <div style={styles.controlsContainer}>
                        <div className="text-center"><h2 className='fw-bold' style={{fontSize: '2rem'}}>Proses Tukar Tambah</h2></div>
                        <div style={{ padding: '1.5rem', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB', width: '100%' }}>
                            <div id="result-label" style={styles.resultLabel}>{selisih > 0 ? "UANG DIBAYARKAN" : selisih < 0 ? "UANG DIKEMBALIKAN" : "TRANSAKSI IMPAS"}</div>
                            <div id="result-box" style={{ ...styles.resultBox, color: selisih > 0 ? '#10B981' : (selisih < 0 ? '#EF4444' : '#1F2937') }}>Rp {Math.abs(selisih).toLocaleString('id-ID')}</div>
                            <Button style={styles.finishButton} disabled={!bisa_selesai} onClick={handleDirectConfirm}><BiCheckCircle size={24}/> Selesaikan Transaksi</Button>
                        </div>
                    </div>

                    <div style={styles.box}>
                        <h3 style={styles.boxHeader}>Item Baru</h3>
                        <div style={styles.boxContent}>
                            <div style={styles.itemsList}>
                               {returSellCart.length === 0 ? <p className='text-muted fst-italic'>Belum ada item</p> :
                                    returSellCart.map((item, index) => (
                                         <div key={`sell-${index}`} style={styles.listItem}>
                                            <div>
                                                <div style={styles.itemName}>{item.comodity}</div>
                                                <div style={styles.itemDetails}>{(item.totalWeight / 1000).toFixed(1)} kg</div>
                                            </div>
                                            <div style={styles.itemPriceContainer}>
                                                <div style={styles.itemPrice}>{parseInt(item.totalPrice, 10).toLocaleString('id-ID')}</div>
                                                <Button variant="link" className="text-secondary p-1" onClick={() => removeFromReturSellCart(item.comodity)}>
                                                    <BiX size={24} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                         <div style={styles.totalRow}>Total Berat: {total_berat_baru_kg.toFixed(2)} kg<div style={{ ...styles.priceDisplay, color: '#10B981' }}>+ {total_baru.toLocaleString('id-ID')}</div></div>
                        <button style={styles.actionButton} onClick={() => { setSelectionMode('jual'); navigateTo('productSelection'); }}>
                            <BiPlus className='me-2' /> Tambah Item Baru
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal ini tetap ada di kode, tapi tidak akan dipanggil lagi dari tombol "Selesaikan Transaksi" */}
            <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
                <Modal.Header closeButton><Modal.Title>Konfirmasi Transaksi</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Rincian belanja untuk <strong>Customer #{tradeInCurrentCustomer + 1}</strong>:</p>
                    {loadingCountPrice ? (<div className="d-flex justify-content-center p-5"><Spinner animation="border" variant="primary" /></div>) : errorCountPrice ? (<Alert variant="danger">{errorCountPrice}</Alert>) : (
                        <Table responsive>
                            <thead><tr className="table-light"><th>Produk</th><th className="text-center">Diskon (Rp)</th><th className="text-end">Harga Akhir</th></tr></thead>
                            <tbody>
                                {mergedResult.map((item, idx) => {
                                    const isSellItem = item.source === 'penjualan';
                                    const manualDiscount = isSellItem ? (discounts[item.originalIndex] || 0) : 0;
                                    const priceAfterDiscount = item.totalPrice - manualDiscount;
                                    return (
                                        <tr key={idx} className="align-middle" style={{backgroundColor: isSellItem ? '' : '#e9f7ef'}}>
                                            <td><strong>{item.comodity}</strong><div className="text-muted small">{item.totalWeight} gr</div><div className="small fst-italic fw-bold" style={{color: isSellItem ? '#0d6efd' : '#198754'}}>{isSellItem ? "Penjualan" : "Pengembalian"}</div></td>
                                            <td className="text-center">
                                                {isSellItem ? (
                                                    <InputGroup style={{ minWidth: '150px', margin: 'auto' }}>
                                                        <Button variant="outline-danger" onClick={() => handleDiscountChange(item.originalIndex, 'decrease')} disabled={manualDiscount === 0}>-</Button>
                                                        <Form.Control className="text-center fw-bold" value={manualDiscount.toLocaleString('id-ID')} readOnly />
                                                        <Button variant="outline-success" onClick={() => handleDiscountChange(item.originalIndex, 'increase', item.totalPrice)} disabled={manualDiscount >= item.totalPrice}>+</Button>
                                                    </InputGroup>
                                                ) : (<span className='text-muted'>-</span>)}
                                            </td>
                                            <td className="text-end">
                                                <span className="fw-bold fs-6">Rp {priceAfterDiscount.toLocaleString('id-ID')}</span>
                                                {manualDiscount > 0 && (<div className="text-muted small text-decoration-line-through">Rp {item.totalPrice.toLocaleString('id-ID')}</div>)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                    <hr />
                    <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Subtotal</span><span>Rp {subtotal.toLocaleString()}</span></ListGroup.Item>
                        {totalDiscount > 0 && <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Diskon Manual</span><span className="text-danger">- Rp {totalDiscount.toLocaleString()}</span></ListGroup.Item>}
                        {tradeInTotal > 0 && (<ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Total Pengembalian</span><span className="text-success">- Rp {tradeInTotal.toLocaleString()}</span></ListGroup.Item>)}
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0 fw-bolder fs-5"><span>TOTAL AKHIR</span><span className="text-primary">Rp {grandTotal.toLocaleString()}</span></ListGroup.Item>
                    </ListGroup>
                    <Form.Group className="my-3">
                        <Form.Label className="fw-bold">Nominal Bayar</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>Rp</InputGroup.Text>
                            <Form.Control type="text" value={paymentAmount ? parseInt(paymentAmount, 10).toLocaleString('id-ID') : ""} onChange={handlePaymentChange} placeholder={"0"} size="lg" autoFocus readOnly/>
                        </InputGroup>
                    </Form.Group>
                    {paymentAmount && grandTotal > 0 && (
                        <div className={`alert d-flex justify-content-between align-items-center fw-bolder fs-5 ${change >= 0 ? 'alert-success' : 'alert-danger'}`}>
                            <span>{change >= 0 ? 'Kembalian' : 'Kurang Bayar'}</span>
                            <span>Rp {change.toLocaleString()}</span>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Tutup</Button>
                    <Button variant="primary" onClick={handleConfirmTransaction} disabled={change < 0 || !paymentAmount || loadingSaveTransaction}>{loadingSaveTransaction ? (<> <Spinner as="span" animation="border" size="sm" /> Menyimpan... </>) : ('Konfirmasi & Cetak Struk')}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Retur;