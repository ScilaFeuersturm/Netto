package com.example.netto.util

import com.example.netto.domain.model.ObligationStatus
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private val spanish: Locale = Locale.Builder().setLanguage("es").build()
private val shortDateFormatter = DateTimeFormatter.ofPattern("d MMM", spanish)

/** "14 Oct" */
fun LocalDate.shortEs(): String =
    format(shortDateFormatter).replace(".", "").split(" ")
        .joinToString(" ") { part -> part.replaceFirstChar { it.uppercase() } }

/** "Octubre 2024" */
fun YearMonth.longEs(): String =
    "${month.getDisplayName(TextStyle.FULL, spanish).replaceFirstChar { it.uppercase() }} $year"

/** Texto corto del vencimiento para chips: "Vence en 2 días", "Vence mañana", "Vencida hace 3 días". */
fun dueLabel(dueDate: LocalDate, status: ObligationStatus, today: LocalDate = LocalDate.now()): String {
    if (status == ObligationStatus.PAGADO) return "Pagada"
    val days = dueDate.toEpochDay() - today.toEpochDay()
    return when {
        days < -1 -> "Vencida hace ${-days} días"
        days == -1L -> "Vencida ayer"
        days == 0L -> "Vence hoy"
        days == 1L -> "Vence mañana"
        else -> "Vence en $days días"
    }
}

/** Qué tan cerca está el vencimiento, de 0 (lejos) a 1 (vence hoy o vencida). Ventana de 30 días. */
fun urgencyFraction(dueDate: LocalDate, isPaid: Boolean, today: LocalDate = LocalDate.now()): Float {
    if (isPaid) return 1f
    val days = dueDate.toEpochDay() - today.toEpochDay()
    return (1f - days / 30f).coerceIn(0.06f, 1f)
}
