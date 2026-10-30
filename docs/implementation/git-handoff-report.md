# GitHub handoff - packaging and repeatable checks

Data: 2026-10-30. Follow-up de empacotamento para Leow4u/Fretenow, após aprovação da revisão da aplicação. Sem mudança de lógica, reconstrução, API/runtime, banco/ambiente, dependências, index Git, commits, pushes ou deploys por esta tarefa. O controlador é responsável pela cópia de staging, index e validação real de checkout.

## Alterações exatas

- `.gitattributes` novo na raiz: `* text=auto`; PDF/ZIP/fontes/imagens/JAR e outros pacotes binários com macro `binary` (`-text -diff -merge`). Isso evita que um PDF composto de bytes ASCII seja tratado como fonte textual.
- `*.svg -text whitespace=cr-at-eol`: preserva os bytes e CRLF originais dos vetores aprovados, mantendo diff textual e permitindo o CR terminal legítimo. Outros avisos de whitespace continuam disponíveis.
- `gradlew`, `*.sh`, `*.bash`: `text eol=lf`; `*.bat` e `*.cmd`: `text eol=crlf`. A escolha independe de `core.autocrlf=true`, sem regravar wrappers existentes.
- Oito caminhos explícitos das licenças Bricolage/Instrument em docs/brand/assets/fonts, apps/web/public/brand, apps/ios/licenses e apps/android/licenses: `-text whitespace=-blank-at-eol`. Preserva o original upstream, inclusive o espaço final da linha21. Não há isenção genérica para arquivos de texto nem edição das licenças.
- `apps/web/package.json`: `test:flow` passa a `tsx --test test/quote-attempt.test.ts test/presentation.test.ts`. O step CI já chama esse script e agora seleciona ambas as suítes.
- `docs/implementation/verification.md`: lacuna CI registrada como corrigida; execução remota continua não realizada.

## Checks executados

- `npm run test:flow --workspace=@fretenow/web`: **5 testes aprovados,0 falhas,0 skips**. Inclui Home ordenado, calendário UTC, resposta de cotação atrasada, rejeição definitiva e retry incerto. Executado uma vez nesta tarefa; nenhum build/teste pesado repetido.
- `git check-attr text eol diff merge whitespace -- ...`: leitura das regras para PDF, ZIP, JAR, gradlew, BAT, fonte, PNG, SVG, licença e fonte TS. Binários com text/diff/merge unset; wrapper LF; BAT CRLF; SVG e OFL sem conversão, com exceções de whitespace específicas; TS continua text=auto.
- Snapshot SHA256 antes/depois de **54 arquivos** de assets/licenças/metadata nativos/wrapper: bytes preservados. Inclui manual PDF, ZIP, aplicações PNG, vetores/fontes originais e cópias nos clientes. Snapshot local em `C:/Users/leona/AppData/Local/Temp/fretenow-packaging-bytes-before.json`; nenhuma renormalização, reexportação ou edição desses arquivos.
- `git diff --check`: sem erros. É uma checagem do workspace, não a validação do index da cópia de staging. Nenhuma operação de index foi executada aqui.

A conferência efetiva de bytes no index e no checkout com core.autocrlf=true e `git diff --cached --check` pertence ao controlador na cópia `C:/Users/leona/AppData/Local/Temp/fretenow-github-handoff-20261030`. Este relatório não a apresenta como já executada. Não há bloqueio desta tarefa; runtime nativo/iOS/providers e CI remoto mantêm os limites documentados anteriormente.

## Controller checkout verification

The staged Git index was exported into a new temporary directory with core.autocrlf=true. All150 intended project files were present;49 protected binary/vector/license files matched their reviewed source SHA256 exactly. gradlew remained LF and gradlew.bat used CRLF. Coverage verification passed in that checkout without ignored runtime output or environment secrets. git diff --cached --check passed. Local proof: output/implementation/github-checkout-proof.json (ignored). Narrow packaging review approved. No remote write or CI execution occurred.
