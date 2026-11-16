import { clientIpTracker } from './client-ip-tracker';

const req = (
  ip: string | undefined,
  headers: Record<string, string | string[]> = {},
) => ({ ip, headers }) as any;

describe('clientIpTracker', () => {
  const original = process.env.VERCEL;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  });

  describe('na Vercel (VERCEL=1)', () => {
    beforeEach(() => (process.env.VERCEL = '1'));

    // Na função da Vercel, req.ip é o endereço interno da plataforma, igual pra
    // todo mundo. O IP do cliente vem no x-real-ip, que a Vercel SOBRESCREVE
    // (o valor mandado pelo cliente não passa), então dá pra confiar.
    it('usa o x-real-ip, não o req.ip', () => {
      expect(
        clientIpTracker(req('10.0.0.1', { 'x-real-ip': '203.0.113.7' })),
      ).toBe('203.0.113.7');
    });

    it('clientes diferentes viram chaves diferentes', () => {
      const a = clientIpTracker(
        req('10.0.0.1', { 'x-real-ip': '203.0.113.7' }),
      );
      const b = clientIpTracker(
        req('10.0.0.1', { 'x-real-ip': '198.51.100.9' }),
      );
      expect(a).not.toBe(b);
    });

    it('sem o cabeçalho, cai no req.ip', () => {
      expect(clientIpTracker(req('10.0.0.1'))).toBe('10.0.0.1');
    });
  });

  describe('fora da Vercel (Railway, dev, testes)', () => {
    beforeEach(() => delete process.env.VERCEL);

    // Fora da Vercel ninguém sobrescreve o x-real-ip/x-forwarded-for antes de
    // chegar aqui de um jeito documentado: confiar nele deixaria qualquer um
    // escapar do limite trocando o cabeçalho a cada tentativa.
    it('ignora x-real-ip e x-forwarded-for (forjáveis) e usa o req.ip', () => {
      const r = req('10.0.0.1', {
        'x-real-ip': '1.2.3.4',
        'x-forwarded-for': '5.6.7.8',
      });
      expect(clientIpTracker(r)).toBe('10.0.0.1');
    });
  });

  it('nunca devolve vazio (chave vazia juntaria todo mundo de um jeito silencioso)', () => {
    delete process.env.VERCEL;
    expect(clientIpTracker(req(undefined))).toBe('unknown');
  });
});
