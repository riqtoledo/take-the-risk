import productMain from "@/assets/product-main.png";
import { Product } from "@/lib/products";

const ProductImage = ({ product }: { product?: Product }) => {
  const src = product?.images?.[0] || productMain;
  const alt = product?.name || "Produto";
  const badge = product?.badgeLabel;

  return (
    <div className="bg-card">
      <div className="container mx-auto px-4 py-6">
        <div className="relative mx-auto aspect-square max-w-md">
          <img src={src} alt={alt} className="h-full w-full object-contain" />
          {badge ? (
            <div className="absolute left-2 top-2 rounded-full bg-promotion px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
              {badge}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductImage;
