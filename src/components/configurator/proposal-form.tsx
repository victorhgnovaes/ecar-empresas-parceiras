"use client";

import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";

import { useRef, useState, type FormEvent } from "react";
import { Check, Copy, Download, ArrowRight } from "lucide-react";
import { emptyContact, generateProposal, validateContact, getWhatsAppUrl, type ContactErrors } from "@/lib/proposal";
import { siteConfig } from "@/config/site";
import type { ProposalContact, Vehicle, VehicleSelection } from "@/types/domain";

export function ProposalForm({ vehicle, selection }: { vehicle: Vehicle; selection: VehicleSelection }) {
  const [contact, setContact] = useState<ProposalContact>(emptyContact);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [message, setMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const messageArea = useRef<HTMLTextAreaElement>(null);
  const update = (name: keyof ProposalContact, value: string | boolean) => { setContact((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateContact(contact);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { const first = Object.keys(nextErrors)[0]; form.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus(); return; }
    setMessage(generateProposal(vehicle, selection, contact));
  }
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopyStatus("Mensagem copiada para a área de transferência."); }
    catch { messageArea.current?.focus(); messageArea.current?.select(); setCopyStatus("Não foi possível copiar automaticamente. O texto está selecionado; copie manualmente com Ctrl+C ou a opção Copiar do dispositivo."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([message], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `simulacao-ecar-${vehicle.slug}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (message) {
    const url = getWhatsAppUrl(siteConfig.whatsappNumber, message);
    return <div className="proposal-result"><div className="success-note"><Check size={20} /><div><strong>Sua mensagem está pronta.</strong><p>Nenhuma mensagem foi enviada. Confira o texto antes de compartilhar.</p></div></div><label htmlFor="proposal-message">Resumo da solicitação</label><textarea ref={messageArea} id="proposal-message" className="proposal-message" value={message} readOnly rows={13} /><div className="proposal-actions"><button type="button" className="button button-primary" onClick={copy}><Copy size={17} />Copiar mensagem</button><button type="button" className="button button-secondary" onClick={download}><Download size={17} />Baixar resumo</button>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="button button-secondary"><WhatsAppIcon size={17} />Enviar ao Emerson ECAR</a>}<button type="button" className="text-link" onClick={() => { setMessage(""); setCopyStatus(""); }}>Editar dados</button></div><p role="status" className="copy-status">{copyStatus}</p>{!url && <p className="demo-notice">WhatsApp indisponível no ambiente DEMO. Você pode copiar a mensagem; não há envio automático.</p>}</div>;
  }
  return <form ref={form} onSubmit={submit} noValidate className="proposal-form"><p className="muted">Prepare sua solicitação com a configuração escolhida. Os dados ficam apenas nesta janela, sem envio ou armazenamento.</p><div className="form-grid">{[
    { name: "name", label: "Nome", type: "text", autoComplete: "name", max: 100 },
    { name: "company", label: "Empresa", type: "text", autoComplete: "organization", max: 150 },
    { name: "email", label: "E-mail", type: "email", autoComplete: "email", max: 254 },
    { name: "phone", label: "Telefone", type: "tel", autoComplete: "tel-national", max: 20 },
    { name: "cnpj", label: "CNPJ (opcional)", type: "text", autoComplete: "off", max: 18 },
  ].map((field) => { const name = field.name as keyof ProposalContact; return <div className="form-field" key={name}><label htmlFor={`contact-${name}`}>{field.label}{name !== "cnpj" && <span aria-hidden="true"> *</span>}</label><input id={`contact-${name}`} name={name} type={field.type} autoComplete={field.autoComplete} maxLength={field.max} required={name !== "cnpj"} value={String(contact[name])} onChange={(event) => update(name, event.target.value)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `error-${name}` : undefined} />{errors[name] && <p className="field-error" id={`error-${name}`}>{errors[name]}</p>}</div>; })}</div><div className="form-field"><label htmlFor="contact-notes">Observações (opcional)</label><textarea id="contact-notes" name="notes" value={contact.notes} onChange={(event) => update("notes", event.target.value)} maxLength={1000} rows={3} placeholder="Conte um pouco sobre a necessidade da sua empresa." /><span className="small muted">{contact.notes.length}/1.000 caracteres</span></div><label className="consent-label"><input type="checkbox" name="consent" checked={contact.consent} onChange={(event) => update("consent", event.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "error-consent" : undefined} />Autorizo incluir meus dados no texto da solicitação.</label>{errors.consent && <p id="error-consent" className="field-error">{errors.consent}</p>}<p className="small muted">Condições e disponibilidade: consulte o Emerson ECAR.</p><button type="submit" className="button button-primary">Gerar mensagem de proposta<ArrowRight size={17} /></button></form>;
}
