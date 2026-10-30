# Task 4 - entrega reproduzível e cobertura

Data: 2026-10-30. Integração documental do primeiro incremento local, com objetivo completo preservado. Nenhuma alteração em lógica de app; nenhum subagente, commit, push, publicação, deploy, DB ou configuração de ambiente alterada por esta tarefa.

## Arquivos entregues

- `README.md`: arquitetura/limites em pt-BR, versões, startup separado para workspace atual versus clone novo, API/Web/PostgreSQL, SDK/Docker Android e geração/build/teste iOS em Mac, sessão demo compartilhada, rede loopback, marca aprovada e estado GitHub/CI.
- `docs/implementation/coverage.json`: inventário original preservado por hash e texto; **12 módulos,46 requisitos,22 entradas de rota,44 contratos**. Por plataforma: ação implementada, escopo parcial/fixture/ausente, fonte, evidência e lacunas. Contratos adicionais separados dos originais. Native runtime nunca marcado validado.
- `docs/implementation/coverage.md`: resumo legível, rotas substituídas/ausentes, contratos sem alias, pendências completas e evidência local versus versionável.
- `docs/implementation/verification.md`: resultados históricos com contagens/correções finais, comandos, versões, skips esperados e limitações. Android atualizado para **7 testes JVM** e hash do APK final; iOS/runtime nativo/CI remoto sem execução.
- `scripts/dev/verify-coverage.mjs` e script raiz `verify:coverage`: conferência determinística da integridade documental, sem rede, tokens ou mutation de dados.
- `.gitignore`: segredos/caches/builds/snapshots/revisões/QA e kit extraído ignorados; manual PDF, ZIP, índice e aplicações PNG aprovados continuam elegíveis e alcançáveis. Tudo preservado fisicamente.

## Conferências

`npm run verify:coverage` aprovado: igualdades exatas, hash original, contagens12/46/22/44, status por plataforma, caminhos locais de fontes/evidências e nenhuma alegação runtime nativa. Links README/cobertura/verificação e regras ignore conferidos; `git diff --check` sem erros. Builds/testes anteriores foram usados conforme relatórios, sem repetir build pesado nem apresentar execução histórica como nova. Não houve necessidade de alterar aplicação ou reparar integração.

## Limites remanescentes

Não há paridade completa dos12módulos. Web possui fluxo demo observado no browser; módulos com leitura vazia não estão concluídos. Android tem build/JVM/transporte em teste e corpo aceito pela API, sem UI/emulador. iOS só fonte/configuração/testes preparados, sem Xcode. Títulos nativos ainda não usam Bricolage. Provedores, auth real/RBAC e workflows comerciais faltantes permanecem no JSON requisito a requisito. Leow4u/Fretenow ADMIN/push confirmado; sem bloqueio de permissão GitHub. Reconciliação do histórico remoto e qualquer envio/publicação continuam sob responsabilidade do controlador, sem força de push. Nenhum bloqueio da Task4 permanece.

## Revisão round1 - reprodução em clone novo

Dois achados Important corrigidos no verificador: hash bruto dependente de CRLF e exigência de artefato local ignorado. Arquivos alterados: `scripts/dev/verify-coverage.mjs`, novo `scripts/dev/verify-coverage.test.mjs`, `coverage.json` schema2 e explicações em coverage.md/verification.md/README. O hash agora usa UTF-8 sem BOM e LF canônico: `5d380458b79e0b0439a3292ddcc1b45e1cebd518249dd2bda5493641ed4ef22f`. O inventário original foi preservado.

`localArtifacts` permite ausência explicitamente declarada apenas de output local, com aviso informativo; fontes e relatórios continuam obrigatórios. Casos isolados reproduziram os defeitos antes da correção. Verificação final: `node --test scripts/dev/verify-coverage.test.mjs` **5/5 aprovados, zero falhas/skips** (LF, CRLF, ausência/presença opcional, fonte obrigatória ausente, relatório obrigatório ausente); `npm run verify:coverage` aprovado12/46/22/44. `git diff --check` e inventário original inalterado conferidos. Nenhum DB/env/evidência real foi modificado; fixtures ficam no diretório temporário do sistema. Nenhuma mudança de app, build repetido, commit, push ou deploy. Nenhum bloqueio restante.

## Revisão round2 - teste sem dependência de QA ignorado

Correção mínima em `scripts/dev/verify-coverage.test.mjs`: o caso de evidência opcional presente escreve JSON sintético `{ "fixture": true }` na própria fixture, sem ler o QA real. Comando de conferência executado: `python C:/Users/leona/AppData/Local/Temp/fretenow-coverage-clean-check.py`. Esse helper temporário copia somente22 arquivos obrigatórios do repositório para um diretório novo, verifica que não há `output/` nem `.env.local`, e executa ali `node --test scripts/dev/verify-coverage.test.mjs` com TEMP/TMP limitados ao diretório temporário permitido.

Antes da correção, cópia `fretenow-coverage-clean-64b83y74`: **4 aprovados,1 falha ENOENT** no caso opcional presente. Depois, cópia `fretenow-coverage-clean-92ti10cm`: **5 aprovados,0 falhas,0 skips**. Isso verifica a própria suíte em formato de clone novo sem qualquer output ignorado. `git diff --check` e preservação do inventário original novamente conferidos. QA real, DB/env e código de aplicação permaneceram intactos; nenhum build, subagente ou operação remota. Os dois achados originais permanecem corrigidos e não há bloqueio restante.
