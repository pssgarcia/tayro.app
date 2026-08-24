/**
 * Trava de regressão de performance (D-18).
 *
 * Os bytes das imagens moram em `IgImage`, tabela separada, exatamente pra não
 * serem arrastados nas listagens. Se alguém acrescentar a relação (ou os bytes)
 * ao select que roda em toda consulta da Fila, cada abertura da tela passa a
 * carregar megabytes de imagem que a resposta JSON nem usa — o `<img>` busca a
 * imagem por conta própria, pela rota dedicada.
 *
 * Este teste existe porque o erro é invisível: nada quebra, só fica lento e caro.
 */
import { influencerSelect } from '../applications/application/applications.service';

describe('bytes de imagem fora das listagens', () => {
  const proibidos = ['igImages', 'data'];

  it.each(proibidos)('influencerSelect não expõe `%s`', (campo) => {
    expect(Object.keys(influencerSelect)).not.toContain(campo);
  });

  it('continua expondo a URL de origem, que é leve e serve de fallback', () => {
    expect(Object.keys(influencerSelect)).toContain('igProfilePicUrl');
  });
});
