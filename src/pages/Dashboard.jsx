import React, { useCallback, useState, useEffect } from 'react';
import { getGoodsList } from './apis/api';
import { Alert, Col, Row, Spinner, Card, Button, Modal } from 'react-bootstrap';
import { BiCart } from 'react-icons/bi';

function Dashboard() {
  const [loadingGoods, setLoadingGoods] = useState(false);
  const [errorLoadingGoods, setErrorLoadingGoods] = useState(null);
  const [goodsList, setGoodsList] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(0);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const handleCloseModal = () => setShowModal(false);
  const handleShowModal = () => {
    if (cart.length > 0) {
      setShowModal(true);
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
                {filteredComodities.map((comodity, idx) => (
                  <Col key={idx} xs={12} sm={6} md={4} lg={6}>
                    <Card className="h-100 shadow-sm border-0">
                      <Card.Body>
                        <Card.Title className="fs-6 fw-bold">
                          {comodity}
                        </Card.Title>
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
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
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
            height: "calc(100vh - 310px)",
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
                          <span className="fw-bold text-success">
                            Rp {item.totalPrice.toLocaleString()}
                          </span>
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

                {/* area fixed untuk total + tombol */}
                <div className="mt-2">
                  {cart.length > 0 && (
                    <li className="list-group-item d-flex justify-content-between align-items-center fw-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        Rp{" "}
                        {cart
                          .reduce((sum, item) => sum + item.totalPrice, 0)
                          .toLocaleString()}
                      </span>
                      <Button variant="success" size="xl" onClick={handleShowModal}>
                        Selesai
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
      <Modal show={showModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Transaksi</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Berikut adalah rincian belanja untuk <strong>Customer #{currentCustomer + 1}</strong>:</p>
          {/* Menampilkan kembali daftar item di dalam modal */}
          <ul className="list-group list-group-flush">
            {cart.map((item, idx) => (
              <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                <div>
                  <strong>{item.comodity}</strong>
                  <div className="text-muted small">{item.totalWeight} gr</div>
                </div>
                <span className="fw-bold">
                  Rp {item.totalPrice.toLocaleString()}
                </span>
              </li>
            ))}
            <li className="list-group-item d-flex justify-content-between align-items-center fw-bolder mt-2">
              <span>TOTAL</span>
              <span className="text-primary">
                Rp {cart.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
              </span>
            </li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Tutup
          </Button>
          <Button variant="primary" onClick={handleCloseModal}>
            Konfirmasi & Cetak Struk
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Dashboard;