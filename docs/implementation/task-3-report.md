# Task 3 — clientes nativos e CI

Data: 2026-10-30. Incremento nativo local de demonstração; sem paridade completa com os doze módulos, sem contratação real, pagamentos, notificações, assinatura de distribuição ou deploy. Nenhum commit/push/execução remota foi realizado por esta tarefa. O coordenador confirmou ADMIN/push no novo repositório Leow4u/Fretenow; isso não equivale a evidência de CI executado.

## Arquivos e arquitetura

- `apps/android`: Gradle Wrapper oficial, configuração SDK36/min26, Kotlin/Compose Material3, manifestos e cleartext restrito ao Debug, ícones adaptativo/monochrome aprovados, logo, licenças, modelos serializáveis, serviço HTTP off-main, ViewModel com escopo de corrotinas, interface nativa e testes JVM.
- `apps/ios`: projeto XcodeGen com bundle `com.fretenow.app`, iOS17+, Observation/SwiftUI, TabView com NavigationStack independente, modelos Codable, URLSession ephemeral injetada por protocolo, telas compostas, fixture PreviewAPI sem rede, XCTest, ATS local apenas Debug, ícone/logo aprovados e licenças.
- `.github/workflows/ci.yml`: PR/workflow_dispatch, contents:read, jobs independentes web-api/android/ios com timeouts e artifacts. Sem secrets de assinatura, sem publicação.
- READMEs em cada app descrevem comandos, rede local, perda de sessão/intenção em encerramento do processo e limites de produção. Nenhum arquivo original do brandbook, Web, API ou ambiente foi alterado.

## Cobertura funcional

| Ação | Android | iOS |
|---|---|---|
| Login demo real, token Bearer só em memória | Implementado | Implementado, não compilado |
| Signout real e expiração 401 | Implementado | Implementado, não compilado |
| Home/lista real, busca, refresh/retry, vazio/loading/erro | Implementado | Implementado, não compilado |
| Detalhe/histórico com IDs do servidor | Implementado | Implementado, não compilado |
| LTL/FTL/Expedited, endereços US completos, data UTC | Implementado | Implementado, não compilado |
| Um item de carga, quantidade/lb/in, accessorial labels | Implementado | Implementado, não compilado |
| Dados de exemplo, validação, cotações reais | Implementado | Implementado, não compilado |
| Confirmação explícita com rota/preço/carrier | Implementado | Implementado, não compilado |
| Reserva com UUID estável em retry de resposta incerta | Implementado/testado JVM | Implementado/XCTest preparado |
| Invalidar tarifas ao editar, congelar durante requisição | Implementado | Implementado, não compilado |
| Expiração de tarifa e erros definitivos permitem recotar | Implementado | Implementado, não compilado |
| Após sucesso: ID servidor, refresh lista/detalhe | Implementado | Implementado, não compilado |
| Cancelar/reagendar | Pendente explícito | Pendente explícito |
| Outros módulos | Tela pending explícita | Tela pending explícita |

Cotação e reserva usam a mesma API4100; nenhum preço/regra comercial local é calculado. Validações físicas e de endereço são conveniência de formulário; o servidor continua autoritativo. Uma única linha de carga é editável nesta versão, embora o contrato suporte várias. Não há ações de salvar fictícias nos módulos pendentes.

Enquanto uma reserva está sem resposta conclusiva, mantém-se draft/rate/UUID e o formulário permanece congelado; Retry envia a mesma operação. Erros HTTP400/404/409 definitivos descartam a tarifa e desbloqueiam recotação. HTTP401 limpa sessão e apresenta login. Após resposta de sucesso, guarda-se o ID imediatamente antes das leituras de refresh; falha nessas leituras não permite reenviar a reserva como nova. O token e a intenção não persistem em disco: após encerramento do processo, o README orienta atualizar Home após entrar novamente antes de repetir reserva incerta.

## Versões e fontes primárias verificadas

