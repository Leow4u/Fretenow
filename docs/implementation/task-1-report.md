# Task 1 — API executável

Data: 2026-10-30. Resultado: fundação local de demonstração implementada e validada com PostgreSQL real. Sem commit, push, deploy, email, pagamento ou contratação de frete.

## Entrega

- `packages/contracts/src/index.ts`: tipos públicos compartilhados de conta, endereço, carga, tarifa, embarque, evento, sessão, snapshot e erro.
- `packages/fixtures/src/index.ts`: conta e configurações exclusivamente sintéticas.
- `services/api/src/app.ts`: Fastify 5 injetável, sessão/cookie/Bearer, autorização por tenant, CSRF/Origin, snapshot, leitura dos módulos parciais, cotações, reservas idempotentes, cancelamento e reagendamento auditados.
- `services/api/src/domain.ts`: validação de dados físicos, endereço US/ZIP5, datas reais, hash integral de draft, eventos e falhas HTTP.
- `services/api/src/store.ts`: contrato Store e MemoryStore com serialização por organização, clone e rollback de falhas.
- `services/api/src/postgres.ts` e `migrations/001_initial.sql`: sessões com hash de token e estado JSONB, transações com bloqueio de linha por organização e idempotência persistente.
- `services/api/src/server.ts`: execução explícita em modo demo, PostgreSQL obrigatório, bind em 127.0.0.1, porta 4100, carregamento de `.env.local` pelos scripts npm.
- `services/api/test/{api,postgres}.test.ts`: cenários de segurança, domínio, concorrência, reinicialização e rollback.
- Raiz: dependências oficiais fixadas e lockfile, scripts npm, TypeScript estrito, `.env.example`, `.gitignore`, Compose PostgreSQL 17 em loopback 55432. `.env.local` existente foi preservado e não é versionado.
- Contrato HTTP e limites de capacidade: `docs/implementation/api-contract.md`.

## Evidências executadas

Ambiente: Windows, Node v24.19.0, npm 11.17.0. Pacotes instalados: Fastify 5.12.7, pg 8.16.3, tsx 4.20.6, TypeScript 5.9.3 (estável), @types/node 24.10.1 e @types/pg 8.15.6. Instalação das dependências e links de workspaces exigiu execução escalada; concluída com sucesso. Não foram usados segredos de produção.

1. `npm test` foi executado antes da API existir e falhou por módulo `app.ts` ausente. Depois da implementação, uma execução intermediária passou os oito testes então existentes (PostgreSQL explicitamente ignorado sem DATABASE_URL). O teste posterior de replay após data de coleta falhou com 400 versus 200 antes da correção e passou na verificação conjunta final.
2. `npm run typecheck`: **aprovado**, backend e pacotes compartilhados.
3. `npm run test:postgres`: **1 teste de integração aprovado** com PostgreSQL 17 local do coordenador. Dois pools e dez chamadas simultâneas resultaram em um único ID; após fechar e recriar pools/app, sessão e embarque permaneceram acessíveis, replay retornou o mesmo ID e payload alterado recebeu 409. Falha dentro de transação não apagou o embarque. Outra organização recebeu 404. O teste usa tenants únicos e limpa seus próprios registros.
4. Dentro do sandbox, o primeiro teste PostgreSQL retornou `EACCES` na conexão com 127.0.0.1:55432. A mesma verificação foi executada com escalada autorizada e passou. Não há bloqueio pendente de conexão.
5. Verificação final: `node --env-file-if-exists=.env.local --import tsx --test services/api/test/*.test.ts` executado com escalada para conexão local: **10 aprovados, zero falhas, zero ignorados**; seguido de `npm run typecheck` aprovado. `npm ls --depth=0` aprovou todas as dependências e links de workspace. `git diff --check` não indicou erros.
6. Comando padrão `npm test` repetido após a correção: **9 aprovados, zero falhas, 1 ignorado** (o PostgreSQL é executado separadamente com `.env.local`, conforme item 5).

Cobertura injetada inclui: 401 sem sessão, expiração/signout, leitura e ação cross-tenant 404, referência a nomes herdados de Object negada, rate de outra organização 404, expiração de tarifa, modificação de item/endereço após cotação 409, replay/concorrência/chave reutilizada, valores e tenant enviados pelo cliente ignorados, carga negativa/zero/NaN/infinito, data impossível, ZIP incompleto, estado US inválido, corpo >64 KiB, JSON inválido, erros sem stack, CSRF com cookie e Origin externo/ausente negado, demo bloqueada em production, ações com chave reaproveitada 409, cancelamento/reagendamento com eventos e transições de in_transit/delivered/cancelled bloqueadas. Capacidades comerciais ausentes retornam 501.

## Lacunas e limites conhecidos

O incremento cobre o primeiro ciclo local. Não constitui paridade completa ou serviço de produção. Onboarding/PATCH de perfil, RBAC, autenticação real, tracking de transportadora, documentos, pagamentos/crédito, sinistros, anexos, convites, recorrências e comparação de propostas permanecem sem escrita funcional. Leituras desses módulos retornam estado sintético vazio/capacidades explícitas. Analytics deriva apenas dos embarques existentes. Endereços têm validação estrutural, sem geocodificação. O provedor de tarifas calcula valores determinísticos de demonstração.

JSONB transacional é uma etapa inicial permitida pela Task 1: serializa inclusive leituras por organização. Normalização relacional, paginação, retenção de sessões/rates/respostas idempotentes, limites por cliente e revisão de produção são necessários antes de exposição pública. A documentação descreve a migração pretendida e não a apresenta como concluída. Não há worker nem efeito comercial externo.

Replay retorna o snapshot original e deve ser seguido de GET detail para observar ações posteriores. Replays preservam resposta mesmo após validade da tarifa ou data da coleta, desde que a sessão seja válida; novas gravações mantêm a validação temporal estrita. Um teste de regressão foi escrito e observado falhar antes dessa correção. O servidor local recusa execução em produção e não fornece fallback de banco em arquivo ou memória. Builds Web/nativos e revisão final integrada pertencem às tarefas seguintes do coordenador.

## Revisão round 1 — enum de modalidade

Achado confirmado: `String(d.mode)` aceitava `mode: ["FTL"]` e preservava o array, selecionando preço-base de LTL. Correção restrita em `domain.ts`: exigir `typeof d.mode === 'string'` antes da comparação com o enum. O teste novo rejeita arrays `['FTL']`/`['LTL']`, objeto e null com 400/VALIDATION. Também cota e reserva as três strings válidas, verificando modalidade persistida e preços específicos (LTL 16700, FTL 96700, Expedited 61700 minor units para a carga de teste).

Comando de regressão: `node --import tsx --test --test-name-pattern="freight mode accepts only" services/api/test/api.test.ts`.

- Antes da correção: `fail 1`, assertion `invalid mode ["FTL"]`, `200 !== 400`.
- Depois da correção: `tests 1`, `pass 1`, `fail 0`.
- `npm test`: `tests 11`, `pass 10`, `fail 0`, `skipped 1` (PostgreSQL sem DATABASE_URL nesse comando). O teste de replay após pickupDate também passou nessa execução.
- `npm run typecheck`: `tsc --noEmit`, exit code 0.

Nenhuma mudança de PostgreSQL, contratos ou demais comportamentos foi realizada nessa rodada. Delta final disponibilizado para nova revisão; não há bloqueio pendente.
