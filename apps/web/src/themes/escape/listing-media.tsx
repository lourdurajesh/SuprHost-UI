import Image from "next/image";
import type { ListingImage } from "@/lib/pms";

// Photo, or a warm placeholder when the host has not uploaded one yet. Photos come pre-sized from
// the CDN and go through next/image (AVIF/WebP, responsive); `sizes` keeps phones from
// downloading desktop widths. SVG placeholders are served as-is.

export function ListingPhoto({
  image,
  name,
  sizes,
  priority = false,
  className = "",
  imgClassName = "",
}: {
  image: ListingImage | null;
  name: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  if (image) {
    return (
      <div className={`relative overflow-hidden bg-sand-deep ${className}`}>
        <Image
          src={image.url}
          alt={image.alt || name}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={image.url.endsWith(".svg")}
          className={`object-cover ${imgClassName}`}
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={name}
      className={`relative flex items-end overflow-hidden bg-gradient-to-br from-[#d9c6a5] via-[#c7b08a] to-[#8f7a5a] ${className}`}
    >
      {name && <span className="m-4 font-display text-2xl text-white/90 drop-shadow-sm">{name}</span>}
    </div>
  );
}
