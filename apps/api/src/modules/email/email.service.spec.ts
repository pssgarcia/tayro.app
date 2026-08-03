import { EmailService } from './email.service';
import type { EmailProvider } from './email.types';

describe('EmailService', () => {
  let sendMock: jest.Mock;
  let service: EmailService;

  beforeEach(() => {
    sendMock = jest.fn().mockResolvedValue(undefined);
    const provider: EmailProvider = { send: sendMock };
    service = new EmailService(provider);
  });

  it('sendApplicationApproved manda e-mail com assunto e corpo neutros (sem gênero)', async () => {
    await service.sendApplicationApproved({
      to: 'creator@example.com',
      creatorName: 'Alex',
      campaignTitle: 'Lançamento Whey',
      brandName: 'Marca Fit',
    });

    expect(sendMock).toHaveBeenCalledWith({
      to: 'creator@example.com',
      subject: expect.stringContaining('Lançamento Whey'),
      html: expect.stringContaining('Marca Fit'),
    });
    // Nunca concordar adjetivo com a pessoa (só com "candidatura")
    const { html, subject } = sendMock.mock.calls[0][0];
    expect(subject + html).not.toMatch(/aprovad[ao]\b.*(você|alex)/i);
  });

  it('sendApplicationRejected manda e-mail de atualização (tom neutro)', async () => {
    await service.sendApplicationRejected({
      to: 'creator@example.com',
      creatorName: 'Alex',
      campaignTitle: 'Lançamento Whey',
      brandName: 'Marca Fit',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@example.com',
        subject: expect.stringContaining('Lançamento Whey'),
      }),
    );
  });

  it('sendClaimAccount manda o link de definir senha', async () => {
    await service.sendClaimAccount({
      to: 'creator@example.com',
      creatorName: 'Alex',
      claimUrl: 'https://tayro-app.vercel.app/claim?token=abc123',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@example.com',
        html: expect.stringContaining(
          'https://tayro-app.vercel.app/claim?token=abc123',
        ),
      }),
    );
  });

  it('falha no provider é engolida (best-effort) — não lança', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend fora do ar'));

    await expect(
      service.sendApplicationApproved({
        to: 'creator@example.com',
        creatorName: 'Alex',
        campaignTitle: 'Lançamento Whey',
        brandName: 'Marca Fit',
      }),
    ).resolves.toBeUndefined();
  });
});
