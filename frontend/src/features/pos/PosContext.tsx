import { createContext, useContext, useState, useMemo, ReactNode } from "react";
import type { Product, Service, PaymentMethod } from "@/types";

export interface CartLine {
  item_type: "PRODUCT" | "SERVICE";
  product?: Product;
  service?: Service;
  quantity: number;
}

interface PosContextType {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  discount: number;
  setDiscount: (val: number) => void;
  subtotal: number;
  grandTotal: number;
  addProduct: (p: Product) => void;
  addService: (s: Service) => void;
  updateQty: (index: number, qty: number) => void;
  removeLine: (index: number) => void;
  clearCart: () => void;
  openCheckout: () => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export function PosProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const addProduct = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.item_type === "PRODUCT" && l.product?.id === p.id,
      );
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { item_type: "PRODUCT", product: p, quantity: 1 }];
    });
  };

  const addService = (s: Service) => {
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.item_type === "SERVICE" && l.service?.id === s.id,
      );
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { item_type: "SERVICE", service: s, quantity: 1 }];
    });
  };

  const updateQty = (index: number, qty: number) => {
    setCart((prev) =>
      prev.map((l, i) => (i === index ? { ...l, quantity: qty } : l)),
    );
  };

  const removeLine = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => setCart([]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, l) => {
      const price =
        l.item_type === "PRODUCT"
          ? (l.product?.sale_price ?? 0)
          : (l.service?.sale_price ?? 0);
      return sum + price * l.quantity;
    }, 0);
  }, [cart]);

  const safeDiscount = Math.min(discount, subtotal);
  const grandTotal = subtotal - safeDiscount;

  const openCheckout = () => {
    if (cart.length > 0) setCheckoutOpen(true);
  };

  return (
    <PosContext.Provider
      value={{
        cart,
        setCart,
        discount,
        setDiscount,
        subtotal,
        grandTotal,
        addProduct,
        addService,
        updateQty,
        removeLine,
        clearCart,
        openCheckout,
        checkoutOpen,
        setCheckoutOpen,
      }}
    >
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (!context) throw new Error("usePos must be used within PosProvider");
  return context;
}
