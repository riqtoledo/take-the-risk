import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/products";

const ProductPrice = ({ product }: { product?: Product }) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, openCart } = useCart();

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  const handleAdd = () => {
    if (!product) return;
    addToCart(product, quantity);
    openCart();
    setQuantity(1);
  };

  const promotion = product?.promotion;
  const oldPrice = product?.oldPrice;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="bg-card">
      <div className="container mx-auto px-4 py-4">
        {promotion ? (
          <div className="mb-4 rounded-lg border border-border bg-promotion p-4">
            <p className="mb-1 text-sm font-semibold text-foreground">{promotion.title}</p>
            {promotion.subtitle ? (
              <p className="text-xs text-muted-foreground">{promotion.subtitle}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mb-6 flex items-end justify-between">
          <div>
            {oldPrice ? (
              <p className="text-sm font-medium text-muted-foreground line-through">
                {formatCurrency(oldPrice)}
              </p>
            ) : null}
            <p className="text-3xl font-bold text-foreground">
              {product ? formatCurrency(product.price) : "R$ 0,00"}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="min-w-[2rem] text-center font-semibold">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button variant="cart" size="lg" className="w-full gap-2" onClick={handleAdd} disabled={!product}>
          <ShoppingCart className="h-5 w-5" />
          Adicionar
        </Button>
      </div>
    </div>
  );
};

export default ProductPrice;
