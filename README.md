# ECAR Frotas | Empresas Parceiras

Catálogo Chevrolet e Volkswagen com 19 famílias e 102 versões, configurador de pinturas e pacotes e solicitação de proposta pelo WhatsApp do Emerson ECAR.

Site: https://victorhgnovaes.github.io/ecar-empresas-parceiras/

O conteúdo permanece em revisão. Valores de outubro/2026 são referências; confirme preços, elegibilidade, disponibilidade e prazo com o Emerson ECAR, (11) 98926-6321. Na Volkswagen, os preços e descontos cadastrados são aplicados até a próxima atualização manual, sem bloqueios por data, status de validação ou divergência comercial. A mesma regra libera pinturas e pacotes marcados para revisão e inclui os valores no catálogo e nas propostas. As verificações de vigência e conciliação da Chevrolet permanecem próprias. Ilustrações temporárias e fichas técnicas incompletas são identificadas na interface.

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

### Vercel

Projeto: https://ecar-empresas-parceiras-hotsite.vercel.app/

Importe este repositório com **Root Directory** na raiz (campo vazio ou `.`), branch de produção `main` e Node.js **24.x**. O arquivo `vercel.json` fixa o preset **Next.js**, instalação `npm ci`, build `npm run build` e saída `.next`. Não use `public` nem `out` como saída da Vercel. O site não exige variáveis secretas nem reimportação de dados durante o build.

As configurações de GitHub Pages ficam restritas ao workflow abaixo. Na Vercel, `VERCEL=1` mantém as rotas e os assets na raiz, mesmo se `GITHUB_PAGES` ou `NEXT_PUBLIC_BASE_PATH` antigos estiverem cadastrados. Depois do push, confira o deployment do commit novo e o domínio de produção, não apenas o status “Ready”.

### GitHub Pages

O workflow .github/workflows/deploy-pages.yml verifica os testes e gera a exportação estática, publicada no GitHub Pages após cada push na branch main. A configuração GITHUB_PAGES=true e NEXT_PUBLIC_BASE_PATH=/ecar-empresas-parceiras é definida no workflow. Sem essas variáveis o projeto mantém o servidor Next.js padrão.

Para verificar a exportação, após gerar o build com essas variáveis, execute npx playwright test --config playwright.pages.config.ts. Também é possível verificar o site publicado definindo ECAR_PUBLIC_URL com o endereço acima.

Documentos comerciais, auditorias, arquivos de trabalho e credenciais ficam fora do repositório. O site usa apenas os dados normalizados e os assets de public. Não exige banco de dados, login nem variáveis secretas. Os dados do formulário ficam no navegador e só entram na mensagem quando o visitante solicita; o envio pelo WhatsApp depende da ação do visitante.
