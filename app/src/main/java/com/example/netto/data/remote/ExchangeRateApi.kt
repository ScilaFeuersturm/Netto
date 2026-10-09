package com.example.netto.data.remote

import com.example.netto.domain.model.Currency
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.math.BigDecimal
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject

/**
 * Cotizaciones oficiales desde ExchangeRate-API (endpoint abierto, sin API key, se actualiza una vez por día).
 * Se usa HttpURLConnection + org.json del SDK para no sumar dependencias por un único GET.
 */
class ExchangeRateApi @Inject constructor() {

    /** Unidades de cada moneda por 1 USD. */
    suspend fun fetchUnitsPerUsd(): Map<Currency, BigDecimal> = withContext(Dispatchers.IO) {
        val connection = URL(ENDPOINT).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = TIMEOUT_MS
            connection.readTimeout = TIMEOUT_MS
            if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                throw IOException("El servicio de cotizaciones respondió ${connection.responseCode}")
            }
            val json = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
            if (json.optString("result") != "success") throw IOException("Respuesta inválida del servicio de cotizaciones")
            val rates = json.getJSONObject("rates")
            Currency.entries
                .filter { it != Currency.USD }
                .associateWith { BigDecimal(rates.getString(it.code)) }
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        const val SOURCE_NAME = "ExchangeRate-API (open.er-api.com)"
        private const val ENDPOINT = "https://open.er-api.com/v6/latest/USD"
        private const val TIMEOUT_MS = 10_000
    }
}
