/**
 * KineticTextarea — regressão do campo que não crescia (reportado 2026-08-23).
 *
 * O sintoma era escrever um texto mais longo na Descrição do programa e perder
 * de vista o que já tinha sido escrito: `rows={1}` fixo, `leading-none` e sem
 * quebra de palavra faziam a primeira linha rolar pra fora de um campo de uma
 * linha só.
 *
 * jsdom não faz layout, então `scrollHeight` é sempre 0 — os testes de altura
 * o simulam explicitamente. O que está travado aqui é a MECÂNICA (a altura é
 * derivada do conteúdo, e é recalculada ao digitar e ao prefillar), não o
 * número de pixels.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import KineticTextarea from './KineticTextarea';

/** jsdom devolve 0; finge um conteúdo de `px` de altura. */
function fakeScrollHeight(el: HTMLElement, px: number) {
  Object.defineProperty(el, 'scrollHeight', { value: px, configurable: true });
}

describe('KineticTextarea — altura acompanha o conteúdo', () => {
  it('cresce ao digitar, em vez de manter uma linha só', () => {
    render(<KineticTextarea label="Descrição" name="description" />);
    const campo = screen.getByLabelText('Descrição');

    fakeScrollHeight(campo, 96);
    fireEvent.input(campo, { target: { value: 'linha 1\nlinha 2\nlinha 3' } });

    expect(campo.style.height).toBe('96px');
  });

  // Sem o `height = auto` antes de medir, o campo só cresceria — apagar texto
  // deixaria um buraco em branco embaixo.
  it('encolhe de volta quando o texto é apagado', () => {
    render(<KineticTextarea label="Descrição" name="description" />);
    const campo = screen.getByLabelText('Descrição');

    fakeScrollHeight(campo, 96);
    fireEvent.input(campo, { target: { value: 'muito texto' } });
    expect(campo.style.height).toBe('96px');

    fakeScrollHeight(campo, 24);
    fireEvent.input(campo, { target: { value: '' } });
    expect(campo.style.height).toBe('24px');
  });

  // Edição de programa chega com a descrição já preenchida: se a altura só
  // fosse calculada ao digitar, o texto abriria cortado.
  it('já abre na altura certa quando vem preenchido', () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { rerender } = render(
      <KineticTextarea label="Descrição" name="description" ref={ref} defaultValue="" />,
    );

    fakeScrollHeight(ref.current as HTMLElement, 120);
    rerender(
      <KineticTextarea
        label="Descrição"
        name="description"
        ref={ref}
        defaultValue="texto longo que veio do servidor"
      />,
    );

    expect(ref.current?.style.height).toBe('120px');
  });

  it('não engole o onInput de quem usa o componente', () => {
    const onInput = vi.fn();
    render(<KineticTextarea label="Descrição" name="description" onInput={onInput} />);

    fireEvent.input(screen.getByLabelText('Descrição'), {
      target: { value: 'texto' },
    });

    expect(onInput).toHaveBeenCalledTimes(1);
  });
});

describe('KineticTextarea — quebra de texto', () => {
  it('quebra palavra longa sem espaço em vez de esticar o campo', () => {
    render(<KineticTextarea label="Descrição" name="description" />);

    expect(screen.getByLabelText('Descrição')).toHaveClass('break-words');
  });

  // Regressão de composição: `leading-*` e `text-[…]` são o mesmo grupo de
  // conflito no tailwind-merge. Com a entrelinha como classe separada e a de
  // tamanho vindo depois, ela era silenciosamente apagada — foi o que
  // aconteceu com o `leading-none` que existia aqui. Fica colada ao tamanho.
  it('aplica a entrelinha de fato (não é apagada pelo tailwind-merge)', () => {
    render(<KineticTextarea label="Descrição" name="description" />);

    const campo = screen.getByLabelText('Descrição');
    expect(campo.className).toMatch(/text-\[14px\]\/\[1\.45\]/);
    expect(campo).not.toHaveClass('leading-none');
  });

  it('vale também na variante sobre a placa clara', () => {
    render(<KineticTextarea label="Descrição" name="description" variant="plate" />);

    expect(screen.getByLabelText('Descrição').className).toMatch(/text-\[15px\]\/\[1\.45\]/);
  });
});

describe('KineticTextarea — contrato do primitivo', () => {
  // A ref de fora é a do register() do react-hook-form: se o auto-grow a
  // engolisse, o campo pararia de registrar valor no formulário.
  it('encaminha a ref de fora além de usar a própria', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<KineticTextarea label="Descrição" name="description" ref={ref} />);

    expect(ref.current).toBe(screen.getByLabelText('Descrição'));
  });

  it('liga label e campo pelo name quando não recebe id', () => {
    render(<KineticTextarea label="Legenda" name="caption" />);

    expect(screen.getByLabelText('Legenda')).toHaveAttribute('id', 'caption');
  });

  it('mostra o erro fora do label (não entra no nome acessível do campo)', () => {
    render(<KineticTextarea label="Descrição" name="description" error="Campo obrigatório" />);

    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
  });
});
