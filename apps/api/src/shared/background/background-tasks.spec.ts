import * as Sentry from '@sentry/nestjs';
import { waitUntil } from '@vercel/functions';
import { BackgroundTasks } from './background-tasks';

jest.mock('@vercel/functions', () => ({ waitUntil: jest.fn() }));
jest.mock('@sentry/nestjs', () => ({
  flush: jest.fn().mockResolvedValue(true),
  captureException: jest.fn(),
}));

const nextTick = () => new Promise((r) => setImmediate(r));

/**
 * Trabalho que roda DEPOIS da resposta HTTP (hoje: o sync do Instagram).
 *
 * Num servidor comum (Railway) o processo segue vivo e o `setImmediate` basta.
 * Numa função serverless (Vercel) a instância pode ser congelada assim que a
 * resposta sai, e o trabalho morre no meio: por isso a promessa é entregue ao
 * `waitUntil`, que segura a função viva até ela terminar. Fora da Vercel o
 * `waitUntil` não faz nada (lê um contexto que não existe), então o mesmo
 * código serve aos dois sem `if`.
 */
describe('BackgroundTasks', () => {
  const tasks = new BackgroundTasks();

  beforeEach(() => jest.clearAllMocks());

  it('não roda a tarefa na hora: quem chamou responde primeiro', async () => {
    const task = jest.fn().mockResolvedValue(undefined);

    void tasks.run(task);

    expect(task).not.toHaveBeenCalled();
    // Nem depois das microtasks: o código que agendou ainda termina o que
    // estava fazendo (setImmediate roda depois delas).
    await Promise.resolve();
    await Promise.resolve();
    expect(task).not.toHaveBeenCalled();
    await nextTick();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('entrega ao waitUntil uma promessa que só resolve depois da tarefa', async () => {
    let finish!: () => void;
    const task = jest.fn(() => new Promise<void>((r) => (finish = r)));

    void tasks.run(task);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    const kept = (waitUntil as jest.Mock).mock.calls[0][0] as Promise<void>;

    let settled = false;
    void kept.then(() => (settled = true));
    await nextTick();
    expect(task).toHaveBeenCalled();
    expect(settled).toBe(false);

    finish();
    await kept;
    expect(settled).toBe(true);
  });

  it('esvazia a fila do Sentry antes de liberar a função', async () => {
    void tasks.run(() => Promise.resolve());
    const kept = (waitUntil as jest.Mock).mock.calls[0][0] as Promise<void>;

    await kept;

    expect(Sentry.flush).toHaveBeenCalled();
  });

  it('falha que escapa da tarefa vai pro Sentry e nunca rejeita (nem pro waitUntil, nem pra quem chamou)', async () => {
    const err = new Error('boom');
    const run = tasks.run(() => Promise.reject(err));
    const kept = (waitUntil as jest.Mock).mock.calls[0][0] as Promise<void>;

    await expect(kept).resolves.toBeUndefined();
    await expect(run).resolves.toBeUndefined();
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      tags: { area: 'background-task' },
    });
  });
});
