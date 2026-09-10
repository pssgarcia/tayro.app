# i18n

Núcleo de idioma do web. **Sem dependência externa.**

## O que está traduzido hoje

**Todo o produto:** landing, autenticação, painel da marca, painel da creator,
telas públicas (candidatura, perfil público, vitrine) e os componentes
compartilhados. Inclui o vocabulário de status, as mensagens de validação de
formulário e os helpers de formatação (número, moeda, data).

## O que NÃO está traduzido, e por quê

Isto é escopo declarado, não esquecimento:

| O quê | Por quê |
|---|---|
| **Texto dos documentos legais** (`/terms-of-use`, `/privacy-policy`) | Existem em inglês desde 2026-09-09, mas **fora do dicionário**: são arquivos irmãos em `pages/public/legal/`, porque documento jurídico traduzido é outro TEXTO, não copy parametrizada. Ver a seção abaixo. |
| **Mensagens de erro da API** | Nascem no servidor, em português. Várias telas mostram `response.data.message` direto (`PublicApplyPage`, `SubmissionsPage`, `ApplyModal`, `CampaignResultsTab`, `CampaignRewardsTab`). Traduzir exige i18n no NestJS, com `Accept-Language`. |
| **Corpo dos e-mails** | Idem: `EmailService`, no servidor. |
| **O VALOR dos nichos** | É chave de filtro de campanha (`?niches=`), não rótulo. Traduzir o valor faria a creator parar de casar com a campanha. Só a exibição muda. |

Uma pessoa navegando em inglês vai, portanto, encontrar português em mensagem
de erro vinda da API.

## Os documentos legais (regra própria)

Os dois documentos têm versão em inglês desde 2026-09-09, e ela é **tradução de
cortesia**: a versão em português é a que **prevalece**, e é isso que a página
diz antes do título, em inglês.

Isso não é formalidade. O aceite grava `acceptedTermsVersion` e **não guarda
idioma**; sem cláusula de prevalência, uma divergência de tradução viraria
ambiguidade num contrato de adesão, que se resolve contra quem redigiu. Por
isso a **versão é a mesma nos dois idiomas** (`1.0`): a tradução não é
documento novo.

Consequências práticas:

- o texto NÃO vive no dicionário. `pages/public/legal/TermsOfUseEn.tsx` e
  `PrivacyPolicyEn.tsx` são arquivos irmãos, e a página despacha por idioma;
- **mudou o texto em português, muda o inglês no mesmo commit**, senão os dois
  passam a dizer coisas diferentes sob o mesmo número de versão;
- as asserções de honestidade rodam nos **dois** idiomas (não processa
  pagamento, não verifica identidade, sem integração com a Meta, sem moderação,
  sem SLA, a candidatura sem login cria conta, a exclusão não é total). Sem
  isso, o inglês seria a superfície onde uma negativa incômoda some numa
  revisão de redação;
- os campos a preencher (a comarca do foro) aparecem nos dois. Preencher um
  exige preencher o outro.

## Como funciona

- `locale.ts` — tipo `Locale`, detecção, persistência e o store module-level.
- `dictionaries/pt.ts` — **fonte de verdade**. `Dictionary = typeof pt`.
- `dictionaries/en.ts` — `satisfies Dictionary`: chave faltando ou sobrando é
  erro de compilação.
- `index.ts` — `useT()`, `useLocale()`, `changeLocale()`, `initLocale()`.

## Como adicionar uma string

1. Adiciona em `pt.ts`.
2. `npm run typecheck` acusa `en.ts` incompleto.
3. Traduz em `en.ts`.

String com valor variável é **função**, não template com placeholder:
`dias: (n: number) => \`${n} dias\``. Assim o argumento fica tipado e a ordem
das palavras pode mudar entre idiomas.

**Fora de componente** (helper puro, schema zod), use `dict()` em vez de
`useT()`: `dict()` lê o mesmo store sem ser hook.

## Duas armadilhas que já morderam

1. **Const de módulo congela o idioma do boot.** Rótulo de aba, rótulo de nav,
   passo de cadastro e mensagem de schema zod NÃO podem viver numa `const` no
   topo do arquivo: ela é avaliada uma vez e não acompanha a troca. O padrão é
   guardar só o **id** na const e montar o rótulo no render; e o schema vira
   `criarSchema(t)` memoizado por idioma.
2. **Copy solta no JSX escapa do `en.ts`.** O `satisfies` só acusa chave que
   FALTA, não copy que nunca virou chave. É o que
   `copy-no-dicionario.test.ts` (na raiz do app) trava.

## Ordem de precedência do idioma

1. `?lang=pt|en` na URL (o link que alguém manda)
2. escolha salva no `localStorage`
3. idioma do navegador (qualquer coisa que não seja português cai em inglês)
4. `pt`

**Em `MODE=test` o padrão é sempre `pt`**, independentemente do navegador: o
jsdom se declara `en-US` e sem essa guarda a suíte inteira passaria a rodar em
inglês por acidente. Teste que quer inglês chama `changeLocale('en')`.

## Regras de tradução que não são estilo

- **Nada de travessão** em copy, nos dois idiomas (travado por teste).
- **Nenhuma palavra que prometa métrica inexistente**: `match`, `score`, `fit`,
  `alignment`, `verified` (`vision.md` nº 5). Travado por teste nos dois idiomas
  em `LandingPage.spec.tsx`.
- **Gênero neutro.** Em português, falando do objeto (candidatura, campanha);
  em inglês, `they/their`.
