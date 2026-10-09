package com.example.netto

import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.domain.model.ExchangeRates
import com.example.netto.util.formatMoney
import com.example.netto.util.parseAmount
import com.example.netto.util.sanitizeAmountInput
import com.example.netto.util.toAmountInput
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.math.BigDecimal

class CurrencyTest {

    private val rates = ExchangeRates(
        unitsPerUsd = mapOf(
            Currency.PYG to BigDecimal("7500"),
            Currency.ARS to BigDecimal("1500"),
        ),
    )

    @Test
    fun convertsBetweenCurrenciesUsingMinorUnits() {
        val toPyg = CurrencyConverter(Currency.PYG, rates)
        // US$ 10,00 (1000 centavos) -> Gs. 75.000
        assertEquals(75_000L, toPyg.convert(1_000, Currency.USD))
        // $ 1.500,00 (150000 centavos) -> 1 USD -> Gs. 7.500
        assertEquals(7_500L, toPyg.convert(150_000, Currency.ARS))

        val toUsd = CurrencyConverter(Currency.USD, rates)
        // Gs. 100.000 -> US$ 13,33 (redondeo a centavos)
        assertEquals(1_333L, toUsd.convert(100_000, Currency.PYG))
    }

    @Test
    fun sameCurrencyNeedsNoRate() {
        val converter = CurrencyConverter.identity(Currency.ARS)
        assertEquals(12_345L, converter.convert(12_345, Currency.ARS))
        assertNull(converter.convert(100, Currency.PYG))
    }

    @Test
    fun sumSkipsAmountsWithoutRate() {
        val onlyPyg = CurrencyConverter(Currency.PYG, ExchangeRates(mapOf(Currency.PYG to BigDecimal("7500"))))
        val items = listOf(10_000L to Currency.PYG, 100L to Currency.USD, 999L to Currency.ARS)
        // ARS no tiene cotización: se omite. US$ 1,00 -> Gs. 7.500.
        assertEquals(17_500L, onlyPyg.sum(items, { it.first }, { it.second }))
    }

    @Test
    fun formatsEachCurrency() {
        assertEquals("Gs. 350.000", 350_000L.formatMoney(Currency.PYG))
        assertEquals("US$ 12,50", 1_250L.formatMoney(Currency.USD))
        assertEquals("$ 1.500", 150_000L.formatMoney(Currency.ARS))
        assertEquals("-Gs. 1.000", (-1_000L).formatMoney(Currency.PYG))
    }

    @Test
    fun parsesUserInput() {
        assertEquals(150_050L, Currency.ARS.parseAmount("1500,5"))
        assertEquals(150_000L, Currency.ARS.parseAmount("1500"))
        assertEquals(1_299L, Currency.USD.parseAmount("12.99"))
        assertEquals(350_000L, Currency.PYG.parseAmount("350000"))
        assertNull(Currency.USD.parseAmount(""))
        assertEquals("12,34", Currency.USD.sanitizeAmountInput("12,345"))
        assertEquals("12345", Currency.PYG.sanitizeAmountInput("12,345"))
    }

    @Test
    fun amountInputRoundTrips() {
        assertEquals("1500,5", 150_050L.toAmountInput(Currency.ARS))
        assertEquals("350000", 350_000L.toAmountInput(Currency.PYG))
        assertEquals("12", 1_200L.toAmountInput(Currency.USD))
    }
}
