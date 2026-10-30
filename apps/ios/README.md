# FreteNow iOS demo

iOS 17+, SwiftUI Observation, per-tab NavigationStack, injected async URLSession service, Codable HTTP contract. Local demo only: no real freight, payments or notifications. This Windows workspace cannot compile Apple frameworks. Source/tests/configuration are prepared for macOS and are **not claimed to have passed Xcode**.

On a Mac with Xcode 16.4 and an available iOS 18.5 simulator:

```sh
brew install mint
mint run yonaskolb/XcodeGen@2.44.1 xcodegen generate
xcrun simctl list devices available
xcodebuild test -project FreteNow.xcodeproj -scheme FreteNow -configuration Debug -destination 'platform=iOS Simulator,id=YOUR_AVAILABLE_UDID' -derivedDataPath build -resultBundlePath build/TestResults.xcresult CODE_SIGNING_ALLOWED=NO
```

CI pins macos-15/Xcode 16.4, generates with XcodeGen 2.44.1, selects an available iPhone on the compatible iOS 18.5 runtime and uploads xcresult and simulator app. It is configured, not remotely executed. No certificate, provisioning profile, Apple account or publishing permissions are required for simulator testing.

Run PostgreSQL and the shared API on that same Mac following the root contract instructions. Debug uses `http://localhost:4100`, with `NSAllowsLocalNetworking` only in Debug. No global arbitrary-load ATS override. The Windows API loopback address is not the Mac's loopback. Physical devices need an authorized remote HTTPS API or tunnel later. No automatic LAN exposure is configured. Release plist has a deliberately unreachable HTTPS placeholder and no ATS relaxation; set an authorized HTTPS API only when production identity/providers have been implemented.

Token lives only in AppModel memory; ephemeral URLSession disables cookie storage/cache. Signing out revokes it; 401 clears account/session data and prompts login. Draft fields freeze during requests and unresolved booking outcomes. A failed transport/5xx booking retains its draft/rate/UUID for Retry. Definitive 400/404/409 errors clear rates and unlock requoting. Successful booking uses the server ID and refreshes list/detail. Process termination loses memory: refresh Home after re-login before repeating any uncertain booking.

Includes demo login, search/refresh, detail/event history, complete US addresses, one cargo line with lb/in, all three modes, pickup UTC date, accessorial labels, example action, rates/expiry and explicit booking confirmation. Cancel/reschedule and other modules are visibly pending. Brand/content titles use the approved bundled Bricolage Grotesque; `.custom(..., relativeTo:)` preserves Dynamic Type. Functional body and system navigation chrome retain semantic system fonts; controls use native touch targets, confirmation buttons at least 44pt. Approved logo/icon are copied unchanged, with included font licenses. PreviewAPI never accesses the network or pretends to book.

XCTest covers contract decoding, fractional/nonfractional timestamps, validation, draft invalidation, session expiry and booking retry key/body/server identity. Tests remain unexecuted until the macOS job is run. See `docs/implementation/task-3-report.md`.

Title typography is implemented in source, with native runtime/large-text rendering still unverified. The unchanged `Resources/Fonts/BricolageGrotesque-Variable.ttf` is included in the resources phase; both Debug/Release plists register `BricolageGrotesque-Variable.ttf` via UIAppFonts. Its actual PostScript name is `BricolageGrotesque-96ptExtraBold` (default variable weight 800). No original brand asset was modified.
