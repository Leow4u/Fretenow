import Foundation

protocol APIClient {
    func login() async throws -> Session
    func shipments(token: String) async throws -> [Shipment]
    func detail(token: String, id: String) async throws -> Shipment
    func rates(token: String, draft: Draft) async throws -> [Rate]
    func book(token: String, intent: BookingIntent) async throws -> Shipment
    func signout(token: String) async throws
}
struct APIFailure: LocalizedError { let status: Int; let message: String; var errorDescription: String? { message } }
final class HTTPClient: APIClient {
    private let base: URL
    private let session: URLSession
    init(base: URL = URL(string: Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String ?? "https://unconfigured.invalid")!) {
        self.base = base
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false; config.httpCookieStorage = nil; config.urlCache = nil; config.timeoutIntervalForRequest = 20
        session = URLSession(configuration: config)
    }
    private func request(_ path: String, token: String? = nil, body: Data? = nil, key: String? = nil, post: Bool = false) async throws -> Data {
        var request = URLRequest(url: base.appendingPathComponent(path)); request.httpMethod = post ? "POST" : "GET"
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let key { request.setValue(key, forHTTPHeaderField: "Idempotency-Key") }
        if let body { request.httpBody = body; request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200...299).contains(status) else { throw APIFailure(status: status, message: (try? JSONDecoder().decode(ErrorEnvelope.self, from: data).error.message) ?? "Request failed (\(status))") }
        return data
    }
    func login() async throws -> Session { try JSONDecoder().decode(Session.self, from: await request("api/demo/session", post: true)) }
    func shipments(token: String) async throws -> [Shipment] { try JSONDecoder().decode(ShipmentList.self, from: await request("api/v1/shipments", token: token)).shipments }
    func detail(token: String, id: String) async throws -> Shipment { try JSONDecoder().decode(Shipment.self, from: await request("api/v1/shipments/\(id)", token: token)) }
    func rates(token: String, draft: Draft) async throws -> [Rate] { try JSONDecoder().decode(RateList.self, from: await request("api/v1/rates", token: token, body: JSONEncoder().encode(draft), post: true)).rates }
    func book(token: String, intent: BookingIntent) async throws -> Shipment { try JSONDecoder().decode(Shipment.self, from: await request("api/v1/shipments", token: token, body: JSONEncoder().encode(intent.body), key: intent.key, post: true)) }
    func signout(token: String) async throws { _ = try await request("api/auth/signout", token: token, post: true) }
}
