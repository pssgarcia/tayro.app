# Entrevistas com cliente

> **ENTREVISTAS REALIZADAS: 0** · Atualizado: 2026-08-06
> **Só Pedro ou Thais escrevem aqui. Agente nunca escreve neste arquivo.**

---

## 🔴 Leia antes de citar este arquivo

`n = 0`.

Nenhuma marca, creator ou agência foi entrevistada. Portanto:

- Nenhuma frase começando com *"clientes dizem"*, *"usuários reclamam"* ou *"o mercado quer"*
  tem respaldo. Um agente que produzir uma dessas está alucinando, e o output deve ser rejeitado.
- Tudo em `personas.md` é retrato-falado.
- A dor descrita em `vision.md` vem da experiência da **Thais** — que é sócia, não cliente.
  n=1 e enviesado: ela conhece a dor dela, não o tamanho do mercado.

Este arquivo existe pra deixar isso desconfortável até deixar de ser verdade.

---

## Por que isto é o gargalo do TAYRO

O produto tem 32 releases, CI, deploy em produção, ~267 testes — e **zero conversa com cliente**.
A engenharia está muito à frente da validação. Isso não é elogio: significa que a chance de o
produto estar resolvendo o problema errado nunca foi medida.

Decisões que estão **travadas** por falta destas entrevistas:
- `D-A` monetização — quem paga e quanto (sem isso não há negócio, só software)
- `D-B` marca vs agência — muda o modelo de dados
- Se "transparência bilateral" e "histórico verificado" importam pra alguém além da gente

Meta mínima antes do lançamento: **5 entrevistas com marca (P1)**.

---

## Como conseguir as 5 primeiras

**O canal conhecido é a rede da Thais (ex-Lilo).** Isso resolve *acesso*, não resolve
*qualificação* — "conhecer alguém" não é a mesma coisa que "essa pessoa é o P1". Gastar as 5
entrevistas com quem está mais acessível em vez de quem mais se parece com a Marina
(`personas.md`) é o jeito mais fácil de sair dessa rodada sem aprender nada. `D-C` (canal de
aquisição, `decisions.md`) continua aberta depois disso — isto aqui é só pra destravar a rodada 1.

### Filtro rápido (de `positioning.md`)

Prioridade em quem bate os 3 primeiros. Os 2 últimos são bônus, não corte:

1. Já recebe candidatura espontânea de creator (por DM ou formulário) — sem isso não há dor de avaliação
2. Trabalha com **muitas creators pequenas**, não com poucas grandes
3. **Uma pessoa só** decide/opera o marketing de influência (sócia, social media, assistente) — não um time
4. Paga em produto, cupom ou PIX de valor baixo/médio — sem contrato jurídico por campanha
5. Nicho fitness/wellness (reduz o custo de conseguir a conversa; não é filtro de exclusão)

**Descarta de cara** (ver `positioning.md`, "Quem NÃO compra"): marca sem nenhuma candidatura
espontânea ainda, marca que já tem time de marketing dedicado, ou quem no primeiro contato disser
"vocês rodam a campanha pra mim?" (isso é busca por agência, não por ferramenta).

**Se a pessoa opera pra clientes de terceiros** (não pra marca própria), ela não é P1 — é **P3
(agência)**, e serve pra outra meta de entrevista (ver contador no fim deste arquivo, e `D-B`).
Não misturar: rotular direito importa mais do que fechar 5 rápido.

### Mensagem de abordagem (rascunho — ajustar a voz pra como a Thais fala de verdade)

Curta, sem vender, pedindo a dor e não a opinião sobre o produto. Contato quente (rede da Thais)
não precisa de contexto institucional — vai direto:

> Oi [nome]! Tô com um projetinho e queria muito ouvir você — não é venda de nada, é 20 minutinhos
> pra eu entender como você faz hoje pra escolher/gerenciar creators pra [marca]. Topa um cafézinho
> (ou call) essa semana? Me ajuda muito mais do que imagina 🙏

Se a pessoa perguntar "o que é o projeto": responder depois de ouvir, não antes. `vision.md` tem
o porquê — a entrevista serve pra ouvir o problema dela, não pra apresentar a solução nossa. Se
ela insistir antes de topar, uma frase basta: *"é uma ideia que a gente tá validando pra ajudar
marca a lidar com candidatura de creator — te conto tudo depois que a gente conversar."*

