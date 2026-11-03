import { test, expect } from "@playwright/test";
import { vehicles } from "../../src/data/vehicles";
import { calculateQuote, selectionForVersion } from "../../src/lib/pricing";
import { formatMoney } from "../../src/lib/format";

test("portal preservado, marcas, FAQ e contato do Emerson", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect.poll(() => page.locator(".portal-split").evaluate((e) => getComputedStyle(e).backgroundImage)).toContain("portal-unificado.png");
  await expect(page.locator(".portal-note, .portal-panel-bottom")).toHaveCount(0);
  await expect(page.locator("header img")).toHaveAttribute("alt", "ECAR Frotas — logo metálico");
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.locator("header .contact-icon")).toHaveAttribute("href", /wa.me\/5511989266321/);
  await page.getByRole("link", { name: "Explorar Chevrolet", exact: true }).click();
  await expect(page.locator(".featured-grid .vehicle-card")).toHaveCount(4);
  await page.getByText("Os preços e descontos são oficiais?", { exact: true }).click();
  await expect(page.locator(".faq-list details[open]")).toContainText("Emerson ECAR");
  await page.locator(".brand-switch summary").click();
  await page.locator(".brand-switch-menu").getByRole("link", { name: "Volkswagen", exact: true }).click();
  await expect(page.locator(".featured-grid .vehicle-card")).toHaveCount(4);
  expect(errors).toEqual([]);
});

