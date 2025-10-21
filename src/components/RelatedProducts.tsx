import { Star } from "lucide-react";
import { Product, getProductById, getAllProducts, generateDeterministicReviews } from "@/lib/products";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";

const RelatedProducts = ({ product }: { product?: Product }) => {
  let products: Product[] = (product?.relatedIds || []).map((id) => getProductById(id)).filter(Boolean) as Product[];

  // if not enough related products, fill with random other products (exclude current)
  if (products.length < 4) {
    const all = getAllProducts().filter((p) => p.id !== product?.id && !products.find((x) => x.id === p.id));
    // shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const needed = 4 - products.length;
    products = products.concat(all.slice(0, needed));
  }

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [selected, setSelected] = useState<number>(0);
  const [size, setSize] = useState<number>(products.length || 0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setSelected(api.selectedScrollSnap());
      const snaps = api.scrollSnapList ? api.scrollSnapList().length : products.length;
      setSize(snaps || products.length);
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, products.length]);

  // autoplay
  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => {
      try {
        api.scrollNext();
      } catch {}
    }, 3500);
    return () => clearInterval(id);
  }, [api]);

  if (!products || products.length === 0) return null;

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Produtos Relacionados</h3>
          <div className="flex gap-2">
            {/* optional previous/next inside carousel */}
          </div>
        </div>

        <Carousel opts={{ loop: true }} setApi={setApi}>
          <CarouselContent className="items-stretch">
            {products.map((p) => (
              <CarouselItem key={p.id} className="max-w-[45%] md:max-w-[30%]">
                <Link to={`/product/${p.id}`} className="block border border-border rounded-lg p-3 bg-card hover:shadow-md h-full">
                  <div className="aspect-square mb-3 bg-background rounded-md p-2">
                    <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-contain" />
                  </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{p.shortDescription}</p>
                      <h4 className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]">{p.name}</h4>
                    {(() => {
                      const baseReviews = p.reviews?.length ? p.reviews : generateDeterministicReviews(p.id, 4);
                      const average =
                        baseReviews.length > 0
                          ? baseReviews.reduce((sum, review) => sum + review.rating, 0) / baseReviews.length
                          : 0;
                      return (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => {
                            const value = index + 1;
                            const active = average >= value - 0.5;
                            return (
                              <Star
                                key={`${p.id}-star-${index}`}
                                className={`h-3 w-3 ${active ? "fill-rating text-rating" : "text-muted-foreground"} ${
                                  !active ? "fill-transparent" : ""
                                }`}
                              />
                            );
                          })}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            {baseReviews.length ? average.toFixed(1) : "Sem notas"}
                          </span>
                        </div>
                      );
                    })()}
                    <p className="text-lg font-bold text-foreground">{`R$ ${p.price.toFixed(2)}`}</p>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        {/* dots */}
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: size }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => api?.scrollTo(idx)}
              className={`h-2 w-2 rounded-full transition-colors ${selected === idx ? "bg-secondary" : "bg-muted-foreground"}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatedProducts;
