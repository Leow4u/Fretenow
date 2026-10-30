# FreteNow — reprodução do LinkLane para Web, iOS e Android

Data: 30/10/2026. Estado: proposta técnica para revisão; não é uma aplicação implementada.

## Direção confirmada pelo usuário

Reproduzir a aplicação inteira do LinkLane no FreteNow, usando o estudo REA como referência de telas, funcionalidades e comportamento. Entregar versões Web, iOS e Android. Usar o plugin Build iOS Apps no desenvolvimento iOS. O usuário não tem Mac e propôs usar o GitHub para realizar a compilação.

O usuário informou que já possui conta Apple Developer e certificado. Não é necessário planejar a criação de uma nova conta. A validade, a chave privada, os perfis e o vínculo com o identificador do FreteNow ainda não foram verificados.

A proposta anterior de portal híbrido ou piloto comercial não é o escopo deste projeto. Os estudos de Lalamove, Transvias, Simpla e CoteFrete permanecem como pesquisa; não acrescentam requisitos nem substituem o LinkLane.

## Abordagem proposta e alternativas consideradas

**Recomendação:** três interfaces próprias da plataforma e uma API central. Web em React/Next.js e TypeScript, iOS em SwiftUI usando Build iOS Apps, Android em Kotlin/Jetpack Compose. A API e a base de dados mantêm os mesmos usuários, cotações, embarques, documentos e eventos nas três interfaces.

Alternativas consideradas:

- Uma interface web empacotada em aplicativos: reduz duplicação visual, mas não atende ao objetivo de usar SwiftUI e os padrões nativos solicitados com a mesma profundidade.
- Uma base de interface multiplataforma: compartilha mais código de apresentação, mas não utiliza diretamente a especialização SwiftUI do plugin escolhido e introduz outra estratégia de interface.
- Interfaces nativas com backend comum: exige implementar e testar três apresentações, mas preserva o comportamento do LinkLane com controles e navegação apropriados a cada plataforma. Esta é a recomendação, ainda sujeita à revisão do usuário.

## Fidelidade e limites

- Web: reproduzir hierarquia, layout, componentes, navegação, formulários e estados observados do LinkLane. Marca do projeto: FreteNow.
- Mobile: preservar informações, ações, validações e sequência dos fluxos; adaptar apresentação a telas menores e navegação nativa. Não presumir a existência de aplicativos nativos originais do LinkLane: o REA estudou seu portal web.
- Preservar inicialmente terminologia, modalidades, unidades e moeda observadas. Tradução e mudanças de regras para o Brasil exigem uma decisão posterior, sem serem introduzidas silenciosamente.
- Reprodução funcional não inclui reproduzir defeitos identificados: endereço incompleto, cache de tarifa desatualizado e autorização apenas na interface precisam de tratamento correto.
- O estudo não recuperou o backend privado, algoritmos de preço, credenciais, contratos com transportadoras, processamento financeiro ou workers de produção.
- Dados de desenvolvimento serão identificados como demonstração. Um teste com provedor simulado não comprova cotação, pagamento, rastreamento ou contratação reais.
- O REA contém estados vazios, contratos e inferências. Quando uma regra não estiver demonstrada, registrar a decisão de implementação como hipótese, mantendo sua origem visível na matriz de cobertura.

## Cobertura obrigatória

Todos os módulos abaixo pertencem ao escopo das três plataformas. Implementar por etapas não reduz o escopo final.

| Módulo | Comportamento a reproduzir |
|---|---|
| Acesso e onboarding | Acesso por link, sessão, cinco etapas de boas-vindas, empresa, coleta e faturamento; variações por papel. |
| Home | Pendências, busca, grupos de embarques, checklist, atalhos para repetir e agendar. |
| Cotação e confirmação | LTL, FTL, Expedited, carga/volumes/densidade, endereços e adicionais, tarifas, detalhes, confirmação e resultado; cotação assistida e extração de texto. |
| Embarques | Lista, filtros, busca, detalhe, histórico, documentos, preço, ocorrências, cancelamento e reagendamento. |
| Rastreamento e avisos | Linha do tempo, mapa, compartilhamento, seguidores e link de motorista quando houver integração disponível. |
| Analytics | Períodos, indicadores derivados dos embarques e exportação CSV. |
| Documentos | Confirmação de tarifa, BOL, POD e faturas, com visualização e download/compartilhamento. |
| Pagamentos e crédito | Meios de pagamento, situação das faturas, solicitação de condições de crédito e contestação de adicionais. |
| Sinistros | Elegibilidade, abertura, detalhes, anexos, notas e acompanhamento. |
| Configurações e equipe | Empresa, locais, contatos, preferências, faturamento, membros, convites e importação de locais/modelos de rota. |
| Recorrências | Criar, alterar, pausar, retomar, encerrar e pular ocorrências; janelas e bloqueios. |
| Comparação de proposta | Envio de proposta concorrente, histórico e estados de avaliação/oferta. |