- AGP8.13.2, Gradle8.13, JDK17, compile/target36, Build Tools35.0.0: [compatibilidade oficial AGP8.13](https://developer.android.com/build/releases/agp-8-13-0-release-notes). A página confirma API máxima36.1, Gradle8.13, JDK17 e Build Tools35.0.0; 8.13.2 suporta Kotlin2.3. Foi usado Kotlin2.2.21 com plugin Compose da mesma versão.
- Compose BOM2025.08.01, Activity1.10.1, Lifecycle2.9.3, coroutines1.10.2, serialization1.9.0, JUnit4.13.2: versões exatas nos arquivos Gradle. [Mapeamento BOM oficial](https://developer.android.com/develop/ui/compose/bom/bom-mapping) e [plugin Compose para Kotlin2+](https://developer.android.com/jetpack/androidx/releases/compose-kotlin). O build resolve os artefatos oficiais Google/Maven Central, sem repositórios alternativos.
- Gradle Wrapper gerado por `gradle:8.13-jdk17`, JAR SHA256 `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f`, verificado contra [checksum oficial](https://services.gradle.org/distributions/gradle-8.13-wrapper.jar.sha256). Distribution SHA256 `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`, fixado em properties e verificado pelo Wrapper contra [distribuição oficial](https://services.gradle.org/distributions/gradle-8.13-bin.zip.sha256).
- iOS17 deployment; CI macos-15/Xcode16.4/iOS18.5 conforme [inventário oficial do runner](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md); XcodeGen2.44.1 via Mint conforme [release oficial](https://github.com/yonaskolb/XcodeGen/releases/tag/2.44.1). A seleção de simulator filtra aparelhos iPhone disponíveis no runtime18.5 compatível. Se a imagem deixar de conter essa combinação, o job falhará explicitamente e deverá ser atualizado.
- [ATS NSAllowsLocalNetworking](https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nsallowslocalnetworking), aplicado somente ao Debug/localhost. Release não contém arbitrary loads nem cleartext Android. Nenhum endpoint de produção está configurado; placeholders HTTPS usam `unconfigured.invalid`.
- Aplicada a skill [Build iOS Apps / SwiftUI UI Patterns](skill://plugins~Plugin_f1b845ac33888191ac156169c58733c2/swiftui-ui-patterns/SKILL.md), incluindo app-wiring, async-state e navigationstack.

## Verificações executadas e limites

1. Leitura inicial do brief, contrato HTTP, tipos compartilhados e relatório Task1. Docker/SDK já fornecidos pelo coordenador; nenhum SDK do sistema foi alterado. Montagens apenas apps/android, volume SDK e cache Gradle.
2. Primeira geração de wrapper sem scaffold falhou porque `/project` ainda não era build Gradle. Após criar settings/build, `gradle wrapper --gradle-version 8.13 --distribution-type bin` passou (`BUILD SUCCESSFUL`, 1m39s). SHA256 do JAR e da distribuição foram obtidos das URLs oficiais e comparados/gravados; erro intermediário de decodificação de bytes PowerShell foi corrigido usando leitura explícita UTF8 Python antes de executar o build.
3. Comando de build/test local:

```powershell
docker run --rm --user root -e ANDROID_HOME=/opt/android-sdk -e GRADLE_USER_HOME=/home/gradle/.gradle -v fretenow-android-sdk:/opt/android-sdk -v fretenow-gradle-cache:/home/gradle/.gradle -v "${PWD}/apps/android:/project" -w /project gradle:8.13-jdk17 bash ./gradlew assembleDebug testDebugUnitTest --no-daemon
```

Primeira execução: `assembleDebug` passou e gerou `app-debug.apk` (10.934.802 bytes). `testDebugUnitTest` falhou na compilação do teste adicional de transporte porque `com.sun.net.httpserver.HttpServer` não está no classpath Android. O teste foi migrado para MockWebServer 4.12.0 e a verificação repetida: **BUILD SUCCESSFUL em 4m17s, 45 tasks, 6 testes, zero falhas/erros/skips** (FreightTest 5 + HttpContractTest 1). O teste de transporte comprova POST sem corpo/Content-Type no login, Bearer e JSON de Draft reais via HttpURLConnection/MockWebServer; não substitui prova contra API4100/emulador. **Verificação final após separar ícones v26/v33: BUILD SUCCESSFUL em 44s, 45 tasks (9 executadas, 36 up-to-date)**; APK recomposto e os seis testes permaneceram válidos/up-to-date. Warnings: processamento SDK XML versão4 com parser versão3; `kotlinOptions.jvmTarget` deprecado; biblioteca androidx.graphics.path não stripped, mantida no APK. Nenhum erro de SDK. APK local em `apps/android/app/build/outputs/apk/debug/app-debug.apk`; resultados JUnit em `apps/android/app/build/test-results/testDebugUnitTest`, relatório HTML em `apps/android/app/build/reports/tests/testDebugUnitTest/index.html`. Esses outputs/caches estão ignorados por git; verificado por `git check-ignore`.

As primeiras execuções montaram o cache em `/root/.gradle`; uma verificação restrita de caminhos/montagens revelou o symlink dessa pasta para `/home/gradle/.gradle` e um volume anônimo da imagem, causando download repetido. O cache de dependências foi copiado para o volume nomeado; o comando final acima corrige o destino e explicita `GRADLE_USER_HOME`. SDK/artefatos da aplicação não foram alterados por isso. Uma tentativa de inspecionar todas as variáveis do contêiner foi **negada pela revisão automática**, por possível exposição de credenciais. Não foi repetida; consultas apenas de caminhos, tamanhos e nomes de volume foram aprovadas e concluídas. Nenhuma credencial foi lida e nenhum deliverable permaneceu bloqueado por essa negação.

APK anterior à revisão round 1: 10.935.313 bytes, SHA256 `D4E2B655A96447F5D5A77764871585832715892B0E5B7A44CD354A2231DC16DA`. Substituído pelo APK corrigido abaixo.

4. YAML do workflow e project.yml lidos com PyYAML; plists Debug/Release com plistlib, Contents.json dos assets com json e XMLs Android com ElementTree: passaram, incluindo repetição final. Isto valida sintaxe de arquivos, não compila Swift nem executa Actions.
5. XCTest preparado para contrato/campos exatos, timestamps fracionários e inteiros, validação física/calendário, invalidação de tarifa, expiração de sessão e retry mantendo corpo/chave/ID servidor. **Não executado**: host Windows sem Xcode/macOS/SDK iOS. Não houve tentativa de assinar ou acessar certificados.
6. CI configurado com npm ci, testes API/Postgres real de serviço17, typecheck backend/Web, testes do estado Web, adapter Web contra API loopback, build Web; Android SDK/JDK17/wrapper validation/testes/APK; iOS geração/testes/xcresult/app. **Nenhum job remoto executado nesta tarefa**. O coordenador trata integração e eventual publicação.
7. Não foram executados emulator/simulator, inspeção visual nativa, testes em aparelhos, VoiceOver/TalkBack ou prova de rede host-emulador. Essas validações continuam pendentes; nenhuma captura de UI é apresentada como evidência.

## Rede e próximos limites

Android emulador padrão usa10.0.2.2:4100 no Windows; iOS simulator usa localhost:4100 quando a API roda no mesmo Mac. API4100 permanece loopback. Dispositivo físico e iOS em outro Mac não podem alcançar automaticamente a API Windows. É necessária configuração remota HTTPS/túnel autorizada posteriormente; esta tarefa não expôs porta LAN. Autenticação real, providers, produção e múltiplas linhas de carga continuam trabalho futuro.

## Revisão round 1 — JSON Android com valores padrão obrigatórios

Achado confirmado: `HttpFreightApi` usava Kotlin serialization com `encodeDefaults=false` implícito. `Draft.example()` saía apenas com `origin`, `destination` e `items`, omitindo mode, pickupDate, accessorials, country e números de carga iguais aos padrões. O servidor exige esses campos; as cotações falhavam com 400. A decodificação do corpo no próprio modelo Kotlin restaurava os padrões e mascarava o defeito no teste anterior. Os seis testes iniciais não demonstravam conformidade do JSON enviado.

Correção restrita a `apps/android/app/src/main/java/com/fretenow/app/Api.kt`: `encodeDefaults=true` no Json do serviço, preservando ignoreUnknownKeys e explicitNulls. Os modelos e regras comerciais não mudaram. iOS/Web/API/CI e ambientes não foram alterados nesta rodada.

`HttpContractTest` agora inspeciona o JSON capturado pelo MockWebServer sem decodificar em modelos com defaults: conjunto de chaves, strings de modalidade/data/endereços/country, array de accessorials, array de itens, quantidade inteira e medidas numéricas. Faz isso para `/api/v1/rates` e para o draft aninhado em `/api/v1/shipments`; também verifica Content-Type, caminho/método, Bearer e repetição do mesmo corpo/Idempotency-Key após HTTP 500. `FreightTest` continua cobrindo estado, expiração, invalidação e preservação da intenção.

Reprodução antes da correção (produção ainda sem encodeDefaults):

```powershell
docker run --rm --user root -e ANDROID_HOME=/opt/android-sdk -e GRADLE_USER_HOME=/home/gradle/.gradle -v fretenow-android-sdk:/opt/android-sdk -v fretenow-gradle-cache:/home/gradle/.gradle -v "${PWD}/apps/android:/project" -w /project gradle:8.13-jdk17 bash ./gradlew testDebugUnitTest --tests com.fretenow.app.HttpContractTest --no-daemon
```

Resultado: **BUILD FAILED em 1m08s, 2 testes executados, 2 falhas**, ambos com `expected [mode, origin, destination, pickupDate, items, accessorials] but was [origin, destination, items]`. Falha de asserção, não compilação.

Verificação após a correção:

```powershell
docker run --rm --user root -e ANDROID_HOME=/opt/android-sdk -e GRADLE_USER_HOME=/home/gradle/.gradle -v fretenow-android-sdk:/opt/android-sdk -v fretenow-gradle-cache:/home/gradle/.gradle -v "${PWD}/apps/android:/project" -w /project gradle:8.13-jdk17 bash ./gradlew testDebugUnitTest --tests com.fretenow.app.HttpContractTest --tests com.fretenow.app.FreightTest assembleDebug --no-daemon
```

Resultado: **BUILD SUCCESSFUL em 1m15s, 45 tasks (9 executadas, 36 up-to-date), 7 testes aprovados (HttpContractTest 2 + FreightTest 5), zero falhas/erros/skips**. São todas as classes da suíte JVM Android atual. Produção e testes recompilaram, testes executaram e APK foi remontado. Permaneceu o warning de versão do XML SDK já documentado; sem erro de SDK ou bloqueio de ferramenta.

APK corrigido: `apps/android/app/build/outputs/apk/debug/app-debug.apk`, **10.935.313 bytes**, SHA256 **`8e95ca94586e97509f3319ada5ea21ae3882050da182a317482203e70b7d72cb`**.

Corpos sintéticos realmente capturados nessa execução, exportados somente após asserções passarem:

- `apps/android/app/build/test-output/quote-draft.json`: 423 bytes, SHA256 `8d7bae5716c8ebe75de2ed61f16fd31fd6f1f4d7994a4c0ac1c938cbbada63c1`; LTL, pickupDate 2026-10-31, duas country US, todos os campos numéricos e accessorials vazio explícitos.
- `apps/android/app/build/test-output/booking-request.json`: 462 bytes, SHA256 `b3528c22989f484a53da78522ef27af4fcea9619f61bc7dd8dd013673f965bb7`; rateId sintético e draft completo. Não é uma tarifa real para reserva na API.

Ambos os artefatos são gerados/ignorados por git (`git check-ignore` confirmou), sem cabeçalhos, token, chave idempotente ou credenciais. O coordenador pode enviar o quote-draft capturado à API4100 para confirmar aceitação pelo servidor. Esta rodada comprova o JSON e o transporte nativo em teste JVM; não a execução em emulador, nem um replay API4100 realizado por este agente. iOS e CI remoto continuam sem execução neste ambiente.

## Final Minor fix - branded content titles

Bricolage title typography is now implemented in source for Android Material headline/title styles (sp font scaling) and iOS brand/content headings (`Font.custom`, semantic relativeTo/Dynamic Type). Functional body and native navigation chrome retain system fonts. Approved TTF copied unchanged to Android res/font and iOS Resources/Fonts; name-table PostScript name `BricolageGrotesque-96ptExtraBold`, default weight800. Both iOS configuration plists register UIAppFonts; XcodeGen explicitly includes Resources in resource phase. Runtime/large-text/assistive-technology validation remains unexecuted; iOS has not compiled on Windows. Applied SwiftUI UI Patterns skill as in the original task.

Android final `assembleDebug` with existing Docker SDK/cache: **BUILD SUCCESSFUL in1m45s,39 tasks (12 executed,27 up-to-date)**. APK **11,187,999 bytes**, SHA256 **`dc9b913bcbe4102708cd1a46fee9194ae05274006991912e7efe1a1542f98aee`**, superseding earlier historical hashes. APK zip contains the new font resource. Seven historical JVM tests were not rerun for UI/resource-only changes. Full scoped change list and checks: [final-fix-report.md](final-fix-report.md). No DB/env/remote changes.
