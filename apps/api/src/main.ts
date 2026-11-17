// PRIMEIRA linha do processo — antes de qualquer @nestjs/*. O Sentry precisa
// aplicar os patches de auto-instrumentação (http/express/prisma) antes dos
// módulos carregarem. Sem DSN, o init não roda e isto é inerte.
import './instrument';
import { createApp } from './bootstrap';

async function bootstrap() {
  const app = await createApp();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

// Rejeição aqui derruba o processo (comportamento padrão do Node), que é o
// certo: API sem config válida não deve ficar de pé.
void bootstrap();
