package com.example.netto.ui.budget

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.local.entity.BudgetPlanEntity
import com.example.netto.data.repository.BudgetPlanRepository
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.IncomeRepository
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.domain.model.BudgetBucket
import com.example.netto.domain.model.BudgetModelType
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.YearMonth
import javax.inject.Inject

data class BudgetUiState(
    val plan: BudgetPlanEntity = BudgetPlanEntity(),
    val totalIncome: Long = 0,
    val necesidadesSpent: Long = 0,
    val deseosSpent: Long = 0,
    val ahorroReal: Long = 0,
    /** Los montos de este estado ya están convertidos a [CurrencyConverter.target]. */
    val converter: CurrencyConverter = CurrencyConverter.identity(Currency.PYG),
) {
    val currency: Currency get() = converter.target
    val necesidadesAllocated: Long get() = totalIncome * plan.necesidadesPercent / 100
    val deseosAllocated: Long get() = totalIncome * plan.deseosPercent / 100
    val ahorroGoal: Long get() = totalIncome * plan.ahorroPercent / 100
}

@HiltViewModel
class BudgetViewModel @Inject constructor(
    private val budgetPlanRepository: BudgetPlanRepository,
    obligationRepository: ObligationRepository,
    incomeRepository: IncomeRepository,
    currencyRepository: CurrencyRepository,
) : ViewModel() {

    val uiState: StateFlow<BudgetUiState> = combine(
        budgetPlanRepository.observe(),
        obligationRepository.observeAll(),
        incomeRepository.observeAll(),
        currencyRepository.observeConverter(),
    ) { plan, obligations, incomes, converter ->
        val currentMonth = YearMonth.now()
        val thisMonthObligations = obligations.filter { YearMonth.from(it.dueDate) == currentMonth }
        val necesidadesSpent = converter.sum(thisMonthObligations.filter { it.category.bucket == BudgetBucket.NECESIDADES }, { it.amount }, { it.currency })
        val deseosSpent = converter.sum(thisMonthObligations.filter { it.category.bucket == BudgetBucket.DESEOS }, { it.amount }, { it.currency })
        val totalIncome = converter.sum(incomes, { it.amount }, { it.currency })
        val totalSpent = converter.sum(thisMonthObligations, { it.amount }, { it.currency })
        BudgetUiState(
            plan = plan,
            totalIncome = totalIncome,
            necesidadesSpent = necesidadesSpent,
            deseosSpent = deseosSpent,
            ahorroReal = (totalIncome - totalSpent).coerceAtLeast(0),
            converter = converter,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BudgetUiState())

    fun selectModel(model: BudgetModelType) {
        viewModelScope.launch {
            val current = budgetPlanRepository.get()
            budgetPlanRepository.save(
                current.copy(
                    modelType = model,
                    necesidadesPercent = model.necesidadesPercent,
                    deseosPercent = model.deseosPercent,
                    ahorroPercent = model.ahorroPercent,
                )
            )
        }
    }

    fun updateCustomPercents(necesidades: Int, deseos: Int, ahorro: Int) {
        viewModelScope.launch {
            val current = budgetPlanRepository.get()
            budgetPlanRepository.save(
                current.copy(
                    modelType = BudgetModelType.CUSTOM,
                    necesidadesPercent = necesidades,
                    deseosPercent = deseos,
                    ahorroPercent = ahorro,
                )
            )
        }
    }

    fun updateReminderDays(days: Int) {
        viewModelScope.launch {
            val current = budgetPlanRepository.get()
            budgetPlanRepository.save(current.copy(reminderDaysBefore = days.coerceIn(1, 30)))
        }
    }
}
