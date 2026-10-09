package com.example.netto.domain.model

import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode
import java.time.Instant

/**
 * Cotizaciones expresadas como "unidades de la moneda por 1 dólar" (USD es siempre 1).
 * Una moneda sin cotización conocida no está en [unitsPerUsd].
 */
data class ExchangeRates(
    val unitsPerUsd: Map<Currency, BigDecimal> = emptyMap(),
    val updatedAt: Instant? = null,
    /** true si el usuario editó a mano alguna cotización (ej. dólar blue) después de la última descarga. */
    val isManual: Boolean = false,
) {
    fun rate(currency: Currency): BigDecimal? =
        if (currency == Currency.USD) BigDecimal.ONE else unitsPerUsd[currency]

    fun has(currency: Currency): Boolean = rate(currency) != null
}

/** Convierte montos (en unidad mínima) a la moneda de visualización [target]. */
class CurrencyConverter(
    val target: Currency,
    val rates: ExchangeRates,
) {
    /** Devuelve null si falta la cotización de alguna de las dos monedas. */
    fun convert(amount: Long, from: Currency, to: Currency = target): Long? {
        if (from == to) return amount
        val fromRate = rates.rate(from) ?: return null
        val toRate = rates.rate(to) ?: return null
        return BigDecimal.valueOf(amount, from.decimals)
            .divide(fromRate, MathContext.DECIMAL64)
            .multiply(toRate)
            .setScale(to.decimals, RoundingMode.HALF_UP)
            .unscaledValue()
            .toLong()
    }

    /** Suma montos en distintas monedas, convertidos a [target]. Los que no se pueden convertir se omiten. */
    fun <T> sum(items: Iterable<T>, amount: (T) -> Long, currency: (T) -> Currency): Long =
        items.sumOf { convert(amount(it), currency(it)) ?: 0L }

    companion object {
        fun identity(target: Currency) = CurrencyConverter(target, ExchangeRates())
    }
}
