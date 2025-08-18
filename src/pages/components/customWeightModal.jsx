import { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const CustomWeightModal = ({ show, handleClose, selectedItemNm, goodsPrice }) => {
  const [kgValue, setKgValue] = useState(0);      // dalam kg
  const [gramValue, setGramValue] = useState(0);  // dalam gram

  // cari harga dari data goodsPrice berdasarkan weight_Gr
  const getPrice = (weight) => {
    const found = goodsPrice.find((g) => parseInt(g.weight_Gr) === weight);
    return found ? parseInt(found.price_per_Gr) : 0;
  };

  const kgInGram = kgValue * 1000;

  const priceKg = getPrice(kgInGram);
  const priceGram = getPrice(gramValue);

  const totalWeight = kgInGram + gramValue;
  const totalPrice = priceKg + priceGram;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Kustomisasi berat {selectedItemNm}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Range per KG */}
        <Form.Group className="mb-4">
          <Form.Label>
            Berat (Kg): {kgValue} kg{" "}
            {priceKg > 0 && <span className="text-success">Rp {priceKg.toLocaleString()}</span>}
          </Form.Label>
          <Form.Range
            min={0}
            max={20}
            value={kgValue}
            onChange={(e) => setKgValue(parseInt(e.target.value))}
          />
        </Form.Group>

        {/* Range per Gram */}
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

        {/* Total */}
        <div className="mt-4 p-3 border rounded bg-light">
          <strong>Total:</strong> {totalWeight / 1000} kg ({totalWeight} g) <br />
          <strong>Harga:</strong> Rp {totalPrice.toLocaleString()}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Tutup
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            console.log("Ditambahkan:", {
              berat: totalWeight,
              harga: totalPrice,
            });
            handleClose();
          }}
        >
          Tambahkan ke keranjang
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CustomWeightModal;
