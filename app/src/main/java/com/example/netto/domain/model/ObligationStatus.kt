package com.example.netto.domain.model

import java.time.LocalDate

/** Estado calculado de una obligación en base a su fecha de vencimiento y si fue pagada. */
enum class ObligationStatus(val label: String) {
    PAGADO("Pagado"),
    VENCIDO("Vencido"),
    HOY("Vence hoy"),
    PROXIMO("Próximo"),
    AL_DIA("Al día");

    companion object {
        /** [proximoUmbralDias] es cuántos días antes del vencimiento se considera "próximo". */
        fun from(dueDate: LocalDate, isPaid: Boolean, today: LocalDate, proximoUmbralDias: Long = 7): ObligationStatus {
            if (isPaid) return PAGADO
            val diasHastaVencimiento = dueDate.toEpochDay() - today.toEpochDay()
            return when {
                diasHastaVencimiento < 0 -> VENCIDO
                diasHastaVencimiento == 0L -> HOY
                diasHastaVencimiento <= proximoUmbralDias -> PROXIMO
                else -> AL_DIA
            }
        }
    }
}
