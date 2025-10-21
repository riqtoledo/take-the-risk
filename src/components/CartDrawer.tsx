import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import CheckoutTransitionOverlay from "@/features/checkout/components/CheckoutTransitionOverlay";

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatCurrency = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { items, subtotal, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const hasItems = items.length > 0;

  const handleFinalize = () => {
    if (!hasItems) return;
    setIsNavigating(true);
    onOpenChange(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => navigate("/checkout"), 200);
  };

  return (
    <>
      <CheckoutTransitionOverlay visible={isNavigating} message="Redirecionando para o checkout..." />
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col p-0 sm:max-w-md">
        <div className="flex items-center justify-center gap-2 bg-primary px-6 py-4 text-primary-foreground">
          <ShoppingCart className="h-5 w-5" />
          <span className="text-base font-semibold">Minha cesta</span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {hasItems ? (
            <div className="space-y-5">
              {items.map(({ product, quantity }) => {
                const imageSrc = product.images?.[0];
                const lineTotal = product.price * quantity;

                return (
                  <div key={product.id} className="flex gap-3">
                    <div
                      className={cn(
                        "flex h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted",
                        imageSrc ? "p-1" : "items-center justify-center text-xs text-muted-foreground",
                      )}
                    >
                      {imageSrc ? (
                        <img src={imageSrc} alt={product.name} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px]">Sem imagem</div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
                          <span className="text-xs text-muted-foreground">{formatCurrency(product.price)}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(product.id)}
                          aria-label={`Remover ${product.name} do carrinho`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-md border border-border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            aria-label="Diminuir quantidade"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <span className="text-sm font-semibold text-foreground">{formatCurrency(lineTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
              Nenhum item na sua cesta.
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card px-6 py-4 shadow-[0_-12px_24px_-16px_rgba(15,23,42,0.4)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="text-base font-semibold text-primary">{formatCurrency(subtotal)}</span>
          </div>
          <Button
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
            disabled={!hasItems}
            onClick={handleFinalize}
          >
            Finalizar pedido
          </Button>
        </div>
      </SheetContent>
      </Sheet>
    </>
  );
};

export default CartDrawer;
