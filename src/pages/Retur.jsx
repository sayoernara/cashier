import React, { useCallback, useState, useContext } from 'react';
import { getGoodsPricePerGram } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal, Form, InputGroup, ListGroup, Table } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';
import { CiImageOff } from 'react-icons/ci';
import { GoodsContext } from './components/GoodsContext';

function Retur() {
    const {
        groupedGoods, selectedLetter, loadingGoods, errorLoadingGoods,
        currentCustomer, setCurrentCustomer,
        cart, addToCart, removeFromCart,
        showModal, handleCloseModal,
        resultCountPrice, loadingCountPrice, errorCountPrice,
        discounts, setDiscounts,
        paymentAmount, setPaymentAmount,
        fetchTransaction, loadingSaveTransaction
    } = useContext(GoodsContext);

    // State lokal hanya untuk modal kustomisasi berat
    const [showModalCstmW, setShowModalCstmW] = useState(false);
    const [selectedIdItem, setSelectedIdItem] = useState('');
    const [selectedItemNm, setSelectedItemNm] = useState('');
    const [errorGoodsPrice, setErrorGoodsPrice] = useState(null);
    const [loadingGoodsPrice, setLoadingGoodsPrice] = useState(false);
    const [goodsPrice, setGoodsPrice] = useState([]);
    const [kgValue, setKgValue] = useState(0);
    const [gramValue, setGramValue] = useState(0);

    const DISCOUNT_STEP = 500;

    const handleCloseModalCstmW = () => {
        setSelectedIdItem('');
        setSelectedItemNm('');
        setShowModalCstmW(false);
        setGoodsPrice([]);
        setKgValue(0);
        setGramValue(0);
    };

    const handleShowModalCstmW = (id, itemnm) => {
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
    // ----- AKHIR FUNGSI LOKAL -----


    const filteredComodities = Object.keys(groupedGoods).filter((comodity) => {
        if (!selectedLetter) return true;
        return comodity.toUpperCase().startsWith(selectedLetter);
    });

    const handleNextCustomer = () => {
        setCurrentCustomer((prev) => prev + 1);
    };

    const handlePrevCustomer = () => {
        if (currentCustomer > 0) {
            setCurrentCustomer((prev) => prev - 1);
        }
    };

    // Logika perhitungan harga untuk modal transaksi
    const subtotal = resultCountPrice.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = discounts.reduce((sum, discount) => sum + (discount || 0), 0);
    const grandTotal = subtotal - totalDiscount;
    const change = parseInt(paymentAmount || 0, 10) - grandTotal;

    const handleConfirmTransaction = () => {
        const summaryData = {
            subtotal: subtotal,
            totalDiscount: totalDiscount,
            grandTotal: grandTotal,
            paymentAmount: parseInt(paymentAmount, 10),
            change: change,
        };
        fetchTransaction(summaryData);
    };

    const getPrice = (weight) => {
        const found = goodsPrice.find(
            (g) => parseInt(g.weight_Gr, 10) === weight
        );
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

    const handleAddToCartFromModal = (selectedItemNm, selectedIdItem, totalWeight, totalPrice) => {
        if (totalWeight > 0 && totalPrice > 0) {
            addToCart(selectedItemNm, selectedIdItem, totalWeight, totalPrice);
        }
        handleCloseModalCstmW();
    }

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

    const presetWeights = [
        { label: '50 gr', value: 50 },
        { label: '100 gr', value: 100 },
        { label: '250 gr', value: 250 },
        { label: '500 gr', value: 500 },
        { label: '750 gr', value: 750 },
        { label: '1 kg', value: 1000 },
    ];

    const handlePresetAddToCart = (weight, price) => {
        if (weight > 0 && price > 0) {
            addToCart(selectedItemNm, selectedIdItem, weight, price);
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
                        <div
                            className="d-flex justify-content-center align-items-center"
                            style={{ height: "85vh" }}
                        >
                            <Spinner
                                animation="border"
                                variant="primary"
                                role="status"
                                style={{ width: "4rem", height: "4rem" }}
                            />
                        </div>
                    ) : (
                        <div
                            className="goods-list"
                            style={{
                                maxHeight: "80vh",
                                overflowY: "auto",
                                padding: "9px",
                            }}
                        >
                            <Row className="g-2">
                                {filteredComodities.map((comodity, idx) => {
                                    const representativeItem = groupedGoods[comodity]?.[0];
                                    return (
                                        <Col key={idx} xs={12} sm={6} md={4} lg={6}>
                                            <Card className="h-100 shadow-sm border-0">
                                                <Card.Body>
                                                    {representativeItem.img ? (
                                                        <img
                                                            src={representativeItem.img}
                                                            alt={comodity}
                                                            className="img-fluid itemimgcenter"
                                                            onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                                                        />
                                                    ) : (
                                                        <CiImageOff size={150} className="text-secondary"
                                                            style={{
                                                                display: 'block',
                                                                margin: '0 auto',
                                                                width: '45%',
                                                                height: 'auto'
                                                            }}
                                                            onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                                                        />
                                                    )}
                                                    <Card.Title className="fs-6 fw-bold text-center">
                                                        {comodity}
                                                    </Card.Title>

                                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                                        {groupedGoods[comodity].map((sub, i) => {
                                                            const isHighlighted = sub.weight_txt === "Kg";
                                                            const headerStyle = {
                                                                backgroundColor: "#2c3e50",
                                                                color: "white",
                                                                padding: "5px 8px",
                                                            };
                                                            const bodyStyle = {
                                                                backgroundColor: isHighlighted ? "#2ecc71" : "white",
                                                                color: isHighlighted ? "white" : "#2c3e50",
                                                                padding: "8px 0",
                                                            };

                                                            return (
                                                                <Card
                                                                    key={i}
                                                                    className="text-center flex-fill border-0 shadow-sm overflow-hidden"
                                                                    style={{
                                                                        minWidth: "80px",
                                                                        flex: "0 0 auto",
                                                                        cursor: "pointer",
                                                                        borderRadius: "8px",
                                                                    }}
                                                                    onClick={() =>
                                                                        addToCart(
                                                                            comodity,
                                                                            sub.id_item,
                                                                            sub.weight_Gr,
                                                                            sub.price_per_Gr
                                                                        )
                                                                    }
                                                                >
                                                                    <div className="fw-bold" style={headerStyle}>
                                                                        {sub.weight_txt}
                                                                    </div>
                                                                    <div style={bodyStyle}>
                                                                        <div className="fw-bolder h2 m-0 lh-1">{sub.stock}</div>
                                                                        <div className="small fw-bold">
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
                        </div>
                    )}
                </Col>

                <Col md={3} style={{ flex: "0 0 30%" }}>
                    <h4 className="mt-4"><BiCart /> Cart Retur Customer #{currentCustomer + 1}</h4>
                    <div style={{
                        backgroundColor: '#f8f9fa', borderRadius: '5px',
                        height: "calc(100vh - 250px)", // Sesuaikan tinggi jika perlu
                        display: "flex", flexDirection: "column"
                    }}>
                        {cart.length === 0 ? (
                            <p className="text-muted small fst-italic m-2">Belum ada item</p>
                        ) : (
                            <div className='cartitemlist' style={{ flex: 1, overflowY: "auto" }}>
                                <ul className="list-group small shadow-sm rounded">
                                    {[...cart].reverse().map((item, idx) => (
                                        <li key={`${item.comodity}-${idx}`} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{item.comodity}</strong>
                                                <div className="text-muted">Total: {item.totalWeight} gr</div>
                                            </div>
                                            <Button variant="outline-danger" size="sm" onClick={() => removeFromCart(item.comodity)}>
                                                Hapus
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="d-flex gap-2 mt-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handlePrevCustomer}
                            disabled={currentCustomer === 0}
                        >
                            &laquo; Prev
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleNextCustomer}
                            disabled={currentCustomer === 1}
                        >
                            Next Customer &raquo;
                        </Button>
                    </div>

                </Col>
            </Row>

            {/* Modal Konfirmasi Transaksi (sekarang menggunakan state dari context) */}
            <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Transaksi</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Rincian belanja untuk <strong>Customer #{currentCustomer + 1}</strong>:
                    </p>

                    {loadingCountPrice ? (
                        <div className="d-flex justify-content-center p-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : errorCountPrice ? (
                        <Alert variant="danger">{errorCountPrice}</Alert>
                    ) : (
                        <Table responsive>
                            <thead>
                                <tr className="table-light">
                                    <th>Produk</th>
                                    <th className="text-center">Diskon (Rp)</th>
                                    <th className="text-end">Harga Akhir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resultCountPrice.map((item, idx) => {
                                    const currentDiscount = discounts[idx] || 0;
                                    const priceAfterDiscount = item.totalPrice - currentDiscount;

                                    return (
                                        <tr key={idx} className="align-middle">
                                            <td>
                                                <strong>{item.comodity}</strong>
                                                <div className="text-muted small">{item.totalWeight} gr</div>
                                            </td>
                                            <td className="text-center">
                                                <InputGroup style={{ minWidth: '150px', margin: 'auto' }}>
                                                    <Button
                                                        variant="outline-danger"
                                                        onClick={() => handleDiscountChange(idx, 'decrease')}
                                                        disabled={currentDiscount === 0}
                                                    >
                                                        -
                                                    </Button>
                                                    <Form.Control
                                                        className="text-center fw-bold"
                                                        value={currentDiscount.toLocaleString('id-ID')}
                                                        readOnly
                                                        aria-label="Discount amount"
                                                    />
                                                    <Button
                                                        variant="outline-success"
                                                        onClick={() => handleDiscountChange(idx, 'increase', item.totalPrice)}
                                                        disabled={currentDiscount >= item.totalPrice}
                                                    >
                                                        +
                                                    </Button>
                                                </InputGroup>
                                            </td>
                                            <td className="text-end">
                                                <span className="fw-bold fs-6">
                                                    Rp {priceAfterDiscount.toLocaleString('id-ID')}
                                                </span>
                                                {currentDiscount > 0 && (
                                                    <div className="text-muted small text-decoration-line-through">
                                                        Rp {item.totalPrice.toLocaleString('id-ID')}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}

                    <hr />

                    <ListGroup variant="flush">
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString()}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0">
                            <span>Total Diskon</span>
                            <span className="text-danger">- Rp {totalDiscount.toLocaleString()}</span>
                        </ListGroup.Item>
                        <ListGroup.Item className="d-flex justify-content-between align-items-center ps-0 pe-0 fw-bolder fs-5">
                            <span>TOTAL AKHIR</span>
                            <span className="text-primary">Rp {grandTotal.toLocaleString()}</span>
                        </ListGroup.Item>
                    </ListGroup>

                    <Form.Group className="my-3">
                        <Form.Label className="fw-bold">Nominal Bayar</Form.Label>
                        <InputGroup>
                            <InputGroup.Text>Rp</InputGroup.Text>
                            <Form.Control
                                type="text"
                                value={paymentAmount ? parseInt(paymentAmount, 10).toLocaleString('id-ID') : ""}
                                onChange={handlePaymentChange}
                                placeholder="Masukkan jumlah uang pembayaran"
                                size="lg"
                                autoFocus
                            />
                        </InputGroup>
                    </Form.Group>

                    {paymentAmount && change >= 0 && (
                        <div className="alert alert-success d-flex justify-content-between align-items-center fw-bolder fs-5">
                            <span>Kembalian</span>
                            <span>Rp {change.toLocaleString()}</span>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>Tutup</Button>
                    <Button
                        variant="primary"
                        onClick={handleConfirmTransaction} // Memanggil fungsi baru
                        disabled={change < 0 || !paymentAmount || loadingSaveTransaction}
                    >
                        {loadingSaveTransaction ? (
                            <> <Spinner as="span" animation="border" size="sm" /> Menyimpan... </>
                        ) : (
                            'Konfirmasi & Cetak Struk'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showModalCstmW} onHide={handleCloseModalCstmW} centered size='lg'>
                <Modal.Header closeButton>
                    <Modal.Title>Kustomisasi berat {selectedItemNm}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex flex-wrap justify-content-center mb-4">
                        {presetWeights.map((preset) => {
                            const presetPrice = getPrice(preset.value);

                            return (
                                <Button
                                    key={preset.value}
                                    variant="dark"
                                    className="m-2 d-flex flex-column justify-content-center align-items-center"
                                    style={{
                                        width: '110px',
                                        height: '80px',
                                        borderRadius: '8px',
                                        padding: '10px 5px',
                                        lineHeight: '1.3'
                                    }}
                                    onClick={() => handlePresetAddToCart(preset.value, presetPrice)}
                                    disabled={presetPrice === 0}
                                >
                                    <span className="fw-bold" style={{ fontSize: '1rem' }}>
                                        {preset.label}
                                    </span>
                                    {presetPrice > 0 ? (
                                        <small style={{ fontSize: '0.85rem' }}>
                                            Rp {presetPrice.toLocaleString('id-ID')}
                                        </small>
                                    ) : (
                                        <small className="text-muted">N/A</small>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                    <hr />
                    <Form.Group className="mb-4">
                        <Form.Label>
                            Berat (Kg): {kgValue} kg{" "}
                            {priceKg > 0 && <span className="text-success">Rp {priceKg.toLocaleString()}</span>}
                        </Form.Label>
                        <Form.Range
                            min={0}
                            max={20}
                            step={1}
                            value={Math.min(kgValue, 20)}
                            readOnly
                            onChange={(e) => setKgValue(parseInt(e.target.value, 10))}
                        />
                    </Form.Group>

                    <Form.Group>
                        <Form.Label>
                            Berat (Gram): {gramValue} g{" "}
                            {priceGram > 0 && <span className="text-success">Rp {priceGram.toLocaleString()}</span>}
                        </Form.Label>
                        <Form.Range
                            min={0}
                            max={950}
                            step={50}
                            value={gramValue}
                            onChange={(e) => setGramValue(parseInt(e.target.value))}
                        />
                    </Form.Group>

                    <div className="mt-4 p-3 border rounded bg-light">
                        <strong>Total:</strong> {totalWeight / 1000} kg ({totalWeight} g) <br />
                        <strong>Harga:</strong> Rp {totalPrice.toLocaleString()}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModalCstmW}>
                        Tutup
                    </Button>
                    <Button variant="primary" onClick={() => handleAddToCartFromModal(selectedItemNm, selectedIdItem, totalWeight, totalPrice)}>
                        Tambahkan ke keranjang customer {currentCustomer + 1}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default Retur;