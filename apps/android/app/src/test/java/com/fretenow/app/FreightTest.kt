package com.fretenow.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test
import java.io.IOException

@OptIn(ExperimentalCoroutinesApi::class)
class FreightTest {
    private val shipmentJSON = """{"id":"server-id","mode":"LTL","status":"booked","origin":{"name":"A","address":"120 Main","city":"Austin","state":"TX","postalCode":"78701","country":"US"},"destination":{"name":"B","address":"210 Broad","city":"Denver","state":"CO","postalCode":"80202","country":"US"},"pickupDate":"2026-11-02","items":[{"description":"Pallet","quantity":1,"weightLb":100,"lengthIn":48,"widthIn":40,"heightIn":36}],"accessorials":[],"carrier":"Demo","amountMinor":16700,"currency":"USD","createdAt":"2026-10-30T10:00:00.123Z","demo":true,"events":[{"id":"e1","type":"booked","at":"2026-10-30T10:00:00Z","actor":"Demo","source":"demo"}]}"""
    private fun shipment() = Json.decodeFromString<Shipment>(shipmentJSON)
    private fun rate(expired: Boolean = false) = Rate("rate-id", "Demo", 16700, "USD", 3, if (expired) "2000-01-01T00:00:00Z" else "2099-01-01T00:00:00.123Z", "hash", true)
    @Test fun decodeExactContract() { val s = shipment(); assertEquals("server-id", s.id); assertEquals(16700, s.amountMinor.toInt()); assertEquals("demo", s.events.single().source); assertEquals(null, s.events.single().pickupDate); assertFalse(rate().expired()) }
    @Test fun validatePhysicalInputsAndCalendar() { val d = Draft.example(); assertTrue(d.valid()); assertFalse(d.copy(origin = d.origin.copy(state = "ZZ")).valid()); assertFalse(d.copy(pickupDate = "2026-02-30").valid()); assertFalse(d.copy(items = listOf(Cargo("Pallet", weightLb = Double.NaN))).valid()); assertFalse(d.copy(items = listOf(Cargo("Pallet", quantity = 0))).valid()) }
    private inner class Fake : FreightApi {
        val attempts = mutableListOf<BookingIntent>(); var fail = true; var expiredSession = false; var reject = false
        override suspend fun login() = Session("memory-only", Account("a", "o", "Demo", "Demo", "demo@example.test", true), true)
        override suspend fun list(token: String): List<Shipment> { if (expiredSession) throw ApiFailure(401, "expired"); return emptyList() }
        override suspend fun detail(token: String, id: String) = shipment()
        override suspend fun rates(token: String, draft: Draft) = listOf(rate())
        override suspend fun book(token: String, intent: BookingIntent): Shipment { attempts.add(intent); if (reject) throw ApiFailure(409, "expired"); if (fail) { fail = false; throw IOException("response lost") }; return shipment() }
        override suspend fun signout(token: String) { }
    }
    @Test fun unknownOutcomeRetriesSameBodyAndKeyThenUsesServerID() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        try {
            val api = Fake(); val model = FreightModel(api)
            model.login(); advanceUntilIdle(); model.edit(Draft.example()); model.quote(); advanceUntilIdle()
            model.prepare(model.rates.single()); val key = model.intent!!.key
            model.book(); advanceUntilIdle(); assertEquals(key, model.intent!!.key); assertNotNull(model.error)
            model.edit(Draft()); assertTrue(model.draft.valid())
            model.book(); advanceUntilIdle(); assertEquals(api.attempts[0], api.attempts[1]); assertEquals("server-id", model.bookedID); assertNull(model.intent)
        } finally { Dispatchers.resetMain() }
    }
    @Test fun editsInvalidateRatesAndExpiredRateCannotPrepare() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        try { val model = FreightModel(Fake()); model.login(); advanceUntilIdle(); model.edit(Draft.example()); model.quote(); advanceUntilIdle(); model.edit(model.draft.copy(mode = "FTL")); assertTrue(model.rates.isEmpty()); model.prepare(rate(true)); assertNull(model.intent); assertNotNull(model.error) } finally { Dispatchers.resetMain() }
    }
    @Test fun sessionExpiryClearsAndDefinitiveRejectionUnlocksRequote() = runTest {
        Dispatchers.setMain(StandardTestDispatcher(testScheduler))
        try {
            val api = Fake(); val model = FreightModel(api); model.login(); advanceUntilIdle(); model.edit(Draft.example()); model.quote(); advanceUntilIdle(); model.prepare(model.rates.single()); api.reject = true; model.book(); advanceUntilIdle(); assertNull(model.intent); assertTrue(model.rates.isEmpty())
            api.expiredSession = true; model.refresh(); advanceUntilIdle(); assertNull(model.account); assertTrue(model.shipments.isEmpty())
        } finally { Dispatchers.resetMain() }
    }
}
