import React, { useCallback, useState, useContext, useMemo } from 'react';
import { getGoodsPricePerGram } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal, Form, InputGroup, ListGroup, Table } from 'react-bootstrap';
import { BiCart, BiPlus, BiTransfer } from 'react-icons/bi';
import { CiImageOff } from 'react-icons/ci';
import { GoodsContext } from './components/GoodsContext';
import { FaShoppingBag, FaBalanceScale } from 'react-icons/fa';
import './Dashboard.css';
import Swal from 'sweetalert2';

// --- FUNGSI HELPER UNTUK CETAK (TIDAK BERUBAH) ---
const printReceipt = async (receiptData) => {
    try {
        const { items, tradeInItems, summary, transactionNumber } = receiptData;
        const line = '--------------------------------\n';
        let receiptText = '';
        receiptText += '           Sayoernara\n';
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

        if (tradeInItems && tradeInItems.length > 0) {
            receiptText += line;
            receiptText += '       TUKAR TAMBAH\n';
            receiptText += line;
            tradeInItems.forEach(item => {
                const itemName = `${item.comodity} (${item.totalWeight} gr)`;
                const itemPrice = `-Rp ${item.totalPrice.toLocaleString('id-ID')}`;
                const receiptWidth = 32;
                const spaces = receiptWidth - itemName.length - itemPrice.length;
                receiptText += `${itemName}${' '.repeat(Math.max(0, spaces))}${itemPrice}\n`;
            });
        }

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
        if (summary.tradeInTotal > 0) {
            receiptText += formatSummaryLine('Tukar Tambah', -summary.tradeInTotal);
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
            text: 'Pastikan aplikasi RawBT sudah terinstall.',
        });
    }
};


