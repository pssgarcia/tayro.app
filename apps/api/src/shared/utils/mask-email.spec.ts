import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('mantém o domínio e revela no máximo 2 caracteres da parte local', () => {
    expect(maskEmail('ana.silva@gmail.com')).toBe('an***@gmail.com');
  });

  it('revela só 1 caractere quando a parte local é curta', () => {
    expect(maskEmail('ana@gmail.com')).toBe('a***@gmail.com');
    expect(maskEmail('a@x.com')).toBe('a***@x.com');
  });

  it('nunca devolve a parte local inteira', () => {
    const email = 'pedro@empresa.com.br';
    const masked = maskEmail(email);
    expect(masked).not.toContain('pedro');
    expect(masked).toContain('@empresa.com.br');
  });

  it('usa o último @ (endereço com @ na parte local)', () => {
    expect(maskEmail('a"b@c"@dominio.com')).toBe('a"***@dominio.com');
  });

  it('não vaza nada quando o valor é ausente ou não é e-mail', () => {
    expect(maskEmail(undefined)).toBe('(sem endereço)');
    expect(maskEmail(null)).toBe('(sem endereço)');
    expect(maskEmail('')).toBe('(sem endereço)');
    expect(maskEmail('sem-arroba')).toBe('(endereço inválido)');
    expect(maskEmail('@dominio.com')).toBe('(endereço inválido)');
  });
});
