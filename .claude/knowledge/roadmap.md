# Roadmap — TAYRO

> Atualizado: 2026-08-06 · Dono: agente `product` · Revisar a cada release.
> Ordenado por **valor de aprendizado**, não por facilidade. Não é lista de desejos:
> item que entra aqui empurra outro pra baixo.

## Onde estamos (2026-08-06)

- **v0.32.0** em andamento na branch `feature/register-flow-redesign` (perfil público `/c/:handle`)
- 32 releases · CI/CD verde · API no Railway · Web na Vercel · Neon (dev + prod)
- ~137 testes API + ~130 web
- **Marcas pagantes: 0 · Usuários reais: 0 · Entrevistas: 0**

Diagnóstico honesto: **a engenharia está muito à frente da validação.** O produto tem
infraestrutura de startup com tração e evidência de projeto de faculdade. O gargalo não é código.

---

## AGORA — o que destrava tudo

### 1. Cinco entrevistas com marca (P1) 🔴 não é código
Destrava `D-A` (monetização), `D-B` (marca vs agência) e o posicionamento inteiro.
Enquanto isso não acontece, **toda priorização abaixo é chute** — inclusive esta.
Roteiro pronto em `customer-interviews.md`. Custo: ~5 conversas de 30min.
> Cofundador falando: se você só fizer um item deste roadmap neste mês, faz esse.
> É o único que muda o que todos os outros deveriam ser.

### 2. Fechar o diferencial nº 2/nº 3 — registro de resultado de parceria
`PartnershipResult` existe no banco e **nada escreve nele** `[FATO — verificado 2026-08-06]`.
Sem isso, "histórico verificado" e "transparência bilateral" são slide, não produto — metade
do que a gente diz que é.
Escopo mínimo: marca registra resultado ao concluir (alcance, cupons usados, nota) → aparece
no perfil da creator e pra ela.
**Depende de `D-D`** (definir o que é "verificado") — decisão antes de código.

### 3. E-mail real em produção
`EMAIL_PROVIDER=stub` significa que **nenhum e-mail chega pra ninguém** hoje: aprovação, recusa,
link de claim. Uma creator real que se candidatar nunca recebe nada.
É gate de lançamento, não feature. Depende de comprar o domínio (`D-13`).

---

## PRÓXIMO — antes do lançamento

- **Checklist de lançamento** (`prelaunch`): HTTPS · env vars revisadas · política de privacidade
  e termos · backup do banco · auditoria de segurança e arquitetura **via Fable** (`D-15`)
- **Monitoramento de erros (Sentry)** — hoje um erro em produção só se descobre por reclamação,
  e não há de quem reclamar ainda. Vira urgente no minuto em que houver usuário real
- **Bug conhecido: IG incompleto na 1ª candidatura** — a marca vê "dados indisponíveis" no
  primeiro contato com a plataforma. É a pior primeira impressão possível, no exato momento em
  que a gente promete resolver a avaliação. Investigar logs do Railway **antes** de mexer no código

---

## DEPOIS — precisa de tração ou de decisão aberta

- **Fila assíncrona de Instagram (BullMQ + Redis)** — `D-16`. Justificado por confiabilidade **e**
  por aprendizado explícito (filas, observabilidade). Não antes de haver volume que justifique
- **Reenvio manual de link de claim** (`D-14`) — no dia em que a primeira creator real travar
- **Capacitor / app de loja** (`D-11`) — só com tração
- **Multi-cliente / agência** — **bloqueado por `D-B`**. Não começar sem decisão
- **Billing / planos** — **bloqueado por `D-A`**. Não começar sem decisão

---

## NÃO VAMOS FAZER (e por quê)

| Item | Motivo | Ref |
|---|---|---|
| Calendário | Ninguém pediu; reavaliar após 10 entrevistas | `D-09` |
| Ranking / gamificação / moedas | Não valida o fluxo central | `D-08` |
| Notificação in-app | Idem — o modelo `Notification` é tabela órfã, sem módulo na API | `D-08` |
| Chat em tempo real | WhatsApp já existe e ganha | `D-08` |
| Relatórios avançados | Antes disso é preciso ter dado de resultado (item 2 do AGORA) | `D-08` |
| Pagamento automático / escrow | KYC, custódia, risco regulatório. Não valida a tese | `D-07` |
| React Native | Reescrever UI com app web funcionando é desperdício | `D-11` |
| Discovery de creator | É o jogo do Modash; nosso valor começa depois que a candidata aparece | `vision.md` nº 6 |

---

## Regra de admissão (o agente `product` aplica)

Pra entrar no AGORA, a feature precisa passar em **todas**:

1. Tira trabalho manual da marca **ou** engorda o registro de trabalho da creator
2. Não contradiz nenhum "nunca" da `vision.md`
3. Não depende de decisão `ABERTA` em `decisions.md`
4. Cabe em uma release (`vX.Y.0`) — se não couber, não foi decomposta
5. Dá pra dizer o que a gente aprende com ela, não só o que ela entrega

Falhou em uma? Vai pro DEPOIS com o motivo escrito. Falhou na 2? Sobe pro Pedro e pra Thais.
