import Image from "next/image";
import logo from "../../public/brand/wnjo-logo-462.png";

/** The supplied WNJO wordmark, used unmodified. */
export function Logo({ preload = false }: { preload?: boolean }) {
  return <Image src={logo} alt="WNJO" preload={preload} sizes="140px" />;
}
