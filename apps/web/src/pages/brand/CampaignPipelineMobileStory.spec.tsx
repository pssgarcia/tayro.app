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
  const mutationComSucesso = () =>
    makeMutation({
      mutate: vi.fn((_id: string, opts?: { onSuccess?: () => void }) =>
        opts?.onSuccess?.(),
      ),
    });

  /** No fim de fila, o número fica no irmão anterior ao rótulo. */
  const contador = (rotulo: string) =>
    screen.getByText(rotulo).previousElementSibling;

  it('aprova a candidatura atual e conta no resumo do fim de fila', () => {
    const approve = mutationComSucesso();
    renderStory([makeApplication('a', { name: 'Ana' })], { approve });

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));
    expect(approve.mutate).toHaveBeenCalledWith('a', expect.anything());

    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    expect(contador('Aprovadas')).toHaveTextContent('1');
  });

  it('não conta no tally quando a decisão não confirma no servidor', () => {
    const approve = makeMutation({ mutate: vi.fn() }); // nunca chama onSuccess
    renderStory([makeApplication('a')], { approve });

    fireEvent.click(screen.getByRole('button', { name: /aprovar/i }));
    fireEvent.click(screen.getByLabelText('Próximo candidato'));

    expect(contador('Aprovadas')).toHaveTextContent('0');
  });

  it('descarta a candidatura atual e conta como recusada', () => {
    const reject = mutationComSucesso();
    renderStory([makeApplication('a')], { reject });

    fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
    expect(reject.mutate).toHaveBeenCalledWith('a', expect.anything());

    fireEvent.click(screen.getByLabelText('Próximo candidato'));
    expect(contador('Recusadas')).toHaveTextContent('1');
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
