import Image, { type StaticImageData } from "next/image";
import { addressBar } from "@/lib/projects";
import styles from "../Devices.module.css";

/**
 * A browser window holding a full-page capture. When its nearest `.scroll-trigger`
 * ancestor is hovered or focused, the page scrolls from top to bottom (pure CSS).
 */
export function ScrollShot({
  src,
  alt,
  host,
  name,
  showAddress,
  sizes,
  className,
  eager,
}: {
  src: StaticImageData;
  alt: string;
  host?: string;
  /** Shown in the bar when the address is hidden. */
  name?: string;
  showAddress?: boolean;
  sizes: string;
  className?: string;
  /** The first thing on screen: fetched straight away, ahead of the rest. */
  eager?: boolean;
}) {
  // Longer pages scroll for longer, so the pace feels constant.
  const duration = Math.min(9, Math.max(3, (src.height / src.width) * 2.2));
  const bar = addressBar({ name, host, showAddress });
  return (
    <figure className={`${styles.browser} ${className ?? ""}`}>
      <div className={styles.bar} aria-hidden="true">
        <span className={styles.dots}>
          <i />
          <i />
          <i />
        </span>
        {bar && <span className={styles.url}>{bar}</span>}
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
