import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import { Button } from "@/components/ui/button";
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
  const { clearCart } = useCart();

  const state = (location.state ?? undefined) as UpsellLocationState | undefined;

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!state?.transactionId) {
      navigate("/", { replace: true });
    }
  }, [state?.transactionId, navigate]);

  const relatedProducts = useMemo(() => {
    if (!state?.items?.length) {
      return getAllProducts().slice(0, 4);
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
      collected.push(...fallback.slice(0, 4));
    }

    return collected.slice(0, 4);
  }, [state?.items]);

  if (!state?.transactionId) {
    return null;
  }

  const totalAmount = state.amount / 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-10 space-y-10">
        <section className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">Pagamento confirmado! 🎉</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Obrigado pela sua compra. Recebemos o pagamento do pedido{" "}
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

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
              Voltar para a loja
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => navigate("/checkout")}
            >
              Fazer novo pedido
            </Button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Talvez você também goste</h2>
              <p className="text-sm text-muted-foreground">
                Selecionamos ofertas relacionadas ao seu pedido. Aproveite para complementar a sua compra!
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/")} className="self-start sm:self-auto">
              Ver todos os produtos
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-xs font-medium uppercase text-primary">{product.badgeLabel}</p>
                  <h3 className="text-base font-semibold text-foreground line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.shortDescription}</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Newsletter />
      <Footer />
    </div>
  );
};

export default UpsellPage;
