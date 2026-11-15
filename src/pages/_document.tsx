import { Head, Html, Main, NextScript } from "next/document";

/**
 * The document for the pages served by the Pages Router, which today is only a customer's live website. It has none
 * of WINJO DIGITAL's own header, footer or styles: a customer's site must look like theirs alone.
 */
export default function Document() {
  return (
    <Html lang="en-GB">
      <Head />
      <body style={{ margin: 0 }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
