# FreteNow

Primeiro incremento executável local do portal de fretes, com a identidade FreteNow aprovada. Web em Next.js/React, API Fastify/TypeScript com PostgreSQL, Android Kotlin/Compose e iOS SwiftUI. Todos usam a organização sintética `demo-fretenow`, os mesmos IDs de embarque e o mesmo contrato HTTP. USD, lb, in e endereços US fazem parte deste incremento.

O fluxo local cobre acesso demo, cotação, revisão, reserva persistida e consulta. A Web também cancela, reagenda, repete embarques e exporta CSV. Os outros módulos possuem leituras parciais ou permanecem pendentes. **Não é paridade completa nem operação comercial**: tarifas são calculadas pelo provedor demo; nenhuma transportadora, cobrança, mensagem, convite ou sinistro real é acionado. A API exige PostgreSQL em execução; MemoryStore existe apenas para testes, sem fallback em runtime.

Consulte a [especificação completa](docs/superpowers/specs/2026-10-30-linklane-multiplatform-design.md), o [inventário original preservado](docs/research/linklane-parity.json), a [cobertura dos 12 módulos](docs/implementation/coverage.md) e o [contrato implementado](docs/implementation/api-contract.md). A matriz [JSON](docs/implementation/coverage.json) conserva cada requisito, rota e contrato original, inclusive os ainda não implementados.

## Ambiente local

Comandos executados a partir da raiz, salvo indicação contrária. Versões verificadas neste workspace: Node **24.19.0**, npm **11.17.0**, Docker **29.7.2**, PostgreSQL **17** (Compose fixa `17.7-alpine`), TypeScript **5.9.3**, Fastify **5.12.7**, Next.js **16.4.3**, React **19.3.1**. Use Node 24.x e o lockfile com `npm ci`.

### Workspace atual no Windows

O banco já existe: contêiner `fretenow-postgres`, volume `fretenow-postgres-data`, bind `127.0.0.1:55432`. Sua senha aleatória está em `.env.local`, ignorado pelo Git. **Preserve esse arquivo e o volume**. Neste workspace use `docker start`, sem iniciar outro Compose na mesma porta e sem copiar `.env.example` por cima da configuração existente.

```powershell
docker start fretenow-postgres
npm ci
npm run start:api
```

Em outro terminal na raiz:

```powershell
npm run dev:web
```

Abra **http://127.0.0.1:3002** e escolha **Open demo workspace**. API: `http://127.0.0.1:4100/health`. Os scripts carregam `.env.local`; `WEB_ORIGIN` deve ser `http://127.0.0.1:3002`, sem barra final. A porta 3000 já era usada por outro serviço; mantenha 3002. Para desenvolvimento da API com watch, use `npm run dev:api`. O processo da API deve estar em um terminal separado.

### Clone novo e banco novo

Execute esta opção apenas em um ambiente sem o banco atual nem outro serviço na porta 55432. Ela cria seu próprio volume Compose e não reutiliza automaticamente o volume nomeado acima.

```powershell
if (Test-Path -LiteralPath .env.local) { throw 'Configuracao existente: preserve .env.local e use o roteiro do workspace atual.' }
Copy-Item -LiteralPath .env.example -Destination .env.local
npm ci
docker compose up -d postgres
docker compose ps
npm run start:api
```

Aguarde o PostgreSQL ficar `healthy` antes da API; a migração idempotente é aplicada na inicialização. No segundo terminal: `npm run dev:web`. Em macOS/Linux, o equivalente da cópia protegida é `test -e .env.local || cp .env.example .env.local`; leia a configuração existente antes de iniciar Compose. O exemplo e o Compose usam a senha intencionalmente **local e demo** `local-demo-only`, sem segurança de produção. Não substitua a senha do banco já existente por esse exemplo.

Para servir o build Web local, encerre o processo Web de desenvolvimento antes de ocupar a mesma porta:

```powershell
npm run build:web
npm run start:web
```

O build Web não exige API ativa. O servidor Next encaminha `/api/*` para `API_BASE_URL` (padrão `http://127.0.0.1:4100`), variável apenas do servidor. A API limita bind a loopback, exige `APP_MODE=demo`, recusa `NODE_ENV=production` e não se torna uma API de produção por usar o build Web otimizado.

## Android

API 26+, compile/target SDK 36, Build Tools 35.0.0, JDK 17, Gradle Wrapper 8.13, AGP 8.13.2, Kotlin 2.2.21 e Compose BOM 2025.08.01. Com Android SDK instalado e `ANDROID_HOME` configurado, na pasta `apps/android`:

```powershell
.\gradlew.bat testDebugUnitTest assembleDebug
```

Em macOS/Linux: `bash ./gradlew testDebugUnitTest assembleDebug`. O comando Docker abaixo foi executado neste Windows e pressupõe os volumes **já preparados** `fretenow-android-sdk` (SDK36/Build Tools35.0.0) e `fretenow-gradle-cache`; criar volumes vazios não instala o SDK. Execute a partir da raiz:

```powershell
docker run --rm --user root -e ANDROID_HOME=/opt/android-sdk -e GRADLE_USER_HOME=/home/gradle/.gradle -v fretenow-android-sdk:/opt/android-sdk -v fretenow-gradle-cache:/home/gradle/.gradle -v "${PWD}/apps/android:/project" -w /project gradle:8.13-jdk17 bash ./gradlew testDebugUnitTest assembleDebug --no-daemon
```

