import React, { useCallback, useState, useContext, useMemo, useEffect } from 'react';
import { getGoodsPricePerGram, getVoucherByphone } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal, Form, InputGroup, ListGroup, Table } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';
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
      const receiptWidth = 32;
      const spaces = receiptWidth - itemName.length - itemPrice.length;
      receiptText += `${itemName}${' '.repeat(Math.max(0, spaces))}${itemPrice}\n`;
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

    // Corrected line for proper encoding
    const base64String = btoa(unescape(encodeURIComponent(receiptText)));

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
    const found = goodsPrice.find(g => parseInt(g.weight_Gr, 10) === weight);
    if (found) return parseInt(found.price_per_Gr, 10);
    if (weight % 1000 === 0) {
      const base = goodsPrice.find(g => parseInt(g.weight_Gr, 10) === 1000);
      return base ? (weight / 1000) * parseInt(base.price_per_Gr, 10) : 0;
    }
    if (weight % 50 === 0) {
      const base = goodsPrice.find(g => parseInt(g.weight_Gr, 10) === 50);
      return base ? (weight / 50) * parseInt(base.price_per_Gr, 10) : 0;
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
    <Modal show={show} onHide={onHide} centered size='lg'>
      <Modal.Body>
        {loadingGoodsPrice && <div className="text-center"><Spinner animation="border" /></div>}
        {errorGoodsPrice && <Alert variant="danger">{errorGoodsPrice}</Alert>}

        <div className="d-flex flex-wrap justify-content-center mb-3">
          {presetWeights.map((preset) => {
            const presetPrice = getPrice(preset.value);
            return (
              <Button
                key={preset.value} variant="dark"
                className="m-2 d-flex flex-column justify-content-center align-items-center"
                style={{ width: '110px', height: '80px', borderRadius: '8px', padding: '10px 5px', lineHeight: '1.3' }}
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
                <div className="delete-item-icon" onClick={() => removeFromCart(item.comodity, item.id)}>&times;</div>
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
      console.log('Response from getVoucherByphone:', voucher);

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
    <Modal show={show} onHide={onHide} centered size="lg">
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

// --- KOMPONEN UTAMA DASHBOARD ---
function Dashboard() {
  const {
    groupedGoods, selectedLetter, loadingGoods, errorLoadingGoods,
    addToCart,
    showModal, handleCloseModal, currentCustomer
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

  const filteredComodities = Object.keys(groupedGoods).filter((comodity) => {
    if (!selectedLetter) return true;
    return comodity.toUpperCase().startsWith(selectedLetter);
  });

  const itemsPerPage = 8;
  const pages = useMemo(() => {
    const result = [];
    for (let i = 0; i < filteredComodities.length; i += itemsPerPage) {
      result.push(filteredComodities.slice(i, i + itemsPerPage));
    }
    return result;
  }, [filteredComodities]);


  return (
    <div className="container-fluid">
      <Row>
        <Col md={12}>
          {errorLoadingGoods ? (
            <Alert variant="danger">{errorLoadingGoods}</Alert>
          ) : loadingGoods ? (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "85vh" }}>
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
                                  <img
                                    src={representativeItem.img}
                                    alt={comodity}
                                    className="img-fluid item-img-small"
                                    onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                                  />
                                ) : (
                                  <CiImageOff size={80} className="text-secondary item-img-small-placeholder"
                                    onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                                  />
                                )}
                              </div>
                              <Card.Title className="product-title-small text-center">
                                {comodity}
                              </Card.Title>
                              <div className="weight-buttons-container d-flex flex-wrap justify-content-center gap-1 mt-auto">
                                {groupedGoods[comodity].map((sub, i) => {
                                  const isHighlighted = sub.weight_txt === "Kg";
                                  return (
                                    <Card
                                      key={i}
                                      className="text-center flex-fill border-0 shadow-sm overflow-hidden weight-card-small"
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

      <TransactionModal show={showModal} onHide={handleCloseModal} currentCustomer={currentCustomer} />
      <CustomWeightModal show={showModalCstmW} onHide={handleCloseModalCstmW} itemId={selectedIdItem} itemName={selectedItemNm} />
    </div>
  );
}

export default Dashboard;