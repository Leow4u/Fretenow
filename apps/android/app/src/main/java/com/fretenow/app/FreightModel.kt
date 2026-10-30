package com.fretenow.app

import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

class FreightModel(private val api: FreightApi = HttpFreightApi()) : ViewModel() {
    var account by mutableStateOf<Account?>(null); private set
    private var token: String? = null
    var shipments by mutableStateOf(emptyList<Shipment>()); private set
    var selected by mutableStateOf<Shipment?>(null); private set
    var draft by mutableStateOf(Draft()); private set
    var rates by mutableStateOf(emptyList<Rate>()); private set
    var intent by mutableStateOf<BookingIntent?>(null); private set
    var busy by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set
    var bookedID by mutableStateOf<String?>(null); private set
    var bookingAttempted by mutableStateOf(false); private set
    private fun run(block: suspend () -> Unit) { if (busy) return; viewModelScope.launch {
        busy = true; error = null
        try { block() } catch (e: CancellationException) { throw e } catch (e: Exception) {
            if (e is ApiFailure && e.status == 401) { token = null; account = null; shipments = emptyList(); selected = null; rates = emptyList(); intent = null; error = "Session expired. Enter the demo again." }
            else error = e.message ?: "Connection failed. Retry the same operation."
            if (e is ApiFailure && e.status in listOf(400, 404, 409)) { intent = null; rates = emptyList(); bookingAttempted = false }
        } finally { busy = false }
    } }
    fun login() = run { val s = api.login(); token = s.token; account = s.account; shipments = api.list(s.token) }
    fun logout() = run { api.signout(requireNotNull(token)); token = null; account = null; shipments = emptyList(); rates = emptyList(); intent = null; selected = null; bookedID = null; draft = Draft() }
    fun refresh() = run { shipments = api.list(requireNotNull(token)) }
    fun detail(id: String) = run { selected = api.detail(requireNotNull(token), id) }
    fun edit(value: Draft) { if (busy || intent != null) return; draft = value; rates = emptyList(); bookedID = null }
    fun quote() = run { check(draft.valid()) { "Complete US addresses, a valid date and positive lb/in cargo." }; rates = api.rates(requireNotNull(token), draft); intent = null; bookedID = null }
    fun prepare(rate: Rate) { if (busy || intent != null) return; if (rate.expired()) { rates = emptyList(); error = "Rate expired. Request new rates." } else { intent = BookingIntent(Booking(rate.id, draft)); bookingAttempted = false } }
    fun dismissConfirmation() { if (!busy) intent = null }
    // Retain the entire intent on transport failure: retries must replay the exact payload/key.
    fun book() = run {
        val pending = requireNotNull(intent)
        bookingAttempted = true
        val shipment = api.book(requireNotNull(token), pending)
        bookedID = shipment.id; intent = null; rates = emptyList()
        selected = shipment
        shipments = api.list(requireNotNull(token))
        selected = api.detail(requireNotNull(token), shipment.id)
    }
}
