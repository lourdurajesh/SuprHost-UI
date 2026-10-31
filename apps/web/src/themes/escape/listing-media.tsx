import Image from "next/image";
import type { ListingImage } from "@/lib/pms";

/**
 * Local media (http://localhost / 127.0.0.1 in development) bypasses the image optimiser, which
 * refuses private addresses by design (SSRF protection). Production media is on a public domain.
 */
export const skipOptimizer = (url: string) => url.endsWith(".svg") || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url);

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
          unoptimized={skipOptimizer(image.url)}
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
      {name && <span className="m-4 text-h3 text-white/90 drop-shadow-sm">{name}</span>}
    </div>
  );
}
