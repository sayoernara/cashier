import React, { useCallback, useState, useEffect } from 'react';
import { countPrice, getGoodsList, getGoodsPricePerGram } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal, Form, InputGroup, ListGroup, Table } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';
import { CiImageOff } from 'react-icons/ci';
import Swal from 'sweetalert2';

function Dashboard() {
  const [loadingGoods, setLoadingGoods] = useState(false);
  const [errorLoadingGoods, setErrorLoadingGoods] = useState(null);
  const [goodsList, setGoodsList] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(0);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showModalCstmW, setShowModalCstmW] = useState(false);
  const [selectedIdItem, setSelectedIdItem] = useState('');
  const [selectedItemNm, setSelectedItemNm] = useState('');
  const [errorLoadingGoodsPrice, setErrorLoadingGoodsPrice] = useState(null);
  const [goodsPrice, setGoodsPrice] = useState([]);
  const [kgValue, setKgValue] = useState(0);
  const [gramValue, setGramValue] = useState(0);
  const [resultCountPrice, setResultCounPrice] = useState([]);
  const [loadingCountPrice, setLoadingCountPrice] = useState(false);
  const [errorCountPrice, setErrorCountPrice] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const DISCOUNT_STEP = 500;

  const handleCloseModal = () => {
    setShowModal(false);
    setResultCounPrice([]);
    setDiscounts([]); 
    setPaymentAmount(""); 
  };
  const handleShowModal = () => {
    if (cart.length > 0) {
      setShowModal(true);
      fetchCountPrice();
    }
  };

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

  const fetchGoodsPricePerGram = useCallback(async (selectedIdItem) => {
    try {
      setErrorLoadingGoodsPrice(true);
      const result = await getGoodsPricePerGram(selectedIdItem);
      setGoodsPrice(result.data.price[0]);
      // console.log(result.data.price[0]);
    } catch (err) {
      setErrorLoadingGoods(err.message);
    } finally {
      setErrorLoadingGoodsPrice(false);
    }
  });

  const fetchCountPrice = useCallback(async () => {
  try {
    setLoadingCountPrice(true);
    const carts = JSON.parse(localStorage.getItem("carts") || "{}")[currentCustomer] || [];
    if (carts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Keranjang Kosong',
        text: 'Silakan tambahkan barang ke keranjang terlebih dahulu.',
      });
      return;
    }
    const result = await countPrice(carts);
    setResultCounPrice(result.data.cart);
  } catch (err) {
    setErrorCountPrice(err.message);
  } finally {
    setLoadingCountPrice(false);
  }
}, [currentCustomer]);

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

  const filteredComodities = Object.keys(groupedGoods).filter((comodity) => {
    if (!selectedLetter) return true;
    return comodity.toUpperCase().startsWith(selectedLetter);
  });

  const alphabet = Array.from(
    new Set(
      Object.keys(groupedGoods).map(c => c[0].toUpperCase())
    )
  ).sort();

  const getCart = (customerIndex) => {
    const carts = JSON.parse(localStorage.getItem("carts") || "{}");
    return carts[customerIndex] || [];
  };

  const saveCart = (customerIndex, cart) => {
    const carts = JSON.parse(localStorage.getItem("carts") || "{}");
    carts[customerIndex] = cart;
    localStorage.setItem("carts", JSON.stringify(carts));
  };

  useEffect(() => {
    setCart(getCart(currentCustomer));
  }, [currentCustomer]);

  const addToCart = (comodity, id_item, weight, price) => {
    setCart((prevCart) => {
      const numWeight = parseInt(weight, 10);
      const numPrice = parseInt(price, 10);

      const existingItemIndex = prevCart.findIndex(
        (item) => item.comodity === comodity && item.id_item === id_item
      );
      ``
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
        updatedCart = [
          ...prevCart,
          {
            comodity,
            id_item,
            totalWeight: numWeight,
            totalPrice: numPrice,
          },
        ];
      }

      saveCart(currentCustomer, updatedCart);
      return updatedCart;
    });
  };

  const removeFromCart = (comodityToRemove) => {
    const updatedCart = cart.filter((item) => item.comodity !== comodityToRemove);
    setCart(updatedCart);
    saveCart(currentCustomer, updatedCart);
  };

  const handleNextCustomer = () => {
    setCurrentCustomer((prev) => prev + 1);
  };


  const handlePrevCustomer = () => {
    if (currentCustomer > 0) {
      setCurrentCustomer((prev) => prev - 1);
    }
  };

  const totalHarga = cart.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );


  // ambil harga sesuai weight_Gr, kalau gak ada → fallback ke per kg / per 50g
  const getPrice = (weight) => {
    const found = goodsPrice.find(
      (g) => parseInt(g.weight_Gr, 10) === weight
    );
    if (found) return parseInt(found.price_per_Gr, 10);

    // fallback: kalau kelipatan 1000 → ambil harga 1kg × banyak kilo
    if (weight % 1000 === 0) {
      const base = goodsPrice.find((g) => parseInt(g.weight_Gr, 10) === 1000);
      return base ? (weight / 1000) * parseInt(base.price_per_Gr, 10) : 0;
    }

    // fallback: kalau kelipatan 50 → ambil harga 50g × banyak kelipatan
    if (weight % 50 === 0) {
      const base = goodsPrice.find((g) => parseInt(g.weight_Gr, 10) === 50);
      return base ? (weight / 50) * parseInt(base.price_per_Gr, 10) : 0;
    }

    return 0;
  };

  // Hitungan berdasarkan slider
  const kgInGram = kgValue * 1000;
  const priceKg = kgValue > 0 ? getPrice(kgInGram) : 0;
  const priceGram = gramValue > 0 ? getPrice(gramValue) : 0;
  const totalWeight = kgInGram + gramValue;
  const totalPrice = priceKg + priceGram;

  // Tambahan: Input dan tombol untuk KG
  const handleKgInputChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setKgValue(isNaN(value) ? 0 : value);
  };

  const handleIncrementKg = () => {
    setKgValue((prevKg) => prevKg + 1);
  };

  const handleDecrementKg = () => {
    setKgValue((prevKg) => Math.max(0, prevKg - 1));
  };

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
  console.log(`Item index: ${index}, Operation: ${operation}, Old Discount: ${currentDiscount}, New Discount: ${newValue}`);
  newDiscounts[index] = newValue;
  setDiscounts(newDiscounts);
};

  const handlePaymentChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPaymentAmount(value);
  };

  // --- Kalkulasi untuk ditampilkan ---
  const subtotal = resultCountPrice.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalDiscount = discounts.reduce((sum, discount) => sum + (discount || 0), 0);
  const grandTotal = subtotal - totalDiscount;
  const change = parseInt(paymentAmount || 0, 10) - grandTotal;

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
                          <Card.Title className="fs-6 fw-bold">
                            {comodity}
                          </Card.Title>
                          {representativeItem.img ? (
                            <img
                              src={representativeItem.img}
                              alt={comodity}
                              className="img-fluid itemimgcenter"
                            />
                          ) : (
                            <CiImageOff size={150} className="text-secondary"
                              style={{
                                display: 'block',
                                margin: '0 auto',
                                width: '45%',
                                height: 'auto'
                              }}
                            />
                          )}

                          <div className="d-flex flex-wrap gap-2 mt-3">
                            {groupedGoods[comodity].map((sub, i) => (
                              <Card
                                key={i}
                                className="p-2 text-center flex-fill border shadow-sm"
                                style={{
                                  minWidth: "80px",
                                  flex: "0 0 auto",
                                  cursor: "pointer",
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
                                <div className="fw-bold">{sub.weight_Gr} gr</div>
                                <div className="text-primary small">
                                  Rp {parseInt(sub.price_per_Gr).toLocaleString()}
                                </div>
                              </Card>
                            ))}
                            {representativeItem && (
                              <Card
                                className="p-2 d-flex align-items-center justify-content-center border shadow-sm text-center"
                                style={{
                                  minWidth: "80px",
                                  minHeight: "80px",
                                  flex: "0 0 auto",
                                  cursor: "pointer",
                                  backgroundColor: '#3498db',
                                  color: 'white',
                                }}
                                onClick={() => handleShowModalCstmW(representativeItem.id_item, comodity)}
                              >
                                CSTM<br /> Weight
                              </Card>
                            )}
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
          <div className="d-flex flex-wrap gap-1 mb-3">
            {alphabet.map((letter) => (
              <Card
                key={letter}
                className={`p-2 text-center shadow-sm border ${selectedLetter === letter ? "bg-primary text-white" : ""
                  }`}
                style={{
                  width: "40px",
                  height: "40hv",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setSelectedLetter(selectedLetter === letter ? null : letter)
                }
              >
                {letter}
              </Card>
            ))}
          </div>

          <h4 className="mt-4"><BiCart /> Cart Customer #{currentCustomer + 1}</h4>
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            height: "calc(100vh - 400px)",
            display: "flex",
            flexDirection: "column"
          }}>
            {cart.length === 0 ? (
              <p className="text-muted small fst-italic m-2">Belum ada item</p>
            ) : (
              <>
                <div className='cartitemlist' style={{ flex: 1, overflowY: "auto" }}>
                  <ul className="list-group small shadow-sm rounded">
                    {[...cart].reverse().map((item, idx) => (
                      <li
                        key={`${item.comodity}-${idx}`}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <strong>{item.comodity}</strong>
                          <div className="text-muted">
                            Total: {item.totalWeight} gr
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {/* <span className="fw-bold text-success">
                            Rp {item.totalPrice.toLocaleString()}
                          </span> */}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => removeFromCart(item.comodity)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2">
                  {cart.length > 0 && (
                    <li className="list-group-item d-flex justify-content-between align-items-center fw-bold">
                      {/* <span>Total</span>
                      <span className="text-primary">
                        Rp{" "}
                        {cart
                          .reduce((sum, item) => sum + item.totalPrice, 0)
                          .toLocaleString()}
                      </span> */}
                      <Button variant="success" size="xl" onClick={handleShowModal}>
                        Selesaikan pesanan
                      </Button>
                    </li>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="d-flex gap-2 mt-3">
            <Button variant="secondary" size="sm" onClick={handlePrevCustomer} disabled={currentCustomer === 0}>
              &laquo; Prev
            </Button>
            <Button variant="primary" size="sm" onClick={handleNextCustomer}>
              Next Customer &raquo;
            </Button>
          </div>

        </Col>
      </Row>

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
          // --- STRUKTUR TABEL ---
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
                    {/* Kolom Nama Produk */}
                    <td>
                      <strong>{item.comodity}</strong>
                      <div className="text-muted small">{item.totalWeight} gr</div>
                    </td>

                    {/* Kolom Kontrol Diskon */}
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

                    {/* Kolom Harga Akhir */}
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

        {/* --- BAGIAN TOTAL DAN PEMBAYARAN (TETAP SAMA) --- */}
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
        <Button variant="primary" onClick={handleCloseModal} disabled={change < 0 || !paymentAmount}>
          Konfirmasi & Cetak Struk
        </Button>
      </Modal.Footer>
    </Modal>

      <Modal show={showModalCstmW} onHide={handleCloseModalCstmW} centered size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>Kustomisasi berat {selectedItemNm}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Input Group untuk KG */}
          <Form.Group className="mb-4">
            <Form.Label>
              Berat (Kg): {kgValue} kg{" "}
              {priceKg > 0 && <span className="text-success">Rp {priceKg.toLocaleString()}</span>}
            </Form.Label>

            {/* Kombinasi Tombol dan Input Field */}
            <InputGroup className="mb-2">
              <Button variant="outline-secondary" onClick={handleDecrementKg}>
                -
              </Button>
              <Form.Control
                type="number"
                value={kgValue}
                onChange={handleKgInputChange}
                placeholder="Masukkan berat (kg)"
                className="text-center"
              />
              <Button variant="outline-secondary" onClick={handleIncrementKg}>
                +
              </Button>
            </InputGroup>


            <Form.Range
              min={0}
              max={20}
              step={1}
              value={Math.min(kgValue, 20)}
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

export default Dashboard;