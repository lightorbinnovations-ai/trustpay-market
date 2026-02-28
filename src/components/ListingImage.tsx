import { useState, forwardRef } from "react";
import { ImageOff } from "lucide-react";

interface ListingImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}

const ListingImage = forwardRef<HTMLDivElement, ListingImageProps>(({ src, alt = "Listing", className = "" }, ref) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`bg-secondary flex items-center justify-center ${className}`}>
        <ImageOff className="w-5 h-5 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`object-cover ${className}`}
    />
  );
});
ListingImage.displayName = "ListingImage";

export default ListingImage;
