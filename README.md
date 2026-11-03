# ECAR Frotas | Empresas Parceiras

Catálogo Chevrolet e Volkswagen com 19 famílias e 102 versões, configurador de pinturas e pacotes e solicitação de proposta pelo WhatsApp do Emerson ECAR.

Site: https://victorhgnovaes.github.io/ecar-empresas-parceiras/

O conteúdo permanece em revisão. Valores de outubro/2026 são referências; confirme preços, elegibilidade, disponibilidade e prazo com o Emerson ECAR, (11) 98926-6321. Condições vencidas ou não conciliadas não geram oferta final. Ilustrações temporárias e fichas técnicas incompletas são identificadas na interface.

## Desenvolvimento

Node.js 24 e npm:

```sh
npm ci
npm run dev
```

## Verificação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Os testes E2E usam Playwright. Neste computador, defina PLAYWRIGHT_CHANNEL=msedge. Em outro ambiente, instale o Chromium com npx playwright install chromium.

## Publicação

O workflow .github/workflows/deploy-pages.yml verifica os testes e gera a exportação estática, publicada no GitHub Pages após cada push na branch main. A configuração GITHUB_PAGES=true e NEXT_PUBLIC_BASE_PATH=/ecar-empresas-parceiras é definida no workflow. Sem essas variáveis o projeto mantém o servidor Next.js padrão.

Para verificar a exportação, após gerar o build com essas variáveis, execute npx playwright test --config playwright.pages.config.ts. Também é possível verificar o site publicado definindo ECAR_PUBLIC_URL com o endereço acima.

Documentos comerciais, auditorias, arquivos de trabalho e credenciais ficam fora do repositório. O site usa apenas os dados normalizados e os assets de public. Não exige banco de dados, login nem variáveis secretas. Os dados do formulário ficam no navegador e só entram na mensagem quando o visitante solicita; o envio pelo WhatsApp depende da ação do visitante.
