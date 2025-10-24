import { useMemo } from "react";
import { Star } from "lucide-react";
import { Product, generateDeterministicReviews } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useState } from "react";

const ProductInfo = ({ product }: { product?: Product }) => {
  const reviews = useMemo(() => {
    if (!product?.id) return [];
    if (product.reviews && product.reviews.length > 0) return product.reviews;
    return generateDeterministicReviews(product.id, 4);
  }, [product]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, index) => {
      const value = index + 1;
      const active = rating >= value - 0.5;
      return (
        <Star
          key={value}
          className={cn(
            "h-4 w-4",
            active ? "fill-rating text-rating" : "text-muted-foreground",
            !active && "fill-transparent",
          )}
        />
      );
    });

  function DiaperSizeBox({ product, onSelect }) {
    if (!product?.isDiaper || !Array.isArray(product?.diaperSizes) || product.diaperSizes.length === 0) {
      return null; // não é fralda => não mostra nada
    }

    const sizes = product.diaperSizes.filter((s) => s.code !== "RN");

    const [selected, setSelected] = useState(
      sizes.find((s) => s.default)?.code ??
      sizes.find((s) => s.stock > 0)?.code ??
      sizes[0]?.code
    );

    const handleClick = (size) => {
      if (size.stock === 0) return; // evita selecionar esgotado
      setSelected(size.code);
      onSelect?.(size);
    };

    if (sizes.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-foreground">Tamanhos</div>

        {/* grid mobile-first, compacto */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {sizes.map((size) => {
            const isSelected = selected === size.code;
            const isOut = size.stock === 0;

            return (
              <button
                key={size.code}
                type="button"
                onClick={() => handleClick(size)}
                disabled={isOut}
                aria-pressed={isSelected}
                title={size.label}
                className={[
                  "flex flex-col items-center justify-center rounded-lg border px-2 py-2 text-xs leading-tight transition",
                  "min-w-[56px] md:min-w-[64px]",
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
                  isOut ? "cursor-not-allowed opacity-50 line-through" : "hover:border-primary",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                ].join(" ")}
              >
                <span className="font-semibold">{size.code}</span>
                {size.range ? (
                  <span className="text-[11px] text-muted-foreground">{size.range}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {product.sizeGuide ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {product.sizeGuide}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <h1 className="mb-1 text-sm text-muted-foreground">{product?.shortDescription}</h1>
        <h2 className="mb-3 text-xl font-semibold text-foreground">{product?.name}</h2>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1">{renderStars?.(averageRating)}</div>
          <span className="text-xs text-muted-foreground">
            {reviews.length
              ? `${averageRating.toFixed(1)} - ${reviews.length} avaliação${reviews.length > 1 ? "es" : ""}`
              : "Sem avaliações"}
          </span>
        </div>

        {product?.sales ? (
          <p className="mb-1 text-xs text-muted-foreground">
            {product.sales.percentage}% de vendas ({product.sales.count.toLocaleString("pt-BR")})
          </p>
        ) : null}

        {/* 👉 Box de tamanhos (só aparece se for fralda e houver tamanhos) */}
        {product?.isDiaper && product?.diaperSizes?.length > 0 ? (
          <DiaperSizeBox
            product={product}
            onSelect={(size) => {
              // ex.: atualizar variante/sku/carrinho ou navegar para o ID do tamanho
              if (size.navigateToId && size.navigateToId !== product.id) {
                // router.push(`/produto/${size.navigateToId}`)
              }
              console.log("Tamanho selecionado:", size);
            }}
          />
        ) : null}

        {/* ... resto da página (botão comprar, descrição longa, etc.) */}
      </div>
    </div>
  );
};

export default ProductInfo;
