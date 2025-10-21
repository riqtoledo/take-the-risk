import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";

type OrderSummaryProps = {
  shippingCost: number;
  isFreeShipping: boolean;
};

const OrderSummary = ({ shippingCost, isFreeShipping }: OrderSummaryProps) => {
  const { items, subtotal } = useCart();

  const total = useMemo(() => subtotal + (isFreeShipping ? 0 : shippingCost), [subtotal, shippingCost, isFreeShipping]);

  return (
    <aside className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Resumo do pedido</h2>
        <Link to="/" className="text-xs font-medium text-primary underline">
          Voltar para a loja
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex gap-3 rounded-lg border border-border/60 p-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md bg-muted">
              <img src={product.images?.[0]} alt={product.name} className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-1 flex-col justify-between text-sm">
              <div>
                <p className="font-medium text-foreground line-clamp-2">{product.name}</p>
                <span className="text-xs text-muted-foreground">Qtd: {quantity}</span>
              </div>
              <span className="text-sm font-semibold">
                {(product.price * quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Entrega</span>
          <span>{isFreeShipping ? "Gratis" : shippingCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
          <span>Total</span>
          <span>{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </div>
      </div>

      <Button asChild variant="ghost" className="mt-4 w-full">
        <Link to="/">Editar cesta</Link>
      </Button>
    </aside>
  );
};

export default OrderSummary;
