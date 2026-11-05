import Image from "next/image";
import logo from "../../public/brand/wnjo-logo-462.png";

/** The supplied WNJO lockup (W mark, wordmark and "Web & SaaS" line), used unmodified. */
export function Logo({ preload = false }: { preload?: boolean }) {
  return <Image src={logo} alt="WNJO" preload={preload} sizes="(min-width: 64rem) 200px, 170px" />;
}
