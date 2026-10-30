# FreteNow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Track actual evidence in progress.md.

**Goal:** Construir o sistema completo descrito na especificação por incrementos executáveis, começando por uma base compartilhada e um ciclo de cotação/embarque comprovado.
**Architecture:** API TypeScript com contratos comuns e PostgreSQL. Clientes Next.js, SwiftUI e Kotlin/Compose consomem a mesma API; provedores de demonstração são explícitos e substituíveis.
**Tech Stack:** Node 24, TypeScript, Fastify 5, PostgreSQL 17, Next.js 16 / React 19, SwiftUI e Compose. Versões npm verificadas no registro e fixadas no lockfile.
**Spec:** docs/superpowers/specs/2026-10-30-linklane-multiplatform-design.md

## Global Constraints

- Os 12 módulos da matriz permanecem no escopo final das três plataformas.
- Preservar inicialmente terminologia, modalidades, unidades e moeda observadas: interface funcional em inglês, USD, lb/in, LTL/FTL/Expedited. O brandbook em português não autoriza localização de regras do produto.
- Identidade FreteNow, assets locais aprovados, Bricolage Grotesque / Instrument Sans, navegação marinho e ações #0166D9.
- Não copiar bundles privados, credenciais, cookies ou dados de pessoas do estudo. Fixtures são sintéticas.
- Isolamento entre organizações no servidor, dinheiro inteiro, tarifas vinculadas ao rascunho e com validade, operações idempotentes.
- Não executar pagamentos, envios de email/SMS, fretes ou operações comerciais reais nesta construção local.
- iOS requer build macOS; Android requer JDK/SDK. Arquivos escritos não equivalem a build aprovado.
- Sem publicação ou alteração remota nesta etapa. Repositório atual confirmou permissão READ em 30/10/2026.

## Review Focus

1. Outra organização solicita um ID conhecido: responder 404/403 sem revelar dados; testar na API.
2. Tarifa expira ou rascunho muda: impedir reserva, inclusive com mesmo id; testar o vínculo integral.
3. Duplo clique/reenvio concorrente: uma reserva, mesma resposta; chave reaproveitada para outra entrada retorna 409.
4. Valores/quantidades inválidos e datas impossíveis: erro de validação útil; não aceitar NaN, infinito ou negativos.
5. Provedor ausente e perda de sessão: UI informa indisponibilidade/novo acesso sem sucesso fictício.

## Incremento executável 1

### Task 1: API, contratos, persistência e testes
**Files:** packages/contracts/src/index.ts; services/api/src/{app,domain,store,postgres,server}.ts; services/api/test/*.test.ts; services/api/migrations/001_initial.sql; package.json; tsconfig.json.
**Interfaces:** ver docs/implementation/task-1-api.md. Produz app factory injetável, sessão demo, snapshot e ciclo rates -> shipment -> detail/actions. Read models dos demais módulos são explicitamente parciais.
- [ ] Testar isolamento, expiração/vínculo de tarifa, idempotência, validação e transições antes da implementação.
- [ ] Implementar camada de domínio e Store com adaptadores Memory (testes) e PostgreSQL (execução local).
- [ ] Testar API com inject e reinício de persistência PostgreSQL. Fixar dependências e scripts repetíveis.
- [ ] Revisão de segurança/contrato e correção dos achados.

### Task 2: Portal Web e primeiro fluxo completo
**Files:** apps/web/app/**; apps/web/components/**; apps/web/lib/**; apps/web/public/brand/**.
**Consumes:** contratos e rotas da Task 1. Produces: login demo, dashboard, formulário LTL/FTL/Expedited, tarifas, confirmação e detalhe de embarque, listagem e navegação dos 12 módulos.
- [ ] Usar referências visuais do REA e tokens aprovados; não redesenhar o portal como o site institucional.
- [ ] Integrar todas as ações apresentadas à API; rotular capacidades ainda indisponíveis e manter matriz honesta.
- [ ] Verificar estados de loading/empty/error/session, navegação por teclado e layout mobile.
- [ ] Executar typecheck/build, teste de navegador login -> quote -> booking -> detail e revisão de UI.

### Task 3: Clientes nativos e CI verificável
**Files:** apps/ios/**; apps/android/**; .github/workflows/ci.yml.
**Consumes:** os mesmos contratos HTTP. Produces: bases nativas com sessão demo, lista/detalhe, fluxo de cotação quando possível, configuração de build e testes.
- [ ] iOS SwiftUI com serviços injetados, NavigationStack, estados e fixtures; project configurável por XcodeGen.
- [ ] Android Compose com serviço HTTP, navegação e estados; projeto Gradle reproduzível.
- [ ] Compilar onde o ambiente permitir; separar bloqueios de SDK/macOS/permissão remota dos resultados reais.

### Task 4: Integração, cobertura e retomada
**Files:** README.md; docs/implementation/{coverage,progress}.md; docker-compose.yml; scripts/**.
- [ ] Registrar cobertura por ação/plataforma, evidência de testes e comandos de inicialização.
- [ ] Rodar verificação final e revisão ampla; corrigir problemas encontrados.
- [ ] Entregar ambiente local executável e registrar o próximo incremento sem declarar paridade completa prematuramente.

## Incrementos restantes para a entrega completa

O primeiro incremento não encerra o produto. A sequência após a base comprovada é: onboarding completo e papéis; documentos e tracking; analytics e faturamento; sinistros com anexos; equipe/locais/importação; recorrências com materialização e timezone; comparação de propostas; paridade visual e comportamental dos clientes nativos; integrações autorizadas e distribuição. Cada módulo exige seu próprio plano detalhado com contratos e testes antes da implementação. A matriz original permanece íntegra como inventário de requisitos.
