package com.example.netto.domain.model

/**
 * Monedas soportadas. Los montos se guardan como [Long] en la unidad mínima de cada moneda
 * (guaraníes enteros; centavos para pesos y dólares), por eso [decimals] define la escala.
 */
enum class Currency(
    val code: String,
    val symbol: String,
    val label: String,
    val decimals: Int,
) {
    PYG(code = "PYG", symbol = "Gs.", label = "Guaraníes", decimals = 0),
    ARS(code = "ARS", symbol = "$", label = "Pesos argentinos", decimals = 2),
    USD(code = "USD", symbol = "US$", label = "Dólares", decimals = 2),
}
