/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignPipelineMobileStory from './CampaignPipelineMobileStory';
import { makeApplication, campaignFixture } from '../../test/fixtures/applications';
import type { Application } from '../../types/api';

// Story mobile é um componente controlado por props (query e mutations vivem
// em CampaignFilaTab). Nenhum hook mockado aqui: os testes exercitam o
// comportamento real — recorte da fila, navegação, tally e fim de fila.

function makeMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
    error: null,
    ...overrides,
  } as any;
}

function renderStory(
  applications: Application[],
  overrides: {
    approve?: any;
    reject?: any;
    refreshIg?: any;
    appsLoading?: boolean;
    onExit?: () => void;
  } = {},
) {
  const props = {
    campaign: campaignFixture,
    applications,
    appsLoading: overrides.appsLoading ?? false,
    approve: overrides.approve ?? makeMutation(),
    reject: overrides.reject ?? makeMutation(),
    refreshIg: overrides.refreshIg ?? makeMutation(),
    onExit: overrides.onExit ?? vi.fn(),
  };
  const utils = render(<CampaignPipelineMobileStory {...props} />);
  return { ...utils, props };
}

/** O hero é o único container com gesto de swipe — pego pelo aspect-ratio. */
function heroOf(container: HTMLElement) {
  return container.querySelector('[class*="aspect-"]') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CampaignPipelineMobileStory — recorte da fila', () => {
  it('mostra só candidaturas PENDING (decidida não entra na fila)', () => {
    renderStory([
      makeApplication('a', { status: 'PENDING', name: 'Ana Pendente' }),
      makeApplication('b', { status: 'APPROVED', name: 'Bia Aprovada' }),
      makeApplication('c', { status: 'REJECTED', name: 'Cris Recusada' }),
      makeApplication('d', { status: 'WITHDRAWN', name: 'Dani Retirada' }),
    ]);

    expect(screen.getByText('Ana Pendente')).toBeInTheDocument();
    expect(screen.queryByText('Bia Aprovada')).not.toBeInTheDocument();
    expect(screen.queryByText('Cris Recusada')).not.toBeInTheDocument();
    expect(screen.queryByText('Dani Retirada')).not.toBeInTheDocument();
    // Contador reflete só a fila pendente, não o total de candidaturas
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });

  it('cai direto no fim de fila quando não há nenhuma PENDING', () => {
    renderStory([makeApplication('a', { status: 'APPROVED' })]);

    expect(screen.getByText(/fila em dia/i)).toBeInTheDocument();
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });

  it('não mostra fim de fila prematuro enquanto a query carrega', () => {
    renderStory([], { appsLoading: true });

    expect(screen.queryByText(/fila em dia/i)).not.toBeInTheDocument();
  });
});