Artefato local: `apps/android/app/build/outputs/apk/debug/app-debug.apk`. O relatório final registra **7 testes JVM**, APK recomposto e JSON Kotlin aceito pela API com três tarifas demo. Isso não comprova execução da UI ou conectividade do emulador. Debug aponta para `http://10.0.2.2:4100` no emulador Android padrão do host da API. Consulte [rede, comandos e limites Android](apps/android/README.md).

## iOS em um Mac

Fonte para iOS17+, Xcode16.4, XcodeGen2.44.1 e simulator iOS18.5. Nesta máquina Windows **não houve compilação Swift, XCTest, simulator, assinatura ou publicação**. No Mac, execute primeiro o roteiro de clone novo/API nesse mesmo Mac. Em seguida:

```sh
cd apps/ios
brew install mint
mint run yonaskolb/XcodeGen@2.44.1 xcodegen generate
xcrun simctl list devices available
xcodebuild build -project FreteNow.xcodeproj -scheme FreteNow -configuration Debug -destination 'generic/platform=iOS Simulator' -derivedDataPath build CODE_SIGNING_ALLOWED=NO
xcodebuild test -project FreteNow.xcodeproj -scheme FreteNow -configuration Debug -destination 'platform=iOS Simulator,id=YOUR_AVAILABLE_UDID' -derivedDataPath build -resultBundlePath "build/TestResults-$(date +%Y%m%d-%H%M%S).xcresult" CODE_SIGNING_ALLOWED=NO
```

Troque `YOUR_AVAILABLE_UDID` pelo iPhone disponível no runtime18.5. Debug usa `http://localhost:4100`; esse localhost é o **Mac**, não o Windows. Dispositivos físicos e um Mac separado não acessam automaticamente a API loopback do Windows. Endpoint HTTPS/túnel autorizado, testes em aparelhos e configuração de distribuição são trabalho posterior. Consulte o [README iOS](apps/ios/README.md).

## Verificação e limites

```powershell
npm test
npm run test:postgres
npm run typecheck
npm run typecheck:web
npm run test:flow --workspace=@fretenow/web
npm run test:api --workspace=@fretenow/web
npm run build:web
npm run verify:coverage
node --test scripts/dev/verify-coverage.test.mjs
```

`test:api` requer a API local ativa; `test:postgres` carrega `.env.local` e cria/remove apenas seus tenants de teste. `npm test` ignora o teste PostgreSQL quando `DATABASE_URL` não está no ambiente do processo; o comando separado cobre esse caso. O verificador de cobertura aceita LF/CRLF e avisa quando o QA local opcional não está no clone; fontes e relatórios continuam obrigatórios. Sua regressão usa apenas cópias temporárias, sem tocar no banco ou ambiente. Não há comando lint configurado. Resultados, contagens, evidências e verificações não executadas estão em [verification.md](docs/implementation/verification.md) e [browser-qa.md](docs/implementation/browser-qa.md).

Autenticação é demo (cookie HttpOnly Web; Bearer apenas em memória nativa), sem login real por email/RBAC. Todos os acessos demo usam a mesma organização; isso permite observar os mesmos IDs, não cria contas pessoais isoladas. Sessão dura uma hora. Após encerramento do app nativo, sessão e intenção de reserva se perdem: entre novamente e atualize Home antes de repetir uma reserva com resultado incerto. Cancelamento/reagendamento nativos, múltiplas linhas nativas, providers, pagamentos, documentos, tracking ao vivo, claims e recorrência continuam pendentes. Títulos nativos ainda usam fonte do sistema; alinhamento com Bricolage permanece pendente.

O projeto está publicado na branch `codex/fretenow-foundation` de **Leow4u/Fretenow**, no [PR #1](https://github.com/Leow4u/Fretenow/pull/1). O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) executa Web/API, Android e iOS; acompanhe os resultados e artefatos nos [runs do CI](https://github.com/Leow4u/Fretenow/actions). O commit inicial remoto foi preservado, sem force push, e o antigo remoto permanece como `previous-origin`. O PR não executa merge, deploy, assinatura ou distribuição nas lojas.

## Identidade aprovada e distribuição

[Registro de marca](docs/brand/README.md), [manual aprovado PDF](output/brandbook/FreteNow-Brandbook-v1.0.pdf), [kit ZIP](output/brandbook/FreteNow-Kit-de-Marca-v1.0.zip) e [índice visual](output/brandbook/index.html). Fontes/licenças e matrizes estão em `docs/brand/assets`; os clientes reutilizam cópias aprovadas. O índice contém aplicações de marca ilustrativas, não evidência de runtime.

PDF, ZIP, índice e PNGs aprovados estão versionados e publicados na branch do PR. Duplicatas extraídas do kit, QA/renderizações, snapshots de revisão, APK e logs ficam preservados no disco, ignorados pelo Git. Capturas locais citadas nos relatórios não estarão disponíveis em um clone novo; a evidência textual versionável explicita essa distinção. O ZIP é a distribuição completa das peças de marca.
