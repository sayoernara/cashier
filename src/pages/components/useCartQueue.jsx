import { useState, useEffect } from "react";

export function useCartQueue() {
  const [carts, setCarts] = useState({});
  const [activeCustomer, setActiveCustomer] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem("cartQueue");
    if (stored) {
      const parsed = JSON.parse(stored);
      setCarts(parsed.carts || {});
      setActiveCustomer(parsed.activeCustomer || 1);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "cartQueue",
      JSON.stringify({ carts, activeCustomer })
    );
  }, [carts, activeCustomer]);

  // tambah item ke cart
  const addItem = (item) => {
    setCarts((prev) => {
      const currentCart = prev[activeCustomer] || [];
      const index = currentCart.findIndex(
        (x) => x.comodity === item.comodity && x.weight_Gr === item.weight_Gr
      );

      let updatedCart;
      if (index >= 0) {
        updatedCart = [...currentCart];
        updatedCart[index] = {
          ...updatedCart[index],
          qty: updatedCart[index].qty + 1,
        };
      } else {
        updatedCart = [...currentCart, { ...item, qty: 1 }];
      }

      return { ...prev, [activeCustomer]: updatedCart };
    });
  };

  // ganti customer aktif
  const switchCustomer = (custNo) => {
    setActiveCustomer(custNo);
  };

  return { carts, activeCustomer, addItem, switchCustomer };
}
