package com.example.netto.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.local.entity.PaymentHistoryEntity
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.IncomeRepository
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.domain.model.ObligationCategory
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.YearMonth
import javax.inject.Inject

data class CategoryShare(val category: ObligationCategory, val amount: Long, val percent: Int)

data class ReportsUiState(
    /** Meses con movimientos (más el actual), en orden cronológico. */
    val months: List<YearMonth> = emptyList(),
    val selectedMonth: YearMonth = YearMonth.now(),
    val totalIncome: Long = 0,
    /** Obligaciones con vencimiento en el mes elegido, pagadas o no. */
    val totalExpenses: Long = 0,
    val paidExpenses: Long = 0,
    val categories: List<CategoryShare> = emptyList(),
    val payments: List<PaymentHistoryEntity> = emptyList(),
    /** Los totales de este estado ya están convertidos a [CurrencyConverter.target]. */
    val converter: CurrencyConverter = CurrencyConverter.identity(Currency.PYG),
) {
    val currency: Currency get() = converter.target
    val netFlow: Long get() = totalIncome - totalExpenses
    val expensesPercentOfIncome: Int get() = if (totalIncome == 0L) 0 else (totalExpenses * 100 / totalIncome).toInt()
    val paidPercent: Int get() = if (totalExpenses == 0L) 0 else (paidExpenses * 100 / totalExpenses).toInt()
}

@HiltViewModel
class HistoryViewModel @Inject constructor(
    obligationRepository: ObligationRepository,
    incomeRepository: IncomeRepository,
    currencyRepository: CurrencyRepository,
) : ViewModel() {

    private val selectedMonth = MutableStateFlow(YearMonth.now())

    val uiState: StateFlow<ReportsUiState> = combine(
        obligationRepository.observeAll(),
        incomeRepository.observeAll(),
        obligationRepository.observePaymentHistory(),
        selectedMonth,
        currencyRepository.observeConverter(),
    ) { obligations, incomes, history, month, converter ->
        val inMonth = obligations.filter { YearMonth.from(it.dueDate) == month }
        val totalExpenses = converter.sum(inMonth, { it.amount }, { it.currency })
        val categories = inMonth
            .groupBy { it.category }
            .map { (category, items) ->
                val amount = converter.sum(items, { it.amount }, { it.currency })
                CategoryShare(category, amount, if (totalExpenses == 0L) 0 else (amount * 100 / totalExpenses).toInt())
            }
            .sortedByDescending { it.amount }

        val monthsWithData = obligations.map { YearMonth.from(it.dueDate) } + history.map { YearMonth.from(it.paidDate) }
        ReportsUiState(
            months = (monthsWithData + YearMonth.now() + month).distinct().sorted(),
            selectedMonth = month,
            totalIncome = converter.sum(incomes, { it.amount }, { it.currency }),
            totalExpenses = totalExpenses,
            paidExpenses = converter.sum(inMonth.filter { it.isPaid }, { it.amount }, { it.currency }),
            categories = categories,
            payments = history
                .filter { YearMonth.from(it.paidDate) == month }
                .sortedByDescending { it.paidDate },
            converter = converter,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ReportsUiState())

    fun selectMonth(month: YearMonth) {
        selectedMonth.value = month
    }
}
