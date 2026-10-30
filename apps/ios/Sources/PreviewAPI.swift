import Foundation

// No network or credentials in previews. Booking is deliberately unavailable.
struct PreviewAPI: APIClient {
    func login() async throws -> Session { Session(token: "preview-only", account: Account(id: "preview", organizationId: "preview", name: "Demo", organizationName: "Preview workspace", email: "preview@example.test", demo: true), demo: true) }
    func shipments(token: String) async throws -> [Shipment] { [] }
    func detail(token: String, id: String) async throws -> Shipment { throw APIFailure(status: 404, message: "Preview has no shipments") }
    func rates(token: String, draft: Draft) async throws -> [Rate] { [] }
    func book(token: String, intent: BookingIntent) async throws -> Shipment { throw APIFailure(status: 501, message: "Preview booking is unavailable") }
    func signout(token: String) async throws { }
}
