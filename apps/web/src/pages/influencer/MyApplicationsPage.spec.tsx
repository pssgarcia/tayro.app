/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyApplicationsPage from './MyApplicationsPage';
import * as hooks from '../../hooks/useMyApplications';
import * as submissionHooks from '../../hooks/useMySubmissions';
import * as partnershipHooks from '../../hooks/usePartnershipResults';
import * as profileHooks from '../../hooks/useInfluencerProfile';
import type { MyApplication, MyPartnershipResult } from '../../types/api';

vi.mock('../../hooks/useMyApplications', () => ({
  useMyApplications: vi.fn(),
  useWithdrawApplication: vi.fn(),
  myApplicationKeys: { all: ['applications', 'mine'] },
}));

vi.mock('../../hooks/useMySubmissions', () => ({
  useMySubmissions: vi.fn(),
  mySubmissionKeys: { all: ['submissions', 'mine'] },
}));

vi.mock('../../hooks/usePartnershipResults', () => ({
  useMyPartnershipResults: vi.fn(),
  useSetResultVisibility: vi.fn(),
  partnershipKeys: { mine: ['partnership-results', 'mine'] },
}));

vi.mock('../../hooks/useInfluencerProfile', () => ({
  useInfluencerProfile: vi.fn(),
  influencerProfileKeys: { me: ['influencer', 'profile'] },
}));

const baseResult: MyPartnershipResult = {
  id: 'res-1',
  applicationId: 'app-1',
  campaignId: 'camp-1',
  campaignTitle: 'Campanha Verão',
  brandName: 'Marca Fit',
  reach: 12400,
  impressions: null,
  couponsUsed: 37,
  note: 'Melhor entrega da campanha.',
  brandAllowsPublic: true,
  hiddenByCreator: false,
  createdAt: '2026-09-01T10:00:00.000Z',
};

const baseApp: MyApplication = {
  id: 'app-1',
  campaignId: 'camp-1',
  status: 'PENDING',
  message: null,
  appliedAt: '2026-06-10T10:00:00.000Z',
  reviewedAt: null,
  campaign: {
    title: 'Campanha Verão',
    status: 'ACTIVE',
    deadline: '2026-07-15T00:00:00.000Z',
    offerType: 'CASH',
    offerAmount: 30_000,
    offerDeadlineDays: 30,
    offerDescription: null,
    offerCommissionPercent: null,
    brand: { name: 'Marca Fit', logoUrl: null },
  },
};

const withdrawMutate = vi.fn();

const setVisibilityMutate = vi.fn();

function mockHooks(
  apps: MyApplication[] = [],
  withdrawState: Record<string, unknown> = {},
  results: MyPartnershipResult[] = [],
  publicProfileEnabled = true,
) {
  vi.mocked(hooks.useMyApplications).mockReturnValue({
    data: apps,
    isLoading: false,
    isError: false,
  } as any);
  vi.mocked(hooks.useWithdrawApplication).mockReturnValue({
    mutate: withdrawMutate,
    isPending: false,
    isError: false,
    variables: undefined,
    ...withdrawState,
  } as any);
  vi.mocked(submissionHooks.useMySubmissions).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  } as any);
  vi.mocked(partnershipHooks.useMyPartnershipResults).mockReturnValue({
    data: results,
    isLoading: false,
    isError: false,
  } as any);
  vi.mocked(partnershipHooks.useSetResultVisibility).mockReturnValue({
    mutate: setVisibilityMutate,
    isPending: false,
    isError: false,
  } as any);
  vi.mocked(profileHooks.useInfluencerProfile).mockReturnValue({
    data: { publicProfileEnabled },
    isLoading: false,
  } as any);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyApplicationsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  withdrawMutate.mockReset();
  mockHooks();
});

