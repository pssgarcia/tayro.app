import type { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './resend.email.provider';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

function makeConfig(): ConfigService {
  return {
    getOrThrow: (key: string) =>
      ({ RESEND_API_KEY: 'test-key', EMAIL_FROM: 'noreply@tayro.app' })[key],
  } as unknown as ConfigService;
}

describe('ResendEmailProvider', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('envia com from configurado e propaga to/subject/html', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

    const provider = new ResendEmailProvider(makeConfig());
    await provider.send({
      to: 'creator@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: 'noreply@tayro.app',
      to: 'creator@example.com',
      subject: 'Assunto',
      html: '<p>Corpo</p>',
    });
  });

  it('a SDK não lança em erro de API — o provider precisa checar `error` e lançar', async () => {
    sendMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Domain not verified', name: 'validation_error' },
    });

    const provider = new ResendEmailProvider(makeConfig());

    await expect(
      provider.send({ to: 'x@example.com', subject: 's', html: 'h' }),
    ).rejects.toThrow('Domain not verified');
  });
});
