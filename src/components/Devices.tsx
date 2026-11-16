import Image, { type StaticImageData } from "next/image";
import { addressBar } from "@/lib/projects";
import styles from "./Devices.module.css";

type FrameProps = {
  src: StaticImageData;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
};

/** A restrained browser window around a real screenshot. */
export function BrowserFrame({
  src,
  alt,
  sizes,
  preload,
  className,
  host,
  name,
  showAddress,
}: FrameProps & { host?: string; name?: string; showAddress?: boolean }) {
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
      <Image src={src} alt={alt} sizes={sizes} preload={preload} placeholder="blur" className={styles.shot} />
    </figure>
  );
}

/** A phone silhouette around a real mobile screenshot. */
export function PhoneFrame({ src, alt, sizes, preload, className }: FrameProps) {
  return (
    <figure className={`${styles.phone} ${className ?? ""}`}>
      <Image src={src} alt={alt} sizes={sizes} preload={preload} placeholder="blur" className={styles.screen} />
    </figure>
  );
}