for (const brand of ["chevrolet", "volkswagen"] as const) {
  test(`${brand}: pesquisa, filtros e famílias reais`, async ({ page }) => {
    const count = vehicles.filter((v) => v.brand === brand).length;
    await page.goto(`/${brand}/modelos`);
    await expect(page.locator(".vehicle-card")).toHaveCount(count);
    await page.getByRole("button", { name: "SUV", exact: true }).click();
    await page.getByRole("searchbox").fill(brand === "chevrolet" ? "Tracker" : "Nivus");
    await expect(page.locator(".vehicle-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Hatch", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nenhum veículo por aqui." })).toBeVisible();
    await page.locator(".empty-state").getByRole("button", { name: "Limpar filtros" }).click();
    await expect(page.locator(".vehicle-card")).toHaveCount(count);
    await page.getByLabel("Ano/modelo", { exact: true }).selectOption("2026");
    if (brand === "chevrolet") await expect(page.locator(".vehicle-card")).toHaveCount(2);
    else { await page.getByRole("searchbox").fill("R11AQ4-2"); await expect(page.locator(".vehicle-card")).toHaveCount(0); await page.getByLabel("Ano/modelo", { exact: true }).selectOption("2027"); await expect(page.locator(".vehicle-card")).toHaveCount(1); }
  });

  test(`${brand}: seleções, série, proposta completa e WhatsApp`, async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const vehicle = vehicles.find((v) => v.brand === brand && v.slug === (brand === "chevrolet" ? "onix" : "polo"))!;
    const version = brand === "volkswagen" ? vehicle.versions.find((v) => v.commercialCode === "R11AQ4-2")! : vehicle.versions[0];
    await page.goto(`/${brand}/veiculo/${vehicle.slug}`);
    await page.locator(`input[name="version"][value="${version.id}"]`).check();
    const initial = selectionForVersion(vehicle, version.id);
    const displayedPrice = (selection: typeof initial) => { const quote = calculateQuote(vehicle, selection); return quote.finalAvailable ? formatMoney(quote.unitCents) : "Consulte o Emerson ECAR"; };
    await expect(page.getByTestId("final-price")).toHaveText(displayedPrice(initial));
    const equipment = page.getByRole("button", { name: "Itens de série", exact: true });
    const eb = (await equipment.boundingBox())!, pb = (await page.locator(".vehicle-preview").boundingBox())!;
    expect(eb.x - pb.x).toBeLessThan(30); expect(eb.y - pb.y).toBeLessThan(30); expect(eb.height).toBeLessThanOrEqual(38);
    await equipment.click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(new RegExp(version.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await expect(page.locator(".equipment-list li")).toHaveCount(version.features.length);
    await page.getByLabel("Buscar equipamento").fill("zzzinexistente");
    await expect(page.getByRole("dialog")).toContainText("Nenhum equipamento encontrado");
    await page.keyboard.press("Escape"); await expect(equipment).toBeFocused();
    const paid = version.colors!.find((c) => c.priceCents > 0 && !c.blocked)!;
    const previousImage = await page.locator(".vehicle-preview img").getAttribute("src");
    await page.locator(`input[name="color"][value="${paid.id}"]`).check();
    if (paid.imageStatus?.startsWith("MATCHED")) {
      await expect(page.locator(".vehicle-preview img")).not.toHaveAttribute("src", previousImage!);
      await expect(page.locator(".vehicle-preview img")).toHaveAttribute("src", new RegExp(encodeURIComponent(paid.image!)));
    }
    const selection = { ...initial, colorId: paid.id };
    await expect(page.getByTestId("final-price")).toHaveText(displayedPrice(selection));
    if (brand === "volkswagen") {
      const option = version.options!.find((o) => o.code === "P7D")!;
      await page.locator(`input[name="options"][value="${option.id}"]`).check();
      selection.optionIds = [option.id];
      await expect(page.getByTestId("final-price")).toHaveText(displayedPrice(selection));
    }
    await page.getByLabel("Quantidade de veículos").fill("2"); selection.quantity = 2;
    const href = await page.locator(".premium-main-cta").getAttribute("href");
    const url = new URL(href!); expect(url.pathname).toBe("/5511989266321");
    const text = url.searchParams.get("text")!;
    for (const v of ["Emerson", vehicle.name, version.commercialCode!, paid.name, "Quantidade: 2", "documentação"]) expect(text).toContain(v);
    if (calculateQuote(vehicle, selection).finalAvailable) expect(text).toContain("Total para 2");
    else { expect(text).toContain("confirmar com você"); expect(text).not.toContain("Valor final por unidade"); }
    await page.getByRole("button", { name: "Copiar resumo", exact: true }).click();
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(text);
    await page.getByRole("button", { name: "Incluir meus dados" }).click();
    await page.getByRole("button", { name: "Gerar mensagem de proposta" }).click();
    await expect(page.getByLabel(/^Nome/)).toBeFocused();
    await page.getByLabel(/^Nome/).fill("Pessoa de Teste"); await page.getByLabel(/^Empresa/).fill("Empresa de Teste");
    await page.getByLabel(/^E-mail/).fill("teste@example.test"); await page.getByLabel(/^Telefone/).fill("11999990000");
    await page.getByRole("checkbox", { name: /Autorizo/ }).check();
    await page.getByRole("button", { name: "Gerar mensagem de proposta" }).click();
    await expect(page.getByLabel("Resumo da solicitação")).toHaveValue(/Pessoa de Teste/);
    await expect(page.getByRole("link", { name: "Enviar ao Emerson ECAR" })).toHaveAttribute("href", /wa.me\/5511989266321/);
    await page.keyboard.press("Escape");
    await page.locator(".premium-commercial").scrollIntoViewIfNeeded();
    const showcaseBox = (await page.locator(".premium-showcase").boundingBox())!;
    const commercialBox = (await page.locator(".premium-commercial").boundingBox())!;
    expect(showcaseBox.y + showcaseBox.height).toBeLessThanOrEqual(commercialBox.y + 1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/${brand}-premium-desktop.png`, fullPage: true });
  });
}

test("19 famílias e 102 seleções de versão, imagens, estados pendentes e 404", async ({ page, request }) => {
  test.setTimeout(300000);
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  for (const vehicle of vehicles) {
    expect((await request.get(vehicle.image)).ok(), vehicle.image).toBe(true);
    expect((await page.goto(`/${vehicle.brand}/veiculo/${vehicle.slug}`))?.status()).toBe(200);
    for (const version of vehicle.versions) {
      const year = `MY${String(version.modelYear).slice(2)}`;
      const yearButton = page.getByRole("button", { name: year, exact: true });
      if (await yearButton.getAttribute("aria-pressed") !== "true") await yearButton.click();
      await page.locator(`input[name="version"][value="${version.id}"]`).check();
      if (vehicle.brand === "volkswagen") {
        const quote = calculateQuote(vehicle, selectionForVersion(vehicle, version.id));
        await expect(page.getByTestId("final-price")).toHaveText(formatMoney(quote.unitCents));
        await expect(page.getByTestId("public-price")).toHaveText(formatMoney(quote.publicCents));
        await expect(page.getByTestId("discount-price")).toHaveText(`− ${formatMoney(quote.discountCents)}`);
      } else if (version.status === "PENDENTE_VALIDACAO") await expect(page.getByTestId("final-price")).toHaveText("Consulte o Emerson ECAR");
      await expect(page.locator(".commercial-heading")).toContainText(version.commercialCode!);
      await expect.poll(() => page.locator(".vehicle-preview img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
  }
  for (const route of ["/chevrolet/veiculo/inexistente", "/volkswagen/veiculo/onix", "/marca-inexistente"]) {
    await page.goto(route); await expect(page.getByRole("heading", { level: 1 })).toContainText("novo caminho");
  }
  expect(errors).toEqual([]);
});

for (const [width, height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[375,812],[320,640]]) {
  test(`responsividade ${width}x${height}: layouts e modal acessível`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const route of ["/", "/chevrolet", "/volkswagen", "/chevrolet/modelos", "/volkswagen/modelos", "/chevrolet/veiculo/tracker", "/volkswagen/veiculo/t-cross"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
      if (width === 390 || width === 1440) await page.screenshot({ path: `test-results/${route.replaceAll("/", "-") || "portal"}-${width}.png`, fullPage: true });
    }
    const equipment = page.getByRole("button", { name: "Itens de série", exact: true });
    await equipment.click(); await expect(page.getByRole("dialog")).toBeVisible();
    expect((await page.getByRole("dialog").boundingBox())!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape"); await expect(equipment).toBeFocused();
    await page.getByRole("button", { name: "Incluir meus dados" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Gerar mensagem de proposta" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Gerar mensagem de proposta" })).toBeVisible();
  });
}

test("imagem com fallback honesto, SEO e fonte local", async ({ page, request }) => {
  await page.route("**/_next/image*", (route) => route.abort());
  await page.goto("/chevrolet/veiculo/onix");
  await expect(page.locator(".vehicle-preview img")).toHaveAttribute("src", "/images/vehicles/placeholder.svg");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect((await request.get("/fonts/InterVariable.woff2")).ok()).toBe(true);
});

test("pinturas faltantes continuam identificadas no celular, sem trocar MY ou gerar overflow", async ({ page }) => {
  await page.setViewportSize({ width:375,height:812 });
  await page.goto("/volkswagen/veiculo/tera");
  await expect(page.getByRole("button",{name:"MY26",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"MY27",exact:true}).click();
  await expect(page.locator(".preview-caption")).toContainText("Imagem ilustrativa temporária");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const s10=vehicles.find(v=>v.brand==="chevrolet"&&v.slug==="s10")!;
  const chassis=s10.versions.find(v=>v.commercialCode?.endsWith("/R9D"))!;
  const black=chassis.colors!.find(c=>c.imageStatus==="TEMPORARY_ILLUSTRATION")!;
  await page.goto("/chevrolet/veiculo/s10");
  await page.locator(`input[name="version"][value="${chassis.id}"]`).check();
  await page.locator(`input[name="color"][value="${black.id}"]`).check();
  await expect(page.locator(".preview-caption")).toContainText("Imagem ilustrativa temporária");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
