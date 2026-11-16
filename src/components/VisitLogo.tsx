import Image, { type StaticImageData } from "next/image";

/**
 * A quiet logo that opens a project site. Used when the address must not be written out.
 */
export function VisitLogo({
  name,
  url,
  logo,
  className,
  tabIndex,
}: {
  name: string;
  url: string;
  logo: StaticImageData;
  className?: string;
  tabIndex?: number;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? `visit-logo ${className}` : "visit-logo"}
      aria-label={`Visit the ${name} website (opens in a new tab)`}
      title={`Visit the ${name} website`}
      tabIndex={tabIndex}
    >
      <Image src={logo} alt="" width={44} height={44} sizes="44px" />
      <span className="visually-hidden">Visit the {name} website (opens in a new tab)</span>
    </a>
  );
}
