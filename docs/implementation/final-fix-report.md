# Final scoped fix report

Date: 2026-10-30. One bounded wave for the three Minor findings from the accepted first local executable increment. No new functionality/modules, commits, pushes, deploys, DB/env changes or original brand/inventory edits. Controller owns the final scoped review and Git work.

## Result

1. Home passes filtered records through `recentShipments`: copy, descending createdAt, then first five. The full Shipments list retains its existing order. This handles JSONB object enumeration without changing API behavior.
2. `utcDate(offset, now)` uses UTC arithmetic and ISO calendar dates. All Web default/example/pickup/reschedule call sites use it; both editable date labels say UTC. Pickup/reschedule controls bound today through366 UTC days. The injected instant permits deterministic tests without replacing global clocks or mutating input Dates. The existing live-API fixture only renames its helper import/call.
3. Native content titles use the approved Bricolage variable TTF, copied unchanged. Android Material headline/title slots retain their native sp sizes and natural wrapping; body/navigation labels stay system. iOS content headings use the actual PostScript name with semantic `relativeTo` for Dynamic Type; system navigation/section chrome and body can stay system. XcodeGen Resources explicitly use the resources build phase, and both Debug/Release plists declare UIAppFonts. SwiftUI UI Patterns skill applied. Native rendering remains unverified.

Actual TTF name table (parsed from binary): family `Bricolage Grotesque 96pt ExtraBold`, subfamily `Regular`, PostScript `BricolageGrotesque-96ptExtraBold`. fvar: opsz12..96/default96, wght200..800/default800, wdth75..100/default100. Source and both copies share SHA256 `413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682`. Existing OFL licenses preserved. iOS UIAppFonts uses the bundled filename, not the PostScript name; Font.custom uses the PostScript name.

## Exact changed files in this wave

- `apps/web/components/Shipments.tsx`
- `apps/web/components/ShipFlow.tsx`
- `apps/web/lib/api.ts`
- `apps/web/lib/shipments.ts`
- `apps/web/test/presentation.test.ts`
- `apps/web/test/api.integration.test.ts`
- `apps/android/app/src/main/java/com/fretenow/app/MainActivity.kt`
- `apps/android/app/src/main/res/font/bricolage_grotesque.ttf`
- `apps/android/README.md`
- `apps/ios/Sources/FreteNowApp.swift`
- `apps/ios/Sources/QuoteView.swift`
- `apps/ios/Sources/BrandTokens.swift`
- `apps/ios/Resources/Fonts/BricolageGrotesque-Variable.ttf`
- `apps/ios/Config/Debug-Info.plist`
- `apps/ios/Config/Release-Info.plist`
- `apps/ios/project.yml`
- `apps/ios/README.md`
- `docs/implementation/coverage.json`
- `docs/implementation/coverage.md`
- `docs/implementation/verification.md`
- `docs/implementation/task-2-report.md`
- `docs/implementation/task-3-report.md`
- `docs/implementation/final-fix-report.md`

## Focused verification

- `node --import tsx --test apps/web/test/presentation.test.ts`: **2 passed,0failed,0skipped**. Seven deliberately unordered records prove newest five are chosen before limit and source array is unchanged. Injected `2026-10-31T01:00Z` is still October30 in America/Chicago but UTC helper returns October31; tomorrow,366-day and year rollover checks pass without global time/TZ mutation.
- `npm run typecheck:web`: **passed**, including renamed integration-test helper import. Initial typecheck identified that old import, which was corrected before the passing run.
- `npm run build:web`: **passed**, Next16.4.3. Build ID **`WojKHd--JjTJ7lEUspPPM`**. Initial sandbox run hit EPERM cleaning generated `.next/static`; identical authorized build passed with escalation. Controller stopped its old server first and restarted Next3002 successfully with this build (controller session14678). No competing server started by this worker.
- Android compile command:

```powershell
docker run --rm --user root -e ANDROID_HOME=/opt/android-sdk -e GRADLE_USER_HOME=/home/gradle/.gradle -v fretenow-android-sdk:/opt/android-sdk -v fretenow-gradle-cache:/home/gradle/.gradle -v "${PWD}/apps/android:/project" -w /project gradle:8.13-jdk17 bash ./gradlew assembleDebug --no-daemon
```

**BUILD SUCCESSFUL in1m45s,39 actionable tasks (12executed,27up-to-date)**. The initial sandbox could not access the Docker named pipe; authorized escalation succeeded. Existing SDK XML parser-version warning remains. No new dependencies or system SDK changes. APK `apps/android/app/build/outputs/apk/debug/app-debug.apk`: **11,187,999bytes**, SHA256 **`dc9b913bcbe4102708cd1a46fee9194ae05274006991912e7efe1a1542f98aee`**. ZIP inspection confirms `res/font/bricolage_grotesque.ttf` exists. This hash supersedes historical Task3 hashes.

- Python plistlib parsed both iOS plists and asserted the expected UIAppFonts entry. Font binary hashes matched the untouched original. This is structural verification, not an iOS compile.
- `node --test scripts/dev/verify-coverage.test.mjs`: **5 passed, 0 failed/skipped**. `npm run verify:coverage`: **passed**, canonical original inventory and 12/46/22/44 counts preserved, required evidence/source paths present. `git diff --check`: **passed**. These checks validate documentation integrity, not runtime behavior.

## Limits

No API implementation changes; no passed API/PostgreSQL suite reruns. Prior seven Android JVM tests remain historical and were not rerun for font/resource-only changes. No Android emulator/device or native large-text/VoiceOver/TalkBack visual checks. iOS compilation/XCTest requires macOS/Xcode and was not possible on Windows. Previous browser acceptance remains historical; final scoped browser/source review belongs to the controller. No denied or pending action remains; implementation is ready for that review. Original12-module parity inventory and12/46/22/44 scope preserved.
