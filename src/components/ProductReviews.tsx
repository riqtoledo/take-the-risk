import React, { useMemo, useState } from "react";
import { MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Product, Review, generateDeterministicReviews } from "@/lib/products";
import { cn } from "@/lib/utils";

const fallbackComments = [
  "Chegou rápido e atendeu às expectativas.",
  "Custo-benefício excelente, recomendo!",
  "Funciona bem no dia a dia, voltaria a comprar.",
  "Qualidade boa, mas poderia ter embalagem melhor.",
  "Entrega no prazo e produto conforme descrição.",
  "Preço justo pelo que oferece.",
  "Gostei bastante, resolveu meu problema.",
  "Produto honesto, faz o que promete.",
];

const getCommentForIndex = (index: number): string =>
  fallbackComments[index % fallbackComments.length];

type LocalReviewMap = Record<string, Review[]>;

const ProductReviews = ({ product }: { product?: Product }) => {
  const [localReviewsByProduct, setLocalReviewsByProduct] = useState<LocalReviewMap>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  const baseReviews = useMemo<Review[]>(() => {
    if (!product) return [];
    if (product.reviews && product.reviews.length > 0) return product.reviews;
    if (!product.id) return [];
    return generateDeterministicReviews(product.id, 4).map((review, idx) => ({
      ...review,
      comment: review.comment && review.comment.length > 0 ? review.comment : getCommentForIndex(idx),
    }));
  }, [product]);

  const localReviews = product?.id ? localReviewsByProduct[product.id] ?? [] : [];

  const allReviews = useMemo(() => [...baseReviews, ...localReviews], [baseReviews, localReviews]);
  const totalReviews = allReviews.length;
  const recommendationPercentage = totalReviews
    ? Math.round((allReviews.filter((r) => r.rating >= 4).length / totalReviews) * 100)
    : 0;

  const summary = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((stars) => {
        const count = allReviews.filter((r) => Math.round(r.rating) === stars).length;
        return {
          stars,
          count,
          percentage: totalReviews ? Math.round((count / totalReviews) * 100) : 0,
        };
      }),
    [allReviews, totalReviews],
  );

  const handleSubmitReview = () => {
    if (!newComment.trim()) return;
    if (!product?.id) return;
    const review: Review = {
      user: "Você",
      rating: newRating,
      comment: newComment.trim(),
    };
    setLocalReviewsByProduct((prev) => {
      const current = prev[product.id!] ?? [];
      return {
        ...prev,
        [product.id!]: [...current, review],
      };
    });
    setIsDialogOpen(false);
    setNewComment("");
    setNewRating(5);
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, index) => {
      const value = index + 1;
      const active = rating >= value;
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
      <div className="container mx-auto px-4 py-6">
        <h3 className="mb-4 font-semibold text-foreground">Avaliações</h3>

        <div className="mb-6 space-y-3">
          {summary.map((row) => (
            <div key={row.stars} className="flex items-center gap-3">
              <div className="flex w-20 items-center gap-1">
                <span className="text-sm text-muted-foreground">
                  {row.stars} estrela{row.stars > 1 ? "s" : ""}
                </span>
              </div>
              <Progress value={row.percentage} className="h-2 flex-1" />
              <span className="w-8 text-right text-sm text-muted-foreground">{row.count}</span>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-lg bg-accent p-4">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary">
              <span className="text-2xl font-bold text-primary">{recommendationPercentage}%</span>
            </div>
          </div>
          <p className="text-center text-sm font-medium text-foreground">Recomenda este produto</p>
        </div>

        <Button variant="default" size="lg" className="mb-6 w-full gap-2" onClick={() => setIsDialogOpen(true)}>
          <MessageCircle className="h-5 w-5" />
          Escrever avaliação
        </Button>

        <div className="space-y-4">
          {allReviews.map((review, index) => (
            <div key={`${review.user}-${index}`} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                  <span className="text-sm font-medium">{review.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">Avaliação verificada</span>
              </div>
              <h4 className="mb-2 font-medium text-foreground">{review.user}</h4>
              <p className="text-sm text-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conte a sua experiência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Como foi para você?</Label>
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Olá! Compartilhe em poucas palavras como foi usar {product?.name ?? "o produto"}.
                  </div>
                </div>
                {newComment && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {newComment}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating" className="text-sm font-medium text-foreground">
                Nota
              </Label>
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  const active = newRating >= value;
                  return (
                    <Button
                      key={value}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-full border border-border",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground",
                      )}
                      onClick={() => setNewRating(value)}
                      type="button"
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          active ? "fill-primary text-primary" : "text-muted-foreground",
                          !active && "fill-transparent",
                        )}
                      />
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-text" className="text-sm font-medium text-foreground">
                Escreva sua avaliação
              </Label>
              <Textarea
                id="review-text"
                placeholder="Ex: Produto excelente, chegou rápido e tem ótimo custo-benefício."
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitReview} disabled={!newComment.trim()}>
              Enviar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductReviews;