### Depois de cada uma

Registrar em até 24h no formato abaixo (seção "Como registrar"), rotular a pessoa como P1 ou P3,
e atualizar o contador no fim deste arquivo. Se 2 entrevistas seguidas confirmarem exatamente o
que a gente já achava, checar se a pergunta 4 ("como você decidiu que era ela?") está sendo feita
de verdade ou se a conversa está sendo conduzida — é o sinal mais comum de entrevista mal feita.

---

## Roteiro — marca (P1)

Regra de ouro: perguntar sobre o **passado concreto**, nunca sobre o futuro hipotético.
"Você usaria?" não vale nada. "Me mostra como você fez da última vez" vale tudo.
Não vender, não explicar o TAYRO até o fim. Ouvir mais do que falar.

**Contexto**
1. Me conta a última vez que você fechou parceria com uma creator. Começa do começo.
2. Como ela chegou até você?
3. Quantas candidaturas você recebeu naquele mês? O que fez com as que não escolheu?

**Avaliação (o coração da nossa tese)**
4. Como você decidiu que era ela? Me mostra o que você olhou.
5. Quanto tempo isso levou? (Deixar a pessoa estimar sozinha, sem sugerir número)
6. Já se arrependeu de alguma escolha? O que você teria olhado antes?

**Operação**
7. Depois do "sim", como você controlou o combinado? Me mostra a planilha/conversa.
8. Já perdeu prazo, esqueceu pagamento ou perdeu o fio de alguém? Conta.

**Resultado**
9. Como você soube se deu certo?
10. A creator ficou sabendo do resultado? Por quê / por que não?

**Dinheiro (não pular — é aqui que a conversa fica real)**
11. Você paga por alguma ferramenta de marketing hoje? Quais, quanto?
12. Se existisse algo que cortasse [a dor que ela mais reclamou] pela metade, quanto valeria por mês?
13. Quem assinaria esse cheque — você?

**Fechamento**
14. Qual foi a pior parte disso tudo? (Deixar responder. Não sugerir.)
15. Quem mais eu deveria ouvir?

## Roteiro — agência (P3)
Mesmo roteiro, mais 4 perguntas que decidem `D-B`:
- Quantos clientes/creators você gerencia hoje ao mesmo tempo?
- Como você presta contas pro seu cliente?
- O que acontece quando você erra um prazo do cliente?
- Você pagaria por isso, ou repassaria o custo pro cliente?

## Roteiro — creator (P2)
- Me conta a última parceria que você fechou. Como te acharam?
- Você soube o valor antes ou depois de topar?
- Já entregou e nunca mais soube de nada?
- Quando uma marca pede media kit, o que você manda? Me mostra.
- **Você toparia manter um perfil em mais uma plataforma? Por quê?** ← testa o risco de abandono da P2

---

## Como registrar (copiar o bloco abaixo)

Registrar **no máximo 24h depois**, com as palavras da pessoa. Verbo dela, não o nosso.
Se você precisou reescrever pra ficar bonito, perdeu o dado.

```markdown
### E-00X · [Nome ou apelido] · [marca/agência/creator] · AAAA-MM-DD
**Contexto:** o que a pessoa faz, tamanho, quanto tempo de mercado
**Como decide hoje:** (comportamento observado, não opinião)
**Ferramentas que usa:**
**Dor nº 1 (palavras dela):** "…"
**Já paga por:** (ferramenta, valor)
**Disposição a pagar:** (o que ela disse, não o que a gente entendeu)
**Citação marcante:** "…"
**O que ISSO falsifica na nossa base:** ← campo obrigatório
**O que confirma:**
**Próximo passo:**
```

O campo *"o que isso falsifica"* é obrigatório porque entrevista que só confirma o que a gente
já achava normalmente foi mal conduzida — ou a gente vendeu em vez de ouvir.

---

## Entrevistas

*(vazio — nenhuma realizada)*

---

## Contador

| Persona | Meta | Feitas |
|---|---|---|
| P1 marca | 5 | **0** |
| P3 agência | 5 | **0** |
| P2 creator | 5 | **0** |
