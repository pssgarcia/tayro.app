/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignResultsTab from './CampaignResultsTab';
import * as hooks from '../../hooks/usePartnershipResults';
import type { CampaignPartnership } from '../../types/api';

vi.mock('../../hooks/usePartnershipResults', async (importOriginal) => {
  const actual = await importOriginal<typeof hooks>();
  return {
    ...actual,
    useCampaignPartnerships: vi.fn(),
    useCreatePartnershipResult: vi.fn(),
    useUpdatePartnershipResult: vi.fn(),
    useDeletePartnershipResult: vi.fn(),
  };
});

const influencer = {
  id: 'inf-1',
  name: 'Ana Creator',
  avatarUrl: null,
  instagramHandle: 'ana.creator',
  igProfilePicUrl: null,
};

const semResultado: CampaignPartnership = {
  applicationId: 'app-1',
  reviewedAt: '2026-09-01T10:00:00.000Z',
  influencer,
  result: null,
};

const comResultado: CampaignPartnership = {
  applicationId: 'app-2',
  reviewedAt: '2026-08-30T10:00:00.000Z',
  influencer: { ...influencer, id: 'inf-2', name: 'Bia Runner', instagramHandle: 'bia' },
  result: {
    id: 'res-1',
    applicationId: 'app-2',
    reach: 12400,
    impressions: null,
    couponsUsed: 37,
    note: 'Melhor entrega da campanha.',
    brandAllowsPublic: false,
    hiddenByCreator: false,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
};

const mutations = {
  create: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null },
  update: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null },
  remove: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
};

function mockHooks(partnerships: CampaignPartnership[] = []) {
  vi.mocked(hooks.useCampaignPartnerships).mockReturnValue({
    data: partnerships,
    isLoading: false,
  } as any);
  vi.mocked(hooks.useCreatePartnershipResult).mockReturnValue(mutations.create as any);
  vi.mocked(hooks.useUpdatePartnershipResult).mockReturnValue(mutations.update as any);
  vi.mocked(hooks.useDeletePartnershipResult).mockReturnValue(mutations.remove as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHooks();
});

