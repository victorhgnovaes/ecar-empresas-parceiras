import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
export default function NotFound() { return <main id="conteudo" className="not-found container"><span className="eyebrow">ECAR FROTAS · 404</span><Compass size={56} strokeWidth={1} /><h1>Vamos encontrar<br />um novo caminho.</h1><p>Esta página ou veículo não está no catálogo demonstrativo.</p><Link className="button button-primary" href="/"><ArrowLeft size={17} />Voltar ao portal ECAR</Link></main>; }
