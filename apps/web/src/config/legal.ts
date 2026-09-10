/**
 * Endereços e identificação dos documentos legais.
 *
 * Fonte única no front: os três fluxos de criação de conta, o rodapé da
 * landing, o rodapé das telas de autenticação e os próprios documentos linkam
 * um para o outro. Mudar um caminho aqui muda em todos.
 */
// Rota em INGLÊS, como todas as outras do produto (`/privacy-policy`,
// `/forgot-password`, `/reset-password`, `/claim`). A copy visível é em
// português; endereço e identificador de código, não. É a mesma decisão que
// manteve `/programs` e `ProgramCard` em inglês quando a copy passou de
// "Programa" para "Campanha".
export const TERMS_PATH = '/terms-of-use';
export const PRIVACY_PATH = '/privacy-policy';

export const TERMS_LABEL = 'Termos de Uso';
export const PRIVACY_LABEL = 'Política de Privacidade';

/**
 * Versão publicada de cada documento, para EXIBIÇÃO no cabeçalho da página.
 *
 * O cliente continua não enviando versão nenhuma no cadastro: quem estampa o
 * que foi aceito é o servidor (`apps/api/src/shared/legal/legal-documents.ts`).
 * Estes valores existem porque o documento precisa dizer qual versão ele é:
 * sem isso, `acceptedTermsVersion: "1.0"` gravado no banco não aponta para
 * texto identificável nenhum, e o registro perde valor como prova.
 *
 * PRECISAM ser iguais aos do arquivo do servidor. Ao publicar uma versão nova
 * de qualquer um dos dois documentos, mude nos dois lugares.
 */
export const TERMS_VERSION = '1.0';
export const PRIVACY_VERSION = '1.0';

/** Data de publicação da versão atual, como aparece nos dois documentos. */
export const LEGAL_UPDATED_AT = '4 de setembro de 2026';

/**
 * Canal de contato indicado nos dois documentos, para dúvidas e para exercício
 * de direitos do titular.
 */
export const LEGAL_CONTACT_EMAIL = 'pedrossgarcia88@gmail.com';

/**
 * Rótulos e data em inglês, para a tradução dos dois documentos publicada em
 * 2026-09-09.
 *
 * A versão (`TERMS_VERSION`/`PRIVACY_VERSION`) é a MESMA nos dois idiomas: a
 * tradução não é um documento novo, é o mesmo documento vertido para outro
 * idioma. É o que mantém `acceptedTermsVersion: "1.0"` apontando para um texto
 * identificável, sem precisar guardar idioma no registro de aceite. Por isso a
 * data exibida também é a da publicação da versão em português, e não a da
 * tradução.
 */
export const TERMS_LABEL_EN = 'Terms of Use';
export const PRIVACY_LABEL_EN = 'Privacy Policy';
export const LEGAL_UPDATED_AT_EN = 'September 4, 2026';
