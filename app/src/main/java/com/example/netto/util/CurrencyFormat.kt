package com.example.netto.util

import com.example.netto.domain.model.Currency
import java.math.BigDecimal
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

// Formato rioplatense/paraguayo: "." para miles y "," para decimales.
private val symbols = DecimalFormatSymbols(Locale.Builder().setLanguage("es").setRegion("PY").build())
private val integerFormat = DecimalFormat("#,##0", symbols)
private val decimalFormat = DecimalFormat("#,##0.00", symbols)

/**
 * Solo el número con separador de miles ("350.000", "12,50"), para montos donde el símbolo se muestra aparte.
 * Los centavos se muestran solo si no son cero.
 */
fun Long.formatAmount(currency: Currency): String {
    val value = BigDecimal.valueOf(kotlin.math.abs(this), currency.decimals)
    val hasCents = currency.decimals > 0 && value.remainder(BigDecimal.ONE).signum() != 0
    return if (hasCents) decimalFormat.format(value) else integerFormat.format(value)
}

/** "Gs. 350.000", "US$ 12,50", "-$ 1.200". */
fun Long.formatMoney(currency: Currency): String {
    val sign = if (this < 0) "-" else ""
    return "$sign${currency.symbol} ${formatAmount(currency)}"
}

/** Filtra lo que el usuario escribe en un campo de monto: dígitos y, si la moneda tiene decimales, una coma. */
fun Currency.sanitizeAmountInput(raw: String): String {
    if (decimals == 0) return raw.filter { it.isDigit() }
    val normalized = raw.replace('.', ',').filter { it.isDigit() || it == ',' }
    val commaIndex = normalized.indexOf(',')
    if (commaIndex < 0) return normalized
    val integerPart = normalized.substring(0, commaIndex)
    val fraction = normalized.substring(commaIndex + 1).filter { it.isDigit() }.take(decimals)
    return "$integerPart,$fraction"
}

/** Convierte el texto de un campo de monto ("1500,5") a unidad mínima de la moneda (150050). */
fun Currency.parseAmount(text: String): Long? {
    val clean = sanitizeAmountInput(text).trimEnd(',')
    if (clean.isEmpty()) return null
    return try {
        BigDecimal(clean.replace(',', '.')).setScale(decimals).unscaledValue().toLong()
    } catch (e: ArithmeticException) {
        null
    } catch (e: NumberFormatException) {
        null
    }
}

/** Inverso de [parseAmount], para precargar el campo al editar. */
fun Long.toAmountInput(currency: Currency): String =
    BigDecimal.valueOf(this, currency.decimals).stripTrailingZeros().let {
        if (it.scale() < 0) it.setScale(0) else it
    }.toPlainString().replace('.', ',')
