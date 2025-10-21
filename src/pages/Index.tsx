import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import ProductImage from "@/components/ProductImage";
import ProductInfo from "@/components/ProductInfo";
import ProductPrice from "@/components/ProductPrice";
import DeliveryInfo from "@/components/DeliveryInfo";
import ProductDescription from "@/components/ProductDescription";
import ProductReviews from "@/components/ProductReviews";
import RelatedProducts from "@/components/RelatedProducts";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import AddBar from "@/components/AddBar";
import PageLoading from "@/components/PageLoading";
import { getAllProducts, getProductById, Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const Index = () => {
  const { id } = useParams<{ id?: string }>();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const firstLoadRef = useRef(true);

  const products = useMemo(() => getAllProducts(), []);

  const product: Product | undefined = useMemo(() => {
    if (id) {
      return getProductById(id) ?? products[0];
    }
    return products[0];
  }, [id, products]);

  const content = product ? (
    <>
      <ProductImage product={product} />
      <ProductInfo product={product} />
      <ProductPrice product={product} />
      <DeliveryInfo />
      <ProductDescription product={product} />
      <ProductReviews product={product} />
      <RelatedProducts product={product} />
    </>
  ) : (
    <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
      Produto nao encontrado.
    </div>
  );

  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    setIsTransitioning(true);
  }, [id]);

  useEffect(() => {
    if (!product?.id) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!isTransitioning) return;
    const timeout = window.setTimeout(() => setIsTransitioning(false), 350);
    return () => window.clearTimeout(timeout);
  }, [product?.id, isTransitioning]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="pb-36">
        <div
          className={cn(
            "transition-opacity duration-200",
            isTransitioning ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          {content}
        </div>
      </main>
      <Newsletter />
      <Footer />
      <AddBar product={product} isLoading={isTransitioning} />
      <PageLoading visible={isTransitioning} />
    </div>
  );
};

export default Index;
