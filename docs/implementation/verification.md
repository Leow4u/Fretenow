# Verificação do primeiro incremento

Data: 2026-10-30. Registro histórico da validação local, inicialmente baseada em `95fd5c5`. A publicação e os resultados remotos posteriores estão no [PR #1](https://github.com/Leow4u/Fretenow/pull/1) e nos [runs do CI](https://github.com/Leow4u/Fretenow/actions). Este documento consolida evidência já executada pelos responsáveis; a Task4 não repetiu builds pesados após mudanças apenas documentais. Os resultados abaixo são históricos e têm limites explícitos.

| Verificação executada | Resultado e evidência |
|---|---|
| API `npm test` após correção final de mode | 11 descobertos: **10 aprovados, 0 falhas, 1 skip PostgreSQL** sem DATABASE_URL; [Task1](task-1-report.md) |
| API `npm run test:postgres` | **1 aprovado, 0 falhas/skips**, PostgreSQL real; concorrência, replay, persistência, rollback, tenant isolation; [Task1](task-1-report.md), repetido pela [Task2](task-2-report.md). Não alegar execução conjunta de11/11 após a última correção: o conjunto anterior era10/10; enum foi testado depois |
| API `npm run typecheck` | Aprovado após correção final; [Task1](task-1-report.md) |
| Web `npm run test:api --workspace=@fretenow/web` | **4 aprovados**, API/PostgreSQL reais; login/signout sem corpo, snapshot, rates; [Task2 round1](task-2-report.md) |
| Web `npm run test:flow --workspace=@fretenow/web` | **3 aprovados**, regressões de resposta atrasada, erro definitivo e retry incerto; [Task2 round1](task-2-report.md) |
| Web `npm run build:web`, `npm run typecheck:web` | Aprovados após correções finais; build **WojKHd--JjTJ7lEUspPPM**, Next16.4.3; [relatório final](final-fix-report.md) |
| Web browser conectado com servidor Next de produção | Fluxo LTL completo, FTL por repeat, reagendar/cancelar, signout/login, persistência, Analytics e CSV. Desktop1440x1000/mobile390x844, clientWidth=scrollWidth=375 após ajuste, diálogo/Escape/foco. [Browser QA](browser-qa.md). Não cobre todas as funções dos12módulos |
| Android Gradle8.13/JDK17/SDK36, testDebugUnitTest + assembleDebug final | **7 testes JVM aprovados** (FreightTest5 + HttpContractTest2), zero falhas/erros/skips; **BUILD SUCCESSFUL 1m15s**; [Task3 round1](task-3-report.md) |
| Android JSON real Kotlin -> API4100 | Corpo capturado reenviado **sem alteração**, HTTP200,3tarifas, todas demo; [QA local ignorado](../../output/implementation/qa/android-wire-api.json), controlador. Não é execução da UI nem transporte emulador-host |
| iOS/workflow/plists/assets/XML | Sintaxe inspecionada na [Task3](task-3-report.md); não equivale a Swift compilado nem CI executado |
| Varredura limitada de padrões de credenciais pelo controlador | 77 fontes, sem ocorrência nos padrões procurados; não é auditoria completa nem prova de ausência de todo segredo |

APK final local: `apps/android/app/build/outputs/apk/debug/app-debug.apk`, **11.187.999 bytes**, SHA256 `dc9b913bcbe4102708cd1a46fee9194ae05274006991912e7efe1a1542f98aee`. Substitui os hashes anteriores no histórico da Task3. Captura do draft: SHA256 `8d7bae5716c8ebe75de2ed61f16fd31fd6f1f4d7994a4c0ac1c938cbbada63c1`. Resultados JUnit locais em `apps/android/app/build/test-results/testDebugUnitTest`; fonte dos testes e relatório são versionáveis, outputs não.

Versões registradas: Windows, Node24.19.0/npm11.17.0, Docker29.7.2, PostgreSQL17; TS5.9.3/Fastify5.12.7/pg8.16.3; Next16.4.3/React19.3.1; Gradle8.13/AGP8.13.2/Kotlin2.2.21/JDK17/API36/Build Tools35.0.0. iOS17+, Xcode16.4/XcodeGen2.44.1/iOS18.5 são **alvos configurados**, não ferramentas executadas nesta máquina. Versões e comandos completos estão nos READMEs e relatórios ligados acima.

## Conferências próprias da Task4

- `npm run verify:coverage`: conferência mecânica aprovada do hash do inventário original, igualdade exata de nomes/requisitos/rotas/contratos e contagens **12/46/22/44**, presença das quatro plataformas, status reconhecidos e existência das fontes/relatórios obrigatórios e disponibilidade das evidências locais opcionais declaradas. Não comprova comportamento do produto. O JSON e os relatórios são a base revisável da análise humana.
- Links relativos do README, coverage.md e deste documento conferidos no disco; referências locais ignoradas estão identificadas como locais. Fontes de marca e originais preservados.
- `git check-ignore`: configuração local, builds/caches, QA/snapshots/revisões ignorados; PDF/ZIP/índice e PNGs aprovados elegíveis para versionamento. Nenhuma remoção física.
- `git diff --check` e integridade do inventário original conferidos na entrega. Nenhuma lógica de app, dependência, DB, ambiente, serviço ou remoto foi alterado nesta tarefa; apenas novo script de integridade/documentação e regras Git.

## Limites e validações adicionais

- Build e XCTest macOS são acompanhados no CI do PR. Inspeção visual/interação nativa, Android emulator, rede host-emulador, aparelhos físicos e VoiceOver/TalkBack continuam pendentes. Fonte iOS não é runtime validado. Títulos de conteúdo Bricolage implementados em fonte com escala acessível; runtime/inspeção visual nativa não verificados. Corpo e navegação do sistema podem manter fonte nativa conforme a identidade aprovada.
- Provedores reais, email/SMS, identity/RBAC, pagamentos/crédito, documentos oficiais, tracking ao vivo, sinistros, convites/importação e worker de recorrência. A [cobertura](coverage.md) mantém o escopo completo e a [matriz JSON](coverage.json) enumera cada lacuna original.
- O código e o brandbook foram enviados ao PR autorizado, preservando o commit inicial remoto. Os jobs remotos são verificáveis nos links acima; configuração do workflow sozinha não prova sucesso. Assinatura, distribuição de aplicativos, merge e deploy não foram realizados.
- Não existe script lint: nenhum resultado lint é alegado. O skip PostgreSQL de `npm test` sem DATABASE_URL é esperado e distinto de falha. O teste separado carrega `.env.local` e usa tenants temporários; não substitui nem apaga o banco demo.

O workspace atual usa `docker start fretenow-postgres`; não execute o roteiro Compose de clone novo contra ele. Banco e credenciais locais foram preservados. API sempre loopback4100, Web3002, PostgreSQL55432. Android Debug usa10.0.2.2; iOS localhost requer API no mesmo Mac. Não houve exposição LAN/túnel. Relatórios ficam no repositório; APK, capturas, resultados de teste e QA local ficam no disco ignorado, ausentes em clones novos.

## Task4 revisão round1: clone LF/CRLF sem outputs locais

Corrigidos dois defeitos do verificador documental: hash dependente dos bytes CRLF do workspace e exigência de QA ignorado ausente em clones. O inventário original não foi modificado. `coverage.json` schema2 registra `hashBasis: utf8-no-bom-lf` (remover BOM inicial, converter CRLF em LF, SHA256 UTF-8), digest **5d380458b79e0b0439a3292ddcc1b45e1cebd518249dd2bda5493641ed4ef22f**. A igualdade exata das frases/rotas/contratos continua obrigatória.

Somente caminhos declarados em `localArtifacts` sob `output/` podem faltar como evidência; cada ausência gera `Optional local artifact absent: ...`. Fontes nunca são opcionais; relatórios fora de output não podem ser isentados. A única declaração atual é `output/implementation/qa/android-wire-api.json`; ela não substitui o relatório versionável. O verificador também confere referências das rotas.

Comandos executados: `node --test scripts/dev/verify-coverage.test.mjs` e `npm run verify:coverage`. Regressão observada antes da correção: fixture sem QA falhou por arquivo ausente; fixture CRLF com digest canônico falhou por hash. Após a correção: **5 testes aprovados, zero falhas/skips**, mais verificação real12/46/22/44 aprovada. Fixtures temporárias isoladas usam cópias de fontes/relatórios, sem DB/env: LF e CRLF passam; ausência opcional passa com aviso; evidência opcional presente passa sem aviso; remoção apenas da cópia de uma fonte ou relatório obrigatório produz falha explícita. Nenhuma evidência real foi renomeada/apagada para simular os casos. Não houve rerun de builds nem mudanças em aplicação.

## Correções finais dos três achados Minor

[Relatório final](final-fix-report.md): Home ordena uma cópia por createdAt descendente antes dos cinco registros; datas/defaults/limites Web usam calendário UTC explicitado nos rótulos. Dois testes focados passaram; typecheck e build Web **WojKHd--JjTJ7lEUspPPM** passaram. O controlador reiniciou Next3002 com esse build (sessão14678). Browser QA anterior permanece histórico, sem alegação de nova inspeção deste agente.

Android `assembleDebug` após fonte/tipografia: **BUILD SUCCESSFUL em 1m45s, 39 tasks (12 executadas,27 up-to-date)**. APK contém `res/font/bricolage_grotesque.ttf`. Os sete testes JVM anteriores não foram repetidos por não haver alteração de lógica/transporte. Debug/Release plists iOS foram analisados com plistlib e registram a fonte; não houve compilação iOS no Windows. Originais de marca e inventário de paridade preservados.

### CI coverage note after final review

Addressed in the GitHub packaging follow-up: `test:flow` now explicitly runs both `quote-attempt.test.ts` and `presentation.test.ts`. The existing CI step already invokes this script. `npm run test:flow --workspace=@fretenow/web` passed all **5 tests**, zero failures/skips, locally on2026-10-30. Remote results are tracked in PR #1 and its CI runs. See [Git handoff report](git-handoff-report.md) for attribute rules and byte-preservation checks; this changed test selection only, with no application logic/build/runtime change.
