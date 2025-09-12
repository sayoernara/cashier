import React, { useCallback, useState, useContext, useMemo, useEffect } from 'react';

// Third-party library imports
import { Alert, Col, Row, Spinner, Button, Modal, Form, InputGroup, Table, Card, ListGroup } from 'react-bootstrap';
import { BiPlus, BiTransfer, BiTrash, BiCheckCircle, BiX, BiArrowBack } from 'react-icons/bi';
import { CiImageOff } from 'react-icons/ci';
import { FaShoppingBag, FaBalanceScale } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// Local imports (APIs, Contexts)
import { getGoodsPricePerGram, getStorageData, saveReturTransaction } from './apis/api';
import { GoodsContext } from './components/GoodsContext';


// --- STYLED COMPONENT --- //
const TukarBarangStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
            --primary-color: #4F46E5;
            --primary-hover: #4338CA;
            --success-color: #10B981;
            --danger-color: #EF4444;
            --neutral-bg: #F3F4F6;
            --card-bg-color: #ffffff;
            --text-primary: #1F2937;
            --text-secondary: #4B5563;
            --text-muted: #9CA3AF;
            --border-color: #E5E7EB;
            --border-radius: 12px;
            --swiper-pagination-color: #000;
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--neutral-bg);
            color: var(--text-primary);
        }
        .page-container {
            padding: 0;
            background-color: var(--neutral-bg);
            min-height: 100vh;
        }
        .transaction-box-card {
            background-color: #F9FAFB;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
            display: flex;
            flex-direction: column;
            padding: 1.25rem;
            text-align: center;
            height: 100%;
            min-height: 70vh;
        }
        .box-header-title {
            margin: 0 0 0.75rem 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 2px solid black;
            padding: 0.4rem;
            border-radius: 8px;
            background-color: #FFF;
            display: block;
            width: fit-content;
            margin-left: auto;
            margin-right: auto;
        }
        .item-list-container {
            flex-grow: 1;
            overflow-y: auto;
            text-align: left;
            width: 100%;
            margin-bottom: 0.75rem;
        }
        .list-item-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border-color);
        }
        .list-item-row:last-child {
            border-bottom: none;
        }
        .item-details { flex-grow: 1; }
        .item-details .item-name { font-weight: 500; font-size: 1.1rem; }
        .item-details .item-weight { font-size: 0.9rem; color: var(--text-muted); }
        .item-price-display {
            font-weight: 600;
            font-size: 1.1rem;
            color: var(--primary-color);
        }
        .remove-item-btn {
            background: none; border: none; cursor: pointer;
            padding: 0.4rem;
            margin-left: 0.4rem;
            color: var(--text-muted);
            transition: color 0.2s ease;
        }
        .remove-item-btn:hover { color: var(--danger-color); }
        .remove-item-btn svg { width: 20px; height: 20px; stroke-width: 1.5; }
        .total-display {
            font-size: 2rem;
            font-weight: 700;
            margin-top: auto;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-color);
        }
        .total-display small {
            font-size: 1.2rem !important;
        }
        .center-column-container {
            display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; height: 100%;
        }
        .center-card-title {
            font-size: 1.5rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 1.5rem;
            padding-top: 1.5rem;
        }
        .summary-box {
            width: 100%;
            padding: 1.25rem;
            text-align: center;
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius);
        }
        .summary-label {
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .summary-total {
            font-size: 2.25rem;
            font-weight: 700;
            margin: 0.75rem 0 2rem 0;
        }
        #btn-selesaikan-transaksi {
            width: 100%; max-width: 700px; margin: 0 auto;
            display: inline-flex; align-items: center; justify-content: center;
            gap: 0.5rem;
            padding: 0.8rem;
            font-size: 1.1rem;
            font-weight: 600;
            background-color: var(--success-color); color: white; border: none;
            border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
        }
        #btn-selesaikan-transaksi:hover { background-color: #059669; }
        #btn-selesaikan-transaksi:disabled { background-color: var(--text-muted); cursor: not-allowed; opacity: 0.6; }
        .tambah-item-btn {
            text-decoration: none; background: var(--primary-color); color: white;
            padding: 0.9rem 1.25rem;
            border-radius: 8px;
            font-size: 1.25rem;
            font-weight: 600;
            transition: all 0.2s ease;
            width: 100%;
            margin-top: 1.5rem;
            flex-shrink: 0;
            border: none;
            cursor: pointer;
        }
        .tambah-item-btn:hover { background: var(--primary-hover); }
        .content-page-header {
            background-color: var(--card-bg-color);
            padding: 0.75rem 1.25rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            max-width: 100%;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .content-page {
            max-width: 100%;
            margin: 0;
            padding: 1.5rem;
            background: var(--card-bg-color);
        }
        .content-page-header h2 {
            font-weight: 700;
            margin: 0;
            font-size: 1.5rem;
        }
        .btn-small-header {
            padding: 0.6rem 1rem !important;
            font-size: 0.9rem !important;
        }
        .btn-small-header svg {
            font-size: 1.2rem;
        }
        .page-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5rem;
            gap: 0.75rem;
        }
        .swiper-container {
            width: 100%;
            height: auto;
            padding-bottom: 40px !important;
            box-sizing: border-box;
            cursor: grab;
        }
        .swiper-container:active { cursor: grabbing; }
        .swiper-button-prev, .swiper-button-next, .swiper-pagination {
            display: none !important;
        }
        .goods-page-grid { display: flex; align-items: stretch; }
        .product-card-wrapper { height: 50%; padding-bottom: 0.25rem; }
        .product-card-small { display: flex; flex-direction: column; }
        .product-card-small .card-body { padding: 0.5rem; display: flex; flex-direction: column; flex-grow: 1; }
        .item-image-container { display: flex; justify-content: center; align-items: center; height: 70px; margin-bottom: 0.25rem; flex-shrink: 0; }
        .item-img-small { max-height: 100%; max-width: 100%; width: auto; object-fit: contain; cursor: pointer; }
        .item-img-small-placeholder { display: block; margin: 0 auto; max-height: 100%; max-width: 100%; cursor: pointer; }
        .product-title-small { font-size: 0.7rem; font-weight: bold; margin-bottom: 0.25rem; flex-shrink: 0; }
        .weight-buttons-container { width: 100%; }
        .weight-card-small { min-width: 50px; cursor: pointer; border-radius: 6px !important; flex: 1 1 0px; display: flex; flex-direction: column; }
        .weight-card-header { background-color: #2c3e50; color: white; padding: 3px 4px; font-size: 0.6rem; font-weight: bold; }
        .weight-card-body { background-color: white; color: #2c3e50; padding: 4px 0; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .weight-card-body.highlighted { background-color: #2ecc71; color: white; }
        .price-text { font-size: 0.65rem; font-weight: bold; line-height: 1; }
        .sliders-container { margin-top: 0.75rem; }
        .slider-group { position: relative; margin-bottom: 1.5rem; text-align: center; }
        .volume-bar-container { display: flex; justify-content: space-between; align-items: flex-end; height: 40px; margin-bottom: 8px; padding: 0 4px; }
        .volume-bar-container .bar { width: 3%; background-color: var(--border-color); border-radius: 4px; transition: all 0.1s ease-in-out; }
        .volume-bar-container .bar.active { background: linear-gradient(to top, #6ee7b7, #34d399); }
        .slider-group label { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-bottom: 1rem; font-size: 0.8em; background-color: #212529; color: white; padding: 4px 16px; border-radius: 8px; }
        .custom-slider-container { position: relative; height: 8px; display: flex; align-items: center; }
        .custom-slider-track-bg, .custom-slider-track-volume { position: absolute; top: 50%; transform: translateY(-50%); width: 100%; height: 100%; pointer-events: none; }
        .custom-slider-track-bg { background-color: var(--border-color); border-radius: 8px; }
        .custom-slider-track-volume { background: linear-gradient(to right, #6ee7b7, #34d399); border-radius: 8px; width: 0%; }
        input[type=range].custom-slider-input { position: absolute; width: 100%; height: 100%; -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; z-index: 2; margin: 0; padding: 0; }
        input[type=range].custom-slider-input::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; height: 20px; width: 20px; border-radius: 50%; background: var(--primary-color); border: 3px solid white; box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2); margin-top: -6px; }
        input[type=range].custom-slider-input::-moz-range-thumb { height: 20px; width: 20px; border-radius: 50%; background: var(--primary-color); border: 3px solid white; box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2); }
        .slider-tooltip { display: none; position: absolute; background: #212529; color: white; padding: 6px 10px; border-radius: 6px; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); font-size: 0.9rem; text-align: center; top: -35px; transform: translateX(-50%); z-index: 5; }
        .slider-tooltip .tooltip-price { font-size: 0.8em; opacity: 0.8; display: block; }
        .slider-tooltip.active { display: block; }
        .total-summary-box { background-color: #ffffff; border: 2px solid #000000; border-radius: 12px; padding: 3px; display: flex; flex-direction: column; align-items: center; gap: 2px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); width: 200px; flex-shrink: 0; }
        .total-summary-header { font-size: 0.8rem; font-weight: 700; background-color: #000000; color: #ffffff; padding: 3px 8px; width: 100%; text-align: center; border-radius: 8px; text-transform: uppercase; }
        .total-summary-row { width: 100%; text-align: center; padding: 1px 0; border-radius: 8px; }
        .total-summary-row.price { background-color: #28a745; color: #ffffff; }
        .total-summary-value { font-weight: 700; font-size: 1.1rem; letter-spacing: 1px; }
        .added-item-card { background-color: #111827; color: white; border-radius: 12px; width: 70px; height: 70px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 8px; position: relative; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); font-size: 0.9rem; font-weight: 700; line-height: 1.2; }
        .delete-item-icon { position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; background-color: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; cursor: pointer; transition: transform 0.2s, background-color 0.2s; border: 2px solid white; }
        .delete-item-icon:hover { transform: scale(1.1); background-color: #dc2626; }
        .modal-bottom-container { display: flex; align-items: flex-start; gap: 1rem; margin-top: 0.75rem; }
        .added-items-container { display: flex; flex-wrap: wrap; gap: 8px; flex-grow: 1; align-self: flex-start; }
    `}</style>
);


// --- HELPER FUNCTIONS --- //
const printReceipt = async (receiptData, number) => {
    try {
        const { items, summary } = receiptData;
        const transactionNumber = number;
        const line = '--------------------------------\n';
        let receiptText = '';
        receiptText += '        Sayoernara\n';
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
        };

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


// --- UI COMPONENTS --- //
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
                    return (
                        <div key={index} className={`bar ${isActive ? 'active' : ''}`} style={{ height: `${height}%` }} ></div>
                    );
                })}
            </div>
            <label>{renderIcon()}{label}</label>
            <div className="custom-slider-container">
                <div className="custom-slider-track-bg"></div>
                <div className="custom-slider-track-volume" style={{ width: `${percentage}%` }}></div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    className="custom-slider-input"
                    onChange={handleInteraction}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleMouseUp}
                />
                <div className={`slider-tooltip ${tooltipActive ? 'active' : ''}`} style={{ left: `${percentage}%` }}>
                    {value} {unit}
                    <span className="tooltip-price">Rp {price.toLocaleString('en-US')}</span>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT --- //
function Retur() {
    // Context values
    const {
        groupedGoods, selectedLetter, loadingGoods,
        tradeInCurrentCustomer, showModal, handleShowModal, handleCloseModal,
        tradeInCart, setTradeInCart, addToTradeInCart, removeFromTradeInCart,
        resultCountPrice, loadingCountPrice, errorCountPrice,
        discounts, setDiscounts,
        paymentAmount, setPaymentAmount,
        loadingSaveTransaction
    } = useContext(GoodsContext);

    // Component state
    const [currentView, setCurrentView] = useState('main'); // 'main', 'selectProduct', 'selectWeight', 'confirm'
    const [itemForWeightSelection, setItemForWeightSelection] = useState(null);
    const [transactionMode, setTransactionMode] = useState(null); // 'jual' or 'tukarTambah'
    const [returSellCart, setReturSellCart] = useState([]);
    const [errorGoodsPrice, setErrorGoodsPrice] = useState(null);
    const [loadingGoodsPrice, setLoadingGoodsPrice] = useState(false);
    const [goodsPrice, setGoodsPrice] = useState([]);
    const [kgValue, setKgValue] = useState(0);
    const [gramValue, setGramValue] = useState(0);

    const DISCOUNT_STEP = 500;
    const PRESET_WEIGHTS = [
        { label: '50 gr', value: 50 }, { label: '100 gr', value: 100 },
        { label: '250 gr', value: 250 }, { label: '500 gr', value: 500 },
        { label: '750 gr', value: 750 }, { label: '1 kg', value: 1000 },
    ];

    // Effects
    useEffect(() => {
        const cartKey = `retur_sell_${tradeInCurrentCustomer}`;
        const savedCart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        setReturSellCart(savedCart);
    }, [tradeInCurrentCustomer]);

    // Memos for calculated values
    const pages = useMemo(() => {
        const result = [];
        const itemsPerPage = 8;
        const filtered = Object.keys(groupedGoods).filter((comodity) => {
            if (!selectedLetter) return true;
            return comodity.toUpperCase().startsWith(selectedLetter);
        });
        for (let i = 0; i < filtered.length; i += itemsPerPage) {
            result.push(filtered.slice(i, i + itemsPerPage));
        }
        return result;
    }, [groupedGoods, selectedLetter]);

    const returnedItemsTotal = tradeInCart.reduce((sum, item) => sum + parseInt(item.totalPrice || 0, 10), 0);
    const newItemsTotal = returSellCart.reduce((sum, item) => sum + parseInt(item.totalPrice || 0, 10), 0);
    const totalNewWeight = returSellCart.reduce((sum, item) => sum + parseInt(item.totalWeight || 0, 10), 0);
    const transactionImpas = newItemsTotal - returnedItemsTotal;
    const bisaSelesai = returSellCart.length > 0 || tradeInCart.length > 0;
    
    // --- Data Fetching --- //
    const fetchGoodsPricePerGram = useCallback(async (selectedIdItem) => {
        setLoadingGoodsPrice(true);
        setErrorGoodsPrice(null);
        try {
            const result = await getGoodsPricePerGram(selectedIdItem);
            const priceData = result?.data?.price?.[0] || [];
            setGoodsPrice(priceData);
        } catch (err) {
            setErrorGoodsPrice(err.message);
            setGoodsPrice([]);
        } finally {
            setLoadingGoodsPrice(false);
        }
    }, []);

    const fetchReturTransaction = async (transactionPayload) => {
        try {
            const response = await saveReturTransaction(transactionPayload);
            Swal.fire('Sukses', `Transaksi berhasil dengan nomor: ${response.data.message.number}`, 'success');
            printReceipt(transactionPayload, response.data.message.number);

            // Clear state and local storage after successful transaction
            localStorage.setItem("tradeInCarts", JSON.stringify([]));
            localStorage.setItem(`retur_sell_${tradeInCurrentCustomer}`, JSON.stringify([]));
            setReturSellCart([]);
            setTradeInCart([]);
            setCurrentView('main');
        } catch (error) {
            Swal.fire('Error', `Gagal menyimpan transaksi: ${error.message}`, 'error');
        }
    };
    
    // --- Cart Management --- //
    const addToReturSellCart = (comodity, id_item, weight, price) => {
        setReturSellCart((prevCart) => {
            const newItem = {
                comodity,
                id_item,
                totalWeight: parseInt(weight, 10),
                totalPrice: parseInt(price, 10),
                type: 'PENJUALAN'
            };
            const updatedCart = [...prevCart, newItem];
            localStorage.setItem(`retur_sell_${tradeInCurrentCustomer}`, JSON.stringify(updatedCart));
            return updatedCart;
        });
    };

    const removeFromReturSellCart = (indexToRemove) => {
        const updatedCart = returSellCart.filter((_, index) => index !== indexToRemove);
        setReturSellCart(updatedCart);
        localStorage.setItem(`retur_sell_${tradeInCurrentCustomer}`, JSON.stringify(updatedCart));
    };

    const handleRemoveTradeIn = (index) => {
        removeFromTradeInCart(index);
    };

    // --- Event Handlers --- //
    const handleShowProductSelection = (mode) => {
        setTransactionMode(mode);
        setCurrentView('selectProduct');
    };

    const handleProductImageClick = (id, name) => {
        setItemForWeightSelection({ id, name });
        fetchGoodsPricePerGram(id);
        setCurrentView('selectWeight');
    };

    const handleWeightCardClick = (comodity, subItem) => {
        const { id_item, weight_Gr, price_per_Gr } = subItem;
        const cleanPrice = parseInt(price_per_Gr, 10);
        const cleanWeight = parseInt(weight_Gr, 10);

        if (transactionMode === 'jual') {
            addToReturSellCart(comodity, id_item, cleanWeight, cleanPrice);
        } else {
            const tradeInItem = { id_item, comodity, totalWeight: cleanWeight, totalPrice: cleanPrice, type: 'PENGEMBALIAN' };
            addToTradeInCart(tradeInItem);
        }

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${comodity} (${subItem.weight_txt}) ditambahkan`,
            showConfirmButton: false,
            timer: 1500
        });

        setCurrentView('main');
    };

    const handleSliderRelease = (weight, price) => {
        if (weight > 0 && price > 0) {
            const { id, name } = itemForWeightSelection;
            if (transactionMode === 'jual') {
                addToReturSellCart(name, id, weight, price);
            } else {
                const tradeInItem = { id_item: id, comodity: name, totalWeight: weight, totalPrice: price, type: 'PENGEMBALIAN' };
                addToTradeInCart(tradeInItem);
            }
        }
    };

    const handleKgSliderRelease = () => {
        const weightInGram = kgValue * 1000;
        if (weightInGram <= 0) return;
        const price = getPrice(weightInGram);
        handleSliderRelease(weightInGram, price);
        setKgValue(0);
        setCurrentView('main');
    };

    const handleGramSliderRelease = () => {
        if (gramValue <= 0) return;
        const price = getPrice(gramValue);
        handleSliderRelease(gramValue, price);
        setGramValue(0);
        setCurrentView('main');
    };
    
    const handlePresetClick = (weight, price) => {
        if (weight > 0 && price > 0) {
            const { id, name } = itemForWeightSelection;
            const cleanPrice = parseInt(price, 10);
            const cleanWeight = parseInt(weight, 10);
            if (transactionMode === 'jual') {
                addToReturSellCart(name, id, cleanWeight, cleanPrice);
            } else {
                const tradeInItem = { id_item: id, comodity: name, totalWeight: cleanWeight, totalPrice: cleanPrice, type: 'PENGEMBALIAN' };
                addToTradeInCart(tradeInItem);
            }
        }
        setCurrentView('main');
    };
    
    // --- Confirmation Screen Logic --- //
    const subtotal = resultCountPrice.reduce((sum, item) => sum + parseInt(item.totalPrice || 0, 10), 0);
    const totalDiscount = resultCountPrice.reduce((sum, item, idx) => sum + (discounts[idx] || 0), 0);
    const tradeInTotal = resultCountPrice.filter(item => item.source === "retur").reduce((sum, item) => sum + parseInt(item.totalPrice || 0, 10), 0);
    const grandTotal = subtotal - totalDiscount - tradeInTotal;
    const change = parseInt(paymentAmount || 0, 10) - grandTotal;

const TransactionModal = ({ show, onHide, currentCustomer }) => {
  const {
    resultCountPrice, loadingCountPrice, errorCountPrice,
    discounts, setDiscounts, paymentAmount, setPaymentAmount,
    fetchTransaction, loadingSaveTransaction
  } = useContext(GoodsContext);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCheckingMember, setIsCheckingMember] = useState(false);
  const [memberInfo, setMemberInfo] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [idVoucher, setIdVoucher] = useState(null);

  useEffect(() => {
    if (!show) {
      setPhoneNumber('');
      setMemberInfo(null);
      setVoucherDiscount(0);
      setIdVoucher(null);
    }
  }, [show]);

  const DISCOUNT_STEP = 500;

  const subtotal = useMemo(() => resultCountPrice.reduce((sum, item) => sum + item.totalPrice, 0), [resultCountPrice]);
  const totalDiscount = useMemo(() => discounts.reduce((sum, discount) => sum + (discount || 0), 0), [discounts]);
  const grandTotal = subtotal - totalDiscount - voucherDiscount;
  const change = parseInt(paymentAmount || 0, 10) - grandTotal;

  const handleCheckMember = async () => {
    if (!phoneNumber) {
      Swal.fire('Error', 'Silakan masukkan nomor telepon.', 'error');
      return;
    }
    setIsCheckingMember(true);
    setMemberInfo(null);
    setVoucherDiscount(0);
    try {
      const response = await getVoucherByphone(phoneNumber);
      const voucher = response.data.voucher;

      if (voucher && voucher.nominal) {
        const nominalValue = parseInt(voucher.nominal, 10);
        setMemberInfo(voucher);
        setIdVoucher(voucher.id_voucher);
        setVoucherDiscount(nominalValue);
        Swal.fire('Voucher Ditemukan!', `Anda mendapatkan diskon sebesar Rp ${nominalValue.toLocaleString()}`, 'success');
      } else {
        Swal.fire('Info', 'Member tidak ditemukan atau tidak memiliki voucher aktif.', 'info');
      }
    } catch (error) {
      console.error("Gagal cek member:", error);
      setVoucherDiscount(0);
      Swal.fire('Error', 'Gagal terhubung ke server atau member tidak ditemukan.', 'error');
    } finally {
      setIsCheckingMember(false);
    }
  };

  const handleDiscountChange = (index, operation, itemPrice) => {
    const newDiscounts = [...discounts];
    const currentDiscount = parseInt(newDiscounts[index] || 0, 10);
    let newValue = currentDiscount;
    if (operation === 'increase') {
      newValue = Math.min(currentDiscount + DISCOUNT_STEP, parseInt(itemPrice, 10));
    } else if (operation === 'decrease') {
      newValue = Math.max(currentDiscount - DISCOUNT_STEP, 0);
    }
    newDiscounts[index] = newValue;
    setDiscounts(newDiscounts);
  };

  const handlePaymentChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPaymentAmount(value);
  };

  const handleConfirmTransaction = async () => {
    const summaryData = {
      subtotal, totalDiscount, voucherDiscount, idVoucher, phoneNumber, grandTotal,
      paymentAmount: parseInt(paymentAmount, 10),
      change,
    };

    try {
      const response = await fetchTransaction(summaryData);
      if (response && response.success) {
        const receiptData = {
          items: resultCountPrice.map((item, index) => ({ ...item, discount: discounts[index] || 0 })),
          summary: summaryData,
          transactionNumber: response.number,
        };
        await printReceipt(receiptData);
      } else {
        Swal.fire({ icon: 'error', title: 'Transaksi Gagal', text: response.message || 'Gagal menyimpan transaksi, struk tidak akan dicetak.' });
      }
    } catch (error) {
      console.error("Error saat menyimpan transaksi:", error);
      Swal.fire({ icon: 'error', title: 'Koneksi Gagal', text: 'Tidak dapat menyimpan transaksi ke server. Silakan coba lagi.' });
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Konfirmasi Transaksi</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Rincian belanja untuk <strong>Customer #{currentCustomer + 1}</strong>:</p>
        {loadingCountPrice ? (
          <div className="d-flex justify-content-center p-5"><Spinner animation="border" variant="primary" /></div>
        ) : errorCountPrice ? (
          <Alert variant="danger">{errorCountPrice}</Alert>
        ) : (
          <Table responsive>
            <thead><tr className="table-light"><th>Produk</th><th className="text-center">Diskon (Rp)</th><th className="text-end">Harga Akhir</th></tr></thead>
            <tbody>
              {resultCountPrice.map((item, idx) => {
                const currentDiscount = discounts[idx] || 0;
                const priceAfterDiscount = item.totalPrice - currentDiscount;
                return (
                  <tr key={idx} className="align-middle">
                    <td><strong>{item.comodity}</strong><div className="text-muted small">{item.totalWeight} gr</div></td>
                    <td className="text-center">
                      <InputGroup style={{ minWidth: '150px', margin: 'auto' }}>
                        <Button variant="outline-danger" onClick={() => handleDiscountChange(idx, 'decrease')} disabled={currentDiscount === 0}>-</Button>
                        <Form.Control className="text-center fw-bold" value={currentDiscount.toLocaleString('id-ID')} readOnly />
                        <Button variant="outline-success" onClick={() => handleDiscountChange(idx, 'increase', item.totalPrice)} disabled={currentDiscount >= item.totalPrice}>+</Button>
                      </InputGroup>
                    </td>
                    <td className="text-end">
                      <span className="fw-bold fs-6">Rp {priceAfterDiscount.toLocaleString('id-ID')}</span>
                      {currentDiscount > 0 && <div className="text-muted small text-decoration-line-through">Rp {item.totalPrice.toLocaleString('id-ID')}</div>}
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
          <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Total Diskon</span><span className="text-danger">- Rp {totalDiscount.toLocaleString()}</span></ListGroup.Item>
          {voucherDiscount > 0 && (
            <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0">
              <span>Discount Voucher</span>
              <span className="text-danger">- Rp {voucherDiscount.toLocaleString()}</span>
            </ListGroup.Item>
          )}
          <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0 fw-bolder fs-5"><span>TOTAL AKHIR</span><span className="text-primary">Rp {grandTotal.toLocaleString()}</span></ListGroup.Item>
        </ListGroup>
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Nomor Telepon Member (Opsional)</Form.Label>
          <InputGroup>
            <Form.Control
              type="tel"
              placeholder="Masukkan nomor telepon"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <Button variant="outline-primary" onClick={handleCheckMember} disabled={isCheckingMember}>
              {isCheckingMember ? <Spinner as="span" animation="border" size="sm" /> : 'Cek Member'}
            </Button>
          </InputGroup>
        </Form.Group>
        <Form.Group className="my-3">
          <Form.Label className="fw-bold">Nominal Bayar</Form.Label>
          <InputGroup>
            <InputGroup.Text>Rp</InputGroup.Text>
            <Form.Control type="text" value={paymentAmount ? parseInt(paymentAmount, 10).toLocaleString('id-ID') : ""} onChange={handlePaymentChange} placeholder="Masukkan jumlah uang pembayaran" size="lg" autoFocus />
          </InputGroup>
        </Form.Group>
        {paymentAmount && change >= 0 && (
          <div className="alert alert-success d-flex justify-content-between align-items-center fw-bolder fs-5">
            <span>Kembalian</span><span>Rp {change.toLocaleString()}</span>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Tutup</Button>
        <Button variant="primary" onClick={handleConfirmTransaction} disabled={change < 0 || !paymentAmount || loadingSaveTransaction}>
          {loadingSaveTransaction ? (<><Spinner as="span" animation="border" size="sm" /> Menyimpan...</>) : 'Konfirmasi & Cetak Struk'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
    
    const handleConfirmTransaction = () => {
        const summaryData = {
            subtotal,
            totalDiscount,
            tradeInTotal,
            grandTotal,
            paymentAmount: parseInt(paymentAmount, 10),
            change
        };
        
        const allItems = [
            ...returSellCart.map((item, index) => ({
                comodity: item.comodity,
                id_item: item.id_item,
                totalWeight: item.totalWeight,
                originalPrice: item.totalPrice,
                discount: discounts[index] || 0,
                finalPrice: item.totalPrice - (discounts[index] || 0),
                type: item.type || "PENJUALAN",
            })),
            ...tradeInCart.map((item) => ({
                comodity: item.comodity,
                id_item: item.id_item,
                totalWeight: item.totalWeight,
                originalPrice: item.totalPrice,
                discount: item.totalPrice,
                finalPrice: 0,
                type: item.type || "PENGEMBALIAN",
            })),
        ];

        const mergedItems = Object.values(allItems.reduce((acc, item) => {
            const key = `${item.id_item}-${item.comodity}`;
            if (!acc[key]) {
                acc[key] = { ...item };
            } else {
                acc[key].totalWeight += parseInt(item.totalWeight);
                acc[key].originalPrice += parseInt(item.originalPrice);
                acc[key].discount += parseInt(item.discount);
                acc[key].finalPrice += parseInt(item.finalPrice);
            }
            return acc;
        }, {}));

        const transactionPayload = {
            customerIndex: tradeInCurrentCustomer,
            items: mergedItems,
            summary: summaryData,
            location: getStorageData().decryptidloc,
            cashier: getStorageData().decryptuname,
            transactionDate: new Date().toISOString()
        };
        
        fetchReturTransaction(transactionPayload);
    };


    // --- Utility Functions --- //
    const getPrice = (weight) => {
        if (!goodsPrice) return 0;

        const found = goodsPrice.find((g) => parseInt(g.weight_Gr, 10) === weight);
        if (found) return parseInt(found.price_per_Gr, 10);

        if (weight % 1000 === 0) {
            const base = goodsPrice.find((g) => parseInt(g.weight_Gr, 10) === 1000);
            return base ? (weight / 1000) * parseInt(base.price_per_Gr, 10) : 0;
        }
        if (weight % 50 === 0) {
            const base = goodsPrice.find((g) => parseInt(g.weight_Gr, 10) === 50);
            return base ? (weight / 50) * parseInt(base.price_per_Gr, 10) : 0;
        }
        return 0;
    };

    const getResultLabel = () => {
        if (transactionImpas < 0) return "UANG DIKEMBALIKAN";
        if (transactionImpas > 0) return "UANG DIBAYARKAN";
        return "TRANSAKSI IMPAS";
    };

    const getResultColor = () => {
        if (transactionImpas < 0) return 'var(--success-color)';
        if (transactionImpas > 0) return 'var(--danger-color)';
        return 'var(--text-primary)';
    };

    // --- Render Logic --- //
    const renderContent = () => {
        switch (currentView) {
            case 'selectProduct':
                return (
                    <div className="content-page-container">
                        <div className="content-page-header">
                            <h2>Pilih Item</h2>
                            <Button variant="secondary" onClick={() => setCurrentView('main')} className="btn-small-header">
                                <BiArrowBack className="me-2" /> Kembali ke Dashbor Tukar
                            </Button>
                        </div>
                        <div className="content-page">
                            {loadingGoods ? (
                                <div className="text-center p-5"><Spinner animation="border" /></div>
                            ) : (
                                <Swiper modules={[Pagination]} spaceBetween={20} slidesPerView={1} pagination={{ clickable: true }} navigation={false} className="swiper-container">
                                    {pages.map((page, pageIndex) => (
                                        <SwiperSlide key={pageIndex} className="goods-page-grid">
                                            <Row className="g-1 h-100">
                                                {page.map((comodity) => {
                                                    const representativeItem = groupedGoods[comodity]?.[0];
                                                    return (
                                                        <Col key={comodity} xs={3} className="product-card-wrapper">
                                                            <Card className="h-100 shadow-sm border-0 product-card-small">
                                                                <Card.Body>
                                                                    <div className="item-image-container">
                                                                        {representativeItem.img ? (
                                                                            <img src={representativeItem.img} alt={comodity} className="img-fluid item-img-small" onClick={() => handleProductImageClick(representativeItem.id_item, comodity)} />
                                                                        ) : (
                                                                            <CiImageOff size={60} className="text-secondary item-img-small-placeholder" onClick={() => handleProductImageClick(representativeItem.id_item, comodity)} />
                                                                        )}
                                                                    </div>
                                                                    <Card.Title className="product-title-small text-center">{comodity}</Card.Title>
                                                                    <div className="weight-buttons-container d-flex flex-wrap justify-content-center gap-1 mt-auto">
                                                                        {[...groupedGoods[comodity]].reverse().map((sub, i) => {
                                                                            const isHighlighted = sub.weight_txt === "Kg";
                                                                            return (
                                                                                <Card key={i} className="text-center flex-fill border-0 shadow-sm overflow-hidden weight-card-small" onClick={() => handleWeightCardClick(comodity, sub)}>
                                                                                    <div className="weight-card-header">{sub.weight_txt}</div>
                                                                                    <div className={`weight-card-body ${isHighlighted ? 'highlighted' : ''}`}>
                                                                                        <div className="price-text">{(parseInt(sub.price_per_Gr) / 1000)}</div>
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
                    </div>
                );

            case 'selectWeight':
                const kgInGram = kgValue * 1000;
                const priceKg = kgValue > 0 ? getPrice(kgInGram) : 0;
                const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
                
                const itemsInCart = (transactionMode === 'jual' ? returSellCart : tradeInCart)
                    .filter(item => item.comodity === itemForWeightSelection.name);
                const totalInCartWeight = itemsInCart.reduce((sum, item) => sum + parseInt(item.totalWeight || 0), 0);
                const totalInCartPrice = itemsInCart.reduce((sum, item) => sum + parseInt(item.totalPrice || 0), 0);

                const sliderWeight = kgInGram + gramValue;
                const sliderPrice = priceKg + priceGram;

                const combinedTotalWeight = totalInCartWeight + sliderWeight;
                const combinedTotalPrice = totalInCartPrice + sliderPrice;
                
                const displayWeight = combinedTotalWeight > 950
                    ? `${(combinedTotalWeight / 1000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} KG`
                    : `${combinedTotalWeight} GR`;

                return (
                    <div className="content-page-container">
                        <div className="content-page-header">
                            <h2>{transactionMode === 'jual' ? 'Pilih Berat Penjualan' : 'Pilih Berat Tukar Tambah'}: {itemForWeightSelection.name}</h2>
                            <Button variant="secondary" onClick={() => setCurrentView('selectProduct')} className="btn-small-header">
                                <BiArrowBack className="me-2" /> Kembali
                            </Button>
                        </div>
                        <div className="content-page">
                            <div className="d-flex flex-wrap justify-content-center mb-4">
                                {PRESET_WEIGHTS.map((preset) => {
                                    const presetPrice = getPrice(preset.value);
                                    return (
                                        <Button 
                                            key={preset.value} 
                                            variant="dark" 
                                            className="m-2 d-flex flex-column justify-content-center align-items-center" 
                                            style={{ width: '90px', height: '70px', borderRadius: '8px', padding: '8px 4px', lineHeight: '1.2' }} 
                                            onClick={() => handlePresetClick(preset.value, presetPrice)} 
                                            disabled={!presetPrice || presetPrice === 0}
                                        >
                                            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>{preset.label}</span>
                                            {presetPrice > 0 ? (
                                                <small style={{ fontSize: '0.75rem' }}>Rp {presetPrice.toLocaleString('en-US')}</small>
                                            ) : (
                                                <small className="text-muted">N/A</small>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                            <hr />
                            <div className='sliders-container'>
                                <CustomRangeSlider label="Kelipatan 1 Kg (0 - 20 Kg)" value={kgValue} min={0} max={20} step={1} onChange={(e) => setKgValue(parseInt(e.target.value, 10))} price={priceKg} unit="kg" iconType="kg" onRelease={handleKgSliderRelease} />
                                <CustomRangeSlider label="Kelipatan 50 gr (0 - 950 gr)" value={gramValue} min={0} max={950} step={50} onChange={(e) => setGramValue(parseInt(e.target.value, 10))} price={priceGram} unit="gr" iconType="gr" onRelease={handleGramSliderRelease} />
                            </div>
                            <div className="modal-bottom-container">
                                <div className="added-items-container">
                                    {itemsInCart.map((item, index) => (
                                        <div key={index} className="added-item-card">
                                            {item.totalWeight > 950 ? `${item.totalWeight / 1000} KG` : `${item.totalWeight} GR`}
                                            <div className="delete-item-icon" onClick={() => transactionMode === 'jual' ? removeFromReturSellCart(index) : handleRemoveTradeIn(index)}>&times;</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="total-summary-box">
                                    <div className="total-summary-header">{itemForWeightSelection.name}</div>
                                    <div className="total-summary-row">
                                        <span className="total-summary-value">{displayWeight}</span>
                                    </div>
                                    <div className="total-summary-row price">
                                        <span className="total-summary-value">{combinedTotalPrice.toLocaleString('en-US')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'main':
            default:
                return (
                    <Row className="g-4 justify-content-center align-items-stretch">
                        <Col md={4} lg={4}>
                            <div className="transaction-box-card">
                                <h3 className="box-header-title">Item Dikembalikan</h3>
                                <div className="item-list-container">
                                    {tradeInCart.map((item, idx) => (
                                        <div key={`tradein-${idx}`} className="list-item-row">
                                            <div className="item-details">
                                                <div className="item-name">{item.comodity}</div>
                                                <div className="item-weight">{(parseInt(item.totalWeight || 0) / 1000).toFixed(2)} kg</div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <span className="item-price-display">{Number(item.totalPrice).toLocaleString('en-US')}</span>
                                                <button onClick={() => handleRemoveTradeIn(idx)} className="remove-item-btn" title="Hapus item"><BiX /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="total-display" style={{ color: 'var(--danger-color)' }}>
                                    - {returnedItemsTotal.toLocaleString('en-US')}
                                </div>
                                <Button className="tambah-item-btn" onClick={() => handleShowProductSelection('tukarTambah')}>
                                    Tambah Item Kembali
                                </Button>
                            </div>
                        </Col>

                        <Col md={4} lg={3} className="d-flex flex-column justify-content-center align-items-center">
                            <div className="center-column-container">
                                <h2 className="center-card-title">Proses<br />Tukar Tambah</h2>
                                <div className="summary-box">
                                    <div className="summary-label">{getResultLabel()}</div>
                                    <div className="summary-total" style={{ color: getResultColor() }}>
                                        Rp {Math.abs(transactionImpas).toLocaleString('en-US')}
                                    </div>
                                    <Button id="btn-selesaikan-transaksi" onClick={() => handleShowModal()} disabled={!bisaSelesai}>
                                        <BiCheckCircle size={24} /> Selesaikan Transaksi
                                    </Button>
                                </div>
                            </div>
                        </Col>

                        <Col md={4} lg={4}>
                            <div className="transaction-box-card">
                                <h3 className="box-header-title">Item Baru</h3>
                                <div className="item-list-container">
                                    {returSellCart.map((item, idx) => (
                                        <div key={`newsell-${idx}`} className="list-item-row">
                                            <div className="item-details">
                                                <div className="item-name">{item.comodity}</div>
                                                <div className="item-weight">{(parseInt(item.totalWeight || 0) / 1000).toFixed(2)} kg</div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <span className="item-price-display">{Number(item.totalPrice).toLocaleString('en-US')}</span>
                                                <button onClick={() => removeFromReturSellCart(idx)} className="remove-item-btn" title="Hapus item"><BiX /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="total-display" style={{ color: 'var(--success-color)' }}>
                                    <small style={{ display: 'block', fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        Total Berat: {(totalNewWeight / 1000).toFixed(2)} kg
                                    </small>
                                    + {newItemsTotal.toLocaleString('en-US')}
                                </div>
                                <Button className="tambah-item-btn" onClick={() => handleShowProductSelection('jual')}>
                                    Tambah Item Baru
                                </Button>
                            </div>
                        </Col>
                    </Row>
                );
        }
    };

    return (
        <>
            <TukarBarangStyles />
            <TransactionModal show={showModal} onHide={handleCloseModal} />
            <div className="page-container d-flex flex-column">
                {renderContent()}
            </div>
        </>
    );
}

export default Retur;