# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primária — Marina, sócia-operadora de marca fitness/wellness pequena a média.** Ela é o próprio time de marketing: recebe candidatura de creator por DM/formulário, avalia perfil na mão (abre o Instagram de cada uma), controla tudo em planilha e WhatsApp, paga em PIX ou produto. Dor em ordem: (1) avaliar candidata consome a tarde e a decisão sai insegura, (2) perde o fio de quem recebeu produto/postou/sumiu, (3) não sabe o que funcionou no fim do mês. `[HIPÓTESE — n=1, retrato da co-fundadora numa marca real (Lilo), 0 entrevistas de mercado]`

**Essencial, não-pagante — Bia, micro-creator fitness (8–30 mil seguidores).** Marketing de influência é renda complementar. Manda candidatura sem saber quanto vai receber, aceita permuta sem saber o valor, não sabe se a marca respondeu, recomeça do zero em cada marca nova (nada do que entregou antes conta a favor dela). `[HIPÓTESE — 0 entrevistas]`

**Papel em disputa, fora do produto hoje — dona de agência.** Descrita como persona pelo fundador na origem do projeto, mas o produto só modela `BRAND`/`INFLUENCER` — agência exigiria multi-cliente/carteira, que não existe. Não é escopo de produto nem de design agora; decisão de negócio aberta (`decisions.md` D-B).

## Product Purpose

Matar a decisão manual da marca sobre com qual creator trabalhar, e no mesmo movimento dar à creator um histórico de parceria que vale alguma coisa fora do TAYRO. A tese do produto: o dado que faz a marca decidir rápido (Instagram real, engajamento calculado) é o mesmo dado que constrói a reputação portátil da creator. Frase-âncora do fundador: "decidir com quem trabalhar deve levar minutos, não uma tarde no Instagram."

## Positioning

CRM creator-first de marketing de influência para marca pequena/média com produto físico que **já** recebe candidatura espontânea de creator e decide na mão — não é ferramenta de discovery/garimpo (não compete com GRIN/Modash) e não é agência (não intermedia, não cobra comissão, não cura quem contratar).

Frase de posicionamento `[HIPÓTESE — nunca dita a um cliente real]`: "Pra marca pequena que já recebe candidatura de creator e decide na mão: o TAYRO é o CRM que mostra o Instagram real de cada candidata do lado do botão de aprovar, e transforma cada parceria fechada em histórico verificado — pra ela e pra creator."

Mecanismo diferente que um concorrente não copiaria com verdade: media kit vivo (perfil de creator que se atualiza sozinho a partir do Instagram real) + oferta definida pela marca antes da candidatura (sem leilão, sem negociação constrangedora).

## Operating Context

Marca opera sozinha (uma pessoa: sócia, social media ou assistente), sem time de marketing dedicado. Fluxo real hoje fora do produto: DM/formulário → abrir perfil do Instagram na mão → planilha → cobrar post no WhatsApp → PIX ou Correios. Nicho de entrada é fitness/wellness (não por o mercado ser melhor, mas por rede/repertório de origem). Uso predominantemente mobile — tanto marca quanto creator usam majoritariamente celular no Brasil, não desktop.

## Capabilities and Constraints

- Papéis atuais no produto: `BRAND` e `INFLUENCER` (sem `AGENCY`).
- Oferta (valor, tipo CASH/PRODUCT, prazo) é definida pela marca antes da candidatura e é a mesma para todo mundo — invariante de domínio, não feature negociável.
- Perfil público de creator nasce desligado (opt-in, LGPD).
- PWA instalável (web), não há app nativo — Capacitor é direção futura possível, não decidida.
- Zero entrevistas de cliente realizadas até hoje (n=0) — nenhuma frase "clientes dizem" tem respaldo real ainda; toda persona/positioning acima é hipótese de fundador, não validação de mercado.

## Brand Commitments

**Único compromisso fixo confirmado: o nome "TAYRO".** Todo o resto da identidade visual atual — paleta (fundo escuro, lime `#C6FF33`), tipografia (Space Grotesk/Inter/JetBrains Mono), e o elemento de assinatura "placa" — é o sistema vigente (documentado em `DESIGN.md`), não uma amarra. Confirmado explicitamente pelo fundador em 2026-08-15: a exploração de novas direções visuais está aberta, incluindo abandonar dark-first, a cor lime, ou o conceito de placa, caso uma direção melhor apareça.

## Product Principles

1. **Decisão em minutos, não numa tarde.** Toda feature que não reduz o tempo/esforço da marca pra avaliar uma candidata precisa de justificativa forte pra existir.
2. **O histórico é o fosso, não a lista de creators.** Nunca vender/revender base de creators; o produto é a relação registrada, não o mailing.
3. **Nunca fabricar reputação.** Se um número de "histórico verificado" não pode ser provado, ele não existe na tela — nada de badge/score sem regra pública de cálculo.
4. **Creator nunca paga pra existir na plataforma** e nunca negocia preço por leilão — a oferta é fixa e visível antes da candidatura.
5. **Infraestrutura, não agência.** O produto nunca opina sobre quem a marca deve contratar nem toma comissão sobre a escolha.

## Evidence on Hand

Nenhuma entrevista de cliente realizada (n=0, ver `.claude/knowledge/customer-interviews.md`). Nenhum caso de uso, depoimento ou métrica de mercado real disponível — não fabricar nenhum desses em trabalho de design (mockups de "prova social" devem usar dados claramente fictícios/placeholder, nunca depoimento inventado apresentado como real). Um caso real de origem: co-fundadora operando a marca Lilo manualmente (WhatsApp + Excel), fonte da dor original — n=1, enviesado, não é evidência de mercado.
