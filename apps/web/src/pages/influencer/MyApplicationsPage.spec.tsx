/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyApplicationsPage from './MyApplicationsPage';
import * as hooks from '../../hooks/useMyApplications';
import type { MyApplication } from '../../types/api';

vi.mock('../../hooks/useMyApplications', () => ({
  useMyApplications: vi.fn(),
  useWithdrawApplication: vi.fn(),
  myApplicationKeys: { all: ['applications', 'mine'] },
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

  it('renderiza card com programa, marca e oferta', () => {
    mockHooks([baseApp]);
    renderPage();
    expect(screen.getByText('Programa Verão')).toBeInTheDocument();
    expect(screen.getByText('Marca Fit')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?300,00/)).toBeInTheDocument();
  });

  it('mostra retirar candidatura só em PENDING', () => {
    mockHooks([baseApp]);
    renderPage();
    expect(
      screen.getByRole('button', { name: /retirar candidatura/i }),
    ).toBeInTheDocument();
  });

  it('não mostra retirar em candidatura APPROVED', () => {
    mockHooks([{ ...baseApp, status: 'APPROVED' }]);
    renderPage();
    expect(
      screen.queryByRole('button', { name: /retirar candidatura/i }),
    ).not.toBeInTheDocument();
  });

  it('clicar em retirar chama o withdraw', () => {
    mockHooks([baseApp]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /retirar candidatura/i }));
    expect(withdrawMutate).toHaveBeenCalledWith('app-1');
  });

  it('filtra candidaturas por status', () => {
    const approved: MyApplication = {
      ...baseApp,
      id: 'app-2',
      status: 'APPROVED',
      campaign: { ...baseApp.campaign, title: 'Programa Inverno' },
    };
    mockHooks([baseApp, approved]);
    renderPage();

    expect(screen.getByText('Programa Verão')).toBeInTheDocument();
    expect(screen.getByText('Programa Inverno')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^aprovadas$/i }));
    expect(screen.queryByText('Programa Verão')).not.toBeInTheDocument();
    expect(screen.getByText('Programa Inverno')).toBeInTheDocument();
  });
});
