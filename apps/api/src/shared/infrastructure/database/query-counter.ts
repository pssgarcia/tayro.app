/**
 * QueryCounter — detecta padrões N+1 em unit tests.
 *
 * Como usar:
 *   const counter = new QueryCounter();
 *   counter.wrap(prismaMock);          // intercepta todos os jest.fn() do mock
 *   await service.doSomething();
 *   counter.assertAtMost('influencer', 'findUnique', 1, 'findByCampaign');
 *   counter.reset();
 *
 * Regra de bolso para o limite máximo:
 *   - Uma operação que lista N itens não deve emitir mais de ~3 queries no total.
 *   - Qualquer método cujo limite cresce com o tamanho da lista é um N+1.
 */
export class QueryCounter {
  private calls = new Map<string, number>();

  /**
   * Envolve todos os métodos jest.fn() do mock Prisma para contar chamadas.
   * Deve ser chamado ANTES de configurar os mockResolvedValue dos testes.
   */
  wrap<T extends Record<string, Record<string, jest.Mock>>>(mock: T): T {
    for (const model of Object.keys(mock)) {
      const modelObj = mock[model];
      if (!modelObj || typeof modelObj !== 'object') continue;
      for (const method of Object.keys(modelObj)) {
        const original = modelObj[method];
        if (typeof original !== 'function') continue;
        const key = `${model}.${method}`;
        const self = this;
        modelObj[method] = jest.fn(function (...args: unknown[]) {
          self.calls.set(key, (self.calls.get(key) ?? 0) + 1);
          return original(...args);
        }) as jest.Mock;
      }
    }
    return mock;
  }

  reset() {
    this.calls.clear();
  }

  callCount(model: string, method: string): number {
    return this.calls.get(`${model}.${method}`) ?? 0;
  }

  /**
   * Lança erro se a operação Prisma foi chamada mais que `max` vezes.
   * Use para garantir que um único endpoint não emite N queries para N registros.
   */
  assertAtMost(model: string, method: string, max: number, label?: string) {
    const count = this.callCount(model, method);
    if (count > max) {
      throw new Error(
        `N+1 detectado em "${label ?? `prisma.${model}.${method}`}": ` +
          `${count} chamadas (limite esperado: ${max}). ` +
          `Use include/select para carregar relações em vez de buscar por item.`,
      );
    }
  }

  report(): string {
    const lines = ['=== QueryCounter report ==='];
    for (const [key, count] of [...this.calls.entries()].sort(
      (a, b) => b[1] - a[1],
    )) {
      lines.push(`  prisma.${key}: ${count}x`);
    }
    return lines.join('\n');
  }
}
