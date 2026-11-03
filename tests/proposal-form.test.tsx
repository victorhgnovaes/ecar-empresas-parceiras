// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { ProposalForm } from "@/components/configurator/proposal-form";
import { vehicles } from "@/data/vehicles";
import { initialSelection } from "@/lib/finance";

afterEach(cleanup);

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^Nome/), "Pessoa de Teste");
  await user.type(screen.getByLabelText(/^Empresa/), "Empresa de Teste");
  await user.type(screen.getByLabelText(/^E-mail/), "teste@example.test");
  await user.type(screen.getByLabelText(/^Telefone/), "11999990000");
  await user.click(screen.getByRole("checkbox", { name: /Autorizo/ }));
  await user.click(screen.getByRole("button", { name: "Gerar mensagem de proposta" }));
  return user;
}

describe("Fluxo do formulário de proposta", () => {
  it("mostra erros e direciona o foco ao primeiro campo obrigatório", async () => {
    const user = userEvent.setup();
    render(<ProposalForm vehicle={vehicles[0]} selection={initialSelection(vehicles[0])} />);
    await user.click(screen.getByRole("button", { name: "Gerar mensagem de proposta" }));
    expect(screen.getByLabelText(/^Nome/)).toHaveFocus();
    expect(screen.getByText(/Informe seu nome/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Resumo da solicitação/)).not.toBeInTheDocument();
  });
  it.each(["chevrolet", "volkswagen"])("gera e copia uma mensagem coerente para %s sem envio", async (brand) => {
    const vehicle = vehicles.find((item) => item.brand === brand)!;
    render(<ProposalForm vehicle={vehicle} selection={{ ...initialSelection(vehicle), quantity: 2 }} />);
    const user = await fillValidForm();
    const message = screen.getByLabelText(/Resumo da solicitação/) as HTMLTextAreaElement;
    expect(message.value).toContain(vehicle.name);
    expect(message.value).toContain("Quantidade: 2");
    expect(screen.getByText(/Nenhuma mensagem foi enviada/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar ao Emerson ECAR" })).toHaveAttribute("href", expect.stringContaining("wa.me/5511989266321"));
    const clipboard = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Copiar mensagem" }));
    expect(clipboard).toHaveBeenCalledWith(message.value);
    expect(screen.getByRole("status")).toHaveTextContent("Mensagem copiada");
    clipboard.mockRestore();
    await user.click(screen.getByRole("button", { name: "Editar dados" }));
    expect(screen.getByLabelText(/^Empresa/)).toHaveValue("Empresa de Teste");
  });
  it("oferece instrução de cópia manual quando a permissão é negada", async () => {
    render(<ProposalForm vehicle={vehicles[0]} selection={initialSelection(vehicles[0])} />);
    const user = await fillValidForm();
    const clipboard = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Permission denied"));
    await user.click(screen.getByRole("button", { name: "Copiar mensagem" }));
    expect(screen.getByRole("status")).toHaveTextContent(/copie manualmente/);
    clipboard.mockRestore();
  });
});
