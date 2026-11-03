/** O GitHub Pages publica o projeto em um subdiretório. */
export function sitePath(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return path.startsWith("/") && !path.startsWith("//") && basePath && path !== basePath && !path.startsWith(`${basePath}/`)
    ? `${basePath}${path}`
    : path;
}
