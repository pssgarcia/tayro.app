/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PartnershipResultsSection from './PartnershipResultsSection';
import * as hooks from '../../hooks/usePartnershipResults';
import type { MyPartnershipResult } from '../../types/api';

vi.mock('../../hooks/usePartnershipResults', () => ({
  useSetResultVisibility: vi.fn(),
}));

const baseResult: MyPartnershipResult = {
  id: 'res-1',
  applicationId: 'app-1',
  campaignId: 'camp-1',
  campaignTitle: 'Campanha de Verão',
  brandName: 'Lilo Suplementos',
  reach: 12400,
  impressions: null,
  couponsUsed: 37,
  note: 'Melhor entrega da campanha.',
  brandAllowsPublic: true,
  hiddenByCreator: false,
  createdAt: '2026-09-01T10:00:00.000Z',
};

const mutate = vi.fn();

function mockVisibility(state: Record<string, unknown> = {}) {
  vi.mocked(hooks.useSetResultVisibility).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
    ...state,
  } as any);
}

function renderSection(
  results: MyPartnershipResult[],
  publicProfileEnabled = true,
) {
  return render(
    <MemoryRouter>
      <PartnershipResultsSection
        results={results}
        publicProfileEnabled={publicProfileEnabled}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVisibility();
});

describe('PartnershipResultsSection', () => {
  it('não renderiza nada sem resultado, sem deixar cabeçalho órfão na tela', () => {
    const { container } = renderSection([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra marca, campanha e as métricas informadas', () => {
    renderSection([baseResult]);

    expect(screen.getByText('Lilo Suplementos')).toBeInTheDocument();
    expect(screen.getByText('Campanha de Verão')).toBeInTheDocument();
    expect(screen.getByText('Alcance')).toBeInTheDocument();
    expect(screen.getByText('12,4')).toBeInTheDocument();
    expect(screen.getByText('Cupons usados')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
  });

  it('não inventa métrica que a marca não informou', () => {
    renderSection([baseResult]);
    expect(screen.queryByText('Impressões')).not.toBeInTheDocument();
  });

  it('atribui o número a quem informou: número sem autor não é histórico', () => {
    renderSection([baseResult]);
    expect(
      screen.getByText(/informado por lilo suplementos em/i),
    ).toBeInTheDocument();
  });

  it('mostra a observação que a marca escreveu pra ela', () => {
    renderSection([baseResult]);
    expect(screen.getByText('Melhor entrega da campanha.')).toBeInTheDocument();
  });

  it('conta quantos resultados ela já tem', () => {
    renderSection([baseResult, { ...baseResult, id: 'res-2' }]);
    const secao = within(
      screen.getByRole('region', { name: /resultados das parcerias/i }),
    );
    expect(secao.getByText('2')).toBeInTheDocument();
  });

  // ─── Transparência dos dois lados ─────────────────────────────────────────

  it('resultado não liberado pela marca ainda é mostrado a ela, com o motivo', () => {
    renderSection([{ ...baseResult, brandAllowsPublic: false }]);

    expect(screen.getByText('12,4')).toBeInTheDocument();
    expect(
      screen.getByText(/não liberou este resultado para o seu perfil público/i),
    ).toBeInTheDocument();
    // Sem ação: não há o que ligar, e um botão inerte seria pior.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  // ─── Controle da vitrine ──────────────────────────────────────────────────

  it('esconde do próprio perfil', async () => {
    renderSection([baseResult]);

    expect(screen.getByText(/aparece no seu perfil público/i)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /ocultar do meu perfil/i }),
    );

    expect(mutate).toHaveBeenCalledWith({ id: 'res-1', hidden: true });
  });

  it('mostra de novo o que estava escondido', async () => {
    renderSection([{ ...baseResult, hiddenByCreator: true }]);

    expect(
      screen.getByText(/escondido do seu perfil público/i),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /mostrar no meu perfil/i }),
    );

    expect(mutate).toHaveBeenCalledWith({ id: 'res-1', hidden: false });
  });

  it('trava o botão enquanto salva', () => {
    mockVisibility({ isPending: true });
    renderSection([baseResult]);

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
  });

  it('avisa quando não deu pra salvar', () => {
    mockVisibility({ isError: true });
    renderSection([baseResult]);

    expect(screen.getByText(/não foi possível salvar/i)).toBeInTheDocument();
  });

  // ─── A guarda contra promessa falsa ───────────────────────────────────────
  // Com o perfil público desligado, /c/:handle é 404 pra qualquer visitante —
  // dizer "aparece no seu perfil" ali seria mentira.

  it('com perfil público desligado, diz que ninguém vê e aponta o caminho', () => {
    renderSection([baseResult], false);

    expect(
      screen.getByText(/seu perfil público está desligado/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ligar no perfil/i })).toHaveAttribute(
      'href',
      '/influencer/profile',
    );
  });

  // A regressão que os testes anteriores não pegavam: cada frase era afirmada
  // isolada, e as duas passaram a aparecer JUNTAS na tela, dizendo o oposto uma
  // da outra ("Aparece no seu perfil público." + "ninguém vê este resultado").
  it('nunca diz que aparece e que ninguém vê ao mesmo tempo', () => {
    renderSection([baseResult], false);

    expect(screen.getByText(/ninguém vê este resultado ainda/i)).toBeInTheDocument();
    expect(screen.queryByText('Aparece no seu perfil público.')).not.toBeInTheDocument();
  });

  it('não avisa nada quando o perfil público está ligado', () => {
    renderSection([baseResult], true);

    expect(
      screen.queryByText(/seu perfil público está desligado/i),
    ).not.toBeInTheDocument();
  });

  // O aviso é sobre a vitrine: se a própria creator escondeu o item, o estado
  // do perfil público não muda nada pra ele.
  it('não avisa do perfil desligado num resultado que ela mesma escondeu', () => {
    renderSection([{ ...baseResult, hiddenByCreator: true }], false);

    expect(
      screen.queryByText(/seu perfil público está desligado/i),
    ).not.toBeInTheDocument();
  });
});
