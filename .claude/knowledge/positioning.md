# Posicionamento — TAYRO

> Atualizado: 2026-08-06 · Revisar a cada bloco de entrevistas.

## ⚠️ Questão aberta que bloqueia este arquivo

**Quem é o comprador primário: a marca ou a agência?**

Isso não está decidido, e a indecisão já está aparecendo em lugares diferentes:

- O **produto construído** só conhece dois papéis: `BRAND` e `INFLUENCER`.
  `[FATO — enum UserRole em apps/api/prisma/schema.prisma:12; não existe AGENCY]`
- A **persona que o Pedro descreveu** ao montar esta base é *dona de agência com 15 creators*
  (WhatsApp + Excel + Drive, perde prazo, esquece pagamento, não sabe ROI). Essa pessoa não
  cabe no modelo de dados atual — ela precisa de multi-marca, multi-cliente e visão de carteira.
- A **origem da dor** (Thais na Lilo) é lado marca, não agência.

Não são o mesmo cliente. Uma marca gerencia *suas* campanhas; uma agência gerencia campanhas
*de terceiros* e cobra por isso. Servir agência exige modelo de dados novo (organização →
clientes → campanhas), permissões, e uma proposta de valor diferente ("prove seu trabalho pro
seu cliente", não "decida mais rápido").

**Isso precisa ser decidido antes de qualquer feature de gestão em escala.** Enquanto não for,
o resto deste arquivo assume **marca como comprador primário** — porque é o que o código faz hoje.
Registrado em `decisions.md` como `D-B` (aberta).

---

## Quem compra

**Marca pequena a média, dona de produto físico, que já faz marketing de influência na mão.**

Sinais de qualificação `[HIPÓTESE — 0 entrevistas]`:
- Recebe candidatura espontânea de creator (tem alguma tração de marca)
- Trabalha com **muitas creators pequenas**, não com poucas grandes
- Paga em produto, cupom ou PIX de valor baixo/médio — não tem contrato jurídico por campanha
- Quem opera é **uma pessoa**: sócia, social media ou assistente de marketing. Não tem time
- A planilha existe, e ela já dói

Nicho de entrada: **fitness/wellness**. Não por o mercado ser melhor, mas porque a Thais tem
repertório e rede lá — reduz o custo de conseguir as primeiras conversas. `[FATO — decisão de origem]`

## Quem NÃO compra

Recusar cliente errado cedo vale mais do que fechar. Cada um destes puxaria o produto pra
um lugar que contradiz a visão:

| Não é cliente | Por quê |
|---|---|
| **Enterprise / grande anunciante** | Quer integração, SSO, contrato, compliance e time de sucesso do cliente. É o jogo do GRIN. Perdemos por preço reverso e por não ter estrutura |
| **Agência** (por ora) | Precisa de multi-cliente, que o produto não tem. Ver questão aberta acima — pode virar cliente depois de uma decisão explícita, não por acidente |
| **Marca que quer garimpar creator** | Quem chega buscando "me acha 50 influenciadoras fitness" quer discovery (Modash), não gestão pós-candidatura. Nosso valor começa **depois** que a candidata apareceu |
| **Creator como pagante** | Ela é usuária essencial, nunca fonte de receita. Ver `vision.md`, "nunca" nº 1 |
| **Marca sem tração nenhuma** | Se não recebe candidatura, o produto fica vazio e a culpa parece nossa. Não temos demand-gen |
| **Quem quer serviço, não ferramenta** | "Vocês rodam a campanha pra mim?" = agência. Ver `vision.md`, "nunca" nº 8 |

## Qual é o nosso diferencial

Quatro, na ordem em que defendemos:

1. **Media kit vivo** — o perfil da creator se atualiza sozinho a partir do Instagram real
   (seguidores, engajamento calculado, últimos posts). Ela não monta PDF, a marca não confia em
   print. `[FATO — implementado: sync de IG + /c/:handle]`

2. **Histórico verificado e portátil** — parcerias entregues ficam registradas e viajam com a
   creator. É o único ativo que cresce com o tempo e não é copiável.
   `[FATO — implementado 2026-09-03: a marca informa o resultado, ele entra no perfil público
   com o nome dela ao lado, e a contagem de parcerias concluídas tem regra pública de cálculo.
   Ressalva honesta: o número é DECLARADO pela marca, não medido por nós — e a interface diz
   isso. "Verificado" aqui significa "atestado por quem pagou", não "medido pelo tayro"]`

3. **Transparência bilateral** — a marca devolve resultado pra creator (alcance, cupons usados).
   Inverte a relação padrão, em que a creator entrega e nunca fica sabendo de nada.
   `[FATO — implementado 2026-09-03: registrar resultado é devolvê-lo; a creator sempre vê e é
   avisada por e-mail, e vê também quando a marca escolheu não torná-lo público. Só num
   sentido: ela não avalia a marca — ver specs/partnership-results → Known Gaps]`

4. **Oferta antes da candidatura** — valor, tipo e prazo definidos e visíveis antes de ela se
   candidatar. Mata a negociação constrangedora e o "depois a gente vê".
   `[FATO — implementado, é invariante de domínio]`

### Dívida de posicionamento — PAGA em 2026-09-03 (com uma ressalva que fica)

Até 2026-09-03 este bloco dizia que dos quatro diferenciais só **dois e meio** existiam em
produção: `PartnershipResult` estava no banco e nenhum serviço escrevia nele, então os
diferenciais **2 e 3** eram promessa de pitch. `[FATO — era verdade de 2026-08-06 a
2026-09-03]`

Os quatro existem em produção agora. `D-D` foi decidida (`D-21`) e a capacidade foi construída
— ver `specs/partnership-results`.

**A ressalva que não some, e que precisa ser dita do mesmo jeito numa conversa de venda:** o
número de alcance é **informado pela marca**, não medido pelo tayro. "Histórico verificado"
significa *atestado por quem pagou* — o que já é mais do que print de story, e é o máximo que
se pode afirmar sem a API oficial do Instagram. Vender isso como métrica auditada seria
exatamente o que a `vision.md` nº 5 proíbe, e a própria interface do produto não permite
(todo número aparece com "informado por <marca>" ao lado).

**O que continua não medido:** zero marcas reais usaram a capacidade. Que a marca *queira*
informar resultado é hipótese — a mais importante a testar junto do item #0 do `roadmap.md`.

## Posicionamento em uma frase

> Pra marca pequena que já recebe candidatura de creator e decide na mão:
> o TAYRO é a plataforma que mostra o Instagram real de cada candidata do lado do botão de aprovar,
> e transforma cada parceria fechada em histórico verificado — pra ela e pra creator.

`[HIPÓTESE]` — nunca foi dita pra um cliente real. Testar nas primeiras 5 entrevistas: se a
pessoa não completar a frase sozinha depois de ouvir a primeira linha, o posicionamento está errado.
