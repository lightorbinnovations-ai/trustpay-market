import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

const VerifiedBadge = ({ className = "", size = "sm" }: VerifiedBadgeProps) => {
  const sizeClass = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <BadgeCheck
      className={`${sizeClass} text-primary fill-primary/20 inline-block shrink-0 ${className}`}
      aria-label="Verified seller"
    />
  );
};

export default VerifiedBadge;
