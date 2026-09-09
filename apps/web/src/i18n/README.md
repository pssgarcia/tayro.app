# i18n

Núcleo de idioma do web. **Sem dependência externa.**

## O que está traduzido hoje

Só a **landing (`/`)** e os componentes em `pages/public/landing/`. O resto do
produto (painel da marca, painel da creator, telas de auth, documentos legais,
e-mails e mensagens de erro da API) continua **só em português**, com a copy nos
próprios componentes.

Isso é escopo declarado, não esquecimento: a landing é a porta de entrada e foi
o pedido. Traduzir o produto inteiro é outra ordem de grandeza e traz junto uma
pergunta que não é de engenharia (ver `.claude/knowledge/decisions.md`, entrada
de 2026-09-08).

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