describe('MyApplicationsPage', () => {
  it('mostra empty state sem candidaturas', () => {
    renderPage();
    expect(screen.getByText(/você ainda não se candidatou a nenhuma campanha/i)).toBeInTheDocument();
  });

  it('renderiza a placa em destaque com campanha, marca e oferta', () => {
    mockHooks([baseApp]);
    const { container } = renderPage();
    expect(screen.getAllByText('Campanha Verão').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Marca Fit').length).toBeGreaterThan(0);
    // oferta na placa é em reais inteiros, sem centavos (R$ 300, não R$ 300,00)
    expect(container.textContent).toContain('R$ 300');
    expect(container.textContent).not.toContain('300,00');
  });

  it('candidatura PENDING sem conteúdo vira a placa em destaque com "Retirar candidatura"', () => {
    mockHooks([baseApp]);
    renderPage();
    expect(screen.getByRole('button', { name: /retirar candidatura/i })).toBeInTheDocument();
  });

  it('candidatura APPROVED sem conteúdo enviado vira a placa com "Enviar conteúdo", não "Retirar"', () => {
    mockHooks([{ ...baseApp, status: 'APPROVED' }]);
    renderPage();
    expect(screen.queryByRole('button', { name: /retirar candidatura/i })).not.toBeInTheDocument();
    expect(screen.getByText(/enviar conteúdo/i)).toBeInTheDocument();
  });

  // Retirar é definitivo: o unique (campaignId, influencerId) não olha status,
  // então re-candidatar dá 409 mesmo depois de WITHDRAWN. Antes disso a placa
  // em destaque retirava num clique só, sem confirmação.
  it('retirar pede confirmação antes de chamar a mutation', () => {
    mockHooks([baseApp]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(withdrawMutate).not.toHaveBeenCalled();
  });

  it('a confirmação avisa que não dá pra se candidatar de novo', () => {
    mockHooks([baseApp]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));

    expect(
      within(screen.getByRole('dialog')).getByText(/não poderá se candidatar de novo/i),
    ).toBeInTheDocument();
  });

  it('confirmar chama o withdraw com o id da candidatura em destaque', () => {
    mockHooks([baseApp]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^retirar$/i }));

    expect(withdrawMutate).toHaveBeenCalledWith(
      'app-1',
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('cancelar fecha a confirmação sem retirar', () => {
    mockHooks([baseApp]);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(withdrawMutate).not.toHaveBeenCalled();
  });

  it('falha ao retirar mantém a confirmação aberta com o erro', () => {
    mockHooks([baseApp], { isError: true });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/não foi possível retirar/i)).toBeInTheDocument();
  });

  // O furo: as linhas da lista eram <div> inerte, então quem tinha 3 candidaturas
  // PENDING só conseguia retirar a mais recente (a que virava placa em destaque).
  it('qualquer candidatura PENDING da lista pode ser retirada, não só a em destaque', () => {
    const outraPendente: MyApplication = {
      ...baseApp,
      id: 'app-2',
      appliedAt: '2026-06-01T10:00:00.000Z',
      campaign: { ...baseApp.campaign, title: 'Campanha Inverno' },
    };
    mockHooks([baseApp, outraPendente]);
    renderPage();

    // Duas linhas PENDING na lista → duas ações "Retirar" (a placa usa o rótulo
    // longo "Retirar candidatura", então não colide).
    const rowButtons = screen.getAllByRole('button', { name: /^retirar$/i });
    expect(rowButtons).toHaveLength(2);

    fireEvent.click(rowButtons[1]);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^retirar$/i }));

    expect(withdrawMutate).toHaveBeenCalledWith('app-2', expect.anything());
  });

  it('candidatura já decidida não oferece retirar na lista', () => {
    mockHooks([{ ...baseApp, status: 'REJECTED' }]);
    renderPage();

    expect(screen.queryByRole('button', { name: /^retirar$/i })).not.toBeInTheDocument();
  });

  it('filtra a lista de "Registro" por status pelas abas — a placa em destaque não filtra', () => {
    const approved: MyApplication = {
      ...baseApp,
      id: 'app-2',
      status: 'APPROVED',
      campaign: { ...baseApp.campaign, title: 'Campanha Inverno' },
    };
    // Cascata da placa prioriza APPROVED sem conteúdo sobre PENDING — então
    // app-2 (Campanha Inverno) é a placa em destaque aqui, e também aparece
    // de novo na lista "Todas". app-1 (Campanha Verão, PENDING) só está na lista.
    mockHooks([baseApp, approved]);
    renderPage();

    expect(screen.getAllByText('Campanha Verão')).toHaveLength(1);
    expect(screen.getAllByText('Campanha Inverno')).toHaveLength(2);

    // A aba se chamava "Fechadas" até a migração pro Kinetic; virou
    // "Aprovadas" pra falar a mesma palavra que o status da linha ao lado.
    fireEvent.click(screen.getByRole('button', { name: /^aprovadas$/i }));

    // filtrado pra Aprovadas (APPROVED): Campanha Verão (PENDING) some de vez;
    // Campanha Inverno continua aparecendo duas vezes (placa + lista, as duas
    // já eram APPROVED).
    expect(screen.queryByText('Campanha Verão')).not.toBeInTheDocument();
    expect(screen.getAllByText('Campanha Inverno')).toHaveLength(2);
  });
  // ─── Resultados das parcerias (transparência bilateral) ───────────────────

  describe('resultados das parcerias', () => {
    it('não ocupa espaço quando nenhuma marca informou resultado', () => {
      mockHooks([baseApp]);
      renderPage();

      expect(screen.queryByText(/resultados das parcerias/i)).not.toBeInTheDocument();
    });

    it('mostra o que a marca informou, com o nome de quem informou', () => {
      mockHooks([baseApp], {}, [baseResult]);
      renderPage();

      const secao = within(
        screen.getByRole('region', { name: /resultados das parcerias/i }),
      );
      expect(secao.getByText('Marca Fit')).toBeInTheDocument();
      expect(secao.getByText('Alcance')).toBeInTheDocument();
      expect(secao.getByText('12,4')).toBeInTheDocument();
      expect(secao.getByText('Melhor entrega da campanha.')).toBeInTheDocument();
      expect(secao.getByText(/informado por marca fit em/i)).toBeInTheDocument();
    });

    it('a creator vê o resultado mesmo sem a marca ter liberado a vitrine', () => {
      mockHooks([baseApp], {}, [{ ...baseResult, brandAllowsPublic: false }]);
      renderPage();

      expect(screen.getByText('12,4')).toBeInTheDocument();
      // E fica sabendo que existe, mas não é público — os dois lados à vista.
      expect(
        screen.getByText(/não liberou este resultado para o seu perfil público/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /ocultar do meu perfil/i }),
      ).not.toBeInTheDocument();
    });

    it('esconde o resultado do próprio perfil', () => {
      mockHooks([baseApp], {}, [baseResult]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: /ocultar do meu perfil/i }));

      expect(setVisibilityMutate).toHaveBeenCalledWith({ id: 'res-1', hidden: true });
    });

    it('mostra de novo o que estava escondido', () => {
      mockHooks([baseApp], {}, [{ ...baseResult, hiddenByCreator: true }]);
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: /mostrar no meu perfil/i }));

      expect(setVisibilityMutate).toHaveBeenCalledWith({ id: 'res-1', hidden: false });
    });

    // A guarda contra promessa falsa: com o perfil público desligado,
    // /c/:handle é 404 pra qualquer visitante.
    it('avisa quando o perfil público está desligado, em vez de prometer vitrine', () => {
      mockHooks([baseApp], {}, [baseResult], false);
      renderPage();

      expect(screen.getByText(/seu perfil público está desligado/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ligar no perfil/i })).toHaveAttribute(
        'href',
        '/influencer/profile',
      );
    });

    it('não avisa nada disso quando o perfil público está ligado', () => {
      mockHooks([baseApp], {}, [baseResult], true);
      renderPage();

      expect(screen.queryByText(/seu perfil público está desligado/i)).not.toBeInTheDocument();
    });
  });
});
