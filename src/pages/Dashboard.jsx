import React, { useCallback, useState, useContext, useMemo, useEffect, useRef } from 'react';
import sfx from '../assets/sfx.mp3'; // Import the sound file with the corrected path

// Pastikan getStorageData diimpor untuk mendapatkan info kasir dan lokasi
import { getGoodsPricePerGram, getVoucherByphone, getStorageData } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button } from 'react-bootstrap';
import { CiImageOff } from 'react-icons/ci';
import { GoodsContext } from './components/GoodsContext'; // Adjusted path assuming GoodsContext is in src/components
import { FaShoppingBag, FaBalanceScale } from 'react-icons/fa';
import './Dashboard.css'; // Adjusted path assuming Dashboard.css is in src/
import Swal from 'sweetalert2';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

// Style untuk popup modal kustom
const modalStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(5px)', transition: 'opacity 0.3s ease',
  },
  transactionContent: {
    backgroundColor: '#f8f9fa',
    borderRadius: '16px',
    width: '95%',
    maxWidth: '1300px',
    height: '100vh',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    transform: 'scale(0.95)',
    transition: 'transform 0.3s ease',
    overflow: 'hidden'
  },
  customWeightContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '1300px',
    padding: '1.5rem',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    transform: 'scale(0.95)',
    transition: 'transform 0.3s ease',
    overflowY: 'auto',
    maxHeight: '100vh',
    height: '90vh',
  },
  visibleContent: {
    transform: 'scale(1)',
  },
};

