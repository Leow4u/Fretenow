package com.fretenow.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import java.net.HttpURLConnection
import java.net.URL

class ApiFailure(val status: Int, message: String) : Exception(message)
interface FreightApi {
    suspend fun login(): Session
    suspend fun list(token: String): List<Shipment>
    suspend fun detail(token: String, id: String): Shipment
    suspend fun rates(token: String, draft: Draft): List<Rate>
    suspend fun book(token: String, intent: BookingIntent): Shipment
    suspend fun signout(token: String)
}
class HttpFreightApi(private val base: String = BuildConfig.API_URL) : FreightApi {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false; encodeDefaults = true }
    private suspend fun request(path: String, token: String? = null, body: String? = null, key: String? = null, post: Boolean = false): String = withContext(Dispatchers.IO) {
        val connection = URL(base + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = if (post) "POST" else "GET"
            connection.connectTimeout = 15000; connection.readTimeout = 15000
            connection.instanceFollowRedirects = false
            token?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
            key?.let { connection.setRequestProperty("Idempotency-Key", it) }
            if (body != null) { connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            val response = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (status !in 200..299) throw ApiFailure(status, runCatching { json.decodeFromString<ErrorBody>(response).error.message }.getOrDefault("Request failed ($status)"))
            response
        } finally { connection.disconnect() }
    }
    override suspend fun login() = json.decodeFromString<Session>(request("/api/demo/session", post = true))
    override suspend fun list(token: String) = json.decodeFromString<Shipments>(request("/api/v1/shipments", token)).shipments
    override suspend fun detail(token: String, id: String) = json.decodeFromString<Shipment>(request("/api/v1/shipments/$id", token))
    override suspend fun rates(token: String, draft: Draft) = json.decodeFromString<Rates>(request("/api/v1/rates", token, json.encodeToString(draft), post = true)).rates
    override suspend fun book(token: String, intent: BookingIntent) = json.decodeFromString<Shipment>(request("/api/v1/shipments", token, json.encodeToString(intent.body), intent.key, true))
    override suspend fun signout(token: String) { request("/api/auth/signout", token, post = true) }
}