A lista de rotas, fontes e limites de cada módulo está em `docs/research/linklane-parity.json`. Os 44 contratos identificados são referência de comportamento; sua presença no frontend não comprova implementação ou sucesso no servidor original.

## Estrutura proposta

```text
apps/web/              interface React/Next.js
apps/ios/              aplicativo SwiftUI e testes Xcode
apps/android/          aplicativo Kotlin/Compose e testes Android
services/api/          autenticação, domínio e integrações
packages/contracts/   especificação OpenAPI e esquemas de dados
packages/fixtures/    cenários sintéticos, sem credenciais ou dados privados
docs/research/         matriz de paridade e origem das decisões
.github/workflows/    validação separada por plataforma
```

Proposta de backend: TypeScript e PostgreSQL, com armazenamento de anexos separado e execução de tarefas para recorrências/notificações. Seleção de bibliotecas, hospedagem e fornecedor de armazenamento fica com o implementador, após verificar versões e compatibilidade. Nenhum serviço pago será provisionado como parte da preparação local.

Unidades principais: conta/organização, usuário/membro, local, rascunho de carga, tarifa, solicitação assistida, embarque, evento, documento, pendência, seguidor, sinistro, faturamento, recorrência e comparação de proposta.

A API deve preservar uma identidade comum para cada objeto nas três plataformas. Regras e permissões pertencem ao servidor. O frontend pode antecipar validação, mas não determina autorização ou valor final cobrado.

## Comportamentos transversais

- Separar rascunho, tarifa e embarque. Cotação não produz contratação.
- Endereços resolvidos antes de calcular; chave de tarifa inclui os parâmetros relevantes; mudança de carga ou rota invalida a tarifa anterior.
- Representar dinheiro em unidade monetária inteira e moeda explícita; unidades físicas e conversões explícitas.
- Preservar validade, origem, versão e condições da tarifa. Expiração ou alteração relevante exige reconfirmação.
- Criação de embarque e ações financeiras idempotentes; repetição de chamada não cria nova operação.
- Histórico de eventos com data, ator e origem; permissões por organização e papel verificadas no servidor.
- Estados de carregamento, vazio, erro, sucesso, perda de conexão, sessão expirada e permissões insuficientes em cada fluxo.
- Uploads com limites e associação ao objeto correto; URLs temporárias quando necessário; nenhum segredo de provedor no cliente.
- Recorrências materializadas no servidor, considerando fuso e bloqueios; execução deve tolerar repetição de jobs.
- A divergência no estudo entre cobrança na reserva e na coleta permanece uma regra pendente para integração real. Não declarar uma cobrança executada com base apenas no texto da tela.

## Uso do Build iOS Apps

Aplicar SwiftUI UI Patterns para composição, propriedade de estado, NavigationStack, TabView e apresentação de sheets. Proposta inicial: iOS 17 ou superior, para Observation; a versão mínima é uma decisão técnica proposta, não um requisito já aprovado.

Usar serviços injetados, operações assíncronas e previews com fixtures. Adotar navegação e controles do sistema mantendo a identidade visual e as funções do produto. Efeitos visuais específicos de versões mais recentes devem ter disponibilidade tratada; não elevar silenciosamente a versão mínima.

O skill iOS Debugger Agent depende de XcodeBuildMCP para controle interativo de simulador. Esse MCP não está disponível nesta sessão Windows. Os testes automáticos no GitHub usarão Xcode, Simulator e XCTest/XCUITest por linha de comando; isso não equivale a afirmar que o MCP de simulador está conectado.

## Compilação e testes pelo GitHub

Repositório local ligado a `dartel245-glitch/Fretenow2`, público. Em 30/10/2026, tanto o conector GitHub quanto o GitHub CLI reportaram acesso de leitura para a identidade atual. Escrita e execução remota precisam de uma identidade com a permissão correspondente; nenhuma alteração remota foi realizada.

Pipeline proposto:

1. Web/API: instalar versões fixadas, verificar tipos, testar regras relevantes, gerar build e executar cenários de interface.
2. Android: runner Linux com JDK/SDK compatíveis, Gradle Wrapper, compilação, testes e APK de desenvolvimento; testes de interface em emulador quando configurados.
3. iOS: runner macOS com versão de Xcode fixada e simulador disponível; compilar para Simulator, executar XCTest/XCUITest e publicar relatórios `.xcresult`, screenshots e artefato de simulador.

