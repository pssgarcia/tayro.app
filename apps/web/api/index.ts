// Função da Vercel que executa a API (D-24). Toda a lógica mora em apps/api:
// isto só entrega o handler compilado (apps/api/dist/serverless.js, gerado
// pelo buildCommand do vercel.json). O arquivo fica aqui porque o projeto da
// Vercel tem Root Directory = apps/web, e funções vivem em <root>/api.
//
// Rota: o vercel.json reescreve /api/* pra cá (hoje só com o cookie
// tayro_api=vercel, o canário). O Express do Nest recebe a URL original
// (/api/v1/...), então as rotas não mudam.
import api from '../../api/dist/serverless.js';

export default api.handler;
