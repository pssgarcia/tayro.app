import { fireEvent, screen } from '@testing-library/react';

/**
 * Marca as duas caixas obrigatórias de aceite dos três fluxos de criação de
 * conta (cadastro de creator, cadastro de marca, candidatura pública).
 *
 * Helper compartilhado porque a redação das caixas é a prova do aceite: se
 * cada spec buscasse por um texto próprio, mudar a frase deixaria dois testes
 * verdes e um vermelho, e o vermelho pareceria ser o errado.
 */
export function acceptLegalDocuments() {
  fireEvent.click(screen.getByRole('checkbox', { name: /concordo com os termos de uso/i }));
  fireEvent.click(screen.getByRole('checkbox', { name: /18 anos ou mais/i }));
}

/** As duas caixas, para asserção direta sobre estado inicial ou erro. */
export function legalCheckboxes() {
  return {
    terms: screen.getByRole('checkbox', {
      name: /concordo com os termos de uso/i,
    }),
    adult: screen.getByRole('checkbox', { name: /18 anos ou mais/i }),
  };
}
