export function parseRefreshCsrf(html: string): string | null {
  const match = /<div id="1-name">([0-9a-f]+)<\/div>/i.exec(html)
  return match?.[1] ?? null
}
