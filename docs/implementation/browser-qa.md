# Browser QA — first Web increment

2026-10-30, controller using connected IAB, actual Next production server and PostgreSQL-backed API. Local synthetic data only. Web http://127.0.0.1:3002, API4100.

## Executed observations

- Initial real browser login failed400 INVALID_REQUEST: unconditional JSON header on bodyless POST. Fixed and re-reviewed; subsequent login and signout passed in browser.
- Access screen and Home inspected. Approved FreteNow vector wordmark, navy/blue and local fonts rendered. Desktop screenshot at1440x1000 showed sidebar, topbar, actions and empty state without overlap.
- Open demo workspace loaded Home with zero shipments.
- Ship something -> Use example shipment filled synthetic Austin/TX78701 to Denver/CO80202, LTL,1000lb and2026-11-01 pickup.
- Changing ZIP to787 prevented submission with native format validation. Restoring78701 allowed rates.
- API rates displayed USD320.00/385.00/450.00 with expiry and three synthetic carriers.
- Selected recommended rate -> reviewed pickup/delivery -> explicit final review -> Book demo shipment.
- Created shipment ID `5dfc582c-ea1e-424a-a5c7-3e354b0fedc6`, Booked, USD320.00, event with actor/time/source. Navigation to detail and API persistence observed.
- Reschedule via native keyboard input to2026-11-03 persisted date and appended Rescheduled event. Automation-specific observation: programmatic date fill changed displayed input but not React state in this IAB; two earlier attempts saved the initial2026-10-31. Native keyboard entry verified actual user behavior and correct date persistence. Those local demo events remain visible; no production data affected.
- Cancel shipment -> explicit confirmation -> Cancelled and new event. Further change actions no longer offered.
- Sign out returned to access. New demo login showed the same ID, Cancelled status,2026-11-03 date, USD320.00 and Home count1, proving cross-session persistence.
- Mobile390x844 screenshot found page overflow: document clientWidth375, scrollWidth648. The absolute sr-only Details header escaped the local table scroll container. Fix round2 in progress to establish containing block; local table horizontal scrolling remains intentional.
- Opening action modal left focus on background trigger. Fix round2 in progress using native modal dialog semantics, initial focus, Escape and return focus.

## Remaining before acceptance

Build7t7H40KitRDoL9iNZv4eY foi iniciado e verificado. Home e tarifas mobile390x844 agora têm document clientWidth375 e scrollWidth375; apenas a tabela/tabs mantêm rolagem local. Quantidade exibida como1,000lb.

Repeat shipment no mobile recuperou os dados do primeiro embarque com data nova; mudar paraFTL gerou tarifas USD1,120.00/1,185.00/1,250.00. Revisão e reserva concluídas: segundo ID `22151e8d-3972-4c48-997f-9e5f3b556786`, Booked, USD1,120.00. Diálogo nativo mostrou somente conteúdo modal na árvore acessível, abriu com foco interno; Escape fechou e devolveu foco ao botão Reschedule pickup. Nenhuma ação foi submetida nessa verificação de foco.

Analytics carregou dois embarques, um Booked e um Cancelled, total reservado USD1,120.00 excluindo o cancelado. Export CSV produziu C:/Users/leona/Downloads/fretenow-demo-shipments.csv,307bytes. Conteúdo lido e conferido: cabeçalho e dois IDs/status/datas/valores correspondentes. A espera do controle de navegador pelo download demorou757segundos apesar de timeout10s; usuário recebeu explicação assim que a chamada retornou. Evitar repetir essa espera bloqueante.

Aceitação do primeiro fluxo Web concluída, com revisão de fonte e correções aprovadas. Páginas parciais têm cobertura de contrato/código; não há alegação de validação completa de todas as funções dos12módulos. Native clients, production providers and remote CI are outside this browser evidence.

## Final minor fixes browser check

Build WojKHd--JjTJ7lEUspPPM, controller IAB temporary background tab: Ship form shows Pickup date (UTC), minimum2026-10-30 and default2026-10-31. Home shows newer FTL22151e8d before older LTL5dfc582c. Reschedule dialog shows New pickup date (UTC), minimum2026-10-30; closing returns focus to Reschedule pickup. No shipment write performed; temporary tab closed. Ordering beyond five unordered records and UTC day rollover are covered by the new focused unit tests, not claimed from this two-record browser check.