function Retur() {
    const {
        groupedGoods, selectedLetter, loadingGoods, errorLoadingGoods,
        currentCustomer, setCurrentCustomer,
        cart, addToCart, removeFromCart,
        showModal, handleShowModal, handleCloseModal,
        resultCountPrice, loadingCountPrice, errorCountPrice,
        discounts, setDiscounts,
        paymentAmount, setPaymentAmount,
        fetchTransaction, loadingSaveTransaction
    } = useContext(GoodsContext);

    const [showModalCstmW, setShowModalCstmW] = useState(false);
    const [selectedIdItem, setSelectedIdItem] = useState('');
    const [selectedItemNm, setSelectedItemNm] = useState('');
    const [errorGoodsPrice, setErrorGoodsPrice] = useState(null);
    const [loadingGoodsPrice, setLoadingGoodsPrice] = useState(false);
    const [goodsPrice, setGoodsPrice] = useState([]);
    const [kgValue, setKgValue] = useState(0);
    const [gramValue, setGramValue] = useState(0);
    const [tradeInCart, setTradeInCart] = useState([]);

    // --- PERUBAHAN ---: State untuk menentukan mode modal (jual atau tukarTambah)
    const [modalMode, setModalMode] = useState('jual');

    const DISCOUNT_STEP = 500;

    const handleCloseModalCstmW = () => {
        setSelectedIdItem('');
        setSelectedItemNm('');
        setShowModalCstmW(false);
        setGoodsPrice([]);
        setKgValue(0);
        setGramValue(0);
    };

    // --- PERUBAHAN ---: Fungsi ini sekarang menangani kedua mode
    const handleShowCustomModal = (id, itemnm, mode) => {
        setModalMode(mode); // Set mode saat tombol diklik
        setSelectedIdItem(id);
        setSelectedItemNm(itemnm);
        setShowModalCstmW(true);
        fetchGoodsPricePerGram(id);
    };

    const fetchGoodsPricePerGram = useCallback(async (selectedIdItem) => {
        try {
            setLoadingGoodsPrice(true);
            const result = await getGoodsPricePerGram(selectedIdItem);
            setGoodsPrice(result.data.price[0]);
        } catch (err) {
            setErrorGoodsPrice(err.message);
        } finally {
            setLoadingGoodsPrice(false);
        }
    }, []);
    
    const handleRemoveTradeIn = (index) => {
        setTradeInCart(prev => prev.filter((_, i) => i !== index));
    };

    const filteredComodities = Object.keys(groupedGoods).filter((comodity) => {
        if (!selectedLetter) return true;
        return comodity.toUpperCase().startsWith(selectedLetter);
    });

    const handleNextCustomer = () => setCurrentCustomer((prev) => prev + 1);
    const handlePrevCustomer = () => { if (currentCustomer > 0) setCurrentCustomer((prev) => prev - 1); };

    const subtotal = resultCountPrice.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = discounts.reduce((sum, discount) => sum + (discount || 0), 0);
    const tradeInTotal = tradeInCart.reduce((sum, item) => sum + item.totalPrice, 0);
    const grandTotal = subtotal - totalDiscount - tradeInTotal;
    const change = parseInt(paymentAmount || 0, 10) - grandTotal;

    const handleConfirmTransaction = async () => {
        const summaryData = {
            subtotal, totalDiscount, tradeInTotal, grandTotal,
            paymentAmount: parseInt(paymentAmount, 10),
            change,
        };
        try {
            const response = await fetchTransaction(summaryData);
            if (response && response.success) {
                const receiptData = {
                    items: resultCountPrice.map((item, index) => ({
                        ...item, discount: discounts[index] || 0,
                    })),
                    tradeInItems: tradeInCart, summary: summaryData, transactionNumber: response.number,
                };
                await printReceipt(receiptData);
            } else {
                Swal.fire('Transaksi Gagal', response.message || 'Gagal menyimpan transaksi.', 'error');
            }
        } catch (error) {
            console.error("Error saat menyimpan transaksi:", error);
            Swal.fire('Koneksi Gagal', 'Tidak dapat menyimpan transaksi ke server.', 'error');
        }
    };

    const getPrice = (weight) => {
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

    const kgInGram = kgValue * 1000;
    const priceKg = kgValue > 0 ? getPrice(kgInGram) : 0;
    const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
    const totalWeight = kgInGram + gramValue;
    const totalPrice = priceKg + priceGram;

    // --- PERUBAHAN ---: Satu fungsi untuk menangani konfirmasi dari modal
    const handleConfirmFromCustomModal = () => {
        if (totalWeight > 0 && totalPrice > 0) {
            if (modalMode === 'jual') {
                addToCart(selectedItemNm, selectedIdItem, totalWeight, totalPrice);
            } else { // Mode 'tukarTambah'
                const tradeInItem = {
                    comodity: selectedItemNm,
                    totalWeight,
                    totalPrice,
                };
                setTradeInCart(prev => [...prev, tradeInItem]);
            }
        }
        handleCloseModalCstmW();
    };

    const handleDiscountChange = (index, operation, itemPrice) => {
        const newDiscounts = [...discounts];
        const currentDiscount = parseInt(newDiscounts[index] || 0, 10);
        let newValue = currentDiscount;
        if (operation === 'increase') newValue = Math.min(currentDiscount + DISCOUNT_STEP, parseInt(itemPrice, 10));
        else if (operation === 'decrease') newValue = Math.max(currentDiscount - DISCOUNT_STEP, 0);
        newDiscounts[index] = newValue;
        setDiscounts(newDiscounts);
    };

    const handlePaymentChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, "");
        setPaymentAmount(value);
    };

    const presetWeights = [
        { label: '50 gr', value: 50 }, { label: '100 gr', value: 100 },
        { label: '250 gr', value: 250 }, { label: '500 gr', value: 500 },
        { label: '750 gr', value: 750 }, { label: '1 kg', value: 1000 },
    ];

    const handlePresetClick = (weight, price) => {
        if (weight > 0 && price > 0) {
            if (modalMode === 'jual') {
                addToCart(selectedItemNm, selectedIdItem, weight, price);
            } else {
                const tradeInItem = { comodity: selectedItemNm, totalWeight: weight, totalPrice: price };
                setTradeInCart(prev => [...prev, tradeInItem]);
            }
        }
        handleCloseModalCstmW();
    };

    return (
        <div className="container py-4">
            <Row>
                <Col md={8} style={{ flex: "0 0 70%" }}>
                    {errorLoadingGoods ? (
                        <Alert variant="danger">{errorLoadingGoods}</Alert>
                    ) : loadingGoods ? (
                        <div className="d-flex justify-content-center align-items-center" style={{ height: "85vh" }} >
                            <Spinner animation="border" variant="primary" role="status" style={{ width: "4rem", height: "4rem" }} />
                        </div>
                    ) : (
                        <div className="goods-list" style={{ maxHeight: "80vh", overflowY: "auto", padding: "9px" }}>
                            <Row className="g-2">
                                {filteredComodities.map((comodity, idx) => {
                                    const representativeItem = groupedGoods[comodity]?.[0];
                                    return (
                                        <Col key={idx} xs={12} sm={6} md={4} lg={6}>
                                            <Card className="h-100 shadow-sm border-0">
                                                <Card.Body>
                                                    {representativeItem.img ? (
                                                        <img src={representativeItem.img} alt={comodity} className="img-fluid itemimgcenter" />
                                                    ) : (
                                                        <CiImageOff size={150} className="text-secondary" style={{ display: 'block', margin: '0 auto', width: '45%', height: 'auto' }} />
                                                    )}
                                                    <Card.Title className="fs-6 fw-bold text-center mt-2">{comodity}</Card.Title>
                                                    
                                                    {/* --- PERUBAHAN ---: Tombol aksi memanggil fungsi handleShowCustomModal dengan mode yang sesuai */}
                                                    <div className="d-grid gap-2 mt-3">
                                                        <Button variant="primary" onClick={() => handleShowCustomModal(representativeItem.id_item, comodity, 'jual')}>
                                                            <BiPlus /> Jual
                                                        </Button>
                                                        <Button variant="outline-success" onClick={() => handleShowCustomModal(representativeItem.id_item, comodity, 'tukarTambah')}>
                                                            <BiTransfer /> Tukar Tambah
                                                        </Button>
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </div>
                    )}
                </Col>

                <Col md={3} style={{ flex: "0 0 30%" }}>
                    <h4 className="mt-4"><BiCart /> Keranjang Customer #{currentCustomer + 1}</h4>
                    <div style={{ backgroundColor: '#f8f9fa', borderRadius: '5px', height: "calc(100vh - 250px)", display: "flex", flexDirection: "column" }}>
                        {(cart.length === 0 && tradeInCart.length === 0) ? (
                            <p className="text-muted small fst-italic m-2">Belum ada item</p>
                        ) : (
                            <div style={{ flex: 1, overflowY: "auto" }}>
                                {cart.length > 0 && (
                                    <div className='cartitemlist p-2'>
                                        <h6>Barang Dibeli</h6>
                                        <ul className="list-group small shadow-sm rounded">
                                            {[...cart].reverse().map((item, idx) => (
                                                <li key={`${item.comodity}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center">
                                                    <div><strong>{item.comodity}</strong><div className="text-muted">Total: {item.totalWeight} gr</div></div>
                                                    <Button variant="outline-danger" size="sm" onClick={() => removeFromCart(item.comodity)}>Hapus</Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {tradeInCart.length > 0 && (
                                    <div className='cartitemlist p-2'>
                                        <h6 className='mt-2'>Tukar Tambah</h6>
                                        <ul className="list-group small shadow-sm rounded">
                                            {tradeInCart.map((item, idx) => (
                                                <li key={`tradein-${idx}`} className="list-group-item list-group-item-success d-flex justify-content-between align-items-center">
                                                    <div><strong>{item.comodity}</strong><div className="text-muted">{item.totalWeight} gr</div><div className='fw-bold'>-Rp {item.totalPrice.toLocaleString('id-ID')}</div></div>
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveTradeIn(idx)}>Hapus</Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="d-flex gap-2 mt-3">
                        <Button variant="secondary" size="sm" onClick={handlePrevCustomer} disabled={currentCustomer === 0}>&laquo; Prev</Button>
                        <Button variant="primary" size="sm" onClick={handleNextCustomer} disabled={currentCustomer >= 4}>Next Customer &raquo;</Button>
                    </div>
                </Col>
            </Row>

            <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
                <Modal.Header closeButton><Modal.Title>Konfirmasi Transaksi</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Rincian belanja untuk <strong>Customer #{currentCustomer + 1}</strong>:</p>
                    {loadingCountPrice ? (<div className="d-flex justify-content-center p-5"><Spinner animation="border" variant="primary" /></div>) : errorCountPrice ? (<Alert variant="danger">{errorCountPrice}</Alert>) : (
                        <Table responsive>
                            <thead><tr className="table-light"><th>Produk</th><th className="text-center">Diskon (Rp)</th><th className="text-end">Harga Akhir</th></tr></thead>
                            <tbody>
                                {resultCountPrice.map((item, idx) => {
                                    const currentDiscount = discounts[idx] || 0;
                                    const priceAfterDiscount = item.totalPrice - currentDiscount;
                                    return (<tr key={idx} className="align-middle"><td><strong>{item.comodity}</strong><div className="text-muted small">{item.totalWeight} gr</div></td><td className="text-center"><InputGroup style={{ minWidth: '150px', margin: 'auto' }}><Button variant="outline-danger" onClick={() => handleDiscountChange(idx, 'decrease')} disabled={currentDiscount === 0}> - </Button><Form.Control className="text-center fw-bold" value={currentDiscount.toLocaleString('id-ID')} readOnly /><Button variant="outline-success" onClick={() => handleDiscountChange(idx, 'increase', item.totalPrice)} disabled={currentDiscount >= item.totalPrice}> + </Button></InputGroup></td><td className="text-end"><span className="fw-bold fs-6"> Rp {priceAfterDiscount.toLocaleString('id-ID')} </span>{currentDiscount > 0 && (<div className="text-muted small text-decoration-line-through"> Rp {item.totalPrice.toLocaleString('id-ID')} </div>)}</td></tr>);
                                })}
                                {tradeInCart.map((item, idx) => (
                                    <tr key={`tradein-summary-${idx}`} className="align-middle table-success"><td><strong>{item.comodity} (Tukar Tambah)</strong><div className="text-muted small">{item.totalWeight} gr</div></td><td className="text-center">-</td><td className="text-end"><span className="fw-bold fs-6">-Rp {item.totalPrice.toLocaleString('id-ID')}</span></td></tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                    <hr />
                    <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Subtotal</span><span>Rp {subtotal.toLocaleString()}</span></ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Total Diskon</span><span className="text-danger">- Rp {totalDiscount.toLocaleString()}</span></ListGroup.Item>
                        {tradeInTotal > 0 && (<ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0"><span>Total Tukar Tambah</span><span className="text-success">- Rp {tradeInTotal.toLocaleString()}</span></ListGroup.Item>)}
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0 fw-bolder fs-5"><span>TOTAL AKHIR</span><span className="text-primary">Rp {grandTotal.toLocaleString()}</span></ListGroup.Item>
                    </ListGroup>
                    <Form.Group className="my-3">
                        <Form.Label className="fw-bold">Nominal Bayar</Form.Label>
                        <InputGroup><InputGroup.Text>Rp</InputGroup.Text><Form.Control type="text" value={paymentAmount ? parseInt(paymentAmount, 10).toLocaleString('id-ID') : ""} onChange={handlePaymentChange} placeholder="Masukkan jumlah uang pembayaran" size="lg" autoFocus /></InputGroup>
                    </Form.Group>
                    {paymentAmount && change >= 0 && (<div className="alert alert-success d-flex justify-content-between align-items-center fw-bolder fs-5"><span>Kembalian</span><span>Rp {change.toLocaleString()}</span></div>)}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Tutup</Button>
                    <Button variant="primary" onClick={handleConfirmTransaction} disabled={change < 0 || !paymentAmount || loadingSaveTransaction}>{loadingSaveTransaction ? (<> <Spinner as="span" animation="border" size="sm" /> Menyimpan... </>) : ('Konfirmasi & Cetak Struk')}</Button>
                </Modal.Footer>
            </Modal>

            {/* --- PERUBAHAN ---: Modal ini sekarang dinamis untuk Jual & Tukar Tambah */}
            <Modal show={showModalCstmW} onHide={handleCloseModalCstmW} centered size='lg'>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {modalMode === 'jual' ? 'Pilih Berat Penjualan' : 'Pilih Berat Tukar Tambah'}: {selectedItemNm}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex flex-wrap justify-content-center mb-4">
                        {presetWeights.map((preset) => {
                            const presetPrice = getPrice(preset.value);
                            return (
                                <Button key={preset.value} variant="dark" className="m-2 d-flex flex-column justify-content-center align-items-center" style={{ width: '110px', height: '80px', borderRadius: '8px', padding: '10px 5px', lineHeight: '1.3' }} onClick={() => handlePresetClick(preset.value, presetPrice)} disabled={presetPrice === 0} >
                                    <span className="fw-bold" style={{ fontSize: '1rem' }}>{preset.label}</span>
                                    {presetPrice > 0 ? (<small style={{ fontSize: '0.85rem' }}>Rp {presetPrice.toLocaleString('id-ID')}</small>) : (<small className="text-muted">N/A</small>)}
                                </Button>
                            );
                        })}
                    </div>
                    <hr />
                    <div className='sliders-container'>
                        <CustomRangeSlider label={`Kelipatan 1 Kg (0 - 20 Kg)`} value={kgValue} min={0} max={20} step={1} onChange={(e) => setKgValue(parseInt(e.target.value, 10))} price={priceKg} unit="kg" iconType="kg" />
                        <CustomRangeSlider label={`Kelipatan 50 gr (0 - 950 gr)`} value={gramValue} min={0} max={950} step={50} onChange={(e) => setGramValue(parseInt(e.target.value, 10))} price={priceGram} unit="gr" iconType="gr" />
                    </div>
                    <div className="mt-4 p-3 border rounded bg-light">
                        <strong>Total:</strong> {totalWeight / 1000} kg ({totalWeight} g) <br />
                        <strong>Harga:</strong> Rp {totalPrice.toLocaleString()}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModalCstmW}>Tutup</Button>
                    <Button
                        variant={modalMode === 'jual' ? 'primary' : 'success'}
                        onClick={handleConfirmFromCustomModal}
                    >
                        {modalMode === 'jual' ? 'Tambahkan ke Keranjang' : 'Konfirmasi Tukar Tambah'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

const CustomRangeSlider = ({ label, value, min, max, step, onChange, price, unit, iconType }) => { const [tooltipActive, setTooltipActive] = useState(false); const bars = useMemo(() => { return Array.from({ length: 20 }); }, []); const percentage = max > min ? ((value - min) * 100) / (max - min) : 0; const handleInteraction = (e) => { onChange(e); setTooltipActive(true); }; const handleMouseUp = () => setTooltipActive(false); const renderIcon = () => { if (iconType === 'kg') return <FaShoppingBag className="me-3" />; if (iconType === 'gr') return <FaBalanceScale className="me-3" />; return null; }; return (<div className="slider-group"> <div className="volume-bar-container"> {bars.map((_, index) => { const barPercentage = (index / (bars.length - 1)) * 100; const isActive = barPercentage <= percentage; const height = 10 + barPercentage; return (<div key={index} className={`bar ${isActive ? 'active' : ''}`} style={{ height: `${height}%` }} ></div>); })} </div> <label>{renderIcon()}{label}</label> <div className="custom-slider-container"> <div className="custom-slider-track-bg"></div> <div className="custom-slider-track-volume" style={{ width: `${percentage}%` }}></div> <input type="range" min={min} max={max} step={step} value={value} className="custom-slider-input" onChange={handleInteraction} onMouseUp={handleMouseUp} onTouchEnd={handleMouseUp} /> <div className={`slider-tooltip ${tooltipActive ? 'active' : ''}`} style={{ left: `${percentage}%` }}> {value} {unit} <span className="tooltip-price">Rp {price.toLocaleString('id-ID')}</span> </div> </div> </div>); };

export default Retur;