// --- FUNGSI HELPER UNTUK CETAK (VERSI BARU SESUAI kirim_ke_rawbt.php) ---
const printReceipt = async (receiptData, storageData) => {
  try {
    const { items, summary, transactionNumber } = receiptData;
    const lebarKertas = 32;
    const ESC = String.fromCharCode(27);
    const GS = String.fromCharCode(29);

    const nota_text = [];
    nota_text.push(ESC + "@"); // Inisialisasi
    nota_text.push(GS + "L" + String.fromCharCode(0) + String.fromCharCode(0)); // Margin Kiri
    
    const leftRightAlignText = (left, right) => {
        return left.padEnd(lebarKertas - right.length) + right;
    };

    const buatBarisKolom = (nama, berat, harga) => {
        const lebarNama = 17;
        const lebarBerat = 7;
        const lebarHarga = lebarKertas - lebarNama - lebarBerat;

        let namaTampil = nama;
        if (nama.length > lebarNama) {
            namaTampil = nama.substring(0, lebarNama - 2) + '..';
        }

        const baris = namaTampil.padEnd(lebarNama) +
                      berat.padStart(lebarBerat) +
                      harga.padStart(lebarHarga);
        return baris;
    };

    // === HEADER ===
    // Gunakan perintah alignment bawaan printer untuk hasil yang presisi
    nota_text.push("SAYOERNARA");

    // Reset font ke normal dan kurangi spasi baris untuk menghilangkan gap
    nota_text.push(ESC + "!" + String.fromCharCode(0));
    nota_text.push(ESC + "3" + String.fromCharCode(24)); // Set line spacing lebih rapat (24 dots)

    nota_text.push("SAYUR GROSIR DAN ECERAN");
    nota_text.push("08/22334455/10");
    
    // Reset spasi baris ke default sebelum lanjut
    nota_text.push(ESC + "2");
    
    const namaTitik = (storageData.decryptloc || '???').toUpperCase();
    nota_text.push(namaTitik);
    
    // Kembalikan alignment ke kiri untuk sisa struk
    nota_text.push(ESC + "a" + String.fromCharCode(0)); // 0 = Left Alignment
    nota_text.push('-'.repeat(lebarKertas));


    // === INFO TRANSAKSI ===
    const noPelanggan = summary.phoneNumber || '-';
    const namaKasir = storageData.decryptuname || 'N/A';
    nota_text.push(`NO PELANGGAN: ${noPelanggan}`);
    nota_text.push(`TRANSAKSI   : ${new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
    nota_text.push(`KASIR       : ${namaKasir}`);
    nota_text.push('-'.repeat(lebarKertas));
    
    // === DAFTAR ITEM ===
    // Harga asli (subtotal) dihitung dari harga item sebelum diskon manual
    const subtotalBeli = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    items.forEach(item => {
        const beratKg = item.totalWeight / 1000;
        const beratStr = `(${beratKg.toLocaleString('id-ID', {minimumFractionDigits: 1, maximumFractionDigits: 2})}kg)`;
        const hargaStr = item.totalPrice.toLocaleString('id-ID');
        nota_text.push(buatBarisKolom(item.comodity, beratStr, hargaStr));
    });

    // === SUBTOTAL ===
    nota_text.push('-'.repeat(lebarKertas));
    nota_text.push(leftRightAlignText("Subtotal", subtotalBeli.toLocaleString('id-ID')));

    // === BAGIAN DISKON ===
    const daftarDiskon = [];
    items.forEach(item => {
        if (item.discount > 0) {
            daftarDiskon.push({ nama: `Diskon ${item.comodity}`, nilai: item.discount });
        }
    });
    if (summary.voucherDiscount > 0) {
        daftarDiskon.push({ nama: 'Diskon Voucher', nilai: summary.voucherDiscount });
    }

    if (daftarDiskon.length > 0) {
        nota_text.push('-'.repeat(lebarKertas));
        nota_text.push(ESC + "E" + String.fromCharCode(1));
        nota_text.push("DISKON");
        daftarDiskon.forEach(d => {
            nota_text.push(leftRightAlignText(d.nama, `-${d.nilai.toLocaleString('id-ID')}`));
        });
        nota_text.push(ESC + "E" + String.fromCharCode(0));
    }
    
    // === TOTAL & FOOTER ===
    nota_text.push('-'.repeat(lebarKertas));
    nota_text.push(leftRightAlignText("TOTAL", summary.grandTotal.toLocaleString('id-ID')));
    nota_text.push(leftRightAlignText("BAYAR", summary.paymentAmount.toLocaleString('id-ID')));
    nota_text.push(leftRightAlignText("KEMBALI", summary.change.toLocaleString('id-ID')));
    nota_text.push('-'.repeat(lebarKertas));
    
    // Bagian footer kembali ke tengah
    nota_text.push(ESC + "a" + String.fromCharCode(1)); // 1 = Center Alignment
    nota_text.push("TERIMAKASIH");
    nota_text.push("TELAH BERBELANJA DI SAYOERNARA");
    nota_text.push("SAMPAI JUMPA LAGI :)");
    
    // Perintah potong
    nota_text.push(GS + "V" + String.fromCharCode(66) + String.fromCharCode(0));

    // --- REDIRECT KE RAWBT ---
    const finalReceiptText = nota_text.join('\n');
    const encodedText = encodeURIComponent(finalReceiptText);
    window.location.href = `rawbt:${encodedText}`;

  } catch (error) {
    console.error("Gagal mencetak struk:", error);
    Swal.fire({ icon: 'error', title: 'Gagal Mencetak', text: 'Pastikan aplikasi RawBT sudah terinstall.' });
  }
};


// --- KOMPONEN SLIDER ---
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
    if (onRelease) onRelease();
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
          return <div key={index} className={`bar ${isActive ? 'active' : ''}`} style={{ height: `${10 + barPercentage}%` }} ></div>;
        })}
      </div>
      <label>{renderIcon()}{label}</label>
      <div className="custom-slider-container">
        <div className="custom-slider-track-bg"></div>
        <div className="custom-slider-track-volume" style={{ width: `${percentage}%` }}></div>
        <input type="range" min={min} max={max} step={step} value={value} className="custom-slider-input" onChange={handleInteraction} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp} />
        <div className={`slider-tooltip ${tooltipActive ? 'active' : ''}`} style={{ left: `${percentage}%` }}>
          {value} {unit}
          <span className="tooltip-price">Rp {price.toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL UNTUK BERAT CUSTOM (DIPERBARUI) ---
const CustomWeightModal = ({ show, onHide, itemId, itemName, onAddToCart }) => {
  const { cart, removeFromCart } = useContext(GoodsContext);
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
    const smallestUnit = validPrices.reduce((min, p) => parseInt(p.weight_Gr, 10) < parseInt(min.weight_Gr, 10) ? p : min);
    if (smallestUnit) {
      const pricePerGram = parseInt(smallestUnit.price_per_Gr, 10) / parseInt(smallestUnit.weight_Gr, 10);
      return Math.round(pricePerGram * weight);
    }
    return 0;
  };

  const presetWeights = [{ label: '50 gr', value: 50 }, { label: '100 gr', value: 100 }, { label: '250 gr', value: 250 }, { label: '500 gr', value: 500 }, { label: '750 gr', value: 750 }, { label: '1 kg', value: 1000 }];
  const itemsInCart = useMemo(() => cart.filter(item => item.comodity === itemName), [cart, itemName]);
  const totalInCartWeight = useMemo(() => itemsInCart.reduce((sum, item) => sum + item.totalWeight, 0), [itemsInCart]);
  const totalInCartPrice = useMemo(() => itemsInCart.reduce((sum, item) => sum + item.totalPrice, 0), [itemsInCart]);
  const priceKg = kgValue > 0 ? getPrice(kgValue * 1000) : 0;
  const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
  const combinedTotalWeight = totalInCartWeight + (kgValue * 1000) + gramValue;
  const combinedTotalPrice = totalInCartPrice + priceKg + priceGram;
  const displayWeight = combinedTotalWeight > 950 ? `${(combinedTotalWeight / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} KG` : `${combinedTotalWeight} GR`;

  const handleKgSliderRelease = () => {
    if (kgValue * 1000 > 0 && priceKg > 0) onAddToCart(itemName, itemId, kgValue * 1000, priceKg);
    setKgValue(0);
  };
  const handleGramSliderRelease = () => {
    if (gramValue > 0 && priceGram > 0) onAddToCart(itemName, itemId, gramValue, priceGram);
    setGramValue(0);
  };
  const handlePresetAddToCart = (weight, price) => {
    if (weight > 0 && price > 0) onAddToCart(itemName, itemId, weight, price);
  };

  if (!show) return null;

  return (
    <div style={{ ...modalStyles.overlay, opacity: show ? 1 : 0 }} onClick={onHide}>
      <div style={{ ...modalStyles.customWeightContent, ...(show && modalStyles.visibleContent) }} onClick={(e) => e.stopPropagation()}>
        {loadingGoodsPrice && <div className="text-center"><Spinner animation="border" /></div>}
        {errorGoodsPrice && <Alert variant="danger">{errorGoodsPrice}</Alert>}
        <div className="d-flex flex-wrap justify-content-center mb-3">
          {presetWeights.map((preset) => {
            const presetPrice = getPrice(preset.value);
            return (
              <Button key={preset.value} variant="dark" className="m-2 d-flex flex-column justify-content-center align-items-center preset-weight-btn" onClick={() => handlePresetAddToCart(preset.value, presetPrice)} disabled={presetPrice === 0 || loadingGoodsPrice}>
                <span className="fw-bold" style={{ fontSize: '1.8rem' }}>{preset.label}</span>
                {presetPrice > 0 ? <small style={{ fontSize: '1.4rem' }}>Rp {presetPrice.toLocaleString('id-ID')}</small> : <small className="text-muted">N/A</small>}
              </Button>
            );
          })}
        </div>
        <hr />
        <div className='sliders-container'>
          <CustomRangeSlider label={`Kelipatan 1 Kg (0 - 20 Kg)`} value={kgValue} min={0} max={20} step={1} onChange={(e) => setKgValue(parseInt(e.target.value, 10))} price={priceKg} unit="kg" iconType="kg" onRelease={handleKgSliderRelease} />
          <CustomRangeSlider label={`Kelipatan 50 gr (0 - 950 gr)`} value={gramValue} min={0} max={950} step={50} onChange={(e) => setGramValue(parseInt(e.target.value, 10))} price={priceGram} unit="gr" iconType="gr" onRelease={handleGramSliderRelease} />
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
      </div>
    </div>
  );
};

// --- KOMPONEN MODAL TRANSAKSI ---
const TransactionModal = () => {
  const context = useContext(GoodsContext);
  if (!context) {
    console.error("Kesalahan: TransactionModal harus berada di dalam GoodsContext.Provider.");
    return null;
  }
  const { showModal, handleCloseModal, removeFromCart, resultCountPrice, loadingCountPrice, errorCountPrice, discounts, setDiscounts, paymentAmount, setPaymentAmount, fetchTransaction, loadingSaveTransaction } = context;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [debouncedPhoneNumber, setDebouncedPhoneNumber] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [idVoucher, setIdVoucher] = useState(null);
  const [activeInput, setActiveInput] = useState('payment');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedPhoneNumber(phoneNumber), 1000);
    return () => clearTimeout(handler);
  }, [phoneNumber]);

  useEffect(() => {
    if (showModal) {
      setActiveInput('payment');
      if (!paymentAmount) setPaymentAmount('0');
    } else {
      setPhoneNumber('');
      setVoucherDiscount(0);
      setIdVoucher(null);
    }
  }, [showModal, paymentAmount, setPaymentAmount]);

  useEffect(() => {
    const checkMember = async () => {
      if (!debouncedPhoneNumber) {
        setVoucherDiscount(0);
        setIdVoucher(null);
        return;
      }
      try {
        const response = await getVoucherByphone(debouncedPhoneNumber);
        const voucher = response.data.voucher;
        if (voucher && voucher.nominal) {
          setVoucherDiscount(parseInt(voucher.nominal, 10) || 0);
          setIdVoucher(voucher.id_voucher);
        } else {
          setVoucherDiscount(0);
          setIdVoucher(null);
        }
      } catch (error) {
        console.error("Gagal cek member:", error);
        setVoucherDiscount(0);
        setIdVoucher(null);
      }
    };
    checkMember();
  }, [debouncedPhoneNumber]);

  const DISCOUNT_STEP = 500;
  const subtotal = useMemo(() => resultCountPrice.reduce((sum, item) => sum + item.totalPrice, 0), [resultCountPrice]);
  const totalDiscount = useMemo(() => discounts.reduce((sum, discount) => sum + (discount || 0), 0), [discounts]);
  const grandTotal = subtotal - totalDiscount - voucherDiscount;
  const change = parseInt(paymentAmount || 0, 10) - grandTotal;

  const handleNumpadInput = (value) => {
    if (activeInput === 'payment') setPaymentAmount((prev) => (prev === '0' && value !== '000' ? value : prev + value));
    else setPhoneNumber((prev) => prev + value);
  };
  const handleBackspace = () => {
    if (activeInput === 'payment') setPaymentAmount((prev) => prev.slice(0, -1) || '0');
    else setPhoneNumber((prev) => prev.slice(0, -1));
  };
  const handleDiscountChange = (index, operation, itemPrice) => {
    setDiscounts(currentDiscounts => {
      const newDiscounts = [...currentDiscounts];
      const currentDiscount = parseInt(newDiscounts[index] || 0, 10);
      let newValue = currentDiscount;
      if (operation === 'increase') newValue = Math.min(currentDiscount + DISCOUNT_STEP, parseInt(itemPrice, 10));
      else if (operation === 'decrease') newValue = Math.max(currentDiscount - DISCOUNT_STEP, 0);
      newDiscounts[index] = newValue;
      return newDiscounts;
    });
  };
  const handleConfirmTransaction = async () => {
    if (change < 0 || !paymentAmount) return Swal.fire('Pembayaran Kurang', 'Jumlah uang dibayar kurang dari Grand Total.', 'warning');
    const summaryData = { subtotal, totalDiscount, voucherDiscount, idVoucher, phoneNumber, grandTotal, paymentAmount: parseInt(paymentAmount, 10), change };
    try {
      const response = await fetchTransaction(summaryData);
      if (response && response.success) {
        // Data item di sini sudah berisi harga asli (totalPrice), dan diskon manual (discount)
        const receiptItems = resultCountPrice.map((item, index) => ({
            ...item,
            discount: discounts[index] || 0,
        }));
        const receiptData = { 
            items: receiptItems, 
            summary: summaryData, 
            transactionNumber: response.transactionNumber 
        };
        // Memanggil printReceipt dengan data storage
        await printReceipt(receiptData, getStorageData());
        handleCloseModal();
      }
    } catch (error) {}
  };
  const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '500'];
  const renderConfirmButtonText = () => {
    if (change >= 0 && paymentAmount !== '0' && grandTotal > 0) {
      return (<div className="d-flex flex-column lh-1">Selesaikan Transaksi<span className="fw-normal mt-1" style={{ fontSize: '1rem' }}>Kembalian Rp {change.toLocaleString('id-ID')}</span></div>);
    }
    return 'Selesaikan Transaksi';
  };

  if (!showModal) return null;

  return (
    <div style={{ ...modalStyles.overlay, opacity: showModal ? 1 : 0 }} onClick={handleCloseModal}>
      <div style={{ ...modalStyles.transactionContent, ...(showModal && modalStyles.visibleContent) }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 d-flex flex-column h-100">
          {loadingCountPrice ? <div className="d-flex justify-content-center align-items-center h-100"><Spinner animation="border" /></div> :
           errorCountPrice ? <Alert variant="danger">{errorCountPrice}</Alert> : (
            <>
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
                      <div className="btn-remove-from-modal" onClick={() => removeFromCart(item.comodity)}>&times;</div>
                      <div className="item-name">{item.comodity}</div>
                      <div className="item-details">{`${displayWeight.toLocaleString('id-ID')} ${displayUnit} × ${pricePerUnit.toLocaleString('id-ID')}`}</div>
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
              <hr />
              <div className="pos-layout">
                <div className="pos-numpad-column">
                  <div className="numpad-grid">
                    {numpadKeys.map((key) => (<Button key={key} className="numpad-btn" onClick={() => handleNumpadInput(key)}>{key}</Button>))}
                  </div>
                  <Button className="numpad-btn btn-clear" onClick={handleBackspace}>Hapus</Button>
                </div>
                <div className="pos-summary-column">
                  <div className="summary-group-box">
                    <div className="summary-group-row"><span className="summary-label">Subtotal</span><span className="summary-value">{subtotal.toLocaleString('id-ID')}</span></div>
                    <div className="summary-group-row"><span className="summary-label">Diskon Item</span><span className="summary-value discount">- {totalDiscount.toLocaleString('id-ID')}</span></div>
                    <div className="summary-group-row grand-total-row"><span className="summary-label">Grand Total</span><span className="summary-value">{grandTotal.toLocaleString('id-ID')}</span></div>
                  </div>
                  <div className="summary-item input-item" onClick={() => setActiveInput('payment')} style={{ borderColor: activeInput === 'payment' ? '#0d6efd' : '#dee2e6' }}>
                    <label className="summary-label">Uang Dibayar</label>
                    <div className="summary-input">{parseInt(paymentAmount || 0, 10).toLocaleString('id-ID')}</div>
                  </div>
                  <div className="summary-item input-item" onClick={() => setActiveInput('phone')} style={{ borderColor: activeInput === 'phone' ? '#0d6efd' : '#dee2e6' }}>
                    <label className="summary-label">No Telepon</label>
                    <div className="summary-input phone">{phoneNumber || '-'}</div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Diskon Voucher</span>
                    <span className="summary-value discount">- {voucherDiscount > 0 ? voucherDiscount.toLocaleString('id-ID') : '0'}</span>
                  </div>
                  <Button className="numpad-btn btn-confirm" onClick={handleConfirmTransaction} disabled={loadingSaveTransaction}>
                    {loadingSaveTransaction ? <Spinner as="span" animation="border" size="sm" /> : renderConfirmButtonText()}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA DASHBOARD ---
function Dashboard() {
  const { groupedGoods, loadingGoods, errorLoadingGoods, selectedLetter, addToCart: originalAddToCart } = useContext(GoodsContext);
  const audioRef = useRef(new Audio(sfx));

  const playSound = () => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(error => {
      console.error("Gagal memutar audio:", error);
    });
  };

  const addToCart = (comodity, id_item, weight_Gr, price_per_Gr) => {
    originalAddToCart(comodity, id_item, weight_Gr, price_per_Gr);
    playSound();
  };

  const [showModalCstmW, setShowModalCstmW] = useState(false);
  const [selectedIdItem, setSelectedIdItem] = useState('');
  const [selectedItemNm, setSelectedItemNm] = useState('');

  const handleShowModalCstmW = (id, itemnm) => {
    setSelectedIdItem(id);
    setSelectedItemNm(itemnm);
    setShowModalCstmW(true);
  };
  const handleCloseModalCstmW = () => setShowModalCstmW(false);

  const filteredComodities = useMemo(() => {
    if (!groupedGoods || Object.keys(groupedGoods).length === 0) return [];
    const comodityKeys = Object.keys(groupedGoods);
    if (!selectedLetter) return comodityKeys;
    return comodityKeys.filter(comodity => comodity.split(' ').some(word => word.length > 0 && word.toUpperCase().startsWith(selectedLetter)));
  }, [groupedGoods, selectedLetter]);

  const pages = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredComodities.length; i += 8) {
      result.push(filteredComodities.slice(i, i + 8));
    }
    return result;
  }, [filteredComodities]);

  return (
    <div className="container-fluid dashboard-container">
      <Row className="h-100">
        <Col md={12} className="h-100 d-flex flex-column">
          {errorLoadingGoods ? <Alert variant="danger">{errorLoadingGoods}</Alert> :
           loadingGoods ? <div className="d-flex justify-content-center align-items-center h-100"><Spinner animation="border" style={{ width: "4rem", height: "4rem" }} /></div> :
            <Swiper modules={[Pagination]} spaceBetween={20} slidesPerView={1} pagination={{ clickable: true }} className="swiper-container">
              {pages.map((page, pageIndex) => (
                <SwiperSlide key={pageIndex} className="goods-page-grid h-100">
                  <div className="custom-goods-grid">
                    {page.map((comodity) => {
                      const representativeItem = groupedGoods[comodity]?.[0];
                      if (!representativeItem) return null;
                      return (
                        <div key={comodity} className="product-card-wrapper">
                          <Card className="shadow-sm border-0 product-card-small">
                            <Card.Body>
                              <div className="item-image-container" onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}>
                                {representativeItem.img ? <img src={representativeItem.img} alt={comodity} className="img-fluid item-img-small" /> : <CiImageOff size={100} className="text-secondary item-img-small-placeholder" />}
                              </div>
                              <Card.Title className="product-title-small text-center">{comodity}</Card.Title>
                              <div className="weight-buttons-container d-flex flex-wrap gap-1 mt-2">
                                {groupedGoods[comodity].map((sub) => (
                                  <Card key={sub.id_item} className={`text-center flex-fill border-0 shadow-sm overflow-hidden weight-card-small weight-btn-${sub.weight_txt.replace('/', '-')}`} onClick={() => addToCart(comodity, sub.id_item, sub.weight_Gr, sub.price_per_Gr)}>
                                    <div className="weight-card-header">{sub.weight_txt}</div>
                                    <div className={`weight-card-body ${sub.weight_txt === "Kg" ? 'highlighted' : ''}`}>
                                      <div className="fw-bolder h5 m-0 lh-1">{sub.stock}</div>
                                      <div className="price-text">{parseInt(sub.price_per_Gr) / 1000}</div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </Card.Body>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          }
        </Col>
      </Row>
      
      <TransactionModal />
      <CustomWeightModal 
        show={showModalCstmW} 
        onHide={handleCloseModalCstmW} 
        itemId={selectedIdItem} 
        itemName={selectedItemNm} 
        onAddToCart={addToCart} 
      />
    </div>
  );
}

export default Dashboard;