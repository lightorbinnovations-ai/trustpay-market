import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: "sm" | "md";
}

const StarRating = ({ rating, onRate, size = "md" }: StarRatingProps) => {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onRate}
          onClick={() => onRate?.(star)}
          className={`${onRate ? "cursor-pointer" : "cursor-default"} transition-transform ${onRate ? "active:scale-125" : ""}`}
        >
          <Star
            className={`${iconSize} transition-colors ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
