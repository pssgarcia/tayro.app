# Visão — TAYRO

> Atualizado: 2026-08-06 · Donos: Pedro e Thais · Muda raramente por definição.

## Por que o TAYRO existe

Marca pequena/média que faz marketing de influência no Brasil hoje trabalha assim: recebe
candidatura por DM ou formulário, **abre o Instagram de cada candidata na mão** pra decidir,
controla o resto em planilha e WhatsApp, manda produto ou PIX, e no fim do mês não sabe dizer
o que funcionou. `[FATO — vivido pela Thais na Lilo, n=1, ver customer-interviews.md]`

Do outro lado, a micro-creator manda dezenas de candidaturas, não sabe quanto vai receber nem
quando, não tem nada que prove seu histórico fora de prints, e recomeça do zero em cada marca
nova. `[HIPÓTESE — nenhuma creator foi entrevistada]`

O TAYRO existe pra matar a decisão manual do lado da marca **e**, no mesmo movimento, dar à
creator um histórico que vale alguma coisa. A tese é que esses dois lados são o mesmo produto:
o dado que faz a marca decidir rápido é exatamente o dado que constrói a reputação da creator.

**Frase-âncora:** *decidir com quem trabalhar deve levar minutos, não uma tarde no Instagram.*

## O que queremos ser em 5 anos

O **registro de trabalho** do creator brasileiro — o lugar onde a parceria acontece e,
principalmente, onde ela fica registrada de forma verificável e portátil.

Marketplace qualquer um copia em seis meses. O que não se copia é o histórico acumulado:
quantas parcerias a creator entregou, no prazo, com que resultado, atestado pela marca que pagou.
Cinco anos de histórico real é o fosso. Tudo que a gente construir deve, direta ou
indiretamente, engordar esse registro.

Ordem de expansão pretendida (não é promessa, é direção):
1. Fitness/wellness no Brasil — nicho de entrada, onde a Thais tem repertório
2. Outros nichos de creator no Brasil, mesmo produto
3. Histórico portátil como padrão de mercado — outras ferramentas consomem, não só a nossa

`[HIPÓTESE]` — nada disso está validado. Está aqui pra dar direção, não pra ser defendido.

## O que nunca faremos

Lista curta de propósito. Cada item já custou ou custaria um diferencial nosso.

1. **Nunca cobrar da creator pra existir na plataforma.** Perfil, candidatura e histórico são
   sempre grátis pra ela. Cobrar da creator inverte o incentivo e destrói o lado que gera o dado.
   `[PROPOSTA — precisa ratificação do Pedro, ver decisions.md D-A]`

2. **Nunca transformar a candidatura em leilão de preço.** A oferta (valor, tipo, prazo) é
   definida pela marca **antes** e é a mesma pra todo mundo. Creator não dá lance, não negocia
   pra baixo, não descobre o valor depois de topar. `[FATO — invariante de domínio já no código:
   offer* em Campaign é fonte de verdade]`

3. **Nunca expor dado de creator sem consentimento explícito.** Perfil público nasce desligado.
   `[FATO — publicProfileEnabled default false, LGPD]`

4. **Nunca vender ou revender base de creators como lista.** O produto é a relação, não o mailing.

5. **Nunca fabricar métrica de reputação.** Se "histórico verificado" incluir um número que a
   gente não consegue provar, o diferencial inteiro vira enfeite. Melhor mostrar menos e
   verdadeiro. Corolário: nada de badge, score ou selo sem regra pública de cálculo.

6. **Nunca virar ferramenta de discovery de mega-influencer.** Buscar celebridade por CPM é o
   jogo do GRIN e do Modash, com o bolso deles. Nosso usuário é micro, e a dor dele é
   *avaliar e gerir quem já veio*, não *garimpar quem não veio*.

7. **Nunca virar software interno da Lilo.** A Lilo é a origem da dor e o modelo mental —
   não é cliente. Feature que só faz sentido pra ela morre no `/feature`.
   `[FATO — decidido na origem do projeto]`

8. **Nunca ser uma agência.** Não intermediamos a relação, não tomamos comissão sobre a escolha,
   não "curamos" quem a marca deve chamar. Somos infraestrutura. No dia em que a gente opinar
   sobre quem contratar, vira conflito de interesse com o histórico verificado.

## Como usar este arquivo

Feature que contradiz um "nunca" não é debate de roadmap — é debate de visão, e sobe pro Pedro
e pra Thais. Feature que não engorda o registro de trabalho nem tira trabalho manual da marca
precisa de uma justificativa muito boa pra existir.
