"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="conteudo" className="not-found container"><span className="eyebrow">ECAR FROTAS</span><h1>Não foi possível<br />carregar esta página.</h1><p>Tente novamente para retomar sua configuração.</p><button type="button" className="button button-primary" onClick={reset}>Tentar novamente</button><Link className="text-link" href="/">Voltar ao portal</Link></main>; }
