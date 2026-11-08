import Image from "next/image";

/**
 * The WINJO DIGITAL logo: the W mark and wordmark as one vector file (public/brand/winjo-digital-logo.svg), traced
 * from the supplied artwork. It is an SVG, so it stays sharp at every size and is served as is.
 */
export function Logo({ preload = false }: { preload?: boolean }) {
  return (
    <Image
      src="/brand/winjo-digital-logo.svg"
      alt="WINJO Digital"
      width={220}
      height={29}
      unoptimized
      preload={preload}
      sizes="(min-width: 64rem) 220px, 180px"
    />
  );
}
