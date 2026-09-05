import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import LegalAcceptanceFields from './LegalAcceptanceFields';
import { PRIVACY_PATH, TERMS_PATH } from '../../config/legal';

function Harness({
  termsError,
  adultError,
  intro,
  variant,
}: {
  termsError?: string;
  adultError?: string;
  intro?: React.ReactNode;
  variant?: 'dark' | 'plate';
} = {}) {
  const { register } = useForm();
  return (
    <MemoryRouter>
      <LegalAcceptanceFields
        variant={variant}
        termsField={register('acceptedTermsAndPrivacy')}
        adultField={register('declaredAdult')}
        termsError={termsError}
        adultError={adultError}
        intro={intro}
      />
    </MemoryRouter>
  );
}

describe('LegalAcceptanceFields', () => {
  it('as duas caixas nascem DESMARCADAS', () => {
    render(<Harness />);

    expect(
      screen.getByRole('checkbox', { name: /concordo com os termos de uso/i }),
    ).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /18 anos ou mais/i })).not.toBeChecked();
  });

  it('nomeia os dois documentos no texto da caixa de aceite', () => {
    render(<Harness />);

    const caixa = screen.getByRole('checkbox', {
      name: /concordo com os termos de uso/i,
    });
    // O nome acessível da caixa tem que citar os DOIS documentos: é o texto
    // que a pessoa está aceitando.
    expect(caixa).toHaveAccessibleName(/termos de uso/i);
    expect(caixa).toHaveAccessibleName(/política de privacidade/i);
  });

  it('declara maioridade sem pedir data de nascimento', () => {
    render(<Harness />);

    expect(
      screen.getByRole('checkbox', { name: /declaro que tenho 18 anos ou mais/i }),
    ).toBeInTheDocument();
    // Nenhum campo de data: a declaração é o registro, não a data de nascimento.
    expect(screen.queryByLabelText(/nascimento/i)).not.toBeInTheDocument();
  });

  it('linka os dois documentos, em aba nova', () => {
    render(<Harness />);

    const termos = screen.getByRole('link', { name: 'Termos de Uso' });
    const privacidade = screen.getByRole('link', {
      name: 'Política de Privacidade',
    });

    expect(termos).toHaveAttribute('href', TERMS_PATH);
    expect(privacidade).toHaveAttribute('href', PRIVACY_PATH);
    // Aba nova: quem está no meio de um cadastro de 3 passos perde o que
    // digitou se navegar para fora.
    expect(termos).toHaveAttribute('target', '_blank');
    expect(privacidade).toHaveAttribute('target', '_blank');
    expect(termos).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  // MORDEU na conferência visual de 2026-09-04: a 1ª versão tinha o <label>
  // envolvendo a frase inteira, então clicar em "Termos de Uso" para LER o
  // documento também marcava a caixa de aceite. Registrar aceite de quem só
  // quis abrir o documento é exatamente o que este mecanismo não pode fazer.
  it('clicar no link do documento NÃO marca a caixa de aceite', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const caixa = screen.getByRole('checkbox', {
      name: /concordo com os termos de uso/i,
    });
    await user.click(screen.getByRole('link', { name: 'Termos de Uso' }));

    expect(caixa).not.toBeChecked();
  });

  it('clicar na caixa desenhada marca o aceite', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const caixa = screen.getByRole('checkbox', {
      name: /concordo com os termos de uso/i,
    });
    // A caixa desenhada é o <label> associado ao input.
    await user.click(document.querySelector(`label[for="${caixa.id}"]`)!);

    expect(caixa).toBeChecked();
  });

  it('as duas caixas são independentes', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const termos = screen.getByRole('checkbox', {
      name: /concordo com os termos de uso/i,
    });
    const idade = screen.getByRole('checkbox', { name: /18 anos ou mais/i });

    await user.click(document.querySelector(`label[for="${termos.id}"]`)!);

    expect(termos).toBeChecked();
    expect(idade).not.toBeChecked();
  });

  it('mostra a mensagem de erro de cada caixa', () => {
    render(<Harness termsError="Aceite os documentos" adultError="Confirme a idade" />);

    expect(screen.getByText('Aceite os documentos')).toBeInTheDocument();
    expect(screen.getByText('Confirme a idade')).toBeInTheDocument();
  });

  it('mostra o texto de introdução quando fornecido (aviso de criação de conta)', () => {
    render(<Harness intro="Uma conta será criada." />);

    expect(screen.getByText('Uma conta será criada.')).toBeInTheDocument();
  });

  it('funciona sobre a placa clara sem mudar o texto', () => {
    render(<Harness variant="plate" />);

    expect(
      screen.getByRole('checkbox', { name: /concordo com os termos de uso/i }),
    ).toBeInTheDocument();
  });
});
