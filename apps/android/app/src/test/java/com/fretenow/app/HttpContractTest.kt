package com.fretenow.app

import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.MockResponse
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.*
import kotlinx.serialization.encodeToString
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class HttpContractTest {
    private val responseJson = Json { encodeDefaults = true }
    @Test fun nativeTransportUsesBodylessSessionAndBearerAndJSONQuote() = runTest {
        val server = MockWebServer()
        server.enqueue(MockResponse().setResponseCode(201).setBody("""{"token":"synthetic-test-session","account":{"id":"a","organizationId":"o","name":"Demo","organizationName":"Demo","email":"test@example.test","demo":true},"demo":true}"""))
        server.enqueue(MockResponse().setBody("""{"rates":[]}"""))
        server.start()
        try {
            val api = HttpFreightApi(server.url("").toString().trimEnd('/'))
            val session = api.login(); val draft = Draft.example(); api.rates(session.token, draft)
            val login = server.takeRequest(); val quote = server.takeRequest()
            assertEquals("/api/demo/session", login.path); assertEquals("POST", login.method)
            assertNull(login.getHeader("Content-Type")); assertEquals(0L, login.bodySize)
            assertEquals("Bearer ${session.token}", quote.getHeader("Authorization"))
            assertEquals("/api/v1/rates", quote.path); assertEquals("POST", quote.method)
            assertEquals("application/json", quote.getHeader("Content-Type"))
            val body = quote.body.readUtf8()
            assertWireDraft(Json.parseToJsonElement(body).jsonObject, draft)
            // Captured synthetic request body only: no headers, bearer or credentials.
            File("build/test-output/quote-draft.json").apply { parentFile?.mkdirs(); writeText(body) }
        } finally { server.shutdown() }
    }

    @Test fun bookingWireIncludesRequiredDefaultsAndRetriesIdenticalPayloadAndKey() = runTest {
        val server = MockWebServer()
        val draft = Draft.example()
        val intent = BookingIntent(Booking("synthetic-rate-id", draft))
        val shipment = Shipment("server-id", draft.mode, "booked", draft.origin, draft.destination, draft.pickupDate, draft.items, draft.accessorials, "Demo", 16700, "USD", "2026-10-30T10:00:00.123Z", true, emptyList())
        server.enqueue(MockResponse().setResponseCode(500).setBody("""{"error":{"code":"INTERNAL","message":"Retry"}}"""))
        server.enqueue(MockResponse().setResponseCode(201).setBody(responseJson.encodeToString(shipment)))
        server.start()
        try {
            val api = HttpFreightApi(server.url("").toString().trimEnd('/'))
            val failure = runCatching { api.book("synthetic-test-session", intent) }.exceptionOrNull()
            assertTrue(failure is ApiFailure && failure.status == 500)
            assertEquals("server-id", api.book("synthetic-test-session", intent).id)
            val first = server.takeRequest(); val retry = server.takeRequest()
            val firstBody = first.body.readUtf8(); val retryBody = retry.body.readUtf8()
            assertEquals(firstBody, retryBody)
            for (request in listOf(first, retry)) {
                assertEquals("POST", request.method); assertEquals("/api/v1/shipments", request.path)
                assertEquals("application/json", request.getHeader("Content-Type"))
                assertEquals("Bearer synthetic-test-session", request.getHeader("Authorization"))
                assertEquals(intent.key, request.getHeader("Idempotency-Key"))
            }
            val wire = Json.parseToJsonElement(firstBody).jsonObject
            assertEquals(setOf("rateId", "draft"), wire.keys)
            assertString(wire, "rateId", intent.body.rateId)
            assertWireDraft(wire.getValue("draft").jsonObject, draft)
            File("build/test-output/booking-request.json").apply { parentFile?.mkdirs(); writeText(firstBody) }
        } finally { server.shutdown() }
    }

    // Inspect raw JSON, without decoding into a model that could restore missing defaults.
    private fun assertWireDraft(wire: JsonObject, draft: Draft) {
        assertEquals(setOf("mode", "origin", "destination", "pickupDate", "items", "accessorials"), wire.keys)
        assertString(wire, "mode", draft.mode); assertString(wire, "pickupDate", draft.pickupDate)
        for ((key, address) in listOf("origin" to draft.origin, "destination" to draft.destination)) {
            val value = wire.getValue(key).jsonObject
            assertEquals(setOf("name", "address", "city", "state", "postalCode", "country"), value.keys)
            assertString(value, "name", address.name); assertString(value, "address", address.address)
            assertString(value, "city", address.city); assertString(value, "state", address.state)
            assertString(value, "postalCode", address.postalCode); assertString(value, "country", "US")
        }
        val items = wire.getValue("items").jsonArray
        assertEquals(draft.items.size, items.size)
        for ((index, item) in draft.items.withIndex()) {
            val value = items[index].jsonObject
            assertEquals(setOf("description", "quantity", "weightLb", "lengthIn", "widthIn", "heightIn"), value.keys)
            assertString(value, "description", item.description)
            val quantity = value.getValue("quantity").jsonPrimitive
            assertFalse(quantity.isString); assertEquals(item.quantity, quantity.int)
            for ((key, expected) in mapOf("weightLb" to item.weightLb, "lengthIn" to item.lengthIn, "widthIn" to item.widthIn, "heightIn" to item.heightIn)) {
                val number = value.getValue(key).jsonPrimitive
                assertFalse(number.isString); assertEquals(expected, number.double, 0.0)
            }
        }
        val accessorials = wire.getValue("accessorials").jsonArray
        assertEquals(draft.accessorials.size, accessorials.size)
        accessorials.forEachIndexed { index, value -> assertTrue(value.jsonPrimitive.isString); assertEquals(draft.accessorials[index], value.jsonPrimitive.content) }
    }
    private fun assertString(value: JsonObject, key: String, expected: String) {
        val actual = value.getValue(key).jsonPrimitive
        assertTrue("$key must be a JSON string", actual.isString); assertEquals(expected, actual.content)
    }
}
