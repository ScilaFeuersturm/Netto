package com.example.netto.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import com.example.netto.data.remote.ExchangeRateApi
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.domain.model.ExchangeRates
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException
import java.math.BigDecimal
import java.time.Duration
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cotizaciones (compartidas por todos los usuarios del dispositivo) y moneda de visualización (por usuario).
 * Las cotizaciones se descargan de [ExchangeRateApi], quedan guardadas para usarse sin conexión
 * y el usuario puede pisarlas a mano (ej. para usar el dólar blue o paralelo).
 */
@Singleton
class CurrencyRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val api: ExchangeRateApi,
    private val budgetPlanRepository: BudgetPlanRepository,
) {
    fun observeRates(): Flow<ExchangeRates> = dataStore.data
        .catch { if (it is IOException) emit(emptyPreferences()) else throw it }
        .map { prefs ->
            ExchangeRates(
                unitsPerUsd = Currency.entries
                    .mapNotNull { currency -> prefs[rateKey(currency)]?.toBigDecimalOrNull()?.let { currency to it } }
                    .toMap(),
                updatedAt = prefs[UPDATED_AT_KEY]?.let(Instant::ofEpochMilli),
                isManual = prefs[MANUAL_KEY] ?: false,
            )
        }
        .distinctUntilChanged()

    fun observeDisplayCurrency(): Flow<Currency> =
        budgetPlanRepository.observe().map { it.displayCurrency }.distinctUntilChanged()

    fun observeConverter(): Flow<CurrencyConverter> =
        combine(observeDisplayCurrency(), observeRates()) { currency, rates -> CurrencyConverter(currency, rates) }

    suspend fun setDisplayCurrency(currency: Currency) {
        budgetPlanRepository.update { it.copy(displayCurrency = currency) }
    }

    /** Descarga las cotizaciones oficiales y reemplaza las guardadas (incluidas las manuales). */
    suspend fun refresh(): Result<ExchangeRates> = runCatching {
        val fetched = api.fetchUnitsPerUsd()
        dataStore.edit { prefs ->
            fetched.forEach { (currency, rate) -> prefs[rateKey(currency)] = rate.toPlainString() }
            prefs[UPDATED_AT_KEY] = System.currentTimeMillis()
            prefs[MANUAL_KEY] = false
        }
        observeRates().first()
    }

    /** Actualiza en segundo plano si nunca se descargaron o tienen más de [STALE_AFTER]; respeta las manuales. */
    suspend fun refreshIfStale() {
        val rates = observeRates().first()
        if (rates.isManual) return
        val updatedAt = rates.updatedAt
        if (updatedAt == null || Duration.between(updatedAt, Instant.now()) > STALE_AFTER) refresh()
    }

    suspend fun setManualRate(currency: Currency, unitsPerUsd: BigDecimal) {
        require(currency != Currency.USD && unitsPerUsd.signum() > 0)
        dataStore.edit { prefs ->
            prefs[rateKey(currency)] = unitsPerUsd.toPlainString()
            prefs[UPDATED_AT_KEY] = System.currentTimeMillis()
            prefs[MANUAL_KEY] = true
        }
    }

    private companion object {
        val STALE_AFTER: Duration = Duration.ofHours(12)
        val UPDATED_AT_KEY = longPreferencesKey("rates_updated_at")
        val MANUAL_KEY = booleanPreferencesKey("rates_manual")
        fun rateKey(currency: Currency) = stringPreferencesKey("rate_per_usd_${currency.code}")
    }
}
