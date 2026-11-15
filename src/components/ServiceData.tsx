import { siteUrl } from "@/lib/site";
import { serviceSchema, type ServicePage } from "@/lib/structured-data";

/** The service and its published prices, as data for search engines. Nothing is shown on the page. */
export function ServiceData({ page }: { page: ServicePage }) {
  const schema = serviceSchema(siteUrl() ?? "https://winjodigital.co.uk", page);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
