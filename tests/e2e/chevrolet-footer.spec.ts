import { test, expect } from "@playwright/test";

for (const brand of ["chevrolet", "volkswagen"]) test(`${brand}: rodapé preservado, contato e categorias`, async ({ page }) => {
  await page.goto(`/${brand}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("complementary", { name: "Aviso sobre o conteúdo" })).toHaveCount(0);
  await expect(page.getByText(/conteúdo (?:está )?em revisão/i)).toHaveCount(0);
  const cta = page.getByTestId(`${brand}-cta`), footer = page.getByTestId(`${brand}-footer`);
  await expect(cta.getByRole("link", { name: "Explore os modelos" })).toHaveAttribute("href", `/${brand}/modelos`);
  for (const area of [cta, footer]) for (const link of await area.locator('a[href*="wa.me"]').all()) {
    const url = new URL((await link.getAttribute("href"))!);
    expect(url.pathname).toBe("/5511989266321"); expect(url.searchParams.get("text")).toContain("Emerson");
  }
  await expect(footer.getByRole("link", { name: "Ligar para a ECAR" })).toHaveAttribute("href", "tel:+5511989266321");
  await footer.getByRole("button", { name: "Política de privacidade" }).click();
  await expect(page.getByRole("dialog")).toContainText("Não são enviados a servidores");
  await page.keyboard.press("Escape");
  await footer.getByRole("button", { name: "Termos de uso", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText(/conteúdo (?:está )?em revisão/i);
  await page.keyboard.press("Escape");
  if (brand === "chevrolet") await expect.poll(() => page.getByTestId("chevrolet-cta-background").evaluate((e) => getComputedStyle(e).backgroundImage)).toContain("chevrolet-cta-original.png");
  else await expect(page.getByTestId("chevrolet-cta-background")).toHaveCount(0);
  await footer.getByRole("link", { name: "Picapes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Picape", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".vehicle-card")).toHaveCount(2);
});
