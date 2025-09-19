import React, { useCallback, useState, useContext, useMemo, useEffect } from 'react';
import { getGoodsPricePerGram, getVoucherByphone } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal, Form } from 'react-bootstrap';
import { CiImageOff } from 'react-icons/ci';
import { GoodsContext } from './components/GoodsContext';
import { FaShoppingBag, FaBalanceScale } from 'react-icons/fa';
import './Dashboard.css';
import Swal from 'sweetalert2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// --- FUNGSI HELPER UNTUK CETAK ---
const printReceipt = async (receiptData) => {
  try {
    const { items, summary, transactionNumber } = receiptData;
    const receiptWidth = 32;

    const ESC = '\x1B';
    const GS = '\x1D';

    const INIT_PRINTER = ESC + '@';
    const BOLD_ON = ESC + 'E' + '\x01';
    const BOLD_OFF = ESC + 'E' + '\x00';
    const CUT_PAPER = GS + 'V' + '\x42' + '\x00';

    const createLine = (left, right) => {
      const rightStr = String(right);
      const remainingSpace = receiptWidth - left.length - rightStr.length;
      const spaces = ' '.repeat(Math.max(0, remainingSpace));
      return `${left}${spaces}${rightStr}\n`;
    };

    const createCenterLine = (text) => {
      const remainingSpace = receiptWidth - text.length;
      const padLeft = Math.floor(remainingSpace / 2);
      return ' '.repeat(padLeft) + text + '\n';
    };

    let receiptText = '';
    receiptText += INIT_PRINTER;

    receiptText += BOLD_ON;
    receiptText += createCenterLine('Sayoernara');
    receiptText += BOLD_OFF;
    receiptText += createCenterLine('Terima Kasih!');
    receiptText += '-'.repeat(receiptWidth) + '\n';

    receiptText += createLine(`No: ${transactionNumber}`, '');
    receiptText += createLine(`Tgl: ${new Date().toLocaleString('id-ID')}`, '');
    receiptText += '-'.repeat(receiptWidth) + '\n';

    items.forEach(item => {
      const priceAfterDiscount = item.totalPrice - (item.discount || 0);
      const itemName = `${item.comodity} (${item.totalWeight} gr)`;
      const itemPrice = `Rp ${priceAfterDiscount.toLocaleString('id-ID')}`;
      receiptText += createLine(itemName, itemPrice);
    });
    receiptText += '-'.repeat(receiptWidth) + '\n';

    receiptText += createLine('Subtotal', `Rp ${summary.subtotal.toLocaleString('id-ID')}`);
    if (summary.totalDiscount > 0) {
      receiptText += createLine('Diskon', `-Rp ${summary.totalDiscount.toLocaleString('id-ID')}`);
    }
    receiptText += BOLD_ON;
    receiptText += createLine('Grand Total', `Rp ${summary.grandTotal.toLocaleString('id-ID')}`);
    receiptText += BOLD_OFF;
    receiptText += createLine('Bayar', `Rp ${summary.paymentAmount.toLocaleString('id-ID')}`);
    receiptText += createLine('Kembali', `Rp ${summary.change.toLocaleString('id-ID')}`);
    receiptText += '\n\n';

    receiptText += CUT_PAPER;

    const encodedText = encodeURIComponent(receiptText);
    window.location.href = `rawbt:${encodedText}`;

  } catch (error) {
    console.error("Gagal mencetak struk:", error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Mencetak',
      text: 'Pastikan aplikasi RawBT sudah terinstall dan berjalan dengan baik.',
    });
  }
};


// --- KELOMPOK KOMPONEN UNTUK CUSTOMISASI BERAT (MODAL & SLIDER) ---
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

