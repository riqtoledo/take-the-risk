import { Product } from "@/lib/products";

const ProductDescription = ({ product }: { product?: Product }) => {
  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <h3 className="font-semibold text-foreground mb-3">Descrição</h3>
        
        <div className="space-y-3 text-sm text-foreground">
          <p className="text-muted-foreground leading-relaxed">
            {product?.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductDescription;
