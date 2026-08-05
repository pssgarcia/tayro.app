/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyApplicationsPage from './MyApplicationsPage';
import * as hooks from '../../hooks/useMyApplications';
import * as submissionHooks from '../../hooks/useMySubmissions';
import type { MyApplication } from '../../types/api';

vi.mock('../../hooks/useMyApplications', () => ({
  useMyApplications: vi.fn(),
  useWithdrawApplication: vi.fn(),
  myApplicationKeys: { all: ['applications', 'mine'] },
}));

vi.mock('../../hooks/useMySubmissions', () => ({
  useMySubmissions: vi.fn(),
  mySubmissionKeys: { all: ['submissions', 'mine'] },
}));

const baseApp: MyApplication = {
  id: 'app-1',
  campaignId: 'camp-1',
  status: 'PENDING',
  message: null,
  appliedAt: '2026-06-10T10:00:00.000Z',
  reviewedAt: null,
  campaign: {
    title: 'Programa Verão',
    status: 'ACTIVE',
    deadline: '2026-07-15T00:00:00.000Z',
    offerType: 'CASH',
    offerAmount: 30_000,
    offerDeadlineDays: 30,
    offerDescription: null,
    brand: { name: 'Marca Fit', logoUrl: null },
  },
};

const withdrawMutate = vi.fn();

function mockHooks(apps: MyApplication[] = []) {
  vi.mocked(hooks.useMyApplications).mockReturnValue({
    data: apps,
    isLoading: false,
    isError: false,
  } as any);
  vi.mocked(hooks.useWithdrawApplication).mockReturnValue({
    mutate: withdrawMutate,
    isPending: false,
    variables: undefined,
  } as any);
  vi.mocked(submissionHooks.useMySubmissions).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
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
    expect(
      screen.getByText(/você ainda não se candidatou a nenhum programa/i),
    ).toBeInTheDocument();
  });

  it('renderiza a placa em destaque com programa, marca e oferta', () => {
    mockHooks([baseApp]);
    const { container } = renderPage();
    expect(screen.getAllByText('Programa Verão').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Marca Fit').length).toBeGreaterThan(0);
    // oferta na placa é em reais inteiros, sem centavos (R$ 300, não R$ 300,00)
    expect(container.textContent).toContain('R$ 300');
    expect(container.textContent).not.toContain('300,00');
  });

  it('candidatura PENDING sem conteúdo vira a placa em destaque com "Retirar candidatura"', () => {
    mockHooks([baseApp]);
    renderPage();
    expect(
      screen.getByRole('button', { name: /retirar candidatura/i }),
    ).toBeInTheDocument();
  });

  it('candidatura APPROVED sem conteúdo enviado vira a placa com "Enviar conteúdo", não "Retirar"', () => {
    mockHooks([{ ...baseApp, status: 'APPROVED' }]);
    renderPage();
    expect(
      screen.queryByRole('button', { name: /retirar candidatura/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/enviar conteúdo/i)).toBeInTheDocument();
  });

  it('clicar em retirar chama o withdraw com o id da candidatura em destaque', () => {
    mockHooks([baseApp]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));
    expect(withdrawMutate).toHaveBeenCalledWith('app-1');
  });

  it('filtra a lista de "Registro" por status pelas abas — a placa em destaque não filtra', () => {
    const approved: MyApplication = {
      ...baseApp,
      id: 'app-2',
      status: 'APPROVED',
      campaign: { ...baseApp.campaign, title: 'Programa Inverno' },
    };
    // Cascata da placa prioriza APPROVED sem conteúdo sobre PENDING — então
    // app-2 (Programa Inverno) é a placa em destaque aqui, e também aparece
    // de novo na lista "Todas". app-1 (Programa Verão, PENDING) só está na lista.
    mockHooks([baseApp, approved]);
    renderPage();

    expect(screen.getAllByText('Programa Verão')).toHaveLength(1);
    expect(screen.getAllByText('Programa Inverno')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /^fechadas$/i }));

    // filtrado pra Fechadas (APPROVED): Programa Verão (PENDING) some de vez;
    // Programa Inverno continua aparecendo duas vezes (placa + lista, as duas
    // já eram APPROVED).
    expect(screen.queryByText('Programa Verão')).not.toBeInTheDocument();
    expect(screen.getAllByText('Programa Inverno')).toHaveLength(2);
  });
});
