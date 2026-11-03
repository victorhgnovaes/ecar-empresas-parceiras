import { test, expect } from "@playwright/test";
import manifest from "../../src/data/generated/package72-manifest.json";
import { vehicles } from "../../src/data/vehicles";

test("72 caminhos PNG, vínculo de cor/versão e aviso provisório em desktop e celular", async ({ page, request }) => {
  test.setTimeout(300000);
  let currentRoute = "";
  for (const item of manifest) {
    const response = await request.get(item.path);
    expect(response.status(), item.path).toBe(200);
    expect((await response.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const vehicle = vehicles.find(v => v.brand === item.brand && v.slug === item.family)!;
    const version = vehicle.versions.find(v => v.id === item.version)!;
    const color = version.colors!.find(c => c.id === item.colorId)!;
    const route = `/${item.brand}/veiculo/${item.family}`;
    if (route !== currentRoute) { await page.goto(route); currentRoute = route; }
    const year = page.getByRole("button", { name: `MY${String(item.modelYear).slice(2)}`, exact: true });
    if (await year.getAttribute("aria-pressed") !== "true") await year.click();
    await page.locator(`input[name="version"][value="${version.id}"]`).check();
    const paint = page.locator(`input[name="color"][value="${color.id}"]`);
    if (color.blocked) { await expect(paint).toBeDisabled(); continue; }
    await paint.check();
    await expect(page.locator(".vehicle-preview img")).toHaveAttribute("src", new RegExp(encodeURIComponent(item.path)));
    await expect.poll(() => page.locator(".vehicle-preview img").evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true);
    await expect(page.locator(".preview-caption")).toContainText(item.imageStatus === "TEMPORARY_ILLUSTRATION" ? "Imagem ilustrativa temporária" : "consulte o Emerson");
    await expect(page.locator(".premium-image-stage")).toHaveText("");
  }
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:900});
    for (const number of [1,27]) {
      const item = manifest.find(m => m.number === number)!;
      await page.goto(`/${item.brand}/veiculo/${item.family}`);
      const year = page.getByRole("button", {name:`MY${String(item.modelYear).slice(2)}`,exact:true});
      if (await year.getAttribute("aria-pressed") !== "true") await year.click();
      await page.locator(`input[name="version"][value="${item.version}"]`).check();
      await page.locator(`input[name="color"][value="${item.colorId}"]`).check();
      await expect(page.locator(".preview-caption")).toContainText("Imagem ilustrativa temporária");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator(".vehicle-preview").screenshot({path:`test-results/pacote72-${item.brand}-${width}.png`});
    }
  }
});
