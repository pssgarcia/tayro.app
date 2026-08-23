/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CampaignForm é compartilhado por "Novo programa" e "Editar programa". As
 * specs das duas telas cobrem a fiação (prefill, navegação, gate de DRAFT);
 * aqui o alvo é o formulário em si: conversão de dinheiro, campos que mudam
 * com o tipo de oferta, e a prévia — que é o que a marca lê pra decidir o que
 * está oferecendo antes de publicar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignForm from './CampaignForm';
import type { CampaignFormValues } from './campaignFormSchema';
import type { CreateCampaignPayload } from '../../hooks/useCampaigns';

const baseValues: CampaignFormValues = {
  title: 'Campanha Verão',
  description: 'Conteúdo de treino com o produto',
  briefUrl: '',
  niches: ['fitness'],
  maxSpots: 5,
  deadline: '',
  offerType: 'CASH',
  offerAmountBRL: 300,
  offerDeadlineDays: 15,
  offerDescription: '',
  offerCommissionPercent: undefined,
};

let onSubmit: Mock<(payload: CreateCampaignPayload) => Promise<void>>;
let onCancel: Mock<() => void>;

function renderForm(overrides: Partial<CampaignFormValues> | null = {}, props: any = {}) {
  return render(
    <CampaignForm
      defaultValues={overrides === null ? undefined : { ...baseValues, ...overrides }}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isPending={props.isPending ?? false}
      submitLabel={props.submitLabel ?? 'Salvar rascunho'}
      pendingLabel={props.pendingLabel ?? 'Salvando…'}
      errorMessage={props.errorMessage ?? null}
    />,
  );
}

/** A prévia da oferta vive dentro da placa "O que você recebe". */
const previa = () =>
  screen.getByText(/o que você recebe/i).parentElement as HTMLElement;

beforeEach(() => {
  onSubmit = vi.fn().mockResolvedValue(undefined);
  onCancel = vi.fn();
  vi.clearAllMocks();
});

describe('CampaignForm — campos por tipo de oferta', () => {
  it('em CASH pede valor em reais', () => {
    renderForm({ offerType: 'CASH' });

    expect(screen.getByLabelText(/valor \(r\$\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/descrição do produto/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/comissão/i)).not.toBeInTheDocument();
  });

  it('em PRODUCT pede descrição do produto', () => {
    renderForm({ offerType: 'PRODUCT' });

    expect(screen.getByLabelText(/descrição do produto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/valor \(r\$\)/i)).not.toBeInTheDocument();
  });

  it('em COMMISSION pede o percentual', () => {
    renderForm({ offerType: 'COMMISSION' });

    expect(screen.getByLabelText(/comissão/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/valor \(r\$\)/i)).not.toBeInTheDocument();
  });

  // O rótulo do prazo é derivado do tipo de oferta — produto se envia,
  // dinheiro se paga. Hardcodar um dos dois mentiria pra metade das campanhas.
  it('o prazo fala em envio para produto e em pagamento para dinheiro', () => {
    const { unmount } = renderForm({ offerType: 'PRODUCT' });
    expect(screen.getByLabelText(/prazo p\/ envio/i)).toBeInTheDocument();
    unmount();

    renderForm({ offerType: 'CASH' });
    expect(screen.getByLabelText(/prazo p\/ pagamento/i)).toBeInTheDocument();
  });

  it('troca os campos ao mudar o tipo de oferta', async () => {
    const user = userEvent.setup();
    renderForm({ offerType: 'CASH' });

    await user.click(screen.getByRole('button', { name: /produto/i }));

    expect(await screen.findByLabelText(/descrição do produto/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/valor \(r\$\)/i)).not.toBeInTheDocument();
  });
});

describe('CampaignForm — prévia da oferta', () => {
  it('mostra o valor em reais formatado', () => {
    renderForm({ offerType: 'CASH', offerAmountBRL: 300 });

    expect(within(previa()).getByText(/R\$\s?300,00/)).toBeInTheDocument();
  });

  it('mostra o percentual de comissão por extenso', () => {
    renderForm({ offerType: 'COMMISSION', offerCommissionPercent: 10 });

    expect(within(previa()).getByText('10% por venda')).toBeInTheDocument();
  });

  it('mostra a descrição do produto', () => {
    renderForm({ offerType: 'PRODUCT', offerDescription: 'Kit Whey 900g' });

    expect(within(previa()).getByText('Kit Whey 900g')).toBeInTheDocument();
  });

  // Formulário vazio: oferta, prazo e vagas viram travessão — a prévia não
  // pode sugerir um valor que a marca não digitou.
  it('mostra travessão enquanto a oferta não foi preenchida', () => {
    renderForm(null);

    expect(within(previa()).getAllByText('—').length).toBeGreaterThan(0);
    expect(within(previa()).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(previa()).queryByText(/por venda/)).not.toBeInTheDocument();
  });

  it('acompanha o que a marca digita, antes de salvar', async () => {
    const user = userEvent.setup();
    renderForm({ offerType: 'CASH', offerAmountBRL: undefined });

    await user.type(screen.getByLabelText(/valor \(r\$\)/i), '450');

    await waitFor(() =>
      expect(within(previa()).getByText(/R\$\s?450,00/)).toBeInTheDocument(),
    );
  });

  it('a legenda da prévia muda com o tipo de oferta', () => {
    const { unmount } = renderForm({ offerType: 'PRODUCT' });
    expect(screen.getByText(/produto enviado para você/i)).toBeInTheDocument();
    unmount();

    renderForm({ offerType: 'CASH' });
    expect(screen.getByText(/por candidatura aprovada/i)).toBeInTheDocument();
  });
});

describe('CampaignForm — envio', () => {
  // Dinheiro é SEMPRE centavos na API (decisão de domínio). A tela fala em
  // reais; converter errado aqui multiplica ou divide a oferta por 100.
  it('converte reais para centavos no payload', async () => {
    const user = userEvent.setup();
    renderForm({ offerType: 'CASH', offerAmountBRL: 300 });

    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      title: 'Campanha Verão',
      offerType: 'CASH',
      offerAmount: 30_000,
      maxSpots: 5,
    });
  });

  it('usa os rótulos de ação que a tela passar', () => {
    renderForm({}, { submitLabel: 'Salvar alterações' });

    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it('mostra o rótulo de espera e bloqueia o botão enquanto salva', () => {
    renderForm({}, { isPending: true, pendingLabel: 'Salvando…' });

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
  });

  it('mostra a mensagem de erro vinda da tela', () => {
    renderForm({}, { errorMessage: 'Prazo não pode estar no passado' });

    expect(screen.getByText(/prazo não pode estar no passado/i)).toBeInTheDocument();
  });

  it('cancelar não envia nada', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('não envia sem título', async () => {
    const user = userEvent.setup();
    renderForm({ title: '' });

    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => expect(screen.getByLabelText(/título/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // O handleSubmit do RHF re-lança o que o handler jogar: sem o catch interno,
  // uma mutation que falha vira unhandled rejection no browser.
  it('não estoura quando a mutation rejeita — a tela mostra o erro por props', async () => {
    const user = userEvent.setup();
    onSubmit.mockRejectedValue(new Error('500'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    renderForm();

    await user.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /salvar rascunho/i })).toBeEnabled();
  });
});