A configuração inicial será acionada manualmente e em pull requests após existir código compilável. Terá permissões mínimas e limite de tempo; segredos não serão usados em testes com fixtures. Uma execução remota só será relatada como aprovada após examinar seu resultado.

Build para Simulator não é um IPA instalável em iPhone. O usuário já possui conta Apple Developer e certificado, conforme informou. Para distribuição por TestFlight, configurar a assinatura para o bundle ID do FreteNow e o acesso ao App Store Connect usando a conta existente. Verificar os materiais de assinatura necessários quando chegar essa etapa; certificados, chaves privadas e senhas serão configurados pelo mecanismo de segredos da plataforma, sem inclusão no repositório ou solicitação como texto no chat.

GitHub Actions executa jobs temporários em máquinas macOS. Não cria um Mac interativo permanente para uso dentro deste computador Windows. O ciclo de desenvolvimento pode usar testes, screenshots e logs desses jobs para validação remota.

## Etapas de implementação

1. **Paridade e referência visual:** relacionar rotas, ações, estados e evidências; extrair ou recapturar imagens de referência onde os registros existentes forem apenas texto. Recuperar lacunas sem operações comerciais no LinkLane.
2. **Base compartilhada:** contratos, domínio, autenticação, persistência, fixtures, permissões e estrutura dos três clientes; primeiro build comprovado por plataforma.
3. **Navegação e fluxo principal:** onboarding, Home, cotação, tarifas, confirmação, lista e detalhe de embarques, mantendo registro de cobertura por plataforma.
4. **Demais módulos:** rastreamento, documentos, Analytics, pagamentos/crédito, sinistros, configurações/equipe/importação, recorrências e comparação de propostas.
5. **Integrações e validação:** conectar provedores autorizados, verificar cenários de ponta a ponta, falhas e estados intermediários; validar visual e comportamento em cada plataforma.

O primeiro build é um marco de infraestrutura, não a entrega do LinkLane completo. Cada módulo deve constar como não iniciado, parcial, funcional com fixtures, integrado ou validado; não usar um único status “concluído” para ocultar essas diferenças.

## Critérios de aceitação

- Cada módulo e ação do inventário possui implementação ou pendência explícita em Web, iOS e Android.
- Web comparada com referência do LinkLane em viewport equivalente; adaptação mobile revisada por hierarquia, informação e ações, não por igualdade de pixels com desktop.
- Um mesmo embarque e suas alterações aparecem corretamente nas três interfaces autenticadas.
- Testes relevantes cobrem isolamento entre contas, expiração de tarifa, idempotência, transições de embarque, permissões e recorrências.
- Web compila e funciona no navegador; Android compila e passa seus testes; iOS tem build e testes comprovados por uma execução macOS. Código apenas escrito não satisfaz esse critério.
- Faturas, pagamentos, mensagens, tarifas de mercado e contratações só são apresentados como reais após a integração correspondente ser validada.
- Credenciais, cookies, dados privados e bundles capturados do LinkLane não são publicados no repositório.

## Pendências concretas

- Revisar esta abordagem de três interfaces e backend comum antes de iniciar implementação.
- Disponibilizar acesso de escrita ao repositório para enviar código e workflows e iniciar os jobs autorizados. O acesso atual é de leitura.
- Escolher/configurar integrações reais e resolver regras privadas não recuperadas; isso não impede a construção e validação de fluxos com fixtures identificadas.
- Configurar assinatura e distribuição com a conta Apple Developer e o certificado já disponíveis ao usuário, após verificar sua compatibilidade com o app. A ausência de Mac pessoal é atendida pela proposta de CI macOS.

## Fontes

- Estudo REA LinkLane: inventário local consolidado em `docs/research/linklane-parity.json`; origem é o estudo de 12 módulos, 38 scripts e 44 contratos. Sem acesso ao backend privado.
- Build iOS Apps: skills locais `swiftui-ui-patterns` e `ios-debugger-agent`; padrões de composição e requisitos de execução no simulador.
- [Apple — Xcode e requisitos de sistema](https://developer.apple.com/support/xcode/), consultado em 30/10/2026.
- [Android — Jetpack Compose](https://developer.android.com/develop/ui/compose), consultado em 30/10/2026.
- [GitHub — runners hospedados](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), consultado em 30/10/2026.
- [GitHub — download de artefatos de workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts), consultado em 30/10/2026.
- [Apple — TestFlight](https://developer.apple.com/testflight/), consultado em 30/10/2026.
