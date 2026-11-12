/**
 * Opens a file or page in a new tab, even when the address takes a moment to fetch. Phones (iPhone Safari in
 * particular) block a new tab that is opened after a wait, so the tab is opened straight away, on the tap, and sent
 * to the address once it is ready. Returns false when nothing could be opened.
 */
export async function openFileTab(getUrl: () => Promise<string | null>): Promise<boolean> {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  const url = await getUrl();
  if (!url) {
    tab?.close();
    return false;
  }
  if (tab) {
    tab.location.href = url;
    return true;
  }
  // The browser refused the tab: open the address in this one instead.
  window.location.assign(url);
  return true;
}
