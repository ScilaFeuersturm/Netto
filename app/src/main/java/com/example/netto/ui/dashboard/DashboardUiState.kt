package com.example.netto.ui.dashboard

import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.data.local.entity.PaymentHistoryEntity
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter

data class DashboardUiState(
    val isLoading: Boolean = true,
    /** Los totales de este estado ya están convertidos a [CurrencyConverter.target]. */
    val converter: CurrencyConverter = CurrencyConverter.identity(Currency.PYG),
    val userHasData: Boolean = false,
    val totalIncome: Long = 0,
    val totalPending: Long = 0,
    val pendingThisMonth: Long = 0,
    val vencidosCount: Int = 0,
    val proximosCount: Int = 0,
    val alDiaCount: Int = 0,
    val isOverBudget: Boolean = false,
    val overBudgetAmount: Long = 0,
    val upcoming: List<ObligationEntity> = emptyList(),
    /** Facturas sin pagar que vencen en los próximos 7 días (o ya vencidas). */
    val dueThisWeekCount: Int = 0,
    /** Porcentaje (0-100) del monto de obligaciones de este mes que ya está pagado. */
    val paidThisMonthPercent: Int = 0,
    val recentPayments: List<PaymentHistoryEntity> = emptyList(),
) {
    /** Lo que queda del ingreso mensual después de cubrir lo pendiente del mes. */
    val availableBalance: Long get() = totalIncome - pendingThisMonth
}
