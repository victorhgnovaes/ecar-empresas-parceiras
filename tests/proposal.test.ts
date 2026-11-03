import { describe, expect, it } from "vitest";
import { vehicles } from "./fixtures/demo-vehicles";
import { initialSelection } from "@/lib/finance";
import { emptyContact, generateProposal, getWhatsAppUrl, isValidCnpj, validateContact } from "@/lib/proposal";

const vehicle = vehicles[0];
const contact = { ...emptyContact, name: "Pessoa de Teste", company: "Empresa de Teste", email: "teste@example.test", phone: "11999990000", consent: true };

describe("Proposta e contato", () => {
  it("identifica os campos obrigatórios", () => {
    expect(Object.keys(validateContact(emptyContact))).toEqual(expect.arrayContaining(["name", "company", "email", "phone", "consent"]));
  });
  it("aceita os dados mínimos com CNPJ opcional vazio", () => { expect(validateContact(contact)).toEqual({}); });
  it.each(["", "00000000000000", "11111111111111", "123", "12.345.678/0001-00"])("não considera CNPJ inválido como válido: %s", (value) => { expect(isValidCnpj(value)).toBe(false); });
  it("rejeita CNPJ informado com dígitos verificadores incorretos", () => { expect(validateContact({ ...contact, cnpj: "12.345.678/0001-00" }).cnpj).toBeTruthy(); });
  it.each(["email sem dominio", "a@b", "a b@example.test"])("rejeita e-mail inválido: %s", (email) => { expect(validateContact({ ...contact, email }).email).toBeTruthy(); });
  it.each(["123", "00999999999", "+5511999990000"])("valida telefone local com DDD: %s", (phone) => { expect(validateContact({ ...contact, phone }).phone).toBeTruthy(); });
  it("impede gerar mensagem com dados inválidos", () => { expect(() => generateProposal(vehicle, initialSelection(vehicle), emptyContact)).toThrow(); });
  it("gera resumo com os valores calculados e identifica a demonstração", () => {
    const message = generateProposal(vehicle, { ...initialSelection(vehicle), colorId: "silver", optionIds: ["comfort"], quantity: 3 }, { ...contact, notes: "  Consulta de teste  " });
    expect(message).toContain("DEMONSTRATIVA");
    expect(message).toContain(vehicle.name);
    expect(message).toContain("Quantidade: 3");
    expect(message).toContain("92.700");
    expect(message).toContain("278.100");
    expect(message).toContain(contact.company);
    expect(message).toContain("Consulta de teste");
    expect(message).toContain("sem validade comercial");
  });
  it("bloqueia contatos não configurados ou inválidos", () => {
    for (const number of ["", "123", "5511", "+5511999990000", "https://wa.me/test"]) expect(getWhatsAppUrl(number, "teste")).toBeNull();
  });
  it("codifica a mensagem sem permitir parâmetros injetados", () => {
    const url = getWhatsAppUrl("5511999990000", "A & B\nC?teste=sim");
    expect(new URL(url!).searchParams.get("text")).toBe("A & B\nC?teste=sim");
    expect([...new URL(url!).searchParams.keys()]).toEqual(["text"]);
  });
});
