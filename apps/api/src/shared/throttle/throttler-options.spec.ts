import { throttlerOptionsFactory } from './throttler-options';
import { PostgresThrottlerStorage } from './postgres-throttler-storage';
import { clientIpTracker } from './client-ip-tracker';

describe('throttlerOptionsFactory', () => {
  // Trava a ligação: sem `storage`, o ThrottlerModule cai no Map em memória,
  // que em serverless vale por instância (D-24). O store pode estar certo e
  // simplesmente não estar plugado: é isso que este teste impede.
  it('usa o store no Postgres, não o padrão em memória', () => {
    const options = throttlerOptionsFactory({} as any);

    expect(options.storage).toBeInstanceOf(PostgresThrottlerStorage);
  });

  it('mantém o limite global de 60 req/min', () => {
    expect(throttlerOptionsFactory({} as any).throttlers).toEqual([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]);
  });

  it('identifica o cliente pelo clientIpTracker, não pelo req.ip padrão da lib', () => {
    expect(throttlerOptionsFactory({} as any).getTracker).toBe(clientIpTracker);
  });
});
