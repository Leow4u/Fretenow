import SwiftUI

struct QuoteView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        @Bindable var model = model
        Form {
            Text("Local demo • no real freight or payments")
            StatusView()
            Group {
                Button("Use example data") { model.draft = .example }
                Picker("Mode", selection: $model.draft.mode) { ForEach(["LTL", "FTL", "Expedited"], id: \.self) { Text($0) } }
                AddressEditor(title: "Origin • US", address: $model.draft.origin)
                AddressEditor(title: "Destination • US", address: $model.draft.destination)
                Section("Pickup") { TextField("UTC date (YYYY-MM-DD)", text: $model.draft.pickupDate).textInputAutocapitalization(.never); Text("Today through 366 days, UTC.").font(.caption) }
                Section("Cargo • one item") { CargoEditor(item: $model.draft.items[0]) }
                TextField("Accessorial labels, comma separated", text: Binding(get: { model.draft.accessorials.joined(separator: ",") }, set: { model.draft.accessorials = $0.isEmpty ? [] : $0.components(separatedBy: ",") }))
                Button("Get rates / Retry") { Task { await model.quote() } }.disabled(!model.draft.valid)
            }.disabled(model.busy || model.intent != nil)
            Section("Rates") {
                ForEach(model.rates) { rate in VStack(alignment: .leading, spacing: 8) {
                    Text("\(rate.carrier) • \(money(rate.amountMinor)) USD").font(BrandTokens.contentTitle)
                    Text("\(rate.transitDays) days • valid until \(rate.validUntilISO)")
                    Button("Review booking") { model.prepare(rate) }.frame(minHeight: 44).disabled(model.busy || model.intent != nil)
                } }
            }
            if let pending = model.intent {
                Section("Confirm booking") {
                    Text("\(pending.body.draft.origin.city) → \(pending.body.draft.destination.city). This creates a demo record; no carrier is booked.")
                    if let rate = model.rates.first(where: { $0.id == pending.body.rateId }) { Text("\(rate.carrier) • \(money(rate.amountMinor)) USD • pickup \(pending.body.draft.pickupDate)") }
                    Button("Confirm booking / Retry same request") { Task { await model.book() } }.frame(minHeight: 44).disabled(model.busy)
                    if !model.bookingAttempted { Button("Back to editing") { model.dismissConfirmation() }.disabled(model.busy) }
                    else { Text("A response may have been lost. Retry this booking to safely recover its server ID.") }
                }
            }
            if let id = model.bookedID { Text("Booked locally: \(id). Open Home to inspect the server record.") }
        }.navigationTitle("Quote")
    }
}
struct AddressEditor: View {
    let title: String
    @Binding var address: Address
    var body: some View { Section(title) {
        TextField("Location name", text: $address.name)
        TextField("Street address", text: $address.address)
        TextField("City", text: $address.city)
        TextField("US state (TX)", text: $address.state).textInputAutocapitalization(.characters)
        TextField("ZIP5", text: $address.postalCode).keyboardType(.numberPad)
    } }
}
struct CargoEditor: View {
    @Binding var item: Cargo
    var body: some View {
        TextField("Description", text: $item.description)
        LabeledContent("Quantity") { TextField("Quantity", value: $item.quantity, format: .number).keyboardType(.numberPad) }
        number("Weight per item (lb)", $item.weightLb)
        number("Length (in)", $item.lengthIn)
        number("Width (in)", $item.widthIn)
        number("Height (in)", $item.heightIn)
    }
    private func number(_ label: String, _ binding: Binding<Double>) -> some View { LabeledContent(label) { TextField(label, value: binding, format: .number).keyboardType(.decimalPad) } }
}
#Preview { QuoteView().environment(AppModel(api: PreviewAPI())) }
