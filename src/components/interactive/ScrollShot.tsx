import Image, { type StaticImageData } from "next/image";
import styles from "../Devices.module.css";

/**
 * A browser window holding a full-page capture. When its nearest `.scroll-trigger`
 * ancestor is hovered or focused, the page scrolls from top to bottom (pure CSS).
 */
export function ScrollShot({
  src,
  alt,
  host,
  sizes,
  className,
  eager,
}: {
  src: StaticImageData;
  alt: string;
  host?: string;
  sizes: string;
  className?: string;
  /** The first thing on screen: fetched straight away, ahead of the rest. */
  eager?: boolean;
}) {
  // Longer pages scroll for longer, so the pace feels constant.
  const duration = Math.min(9, Math.max(3, (src.height / src.width) * 2.2));
  return (
    <figure className={`${styles.browser} ${className ?? ""}`}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        {host && <span className={styles.url}>{host}</span>}
      </div>
      <div className="scrollshot" style={{ "--scroll-dur": `${duration.toFixed(1)}s` } as React.CSSProperties}>
        <Image
          src={src}
          alt={alt}
          sizes={sizes}
          placeholder="blur"
          loading={eager ? "eager" : undefined}
          fetchPriority={eager ? "high" : undefined}
        />
      </div>
    </figure>
  );
}
