package com.example.netto.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.repository.BudgetPlanRepository
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.IncomeRepository
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.domain.model.ObligationStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val obligationRepository: ObligationRepository,
    incomeRepository: IncomeRepository,
    budgetPlanRepository: BudgetPlanRepository,
    currencyRepository: CurrencyRepository,
) : ViewModel() {

    val uiState: StateFlow<DashboardUiState> = combine(
        obligationRepository.observeAll(),
        incomeRepository.observeAll(),
        budgetPlanRepository.observe(),
        obligationRepository.observePaymentHistory(),
        currencyRepository.observeConverter(),
    ) { obligations, incomes, plan, history, converter ->
        val today = LocalDate.now()
        val currentMonth = YearMonth.from(today)
        val reminderDays = plan.reminderDaysBefore.toLong()

        val unpaid = obligations.filter { !it.isPaid }
        val statusOf = { o: ObligationEntity -> ObligationStatus.from(o.dueDate, false, today, reminderDays) }

        val vencidos = unpaid.count { statusOf(it) == ObligationStatus.VENCIDO }
        val proximos = unpaid.count { val s = statusOf(it); s == ObligationStatus.HOY || s == ObligationStatus.PROXIMO }
        val alDia = unpaid.count { statusOf(it) == ObligationStatus.AL_DIA }

        val totalIncome = converter.sum(incomes, { it.amount }, { it.currency })
        val totalPending = converter.sum(unpaid, { it.amount }, { it.currency })
        val pendingThisMonth = converter.sum(
            unpaid.filter { YearMonth.from(it.dueDate) == currentMonth || statusOf(it) == ObligationStatus.VENCIDO },
            { it.amount },
            { it.currency },
        )

        val isOverBudget = totalIncome > 0 && pendingThisMonth > totalIncome

        val thisMonth = obligations.filter { YearMonth.from(it.dueDate) == currentMonth }
        val thisMonthTotal = converter.sum(thisMonth, { it.amount }, { it.currency })
        val thisMonthPaid = converter.sum(thisMonth.filter { it.isPaid }, { it.amount }, { it.currency })

        DashboardUiState(
            isLoading = false,
            converter = converter,
            userHasData = obligations.isNotEmpty() || incomes.isNotEmpty(),
            totalIncome = totalIncome,
            totalPending = totalPending,
            pendingThisMonth = pendingThisMonth,
            vencidosCount = vencidos,
            proximosCount = proximos,
            alDiaCount = alDia,
            isOverBudget = isOverBudget,
            overBudgetAmount = (pendingThisMonth - totalIncome).coerceAtLeast(0),
            upcoming = unpaid.sortedBy { it.dueDate }.take(6),
            dueThisWeekCount = unpaid.count { it.dueDate <= today.plusDays(7) },
            paidThisMonthPercent = if (thisMonthTotal == 0L) 0 else (thisMonthPaid * 100 / thisMonthTotal).toInt(),
            recentPayments = history.sortedByDescending { it.paidDate }.take(3),
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = DashboardUiState(),
    )

    fun markAsPaid(obligationId: Long) {
        viewModelScope.launch {
            obligationRepository.getById(obligationId)?.let { obligationRepository.markAsPaid(it) }
        }
    }
}
