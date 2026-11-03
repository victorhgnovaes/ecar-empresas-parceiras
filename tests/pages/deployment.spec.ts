import { test, expect } from "@playwright/test";

for (const width of [1440, 375]) test(`publicação: navegação, imagens e revisão em ${width}px`, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  for (const path of ["", "chevrolet/", "volkswagen/", "chevrolet/modelos/", "volkswagen/modelos/", "chevrolet/veiculo/onix/", "volkswagen/veiculo/polo/"]) {
    const response = await page.goto(new URL(path, baseURL!).href);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("complementary", { name: "Aviso sobre o conteúdo" })).toContainText("Conteúdo em revisão.");
    await expect(page.getByRole("link", { name: /Falar com o Emerson/ })).toHaveAttribute("href", /wa.me\/5511989266321/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    expect(await page.locator("header img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByRole("link", { name: "Voltar aos modelos", exact: true }).first().click();
  await expect(page).toHaveURL(new URL("volkswagen/modelos/", baseURL!).href);
  await page.locator(".vehicle-card").first().click();
  await expect(page.locator(".vehicle-preview img")).toBeVisible();
  await expect.poll(() => page.locator(".vehicle-preview img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Itens de série", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator('[data-testid="volkswagen-footer"]').getByRole("link", { name: "Picapes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Picape", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