const CustomWeightModal = ({ show, onHide, itemId, itemName }) => {
  const { cart, addToCart, removeFromCart } = useContext(GoodsContext); 
  const [errorGoodsPrice, setErrorGoodsPrice] = useState(null);
  const [loadingGoodsPrice, setLoadingGoodsPrice] = useState(false);
  const [goodsPrice, setGoodsPrice] = useState([]);
  const [kgValue, setKgValue] = useState(0);
  const [gramValue, setGramValue] = useState(0);

  const fetchGoodsPricePerGram = useCallback(async (selectedIdItem) => {
    if (!selectedIdItem) return;
    try {
      setLoadingGoodsPrice(true);
      setErrorGoodsPrice(null);
      const result = await getGoodsPricePerGram(selectedIdItem);
      setGoodsPrice(result.data.price[0] || []);
    } catch (err) {
      setErrorGoodsPrice(err.message);
    } finally {
      setLoadingGoodsPrice(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      fetchGoodsPricePerGram(itemId);
    } else {
      setKgValue(0);
      setGramValue(0);
      setGoodsPrice([]);
      setErrorGoodsPrice(null);
    }
  }, [show, itemId, fetchGoodsPricePerGram]);

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

  const presetWeights = [
    { label: '50 gr', value: 50 }, { label: '100 gr', value: 100 },
    { label: '250 gr', value: 250 }, { label: '500 gr', value: 500 },
    { label: '750 gr', value: 750 }, { label: '1 kg', value: 1000 },
  ];
  
  const itemsInCart = useMemo(() => cart.filter(item => item.comodity === itemName), [cart, itemName]);
  const totalInCartWeight = useMemo(() => itemsInCart.reduce((sum, item) => sum + item.totalWeight, 0), [itemsInCart]);
  const totalInCartPrice = useMemo(() => itemsInCart.reduce((sum, item) => sum + item.totalPrice, 0), [itemsInCart]);

  const sliderWeight = (kgValue * 1000) + gramValue;
  const priceKg = kgValue > 0 ? getPrice(kgValue * 1000) : 0;
  const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
  const sliderPrice = priceKg + priceGram;

  const combinedTotalWeight = totalInCartWeight + sliderWeight;
  const combinedTotalPrice = totalInCartPrice + sliderPrice;

  const displayWeight = combinedTotalWeight > 950
    ? `${(combinedTotalWeight / 1000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} KG`
    : `${combinedTotalWeight} GR`;

  const handleKgSliderRelease = () => {
    const weightInGram = kgValue * 1000;
    if (weightInGram > 0 && priceKg > 0) {
      addToCart(itemName, itemId, weightInGram, priceKg);
      setKgValue(0);
    }
  };

  const handleGramSliderRelease = () => {
    if (gramValue > 0 && priceGram > 0) {
      addToCart(itemName, itemId, gramValue, priceGram);
      setGramValue(0);
    }
  };

  const handlePresetAddToCart = (weight, price) => {
    if (weight > 0 && price > 0) {
      addToCart(itemName, itemId, weight, price);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size='xl'>
      <Modal.Body>
        {loadingGoodsPrice && <div className="text-center"><Spinner animation="border" /></div>}
        {errorGoodsPrice && <Alert variant="danger">{errorGoodsPrice}</Alert>}

        <div className="d-flex flex-wrap justify-content-center mb-3">
          {presetWeights.map((preset) => {
            const presetPrice = getPrice(preset.value);
            return (
              <Button
                key={preset.value} variant="dark"
                className="m-2 d-flex flex-column justify-content-center align-items-center preset-weight-btn"
                onClick={() => handlePresetAddToCart(preset.value, presetPrice)}
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
            onRelease={handleKgSliderRelease}
          />
          <CustomRangeSlider
            label={`Kelipatan 50 gr (0 - 950 gr)`} value={gramValue}
            min={0} max={950} step={50}
            onChange={(e) => setGramValue(parseInt(e.target.value, 10))}
            price={priceGram} unit="gr" iconType="gr"
            onRelease={handleGramSliderRelease}
          />
        </div>

        <div className="modal-bottom-container">
          <div className="added-items-container">
            {itemsInCart.map((item, index) => (
              <div key={index} className="added-item-card">
                {item.totalWeight > 950 ? `${item.totalWeight / 1000} KG` : `${item.totalWeight} GR`}
                <div className="delete-item-icon" onClick={() => removeFromCart(item.comodity)}>&times;</div>
              </div>
            ))}
          </div>
          <div className="total-summary-box">
            <div className="total-summary-header">{itemName}</div>
            <div className="total-summary-row">
              <span className="total-summary-value">{displayWeight}</span>
            </div>
            <div className="total-summary-row price">
              <span className="total-summary-value">{combinedTotalPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

// --- KOMPONEN MODAL TRANSAKSI ---
const TransactionModal = ({ show, onHide }) => {
  const {
    removeFromCart, 
    resultCountPrice, loadingCountPrice, errorCountPrice,
    discounts, setDiscounts, paymentAmount, setPaymentAmount,
    fetchTransaction, loadingSaveTransaction
  } = useContext(GoodsContext);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [debouncedPhoneNumber, setDebouncedPhoneNumber] = useState('');
  const [isCheckingMember, setIsCheckingMember] = useState(false);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [idVoucher, setIdVoucher] = useState(null);
  const [activeInput, setActiveInput] = useState('payment');
  const [memberInfo, setMemberInfo] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPhoneNumber(phoneNumber);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [phoneNumber]);

  useEffect(() => {
    if (show) {
      setActiveInput('payment');
      if (!paymentAmount) {
        setPaymentAmount('0');
      }
    } else {
      setPhoneNumber('');
      setVoucherDiscount(0);
      setIdVoucher(null);
    }
  }, [show]);

  useEffect(() => {
    const handleCheckMember = async () => {
      if (!debouncedPhoneNumber) {
        setMemberInfo(null);
        setVoucherDiscount(0);
        setIdVoucher(null); 
        return;
      }
      setIsCheckingMember(true);
      setMemberInfo(null);
      setVoucherDiscount(0); 
      setIdVoucher(null); 
      try {
        const response = await getVoucherByphone(debouncedPhoneNumber);
        console.log('Response from getVoucherByphone:', response.data.voucher);
        const voucherData = response.data.voucher;
        if (voucherData && voucherData.nominal) {
          setMemberInfo(voucherData);
          setVoucherDiscount(parseInt(voucherData.nominal, 10) || 0);
          setIdVoucher(voucherData.id_voucher);
        } else {
          setMemberInfo({ noVoucher: true });
        }
      } catch (error) {
        console.error("Gagal cek member:", error);
        setMemberInfo({ error: true });
      } finally {
        setIsCheckingMember(false);
      }
    };

    handleCheckMember();
  }, [debouncedPhoneNumber]);


  const DISCOUNT_STEP = 500;

  const subtotal = useMemo(() => resultCountPrice.reduce((sum, item) => sum + item.totalPrice, 0), [resultCountPrice]);
  const totalDiscount = useMemo(() => discounts.reduce((sum, discount) => sum + (discount || 0), 0), [discounts]);
  const grandTotal = subtotal - totalDiscount - voucherDiscount;
  const change = parseInt(paymentAmount || 0, 10) - grandTotal;

  const handleNumpadInput = (value) => {
    if (activeInput === 'payment') {
      setPaymentAmount((prev) => (prev === '0' && value !== '000' ? value : prev + value));
    } else {
      setPhoneNumber((prev) => prev + value);
    }
  };

  const handleBackspace = () => {
    if (activeInput === 'payment') {
      setPaymentAmount((prev) => prev.slice(0, -1) || '0');
    } else {
      setPhoneNumber((prev) => prev.slice(0, -1));
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

  const handleCheckMember = async () => {
    if (!phoneNumber) {
      Swal.fire('Error', 'Silakan masukkan nomor telepon.', 'error');
      return;
    }
    setIsCheckingMember(true);
    setVoucherDiscount(0);
    try {
      const response = await getVoucherByphone(phoneNumber);
      const voucher = response.data.voucher;
      if (voucher && voucher.nominal) {
        const nominalValue = parseInt(voucher.nominal, 10);
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

  const handleConfirmTransaction = async () => {
    if (change < 0 || !paymentAmount) {
      Swal.fire('Pembayaran Kurang', 'Jumlah uang yang dibayarkan kurang dari Grand Total.', 'warning');
      return;
    }
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
        onHide();
      } else {
        Swal.fire({ icon: 'error', title: 'Transaksi Gagal', text: response.message || 'Gagal menyimpan transaksi.' });
      }
    } catch (error) {
      console.error("Error saat menyimpan transaksi:", error);
      Swal.fire({ icon: 'error', title: 'Koneksi Gagal', text: 'Tidak dapat menyimpan transaksi ke server.' });
    }
  };

  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '500'];

  const renderConfirmButtonText = () => {
    if (change >= 0 && paymentAmount !== '0' && grandTotal > 0) {
      return (
        <div className="d-flex flex-column lh-1">
          Selesaikan Transaksi
          <span className="fw-normal mt-1" style={{fontSize: '1rem'}}>Kembalian Rp {change.toLocaleString('id-ID')}</span>
        </div>
      );
    }
    return 'Selesaikan Transaksi';
  };

  return (
    <Modal show={show} onHide={onHide} centered size="xl" dialogClassName="modal-pos">
      <Modal.Body className="p-4">
        {loadingCountPrice ? (
          <div className="d-flex justify-content-center p-5"><Spinner animation="border" variant="primary" /></div>
        ) : errorCountPrice ? (
          <Alert variant="danger">{errorCountPrice}</Alert>
        ) : (
          <div className="transaction-items-container">
            {resultCountPrice.map((item, idx) => {
              const currentDiscount = discounts[idx] || 0;
              const priceAfterDiscount = item.totalPrice - currentDiscount;

              const isKg = item.totalWeight >= 1000;
              const displayWeight = isKg ? item.totalWeight / 1000 : item.totalWeight;
              const displayUnit = isKg ? 'kg' : 'gr';
              const pricePerUnit = item.totalWeight > 0 ? item.totalPrice / item.totalWeight * (isKg ? 1000 : 1) : 0;


              return (
                <div key={idx} className="cart-item-card fading-in">
                  <div 
                    className="btn-remove-from-modal" 
                    onClick={() => removeFromCart(item.comodity)}
                  >
                    &times;
                  </div>
                  <div className="item-name">{item.comodity}</div>
                  <div className="item-details">
                    {`${displayWeight.toLocaleString('id-ID')} ${displayUnit} × ${pricePerUnit.toLocaleString('id-ID')}`}
                  </div>
                  <div className="item-price">{priceAfterDiscount.toLocaleString('id-ID')}</div>
                  <div className="item-card-divider"></div>
                  <div className="cart-item-discount">
                    <div className="label">Diskon</div>
                    <div className="controls">
                      <button className="discount-btn" onClick={() => handleDiscountChange(idx, 'decrease')} disabled={currentDiscount === 0}>-</button>
                      <div className="diskon-level">×{currentDiscount / DISCOUNT_STEP}</div>
                      <button className="discount-btn" onClick={() => handleDiscountChange(idx, 'increase', item.totalPrice)} disabled={currentDiscount >= item.totalPrice}>+</button>
                    </div>
                     <div className="final-discount-amount">- {currentDiscount.toLocaleString('id-ID')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <hr />
        <div className="pos-layout">
          <div className="pos-numpad-column">
            <div className="numpad-grid">
              {numpadKeys.map((key) => (
                <Button key={key} className="numpad-btn" onClick={() => handleNumpadInput(key)}>
                  {key}
                </Button>
              ))}
            </div>
            <Button className="numpad-btn btn-clear" onClick={handleBackspace}>
              Hapus
            </Button>
          </div>
          <div className="pos-summary-column">
            <div className="summary-group-box">
              <div className="summary-group-row">
                <span className="summary-label">Subtotal</span>
                <span className="summary-value">{subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="summary-group-row">
                <span className="summary-label">Diskon Item</span>
                <span className="summary-value discount">- {totalDiscount.toLocaleString('id-ID')}</span>
              </div>
              <div className="summary-group-row grand-total-row">
                <span className="summary-label">Grand Total</span>
                <span className="summary-value">{grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="summary-item input-item" onClick={() => setActiveInput('payment')} style={{ borderColor: activeInput === 'payment' ? '#0d6efd' : '#dee2e6' }}>
              <label className="summary-label">Uang Dibayar</label>
              <div className="summary-input">
                {parseInt(paymentAmount || 0, 10).toLocaleString('id-ID')}
              </div>
            </div>
            
            <div className="summary-item input-item" onClick={() => setActiveInput('phone')} style={{ borderColor: activeInput === 'phone' ? '#0d6efd' : '#dee2e6' }}>
              <label className="summary-label">No Telepon</label>
              <div className="summary-input phone">
                {phoneNumber || '-'}
              </div>
            </div>

            <div className="summary-item">
              <span className="summary-label">Diskon Voucher</span>
              <span className="summary-value discount">
                - {voucherDiscount > 0 ? voucherDiscount.toLocaleString('id-ID') : '0'}
              </span>
            </div>
            
            <Button 
                className="numpad-btn btn-confirm" 
                onClick={handleConfirmTransaction}
                disabled={loadingSaveTransaction}
            >
              {loadingSaveTransaction ? <Spinner as="span" animation="border" size="sm" /> : renderConfirmButtonText()}
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};


// --- KOMPONEN UTAMA DASHBOARD ---
function Dashboard() {
  const {
    groupedGoods, loadingGoods, errorLoadingGoods, selectedLetter,
    addToCart,
    showModal, handleCloseModal
  } = useContext(GoodsContext);

  const [showModalCstmW, setShowModalCstmW] = useState(false);
  const [selectedIdItem, setSelectedIdItem] = useState('');
  const [selectedItemNm, setSelectedItemNm] = useState('');

  const handleShowModalCstmW = (id, itemnm) => {
    setSelectedIdItem(id);
    setSelectedItemNm(itemnm);
    setShowModalCstmW(true);
  };

  const handleCloseModalCstmW = () => {
    setShowModalCstmW(false);
  };

  const filteredComodities = useMemo(() => {
    const comodityKeys = Object.keys(groupedGoods);
    if (selectedLetter) {
      return comodityKeys.filter(comodity => comodity.toUpperCase().startsWith(selectedLetter));
    }
    return comodityKeys;
  }, [groupedGoods, selectedLetter]);

  const itemsPerPage = 8;
  const pages = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredComodities.length; i += itemsPerPage) {
      result.push(filteredComodities.slice(i, i + itemsPerPage));
    }
    return result;
  }, [filteredComodities]);


  return (
    <div className="container-fluid dashboard-container">
      <Row className="h-100">
        <Col md={12} className="h-100 d-flex flex-column">
          {errorLoadingGoods ? (
            <Alert variant="danger">{errorLoadingGoods}</Alert>
          ) : loadingGoods ? (
            <div className="d-flex justify-content-center align-items-center h-100">
              <Spinner animation="border" variant="primary" role="status" style={{ width: "4rem", height: "4rem" }} />
            </div>
          ) : (
            <Swiper
              modules={[Pagination]}
              spaceBetween={20}
              slidesPerView={1}
              pagination={{ clickable: true }}
              className="swiper-container"
            >
              {pages.map((page, pageIndex) => (
                <SwiperSlide key={pageIndex} className="goods-page-grid h-100">
                  <Row className="g-1 h-100">
                    {page.map((comodity) => {
                      const representativeItem = groupedGoods[comodity]?.[0];
                      return (
                        <Col key={comodity} xs={6} sm={3} className="product-card-wrapper">
                          <Card className="shadow-sm border-0 product-card-small">
                            <Card.Body>
                              <div className="item-image-container">
                                {representativeItem.img ? (
                                  <img
                                    src={representativeItem.img}
                                    alt={comodity}
                                    className="img-fluid item-img-small"
                                    onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                                  />
                                ) : (
                                  <CiImageOff size={100} className="text-secondary item-img-small-placeholder"
                                    onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                                  />
                                )}
                              </div>
                              <Card.Title className="product-title-small text-center">
                                {comodity}
                              </Card.Title>
                              <div className="weight-buttons-container d-flex flex-wrap gap-1 mt-2">
                                {groupedGoods[comodity].map((sub, i) => {
                                  const isHighlighted = sub.weight_txt === "Kg";
                                  return (
                                    <Card
                                      key={i}
                                      className={`text-center flex-fill border-0 shadow-sm overflow-hidden weight-card-small weight-btn-${sub.weight_txt.replace('/', '-')}`}
                                      onClick={() => addToCart(comodity, sub.id_item, sub.weight_Gr, sub.price_per_Gr)}
                                    >
                                      <div className="weight-card-header">
                                        {sub.weight_txt}
                                      </div>
                                      <div className={`weight-card-body ${isHighlighted ? 'highlighted' : ''}`}>
                                        <div className="fw-bolder h5 m-0 lh-1">{sub.stock}</div>
                                        <div className="price-text">
                                          {parseInt(sub.price_per_Gr) / 1000}
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
        </Col>
      </Row>

      <TransactionModal show={showModal} onHide={handleCloseModal} />
      <CustomWeightModal show={showModalCstmW} onHide={handleCloseModalCstmW} itemId={selectedIdItem} itemName={selectedItemNm} />
    </div>
  );
}

export default Dashboard;