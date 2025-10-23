import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Product } from "@/lib/products";

const CART_STORAGE_KEY = "cart_snapshot_v1";

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartContextType = {
  items: CartLine[];
  totalQuantity: number;
  subtotal: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartLine[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Array<{ product: Product; quantity: number }>;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((line) => line?.product?.id && line.quantity > 0);
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage failures
    }
  }, [items]);

  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [items],
  );

  const addToCart = (product: Product, quantity = 1) => {
    if (!product || quantity <= 0) return;
    setItems((prev) => {
      const existingIndex = prev.findIndex((line) => line.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const current = updated[existingIndex];
        updated[existingIndex] = { ...current, quantity: current.quantity + quantity };
        return updated;
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((line) => line.product.id !== productId);
      }
      return prev.map((line) => (line.product.id === productId ? { ...line, quantity } : line));
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((line) => line.product.id !== productId));
  };

  const clearCart = () => setItems([]);

  const setCartOpen = (open: boolean) => setIsCartOpen(open);
  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isCartOpen,
        setCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