describe('CampaignResultsTab', () => {
  it('sem parceria aprovada, aponta pra Fila em vez de oferecer registro', () => {
    render(<CampaignResultsTab campaignId="camp-1" />);

    expect(screen.getByText(/nenhuma parceria aprovada ainda/i)).toBeInTheDocument();
    expect(screen.getByText(/aprovar uma candidatura na fila/i)).toBeInTheDocument();
  });

  it('lista toda parceria aprovada, com e sem resultado', () => {
    mockHooks([semResultado, comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    const lista = within(screen.getByRole('list', { name: 'Parcerias' }));
    expect(lista.getByText('Ana Creator')).toBeInTheDocument();
    expect(lista.getByText('Bia Runner')).toBeInTheDocument();
    expect(lista.getByText('A informar')).toBeInTheDocument();
    expect(lista.getByText('Informado')).toBeInTheDocument();
  });

  // A honestidade sobre a origem do número é requisito (vision.md nº 5), não
  // copy decorativa: quem digita precisa saber que o tayro não mediu isso.
  it('diz que o número é informado pela marca, não medido pelo produto', () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    expect(screen.getByText(/o tayro não mede alcance/i)).toBeInTheDocument();
    expect(screen.getByText(/informado por você em/i)).toBeInTheDocument();
  });

  it('mostra na placa só as métricas informadas', () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    expect(screen.getByText('Alcance')).toBeInTheDocument();
    expect(screen.getByText('12,4')).toBeInTheDocument();
    expect(screen.getByText('Cupons usados')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
    // `impressions` é null neste resultado — não vira um "0" nem um "—".
    expect(screen.queryByText('Impressões')).not.toBeInTheDocument();
  });

  it('mostra a observação que a creator vai ler', () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    expect(screen.getByText('Melhor entrega da campanha.')).toBeInTheDocument();
  });

  it('diz que o resultado não liberado não aparece no perfil dela', () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    expect(screen.getByText(/não aparece\. só ela vê/i)).toBeInTheDocument();
  });

  it('quando a creator escondeu, a marca vê que a escolha foi dela', () => {
    mockHooks([
      {
        ...comResultado,
        result: { ...comResultado.result!, brandAllowsPublic: true, hiddenByCreator: true },
      },
    ]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    expect(
      screen.getByText(/liberado por você, mas ela escolheu não mostrar/i),
    ).toBeInTheDocument();
  });

  it('filtra por parceria a informar', async () => {
    mockHooks([semResultado, comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    // Pelo grupo de filtros: a linha da lista também é um botão e o nome
    // acessível dela contém o status "A informar".
    const filtros = within(screen.getByRole('group', { name: 'Filtrar parcerias' }));
    await userEvent.click(filtros.getByRole('button', { name: /a informar/i }));

    const lista = within(screen.getByRole('list', { name: 'Parcerias' }));
    expect(lista.getByText('Ana Creator')).toBeInTheDocument();
    expect(lista.queryByText('Bia Runner')).not.toBeInTheDocument();
  });

  // ─── Registro ─────────────────────────────────────────────────────────────

  it('registra o resultado com os números digitados', async () => {
    mockHooks([semResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));

    const modal = within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Alcance'), { target: { value: '12400' } });
    fireEvent.change(modal.getByLabelText('Cupons usados'), { target: { value: '37' } });
    fireEvent.change(modal.getByLabelText('Observação (opcional)'), {
      target: { value: 'Ótima entrega' },
    });
    await userEvent.click(modal.getByRole('button', { name: 'Salvar' }));

    expect(mutations.create.mutate).toHaveBeenCalledWith(
      {
        applicationId: 'app-1',
        reach: 12400,
        impressions: null,
        couponsUsed: 37,
        note: 'Ótima entrega',
        brandAllowsPublic: false,
      },
      expect.anything(),
    );
  });

  it('campo numérico vazio vira ausência de informação, não zero', async () => {
    mockHooks([semResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));
    const modal = within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Alcance'), { target: { value: '900' } });
    await userEvent.click(modal.getByRole('button', { name: 'Salvar' }));

    expect(mutations.create.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ reach: 900, impressions: null, couponsUsed: null }),
      expect.anything(),
    );
  });

  it('não deixa salvar registro vazio — mesma regra da API', async () => {
    mockHooks([semResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));

    const modal = within(screen.getByRole('dialog'));
    expect(modal.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await userEvent.click(modal.getByRole('button', { name: 'Salvar' }));
    expect(mutations.create.mutate).not.toHaveBeenCalled();
  });

  // Publicar é escolha ativa: o padrão do formulário tem que ser "não publica".
  it('o consentimento de publicar nasce desligado', async () => {
    mockHooks([semResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));

    const toggle = within(screen.getByRole('dialog')).getByRole('switch', {
      name: /pode aparecer no perfil público dela/i,
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('registra com consentimento quando a marca liga o interruptor', async () => {
    mockHooks([semResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));
    const modal = within(screen.getByRole('dialog'));
    fireEvent.change(modal.getByLabelText('Alcance'), { target: { value: '12400' } });
    await userEvent.click(modal.getByRole('switch'));
    await userEvent.click(modal.getByRole('button', { name: 'Salvar' }));

    expect(mutations.create.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ brandAllowsPublic: true }),
      expect.anything(),
    );
  });

  it('avisa que a observação é lida pela creator', async () => {
    mockHooks([semResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));

    expect(screen.getByText(/ela vê esta observação/i)).toBeInTheDocument();
  });

  // ─── Edição ───────────────────────────────────────────────────────────────

  it('edição abre com os valores já informados e usa update, não create', async () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const modal = within(screen.getByRole('dialog'));
    expect(modal.getByLabelText('Alcance')).toHaveValue('12400');
    expect(modal.getByLabelText('Cupons usados')).toHaveValue('37');

    fireEvent.change(modal.getByLabelText('Alcance'), { target: { value: '15000' } });
    await userEvent.click(modal.getByRole('button', { name: 'Salvar' }));

    expect(mutations.update.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'res-1', reach: 15000 }),
      expect.anything(),
    );
    expect(mutations.create.mutate).not.toHaveBeenCalled();
  });

  it('mostra a mensagem de erro da API sem fechar o formulário', async () => {
    mockHooks([semResultado]);
    vi.mocked(hooks.useCreatePartnershipResult).mockReturnValue({
      ...mutations.create,
      error: {
        isAxiosError: true,
        response: { data: { message: 'Esta parceria já tem resultado registrado' } },
      },
    } as any);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: /informar resultado/i }));

    expect(
      screen.getByText(/esta parceria já tem resultado registrado/i),
    ).toBeInTheDocument();
  });

  // ─── Remoção ──────────────────────────────────────────────────────────────

  it('confirmação de apagar diz a consequência pra creator, não "tem certeza?"', async () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    const modal = within(screen.getByRole('dialog', { name: /apagar este resultado/i }));
    expect(modal.getByText(/sai do registro dela/i)).toBeInTheDocument();
    expect(modal.getByText(/ela já foi avisada/i)).toBeInTheDocument();
  });

  it('avisa que sai também do perfil público quando estava publicado', async () => {
    mockHooks([
      {
        ...comResultado,
        result: { ...comResultado.result!, brandAllowsPublic: true },
      },
    ]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));

    expect(
      screen.getByText(/e do perfil público dela/i),
    ).toBeInTheDocument();
  });

  it('apaga o resultado selecionado', async () => {
    mockHooks([comResultado]);
    render(<CampaignResultsTab campaignId="camp-1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Apagar' }),
    );

    expect(mutations.remove.mutate).toHaveBeenCalledWith('res-1', expect.anything());
  });
});
