import { useMemo } from "react";
import { Star } from "lucide-react";
import { Product, generateDeterministicReviews } from "@/lib/products";
import { cn } from "@/lib/utils";

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

  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <h1 className="mb-1 text-sm text-muted-foreground">{product?.shortDescription}</h1>
        <h2 className="mb-3 text-xl font-semibold text-foreground">{product?.name}</h2>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1">{renderStars(averageRating)}</div>
          <span className="text-xs text-muted-foreground">
            {reviews.length
              ? `${averageRating.toFixed(1)} - ${reviews.length} avaliacao${reviews.length > 1 ? "s" : ""}`
              : "Sem avaliacoes"}
          </span>
        </div>

        {product?.sales ? (
          <p className="mb-1 text-xs text-muted-foreground">
            {product.sales.percentage}% de vendas ({product.sales.count.toLocaleString("pt-BR")})
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ProductInfo;
