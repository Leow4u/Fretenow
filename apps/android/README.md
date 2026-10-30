# FreteNow Android demo

Native Compose foundation, API 26+, compile/target 36. Uses the same local API as Web and iOS. No real freight, payments or notifications. No production identity or signing configuration.

Run the root PostgreSQL/API instructions in `docs/implementation/api-contract.md`, then open this folder in Android Studio or run:

```sh
./gradlew testDebugUnitTest assembleDebug
```

Windows: `gradlew.bat testDebugUnitTest assembleDebug`. Requires JDK 17, Android SDK platform 36 and Build Tools 35.0.0. Wrapper is official Gradle 8.13 with its distribution checksum pinned; AGP 8.13.2, Kotlin/Compose compiler 2.2.21, Compose BOM 2025.08.01, serialization 1.9.0. No system-wide SDK modifications are needed.

Debug uses `http://10.0.2.2:4100` for the standard Android emulator on the API's Windows host. Cleartext is permitted only in debug for that host and localhost/127.0.0.1. API remains loopback bound. Physical devices cannot reach this loopback API; an authorized remote HTTPS API/tunnel is future work. No LAN listener is created.

Release defaults to a deliberately unreachable HTTPS endpoint. Configure `-PreleaseApiUrl=https://your-authorized-api.example` before a future release build; configuration rejects HTTP. This demo has no production auth or providers and must not be published as a production service. No signing secrets are included.

Session bearer is held in ViewModel memory only. No preferences, backup, database or logs persist it. UI state survives activity recreation through ViewModel; process death loses the session and any unresolved booking intent. If the process is killed after an uncertain booking response, enter the demo and refresh Home before making another booking.

Booking retries preserve the exact draft/rate/key while the process lives. After a transport/5xx failure, the form remains frozen and Retry replays that intent. Definitive 400/404/409 errors unlock editing/requote; 401 clears the session. Inputs are frozen during quotes, and each edit invalidates previous rates. Rates are checked at confirmation preparation and server conflicts require requote. Success displays the server ID, then refreshes list and detail.

Includes login, searchable/refreshable shipment list, detail/history, one cargo line, all US address fields, three modes, date, lb/in, accessorial labels, example data, quote and explicit booking confirmation. Cancel/reschedule and other modules are explicitly pending. Bricolage Grotesque is bundled unchanged for Material headline/title styles with sp scaling; functional body and navigation labels use native system fonts; approved logo/adaptive/monochrome icons are copied from the kit without altering originals. Font licenses are provided. Title typography is implemented in source; native runtime and large-text rendering remain unverified.

Local Docker verification passed after the outbound JSON review fix: focused `HttpContractTest` + `FreightTest` with `assembleDebug`, seven JVM tests with zero failures in 1m15s. Required default values are explicitly serialized for quote and booking; raw wire key/type tests cover both requests. Captured synthetic bodies: `app/build/test-output/quote-draft.json` and `booking-request.json` (generated/ignored, no headers or credentials). APK: `app/build/outputs/apk/debug/app-debug.apk`. See `docs/implementation/task-3-report.md` for evidence and remaining validation limits. No emulator interaction or physical device QA has been claimed.

After the final title-font change, `assembleDebug` passed in 1m45s (39 tasks, 12 executed). Latest APK: 11,187,999 bytes, SHA256 `dc9b913bcbe4102708cd1a46fee9194ae05274006991912e7efe1a1542f98aee`; packaged font verified in the APK. The seven earlier JVM tests were not rerun for this resource/UI-only change. See `docs/implementation/final-fix-report.md`.
