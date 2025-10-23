import { useEffect, useMemo, type MouseEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useCart } from "@/context/CartContext";
import {
  getAllProducts,
  getProductById,
  getRelatedProducts,
  type Product,
} from "@/lib/products";
import { formatCurrency } from "@/lib/utils";

type UpsellStateItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type UpsellLocationState = {
  transactionId: string;
  amount: number;
  items: UpsellStateItem[];
};

const UpsellPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart, addToCart, items } = useCart();

  const state = (location.state ?? undefined) as UpsellLocationState | undefined;

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!state?.transactionId) {
      navigate("/", { replace: true });
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" as ScrollBehavior : "auto" });
  }, [state?.transactionId, navigate]);

  const CART_STORAGE_KEY = "cart_snapshot_v1";

  const handleAddUpsellItem = (event: MouseEvent<HTMLButtonElement>, product: Product) => {
    event.preventDefault();
    addToCart(product, 1);

    const updatedItems = (() => {
      const snapshot = items.map((entry) => ({
        product: entry.product,
        quantity: entry.quantity,
      }));
      const existingIndex = snapshot.findIndex((entry) => entry.product.id === product.id);
      if (existingIndex >= 0) {
        snapshot[existingIndex] = {
          ...snapshot[existingIndex],
          quantity: snapshot[existingIndex].quantity + 1,
        };
      } else {
        snapshot.push({ product, quantity: 1 });
      }
      return snapshot;
    })();

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedItems));
    } catch {
      // ignore storage write errors – context will still hold the data
    }

    toast({
      title: "Oferta adicionada ao carrinho",
      description: `${product.name} foi adicionado ao carrinho.`,
    });
    navigate("/checkout");
  };

  const relatedProducts = useMemo(() => {
    if (!state?.items?.length) {
      return getAllProducts().slice(0, 6);
    }

    const seen = new Set<string>();
    const collected: Product[] = [];

    state.items.forEach((item) => {
      const sourceProduct = getProductById(item.id);
      if (!sourceProduct) return;

      const related = getRelatedProducts(sourceProduct.id);
      related.forEach((product) => {
        if (!seen.has(product.id) && !state.items.some((entry) => entry.id === product.id)) {
          seen.add(product.id);
          collected.push(product);
        }
      });
    });

    if (collected.length === 0) {
      const fallback = getAllProducts().filter(
        (product) => !state.items.some((entry) => entry.id === product.id),
      );
      collected.push(...fallback.slice(0, 6));
    }

    return collected.slice(0, 6);
  }, [state?.items]);

  if (!state?.transactionId) {
    return null;
  }

  const totalAmount = Math.max(state.amount, 0) / 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <section className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">Pagamento confirmado!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Obrigado pela sua compra. Recebemos o pagamento do pedido:{" "}
            <span className="font-semibold text-foreground">{state.transactionId}</span>.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Valor total pago: <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>
          </p>

          <div className="mt-6 grid gap-3 rounded-xl border border-border/60 bg-background p-6 text-left text-sm">
            <h2 className="text-base font-semibold text-foreground">Resumo do pedido</h2>
            <ul className="space-y-2">
              {state.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center">
            <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
              Voltar para a loja
            </Button>
          </div>
        </section>

        <section className="space-y-6 rounded-2xl border border-border bg-accent/5 p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:text-sm">
                Aproveite agora
              </span>
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">Talvez voce tambem goste!</h2>
              <p className="text-sm text-muted-foreground sm:max-w-lg">
                Complementamos o seu pedido com ofertas exclusivas para quem acabou de finalizar a compra.
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")} className="self-start sm:self-auto">
              Ver todos os produtos
            </Button>
          </div>

          {relatedProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {relatedProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-background p-3">
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="h-full w-full object-contain transition-all group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4 flex flex-1 flex-col justify-between text-sm">
                    <div className="space-y-2">
                      {product.badgeLabel ? (
                        <p className="text-xs font-medium uppercase text-primary">{product.badgeLabel}</p>
                      ) : null}
                      <h3 className="text-base font-semibold text-foreground line-clamp-2">{product.name}</h3>
                      {product.shortDescription ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.shortDescription}</p>
                      ) : null}
                      <p className="text-lg font-bold text-foreground">{formatCurrency(product.price)}</p>
                    </div>
                    <Button
                      size="sm"
                      className="mt-4 w-full"
                      onClick={(event) => handleAddUpsellItem(event, product)}
                    >
                      Adicionar ao carrinho
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
              Novas ofertas estarao disponiveis em breve. Enquanto isso, explore a loja completa.
            </div>
          )}
        </section>
      </main>

      <Newsletter />
      <Footer />
    </div>
  );
};

export default UpsellPage;
