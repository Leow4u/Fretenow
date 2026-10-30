package com.fretenow.app

import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.Instant
import java.util.UUID

@Serializable data class Address(val name: String = "", val address: String = "", val city: String = "", val state: String = "", val postalCode: String = "", val country: String = "US")
@Serializable data class Cargo(val description: String = "", val quantity: Int = 1, val weightLb: Double = 100.0, val lengthIn: Double = 48.0, val widthIn: Double = 40.0, val heightIn: Double = 36.0)
@Serializable data class Draft(val mode: String = "LTL", val origin: Address = Address(), val destination: Address = Address(), val pickupDate: String = LocalDate.now(ZoneOffset.UTC).plusDays(1).toString(), val items: List<Cargo> = listOf(Cargo()), val accessorials: List<String> = emptyList()) {
    fun valid(): Boolean = runCatching {
        val states = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ")
        val date = LocalDate.parse(pickupDate); val today = LocalDate.now(ZoneOffset.UTC)
        mode in listOf("LTL", "FTL", "Expedited") && !date.isBefore(today) && !date.isAfter(today.plusDays(366)) && listOf(origin, destination).all { it.name.isNotBlank() && it.address.isNotBlank() && it.city.isNotBlank() && it.state in states && it.postalCode.matches(Regex("[0-9]{5}")) && it.country == "US" } && items.isNotEmpty() && items.size <= 50 && items.all { it.description.isNotBlank() && it.quantity in 1..10000 && it.weightLb.isFinite() && it.weightLb > 0 && it.weightLb <= 100000 && listOf(it.lengthIn, it.widthIn, it.heightIn).all { n -> n.isFinite() && n > 0 && n <= 1000 } } && items.sumOf { it.quantity * it.weightLb } <= 1000000 && accessorials.size <= 20 && accessorials.all { it.isNotBlank() && it.length <= 80 }
    }.getOrDefault(false)
    companion object { fun example() = Draft(origin = Address("Demo origin", "120 Main St", "Austin", "TX", "78701"), destination = Address("Demo destination", "210 Broad St", "Denver", "CO", "80202"), items = listOf(Cargo("Pallet"))) }
}
@Serializable data class Rate(val id: String, val carrier: String, val amountMinor: Long, val currency: String, val transitDays: Int, val validUntilISO: String, val draftHash: String, val demo: Boolean) { fun expired() = !Instant.parse(validUntilISO).isAfter(Instant.now()) }
@Serializable data class Event(val id: String, val type: String, val at: String, val actor: String, val source: String, val pickupDate: String? = null)
@Serializable data class Shipment(val id: String, val mode: String, val status: String, val origin: Address, val destination: Address, val pickupDate: String, val items: List<Cargo>, val accessorials: List<String>, val carrier: String, val amountMinor: Long, val currency: String, val createdAt: String, val demo: Boolean, val events: List<Event>)
@Serializable data class Account(val id: String, val organizationId: String, val name: String, val organizationName: String, val email: String, val demo: Boolean)
@Serializable data class Session(val token: String, val account: Account, val demo: Boolean)
@Serializable data class Shipments(val shipments: List<Shipment>, val demo: Boolean)
@Serializable data class Rates(val rates: List<Rate>)
@Serializable data class Booking(val rateId: String, val draft: Draft)
@Serializable data class Action(val type: String, val pickupDate: String? = null)
@Serializable data class ErrorBody(val error: ErrorInfo)
@Serializable data class ErrorInfo(val code: String, val message: String)
data class BookingIntent(val body: Booking, val key: String = UUID.randomUUID().toString())
fun money(minor: Long) = java.text.NumberFormat.getCurrencyInstance(java.util.Locale.US).format(minor / 100.0)
