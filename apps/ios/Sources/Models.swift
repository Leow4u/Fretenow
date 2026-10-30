import Foundation

struct Address: Codable, Equatable {
    var name = "", address = "", city = "", state = "", postalCode = "", country = "US"
    var valid: Bool {
        let states = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(separator: " ").map(String.init)
        return [name, address, city].allSatisfy { !$0.trimmingCharacters(in: .whitespaces).isEmpty } && states.contains(state) && postalCode.range(of: "^[0-9]{5}$", options: .regularExpression) != nil && country == "US"
    }
}
struct Cargo: Codable, Equatable {
    var description = "", quantity = 1
    var weightLb = 100.0, lengthIn = 48.0, widthIn = 40.0, heightIn = 36.0
    var valid: Bool { !description.trimmingCharacters(in: .whitespaces).isEmpty && (1...10000).contains(quantity) && weightLb.isFinite && weightLb > 0 && weightLb <= 100000 && [lengthIn, widthIn, heightIn].allSatisfy { $0.isFinite && $0 > 0 && $0 <= 1000 } }
}
enum Dates {
    static func day(_ value: Date) -> String { let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(secondsFromGMT: 0); f.dateFormat = "yyyy-MM-dd"; return f.string(from: value) }
    static func iso(_ value: String) -> Date? {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = f.date(from: value) { return date }; f.formatOptions = [.withInternetDateTime]; return f.date(from: value)
    }
}
struct Draft: Codable, Equatable {
    var mode = "LTL", origin = Address(), destination = Address()
    var pickupDate = Dates.day(Date().addingTimeInterval(86400)), items = [Cargo()], accessorials: [String] = []
    var valid: Bool {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(secondsFromGMT: 0); f.dateFormat = "yyyy-MM-dd"; f.isLenient = false
        guard let date = f.date(from: pickupDate), Dates.day(date) == pickupDate else { return false }
        return ["LTL", "FTL", "Expedited"].contains(mode) && origin.valid && destination.valid && pickupDate >= Dates.day(Date()) && pickupDate <= Dates.day(Date().addingTimeInterval(366*86400)) && (1...50).contains(items.count) && items.allSatisfy(\.valid) && items.reduce(0.0) { $0 + Double($1.quantity) * $1.weightLb } <= 1000000 && accessorials.count <= 20 && accessorials.allSatisfy { !$0.trimmingCharacters(in: .whitespaces).isEmpty && $0.count <= 80 }
    }
    static var example: Draft { Draft(origin: Address(name: "Demo origin", address: "120 Main St", city: "Austin", state: "TX", postalCode: "78701"), destination: Address(name: "Demo destination", address: "210 Broad St", city: "Denver", state: "CO", postalCode: "80202"), items: [Cargo(description: "Pallet")]) }
}
struct Rate: Codable, Identifiable { let id, carrier: String; let amountMinor: Int; let currency: String; let transitDays: Int; let validUntilISO, draftHash: String; let demo: Bool; var expired: Bool { (Dates.iso(validUntilISO) ?? .distantPast) <= Date() } }
struct ShipmentEvent: Codable, Identifiable { let id, type, at, actor, source: String; let pickupDate: String? }
struct Shipment: Codable, Identifiable { let id, mode, status: String; let origin, destination: Address; let pickupDate: String; let items: [Cargo]; let accessorials: [String]; let carrier: String; let amountMinor: Int; let currency, createdAt: String; let demo: Bool; let events: [ShipmentEvent] }
struct Account: Codable { let id, organizationId, name, organizationName, email: String; let demo: Bool }
struct Session: Codable { let token: String; let account: Account; let demo: Bool }
struct ShipmentList: Codable { let shipments: [Shipment]; let demo: Bool }
struct RateList: Codable { let rates: [Rate] }
struct BookingBody: Codable, Equatable { let rateId: String; let draft: Draft }
struct BookingIntent { let body: BookingBody; let key: String; init(rate: Rate, draft: Draft) { body = BookingBody(rateId: rate.id, draft: draft); key = UUID().uuidString } }
struct ErrorEnvelope: Codable { let error: ErrorInfo }
struct ErrorInfo: Codable { let code, message: String }
func money(_ minor: Int) -> String { (Double(minor) / 100).formatted(.currency(code: "USD")) }
