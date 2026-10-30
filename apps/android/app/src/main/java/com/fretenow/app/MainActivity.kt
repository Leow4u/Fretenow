package com.fretenow.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.viewmodel.compose.viewModel

// The approved variable font defaults to weight 800; Compose text sizes remain sp
// so product titles follow the user's font scale and can wrap naturally.
private val brandTitleFamily = FontFamily(Font(R.font.bricolage_grotesque, FontWeight.ExtraBold))
private val nativeTypography = Typography()
private val brandTypography = nativeTypography.copy(
    headlineLarge = nativeTypography.headlineLarge.copy(fontFamily = brandTitleFamily),
    headlineMedium = nativeTypography.headlineMedium.copy(fontFamily = brandTitleFamily),
    headlineSmall = nativeTypography.headlineSmall.copy(fontFamily = brandTitleFamily),
    titleLarge = nativeTypography.titleLarge.copy(fontFamily = brandTitleFamily),
    titleMedium = nativeTypography.titleMedium.copy(fontFamily = brandTitleFamily),
    titleSmall = nativeTypography.titleSmall.copy(fontFamily = brandTitleFamily),
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); setContent {
        MaterialTheme(typography = brandTypography, colorScheme = lightColorScheme(primary = Color(0xFF0166D9), secondary = Color(0xFF0A1F4E), background = Color(0xFFF2F4F8))) { FreightApp() }
    } }
}
@Composable fun FreightApp(model: FreightModel = viewModel()) {
    var tab by remember { mutableStateOf("Home") }
    var search by remember { mutableStateOf("") }
    var detailID by remember { mutableStateOf<String?>(null) }
    BackHandler(enabled = detailID != null) { detailID = null }
    LaunchedEffect(model.account) { if (model.account == null) { detailID = null; tab = "Home" } }
    Scaffold(bottomBar = { if (model.account != null) NavigationBar { listOf("Home", "Quote", "More").forEach { name -> NavigationBarItem(selected = tab == name, onClick = { tab = name; detailID = null }, icon = { Text(name.take(1)) }, label = { Text(name) }) } } }) { padding ->
        Column(Modifier.padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Image(painterResource(R.drawable.brand_logo), "FreteNow", Modifier.width(180.dp).height(48.dp))
            Text("Local demo • no real freight, payments or notifications", style = MaterialTheme.typography.labelLarge)
            if (model.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            model.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (model.account == null) {
                Text("Your freight, together.", style = MaterialTheme.typography.headlineLarge)
                Text("Connect to the local shared API. Demo session stays in memory.")
                Button(onClick = model::login, enabled = !model.busy) { Text("Enter local demo / Retry") }
            } else when (tab) {
                "Home" -> if (detailID == null) {
                    Text("Shipments", style = MaterialTheme.typography.headlineMedium)
                    OutlinedTextField(search, { search = it }, label = { Text("Search ID, city or carrier") }, modifier = Modifier.fillMaxWidth())
                    Button(onClick = model::refresh, enabled = !model.busy) { Text("Refresh / Retry") }
                    val matches = model.shipments.filter { "$it".contains(search, ignoreCase = true) }
                    if (matches.isEmpty()) Text("No shipments found. Request a quote to start.")
                    matches.forEach { s -> OutlinedCard(onClick = { detailID = s.id; model.detail(s.id) }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp)) { Text(s.id); Text("${s.origin.city} → ${s.destination.city}"); Text("${s.status} • ${money(s.amountMinor)}") } } }
                } else {
                    Button(onClick = { detailID = null }) { Text("Back to shipments") }
                    Button(onClick = { model.detail(requireNotNull(detailID)) }, enabled = !model.busy) { Text("Refresh detail / Retry") }
                    model.selected?.takeIf { it.id == detailID }?.let { ShipmentDetail(it) }
                }
                "Quote" -> QuoteScreen(model)
                else -> {
                    Text(model.account?.organizationName.orEmpty(), style = MaterialTheme.typography.headlineMedium)
                    Text("Claims, documents, payments, schedules, price matching, analytics and organization editing are pending in this native increment. No provider actions are available.")
                    Button(onClick = model::logout, enabled = !model.busy) { Text("Sign out") }
                }
            }
        }
    }
}
@Composable private fun ShipmentDetail(s: Shipment) {
    Text(s.id, style = MaterialTheme.typography.headlineSmall)
    Text("${s.mode} • ${s.status} • ${s.carrier} • ${money(s.amountMinor)} USD")
    Text("${s.origin.name}, ${s.origin.address}, ${s.origin.city} ${s.origin.state} ${s.origin.postalCode}")
    Text("To: ${s.destination.name}, ${s.destination.address}, ${s.destination.city} ${s.destination.state} ${s.destination.postalCode}")
    Text("Pickup ${s.pickupDate}")
    s.items.forEach { Text("${it.quantity} × ${it.description} • ${it.weightLb} lb • ${it.lengthIn} × ${it.widthIn} × ${it.heightIn} in") }
    Text("History", style = MaterialTheme.typography.titleLarge)
    s.events.forEach { Text("${it.type} • ${it.at}\n${it.actor} • ${it.source}") }
    Text("Cancel and reschedule are pending in this client.")
}
@Composable private fun Field(label: String, value: String, enabled: Boolean, update: (String) -> Unit) {
    OutlinedTextField(value, update, enabled = enabled, label = { Text(label) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
}
@Composable private fun AddressForm(label: String, value: Address, enabled: Boolean, update: (Address) -> Unit) {
    Text(label, style = MaterialTheme.typography.titleLarge)
    Field("Location name", value.name, enabled) { update(value.copy(name = it)) }
    Field("Street address", value.address, enabled) { update(value.copy(address = it)) }
    Field("City", value.city, enabled) { update(value.copy(city = it)) }
    Field("US state (TX)", value.state, enabled) { update(value.copy(state = it.uppercase())) }
    Field("ZIP5", value.postalCode, enabled) { update(value.copy(postalCode = it)) }
}
@Composable private fun QuoteScreen(model: FreightModel) {
    val d = model.draft; val enabled = !model.busy && model.intent == null
    var exampleGeneration by remember { mutableStateOf(0) }
    Text("Request a quote", style = MaterialTheme.typography.headlineMedium)
    Button(onClick = { model.edit(Draft.example()); exampleGeneration++ }, enabled = enabled) { Text("Use example data") }
    Row { listOf("LTL", "FTL", "Expedited").forEach { mode -> FilterChip(d.mode == mode, { model.edit(d.copy(mode = mode)) }, label = { Text(mode) }, enabled = enabled) } }
    AddressForm("Origin • US", d.origin, enabled) { model.edit(d.copy(origin = it)) }
    AddressForm("Destination • US", d.destination, enabled) { model.edit(d.copy(destination = it)) }
    Field("Pickup date UTC (YYYY-MM-DD)", d.pickupDate, enabled) { model.edit(d.copy(pickupDate = it)) }
    Text("Cargo • one item in this increment", style = MaterialTheme.typography.titleLarge)
    val item = d.items.first()
    Field("Description", item.description, enabled) { model.edit(d.copy(items = listOf(item.copy(description = it)))) }
    // Text buffers permit clearing and partially typing numbers without replacing input with a default.
    key(exampleGeneration) { CargoNumbers(item, enabled) { model.edit(d.copy(items = listOf(it))) } }
    Field("Accessorial labels (comma separated)", d.accessorials.joinToString(","), enabled) { model.edit(d.copy(accessorials = if (it.isBlank()) emptyList() else it.split(","))) }
    Text("All addresses require name, street, city, US state and ZIP5. Positive lb/in; pickup today through 366 days UTC.")
    Button(onClick = model::quote, enabled = enabled && d.valid()) { Text("Get rates / Retry") }
    model.rates.forEach { rate ->
        Text("${rate.carrier} • ${money(rate.amountMinor)} USD • ${rate.transitDays} days\nValid until ${rate.validUntilISO}")
        Button(onClick = { model.prepare(rate) }, enabled = enabled) { Text("Review booking") }
    }
    model.intent?.let { pending ->
        Text("Confirm local demo booking: ${pending.body.draft.origin.city} → ${pending.body.draft.destination.city}. No carrier will be booked.", style = MaterialTheme.typography.titleMedium)
        model.rates.find { it.id == pending.body.rateId }?.let { Text("${it.carrier} • ${money(it.amountMinor)} USD • pickup ${pending.body.draft.pickupDate}") }
        Button(onClick = model::book, enabled = !model.busy) { Text("Confirm booking / Retry same request") }
        if (!model.bookingAttempted) TextButton(onClick = model::dismissConfirmation, enabled = !model.busy) { Text("Back to editing") }
        else Text("A response may have been lost. Retry this same booking to safely recover its server ID.")
    }
    model.bookedID?.let { Text("Booked locally: $it. Open Home to inspect the server record.") }
}
@Composable private fun CargoNumbers(item: Cargo, enabled: Boolean, update: (Cargo) -> Unit) {
    var quantity by remember(item.description) { mutableStateOf(item.quantity.toString()) }
    var weight by remember(item.description) { mutableStateOf(item.weightLb.toString()) }
    var length by remember(item.description) { mutableStateOf(item.lengthIn.toString()) }
    var width by remember(item.description) { mutableStateOf(item.widthIn.toString()) }
    var height by remember(item.description) { mutableStateOf(item.heightIn.toString()) }
    Field("Quantity", quantity, enabled) { quantity = it; update(item.copy(quantity = it.toIntOrNull() ?: 0)) }
    Field("Weight per item (lb)", weight, enabled) { weight = it; update(item.copy(weightLb = it.toDoubleOrNull() ?: 0.0)) }
    Field("Length (in)", length, enabled) { length = it; update(item.copy(lengthIn = it.toDoubleOrNull() ?: 0.0)) }
    Field("Width (in)", width, enabled) { width = it; update(item.copy(widthIn = it.toDoubleOrNull() ?: 0.0)) }
    Field("Height (in)", height, enabled) { height = it; update(item.copy(heightIn = it.toDoubleOrNull() ?: 0.0)) }
}
