import Foundation
import Observation

@MainActor @Observable final class AppModel {
    private let api: any APIClient
    private var token: String?
    private(set) var account: Account?
    private(set) var shipments: [Shipment] = []
    private(set) var rates: [Rate] = []
    private(set) var detail: Shipment?
    private(set) var busy = false
    private(set) var bookingAttempted = false
    private(set) var error: String?
    private(set) var bookedID: String?
    private(set) var intent: BookingIntent?
    var draft = Draft() { didSet { rates = []; bookedID = nil } }
    init(api: any APIClient) { self.api = api }
    func perform(_ action: () async throws -> Void) async {
        guard !busy else { return }; busy = true; error = nil
        defer { busy = false }
        do { try await action() }
        catch is CancellationError { }
        catch {
            if let failure = error as? APIFailure {
                if failure.status == 401 { token = nil; account = nil; shipments = []; detail = nil; rates = []; intent = nil; self.error = "Session expired. Enter the demo again."; return }
                if [400, 404, 409].contains(failure.status) { intent = nil; rates = []; bookingAttempted = false }
            }
            self.error = error.localizedDescription
        }
    }
    func login() async { await perform { let s = try await api.login(); token = s.token; account = s.account; shipments = try await api.shipments(token: s.token) } }
    func refresh() async { await perform { shipments = try await api.shipments(token: token ?? "") } }
    func load(_ id: String) async { await perform { detail = try await api.detail(token: token ?? "", id: id) } }
    func quote() async { await perform { guard draft.valid else { throw APIFailure(status: 400, message: "Complete all required US addresses, date and positive lb/in cargo.") }; rates = try await api.rates(token: token ?? "", draft: draft); bookedID = nil } }
    func prepare(_ rate: Rate) { guard !busy, intent == nil else { return }; guard !rate.expired else { rates = []; error = "Rate expired. Request new rates."; return }; intent = BookingIntent(rate: rate, draft: draft); bookingAttempted = false }
    func dismissConfirmation() { if !busy && !bookingAttempted { intent = nil } }
    func book() async { await perform {
        guard let pending = intent else { return }; bookingAttempted = true
        let shipment = try await api.book(token: token ?? "", intent: pending)
        bookedID = shipment.id; intent = nil; rates = []; detail = shipment
        shipments = try await api.shipments(token: token ?? "")
        detail = try await api.detail(token: token ?? "", id: shipment.id)
    } }
    func signout() async { await perform { try await api.signout(token: token ?? ""); token = nil; account = nil; shipments = []; detail = nil; intent = nil; rates = []; draft = Draft(); bookedID = nil } }
}
