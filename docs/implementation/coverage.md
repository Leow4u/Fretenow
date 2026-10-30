# Cobertura do escopo completo

Esta entrega é o primeiro incremento local de demonstração. O objetivo continua sendo implementar o produto completo em Web, iOS e Android. Nenhum dos 12 módulos tem paridade integral. O [inventário original](../research/linklane-parity.json) foi preservado; [coverage.json](coverage.json) conserva as **46 frases funcionais**, **22 entradas de rota por módulo** (o detalhe é compartilhado por Shipments/Tracking) e **44 contratos HTTP**, com implementação, fontes, pendências e evidência por plataforma.

`not_started` significa ação ausente; `fixtures`, leitura sintética/vazia; `partial`, subconjunto do requisito; `integrated`, ação conectada à API demo local; `validated`, execução comprovada de uma ação específica. Uma tela vazia, build ou teste unitário não conclui um módulo. A validação é descrita separadamente do status de implementação. “API integrada” aqui nunca significa provider comercial.

| Módulo original | API e Web neste incremento | iOS e Android | Falta para o escopo original |
|---|---|---|---|
| Acesso/onboarding | Sessão demo, cookie/Bearer, signout, identidade | Mesmo HTTP em fonte nativa | Email real, etapas de onboarding, enriquecimento, billing, RBAC |
| Home | Snapshot persistido, contagens, busca/tabs, links informativos | Lista, busca, refresh | Tarefas/decisões, email recebido, rotas importadas, checklist com escrita |
| Cotação/contratação | US completo, LTL/FTL/Expedited, itens, tarifas demo, revisão e reserva idempotente | Uma linha de carga, revisão/reserva no mesmo contrato | Providers, seguro/classe/equipamentos/veículos, extração/places, cotação assistida, pagamento |
| Shipments | Lista/detalhe/eventos, repetir, cancelar/reagendar booked | Lista/detalhe/eventos | Todos os estados operacionais, extras/decisões/TONU; ações nativas |
| Tracking | Timeline persistida de eventos locais | Timeline do detalhe | Mapa/pings, driver link, seguidores, sete avisos email/SMS |
| Analytics | Contagens, valor reservado sem cancelados, CSV de embarques autorizado | Pending | Períodos, agregações, Spent original, pontualidade/mercado, faturas/CSV completo |
| Documents | Leitura vazia com capacidade explícita; página parcial | Pending | Tipos/flags/estágios, BOL/POD/PDF, downloads |
| Payments | Leitura vazia com capacidade explícita; página parcial | Pending | Saldo/faturas, cartão/Stripe/pay, Net-14, gate de pagamento |
| Claims | Leitura vazia com capacidade explícita; página parcial | Pending | Elegibilidade, wizard, arquivos/fotos/notas, retirada, estados/prazos |
| Settings | Empresa/unidades/timezone/membro sintéticos, somente leitura | Pending | Papéis, convites/associação, locais, importação, preferências/billing/company writes |
| Schedules | Leitura vazia com capacidade explícita; página parcial | Pending | Criar/alterar/pausar/retomar/encerrar/pular, lock17h, worker |
| Price match | Leitura vazia em `/price-matches` | Pending | Rota original `/ship/beat`, formulário/multipart, oferta/histórico/prefill |

A Web usa etapas internas em `/ship`; não implementa os URLs independentes `/ship/rates`, `/ship/details`, `/ship/confirm` e `/ship/confirmed/[id]`. A confirmação termina no detalhe persistido `/shipments/:id`. `/welcome` foi substituído pela entrada demo em `/`. BOL/POD, wizard/caso de sinistro e nova recorrência não têm suas rotas funcionais: o catch-all HTTP200 ou um detalhe genérico não comprova essas páginas. Os nativos usam telas, sem alegação de deep links equivalentes.

O snapshot inclui conta, ações derivadas e seguidores vazios, mas isso não implementa `GET /api/v1/account`, `/actions` ou `/watchers`. PUT de recorrência, PATCH de configurações, convites, billing, importação e demais contratos ausentes continuam ausentes; a matriz informa 404/501 sob sessão válida. A ação compartilhada de embarque aceita somente cancel/reschedule; pagar/ampliar/responder/disputar não estão disponíveis. Contratos novos do incremento estão em `additionalImplementedContracts`, separados dos 44 originais.

Evidência executada: [API](task-1-report.md), [Web e suas correções](task-2-report.md), [browser QA real](browser-qa.md), [Android/iOS e limites](task-3-report.md). Android: sete testes JVM, APK e replay do JSON capturado contra API200/3tarifas ([evidência local ignorada](../../output/implementation/qa/android-wire-api.json)). **Isso não é teste da UI nativa**. iOS não foi compilado/testado. Títulos de conteúdo nativos usam Bricolage em fonte, com escala acessível; execução e inspeção visual nativa permanecem não verificadas. Corpo e navegação do sistema podem manter a fonte nativa conforme a marca.

Relatórios de evidência são entregáveis versionáveis. Capturas, JUnit/APK e QA JSON são artefatos locais ignorados, preservados no disco e ausentes em um clone novo. Não houve CI remoto, push ou publicação. Consulte [verification.md](verification.md) para comandos, contagens e limitações.

A verificação usa o hash canônico `utf8-no-bom-lf`: remove BOM UTF-8 inicial e converte CRLF em LF antes do SHA256, sem regravar o inventário original. Em `coverage.json` schema2, `localArtifacts` declara apenas a evidência ignorada `output/implementation/qa/android-wire-api.json` como opcional; sua ausência em clones gera aviso explícito. Fontes e relatórios versionáveis continuam obrigatórios.