describe('CampaignPipelineMobileStory — navegação', () => {
  const tres = () => [
    makeApplication('a', { name: 'Ana' }),
    makeApplication('b', { name: 'Bia' }),
    makeApplication('c', { name: 'Cris' }),
  ];

  it('avança e volta pelas zonas de toque das laterais', () => {
    renderStory(tres());

    expect(screen.getByText('Ana')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    expect(screen.getByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Candidato anterior'));
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('não volta antes do primeiro candidato', () => {
    renderStory(tres());

    fireEvent.click(screen.getByLabelText('Candidato anterior'));

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('chega no fim de fila depois do último candidato', () => {
    renderStory(tres());

    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    fireEvent.click(screen.getByLabelText('Próximo candidato'));

    expect(screen.getByText(/fila em dia/i)).toBeInTheDocument();
  });

  it('avança no swipe pra esquerda e volta no swipe pra direita', () => {
    const { container } = renderStory(tres());

    // Reconsulta o hero a cada gesto: CandidateStory remonta (key={id}) na
    // troca de candidato, então guardar a referência apontaria pro nó antigo.
    const swipe = (dx: number) => {
      const hero = heroOf(container);
      fireEvent.touchStart(hero, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchEnd(hero, {
        changedTouches: [{ clientX: 200 + dx, clientY: 100 }],
      });
    };

    swipe(-100);
    expect(screen.getByText('Bia')).toBeInTheDocument();

    swipe(100);
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('ignora arraste curto (abaixo do limiar) — não troca de candidato', () => {
    const { container } = renderStory(tres());
    const hero = heroOf(container);

    fireEvent.touchStart(hero, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(hero, {
      changedTouches: [{ clientX: 160, clientY: 100 }],
    });

    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('ignora arraste predominantemente vertical (é scroll, não navegação)', () => {
    const { container } = renderStory(tres());
    const hero = heroOf(container);

    fireEvent.touchStart(hero, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchEnd(hero, {
      changedTouches: [{ clientX: 120, clientY: 60 }],
    });

    expect(screen.getByText('Ana')).toBeInTheDocument();
  });
});

describe('CampaignPipelineMobileStory — identidade', () => {
  it('o @handle é um link pro Instagram da creator (abre em aba nova)', () => {
    renderStory([makeApplication('a', { name: 'Ana' })]);

    const link = screen.getByRole('link', { name: /@creatora/i });
    expect(link).toHaveAttribute('href', 'https://instagram.com/creatora');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});

describe('CampaignPipelineMobileStory — painel de detalhes', () => {
  it('abre com "Ver posts"; com ele aberto, o toque na lateral fecha em vez de avançar', () => {
    renderStory([
      makeApplication('a', { name: 'Ana', message: 'Adoro a marca!' }),
      makeApplication('b', { name: 'Bia' }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /ver posts/i }));
    expect(screen.getByText(/nota da candidatura/i)).toBeInTheDocument();

    // Regra: não perde a posição na fila ao fechar o painel
    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    expect(screen.getByText('Ana')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    expect(screen.getByText('Bia')).toBeInTheDocument();
  });
});

describe('CampaignPipelineMobileStory — decisão e tally', () => {
  /** No fim de fila, o número fica no irmão anterior ao rótulo. */
  const contador = (rotulo: string) => screen.getByText(rotulo).previousElementSibling;

  it('conta no resumo do fim de fila a decisão que o servidor confirmou', () => {
    const approve = makeMutation({ mutate: vi.fn() });
    const { rerender, props } = renderStory([makeApplication('a', { name: 'Ana' })], { approve });

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));
    expect(approve.mutate).toHaveBeenCalledWith('a');

    // revalidação da lista traz 'a' já como APPROVED → sai da fila, tally conta
    rerender(
      <CampaignPipelineMobileStory
        {...props}
        applications={[makeApplication('a', { name: 'Ana', status: 'APPROVED' })]}
      />,
    );

    expect(screen.getByText(/fila em dia/i)).toBeInTheDocument();
    expect(contador('Aprovadas')).toHaveTextContent('1');
  });

  it('não conta no tally quando a decisão não confirma no servidor', () => {
    const approve = makeMutation({ mutate: vi.fn() });
    renderStory([makeApplication('a')], { approve });

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));
    // sem revalidação: 'a' continua PENDING na lista → não entra na contagem
    fireEvent.click(screen.getByLabelText('Próximo candidato'));

    expect(contador('Aprovadas')).toHaveTextContent('0');
  });

  it('não conta a mesma candidatura duas vezes se decidida de novo', () => {
    const reject = makeMutation({ mutate: vi.fn() });
    const { rerender, props } = renderStory([makeApplication('a', { name: 'Ana' })], { reject });

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    const confirmada = [makeApplication('a', { name: 'Ana', status: 'REJECTED' })];
    rerender(<CampaignPipelineMobileStory {...props} applications={confirmada} />);
    rerender(<CampaignPipelineMobileStory {...props} applications={confirmada} />);

    expect(contador('Recusadas')).toHaveTextContent('1');
  });

  it('descarta a candidatura atual e conta como recusada', () => {
    const reject = makeMutation({ mutate: vi.fn() });
    const { rerender, props } = renderStory([makeApplication('a')], { reject });

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    expect(reject.mutate).toHaveBeenCalledWith('a');

    rerender(
      <CampaignPipelineMobileStory
        {...props}
        applications={[makeApplication('a', { status: 'REJECTED' })]}
      />,
    );
    expect(contador('Recusadas')).toHaveTextContent('1');
  });

  // Regressão: o resumo mostrava sempre 0 / 0 / 0 porque cada decisão nova,
  // tomada antes de a anterior liquidar, sobrescrevia o callback do mutate.
  it('soma várias decisões seguidas conforme o servidor confirma cada uma', () => {
    const approve = makeMutation({ mutate: vi.fn() });
    const reject = makeMutation({ mutate: vi.fn() });
    const trio = [
      makeApplication('a', { name: 'Ana' }),
      makeApplication('b', { name: 'Bia' }),
      makeApplication('c', { name: 'Cris' }),
    ];
    const { rerender, props } = renderStory(trio, { approve, reject });

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));
    rerender(
      <CampaignPipelineMobileStory
        {...props}
        applications={[{ ...trio[0], status: 'APPROVED' }, trio[1], trio[2]]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    rerender(
      <CampaignPipelineMobileStory
        {...props}
        applications={[
          { ...trio[0], status: 'APPROVED' },
          { ...trio[1], status: 'REJECTED' },
          trio[2],
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));
    rerender(
      <CampaignPipelineMobileStory
        {...props}
        applications={[
          { ...trio[0], status: 'APPROVED' },
          { ...trio[1], status: 'REJECTED' },
          { ...trio[2], status: 'APPROVED' },
        ]}
      />,
    );

    expect(screen.getByText(/fila em dia/i)).toBeInTheDocument();
    expect(contador('Aprovadas')).toHaveTextContent('2');
    expect(contador('Recusadas')).toHaveTextContent('1');
    expect(contador('Pendentes')).toHaveTextContent('0');
  });

  it('desabilita as duas ações enquanto uma decisão está em voo', () => {
    const approve = makeMutation({ isPending: true, variables: 'a' });
    renderStory([makeApplication('a')], { approve });

    expect(screen.getByRole('button', { name: /aprovando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /descartar/i })).toBeDisabled();
  });
});

describe('CampaignPipelineMobileStory — estados do Instagram', () => {
  it('mostra métricas quando o IG veio (OK)', () => {
    renderStory([makeApplication('a', { igFetchStatus: 'OK' })]);

    expect(screen.getByText(/seguidores/i)).toBeInTheDocument();
    expect(screen.queryByText(/dados do instagram indisponíveis/i)).not.toBeInTheDocument();
  });

  it('oferece "Atualizar" quando o IG falhou', () => {
    const refreshIg = makeMutation();
    renderStory([makeApplication('a', { igFetchStatus: 'FAILED' })], { refreshIg });

    expect(screen.getByText(/dados do instagram indisponíveis/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /atualizar/i }));
    expect(refreshIg.mutate).toHaveBeenCalledWith('a');
  });

  it('trata igFetchStatus nulo como falha (conta sem tentativa registrada)', () => {
    renderStory([makeApplication('a', { igFetchStatus: null })]);

    expect(screen.getByText(/dados do instagram indisponíveis/i)).toBeInTheDocument();
  });

  it('bloqueia o botão enquanto o cooldown de 15min está ativo', () => {
    // extractCooldownWait só reconhece AxiosError com data.waitMinutes —
    // formato real da resposta 429 do cooldown de refresh de IG.
    const refreshIg = makeMutation({
      variables: 'a',
      error: Object.assign(new Error('Request failed with status code 429'), {
        isAxiosError: true,
        response: { status: 429, data: { waitMinutes: 7 } },
      }),
    });
    renderStory([makeApplication('a', { igFetchStatus: 'FAILED' })], { refreshIg });

    expect(screen.getByRole('button', { name: /min/i })).toBeDisabled();
  });
});

describe('CampaignPipelineMobileStory — modo "Todas" (paridade com o desktop)', () => {
  const mix = () => [
    makeApplication('a', { status: 'PENDING', name: 'Ana Pendente' }),
    makeApplication('b', { status: 'APPROVED', name: 'Bia Aprovada' }),
    makeApplication('c', { status: 'REJECTED', name: 'Cris Recusada' }),
    makeApplication('d', { status: 'WITHDRAWN', name: 'Dani Retirada' }),
  ];

  it('lista toda candidatura com o rótulo de status em português', () => {
    renderStory(mix());

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));

    expect(screen.getByText('Ana Pendente')).toBeInTheDocument();
    expect(screen.getByText('Bia Aprovada')).toBeInTheDocument();
    expect(screen.getByText('Cris Recusada')).toBeInTheDocument();
    expect(screen.getByText('Dani Retirada')).toBeInTheDocument();
    expect(screen.getByText('Aprovada')).toBeInTheDocument();
    expect(screen.getByText('Recusada')).toBeInTheDocument();
    expect(screen.getByText('Retirada')).toBeInTheDocument();
  });

  it('mostra as decididas mesmo quando não há nenhuma PENDING (o modo Revisar cai no fim de fila)', () => {
    renderStory([
      makeApplication('b', { status: 'APPROVED', name: 'Bia Aprovada' }),
      makeApplication('c', { status: 'REJECTED', name: 'Cris Recusada' }),
    ]);

    // modo Revisar (default) não tem o que revisar
    expect(screen.getByText(/fila em dia/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(screen.getByText('Bia Aprovada')).toBeInTheDocument();
    expect(screen.getByText('Cris Recusada')).toBeInTheDocument();
  });

  it('estado vazio quando a campanha não tem candidatura nenhuma', () => {
    renderStory([]);

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(screen.getByText(/nenhuma candidatura/i)).toBeInTheDocument();
  });

  it('tocar numa linha abre o detalhe da candidatura, sem sair da revisão', () => {
    const onExit = vi.fn();
    renderStory(mix(), { onExit });

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.click(screen.getByText('Bia Aprovada'));

    // detalhe: métricas de IG da creator
    expect(screen.getByText(/seguidores/i)).toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('detalhe de candidatura já decidida não oferece Aprovar/Descartar', () => {
    renderStory(mix());

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.click(screen.getByText('Bia Aprovada'));

    expect(screen.queryByRole('button', { name: /aprovar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descartar/i })).not.toBeInTheDocument();
  });

  it('detalhe de candidatura PENDENTE em "Todas" ainda decide', () => {
    const approve = makeMutation({ mutate: vi.fn() });
    renderStory(mix(), { approve });

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.click(screen.getByText('Ana Pendente'));
    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));

    expect(approve.mutate).toHaveBeenCalledWith('a');
  });

  it('"Voltar" no detalhe retorna à lista, não sai da revisão', () => {
    const onExit = vi.fn();
    renderStory(mix(), { onExit });

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.click(screen.getByText('Cris Recusada'));
    fireEvent.click(screen.getByRole('button', { name: /voltar à lista/i }));

    expect(screen.getByText('Ana Pendente')).toBeInTheDocument();
    expect(screen.getByText('Bia Aprovada')).toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('alterna de volta pra "Revisar" e volta ao Story da fila pendente', () => {
    renderStory(mix());

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar' }));

    expect(screen.getByText('Ana Pendente')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});

describe('CampaignPipelineMobileStory — saída', () => {
  it('"Fechar revisão" chama onExit e não navega de rota', () => {
    const onExit = vi.fn();
    renderStory([makeApplication('a')], { onExit });

    fireEvent.click(screen.getByLabelText('Fechar revisão'));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('"Voltar para a campanha" no fim de fila também usa onExit', () => {
    const onExit = vi.fn();
    renderStory([], { onExit });

    fireEvent.click(screen.getByRole('button', { name: /voltar para a campanha/i }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
