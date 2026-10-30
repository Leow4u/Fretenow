import SwiftUI

@main struct FreteNowApp: App {
    @State private var model = AppModel(api: HTTPClient())
    var body: some Scene { WindowGroup { RootView().environment(model).tint(BrandTokens.action) } }
}
struct RootView: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        Group {
            if model.account == nil {
                NavigationStack { VStack(spacing: 24) {
                    BrandHeader()
                    Text("Your freight, together.").font(.custom("BricolageGrotesque-96ptExtraBold", size: 34, relativeTo: .largeTitle)).foregroundStyle(BrandTokens.navy)
                    Text("Local demo. No real freight, payments or notifications.")
                    StatusView()
                    Button("Enter local demo / Retry") { Task { await model.login() } }.buttonStyle(.borderedProminent).frame(minHeight: 44).disabled(model.busy)
                }.padding() }
            } else {
                TabView {
                    NavigationStack { ShipmentsView() }.tabItem { Label("Home", systemImage: "shippingbox") }
                    NavigationStack { QuoteView() }.tabItem { Label("Quote", systemImage: "plus.circle") }
                    NavigationStack { MoreView() }.tabItem { Label("More", systemImage: "ellipsis.circle") }
                }
            }
        }
    }
}
struct BrandHeader: View {
    var body: some View { Image("BrandLogo").resizable().scaledToFit().frame(width: 180, height: 48).accessibilityLabel("FreteNow") }
}
struct StatusView: View {
    @Environment(AppModel.self) private var model
    var body: some View { Group { if model.busy { ProgressView("Loading") }; if let error = model.error { Text(error).foregroundStyle(.red).accessibilityAddTraits(.updatesFrequently) } } }
}
struct ShipmentsView: View {
    @Environment(AppModel.self) private var model
    @State private var search = ""
    private var matches: [Shipment] { model.shipments.filter { search.isEmpty || "\($0.id) \($0.origin.city) \($0.destination.city) \($0.carrier)".localizedCaseInsensitiveContains(search) } }
    var body: some View {
        List {
            BrandHeader(); Text("Local demo • no real freight"); StatusView()
            Button("Refresh / Retry") { Task { await model.refresh() } }.disabled(model.busy)
            if matches.isEmpty { Text("No shipments found. Request a quote to start.") }
            ForEach(matches) { s in NavigationLink(value: s.id) { VStack(alignment: .leading) { Text("\(s.origin.city) → \(s.destination.city)").font(BrandTokens.contentTitle); Text(s.id).font(.caption); Text("\(s.status) • \(money(s.amountMinor))") } } }
        }.navigationTitle("Shipments").searchable(text: $search)
            .refreshable { await model.refresh() }
            .navigationDestination(for: String.self) { DetailView(id: $0) }
    }
}
struct DetailView: View {
    @Environment(AppModel.self) private var model
    let id: String
    var body: some View {
        List {
            StatusView()
            Button("Refresh detail / Retry") { Task { await model.load(id) } }.disabled(model.busy)
            if let s = model.detail, s.id == id {
                Text(s.id).font(BrandTokens.contentTitle)
                Text("\(s.mode) • \(s.status) • \(s.carrier)")
                Text("\(money(s.amountMinor)) USD")
                Section("Route") { Text(address(s.origin)); Text(address(s.destination)); Text("Pickup \(s.pickupDate)") }
                Section("Cargo") { ForEach(Array(s.items.enumerated()), id: \.offset) { _, item in Text("\(item.quantity) × \(item.description) • \(item.weightLb) lb • \(item.lengthIn) × \(item.widthIn) × \(item.heightIn) in") } }
                Section("History") { ForEach(s.events) { event in VStack(alignment: .leading) { Text(event.type); Text(event.at); Text("\(event.actor) • \(event.source)").font(.caption) } } }
                Text("Cancel and reschedule are pending in this client.")
            }
        }.navigationTitle("Shipment").task(id: id) { await model.load(id) }
    }
    private func address(_ a: Address) -> String { "\(a.name), \(a.address), \(a.city) \(a.state) \(a.postalCode)" }
}
struct MoreView: View {
    @Environment(AppModel.self) private var model
    var body: some View { List {
        BrandHeader(); Text(model.account?.organizationName ?? "Demo").font(.custom("BricolageGrotesque-96ptExtraBold", size: 22, relativeTo: .title2))
        Text("Local demonstration. No real freight, payments or notifications.")
        Text("Claims, documents, payments, schedules, price matching, analytics and organization editing are pending in this native increment.")
        StatusView()
        Button("Sign out") { Task { await model.signout() } }.disabled(model.busy)
    }.navigationTitle("More") }
}
