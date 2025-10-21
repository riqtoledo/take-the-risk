import React, { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/products";

type AddBarProps = {
  product?: Product;
  isLoading?: boolean;
};

const AddBar = ({ product, isLoading = false }: AddBarProps) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, openCart } = useCart();
  const barRef = useRef<HTMLDivElement | null>(null);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBarHeight(Math.ceil(entry.contentRect.height));
      }
    });
    observer.observe(el);
    setBarHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const onAdd = () => {
    if (!product || isLoading) return;
    addToCart(product, quantity);
    openCart();
    setQuantity(1);
  };

  const displayPrice = product
    ? product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "";

  return (
    <>
      <div aria-hidden className="w-full" style={{ height: barHeight || 104 }} />
      <div
        ref={barRef}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur transition-opacity"
        style={{ opacity: isLoading ? 0.75 : 1 }}
      >
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-1 flex-col gap-1">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-28" />
              </>
            ) : (
              <>
                <span className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {product?.shortDescription || product?.name}
                </span>
                <span className="text-2xl font-bold text-foreground">{displayPrice}</span>
              </>
            )}
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                aria-label="Diminuir quantidade"
                disabled={isLoading || !product}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[2rem] text-center text-lg font-semibold leading-none">
                {isLoading ? "..." : quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((prev) => prev + 1)}
                aria-label="Aumentar quantidade"
                disabled={isLoading || !product}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="cart"
              size="lg"
              className="h-11 flex-1 gap-2 sm:flex-none sm:w-auto sm:min-w-[200px]"
              onClick={onAdd}
              disabled={isLoading || !product}
            >
              <ShoppingCart className="h-5 w-5" />
              {isLoading ? "Atualizando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddBar;
