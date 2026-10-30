import XCTest
@testable import FreteNow

@MainActor final class FreightTests: XCTestCase {
    func testExactContractAndFractionalDates() throws {
        let rate = try JSONDecoder().decode(Rate.self, from: Data(#"{"id":"r","carrier":"Demo","amountMinor":16700,"currency":"USD","transitDays":3,"validUntilISO":"2099-10-30T10:00:00.123Z","draftHash":"hash","demo":true}"#.utf8))
        XCTAssertEqual(rate.amountMinor, 16700); XCTAssertFalse(rate.expired)
        XCTAssertNotNil(Dates.iso("2026-10-30T10:00:00Z")); XCTAssertNotNil(Dates.iso("2026-10-30T10:00:00.123Z"))
        let event = try JSONDecoder().decode(ShipmentEvent.self, from: Data(#"{"id":"e","type":"booked","at":"2026-10-30T10:00:00Z","actor":"Demo","source":"demo"}"#.utf8))
        XCTAssertNil(event.pickupDate)
    }
    func testValidation() {
        var draft = Draft.example; XCTAssertTrue(draft.valid)
        draft.origin.state = "ZZ"; XCTAssertFalse(draft.valid)
        draft = .example; draft.items[0].weightLb = .infinity; XCTAssertFalse(draft.valid)
        draft = .example; draft.pickupDate = "2026-02-30"; XCTAssertFalse(draft.valid)
    }
    func testRetryKeepsExactBookingAndServerIdentity() async {
        let api = FakeAPI(); let model = AppModel(api: api)
        await model.login(); model.draft = .example; await model.quote(); model.prepare(api.rate)
        let key = model.intent?.key
        await model.book(); XCTAssertEqual(model.intent?.key, key); XCTAssertNotNil(model.error)
        await model.book(); XCTAssertEqual(api.attempts.count, 2); XCTAssertEqual(api.attempts[0].key, api.attempts[1].key); XCTAssertEqual(api.attempts[0].body, api.attempts[1].body)
        XCTAssertEqual(model.bookedID, "server-id"); XCTAssertNil(model.intent)
    }
    func testEditInvalidatesAndSessionExpiryClears() async {
        let api = FakeAPI(); let model = AppModel(api: api)
        await model.login(); model.draft = .example; await model.quote(); XCTAssertEqual(model.rates.count, 1)
        model.draft.mode = "FTL"; XCTAssertTrue(model.rates.isEmpty)
        api.expired = true; await model.refresh(); XCTAssertNil(model.account); XCTAssertTrue(model.shipments.isEmpty)
    }
}
private final class FakeAPI: APIClient {
    let rate = Rate(id: "rate-id", carrier: "Demo", amountMinor: 16700, currency: "USD", transitDays: 3, validUntilISO: "2099-01-01T00:00:00.123Z", draftHash: "hash", demo: true)
    var attempts: [BookingIntent] = [], fail = true, expired = false
    private var shipment: Shipment { let d = Draft.example; return Shipment(id: "server-id", mode: d.mode, status: "booked", origin: d.origin, destination: d.destination, pickupDate: d.pickupDate, items: d.items, accessorials: [], carrier: "Demo", amountMinor: 16700, currency: "USD", createdAt: "2026-10-30T10:00:00.123Z", demo: true, events: []) }
    func login() async throws -> Session { try await PreviewAPI().login() }
    func shipments(token: String) async throws -> [Shipment] { if expired { throw APIFailure(status: 401, message: "expired") }; return [] }
    func detail(token: String, id: String) async throws -> Shipment { shipment }
    func rates(token: String, draft: Draft) async throws -> [Rate] { [rate] }
    func book(token: String, intent: BookingIntent) async throws -> Shipment { attempts.append(intent); if fail { fail = false; throw URLError(.networkConnectionLost) }; return shipment }
    func signout(token: String) async throws { }
}
