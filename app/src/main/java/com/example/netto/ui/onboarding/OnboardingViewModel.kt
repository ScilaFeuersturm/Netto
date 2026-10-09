package com.example.netto.ui.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.local.entity.IncomeEntity
import com.example.netto.data.repository.BudgetPlanRepository
import com.example.netto.data.repository.IncomeRepository
import com.example.netto.domain.model.BudgetModelType
import com.example.netto.domain.model.Currency
import com.example.netto.util.parseAmount
import com.example.netto.util.sanitizeAmountInput
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingState(
    val displayCurrency: Currency = Currency.PYG,
    val incomeName: String = "",
    val incomeText: String = "",
    val incomeCurrency: Currency = Currency.PYG,
    val selectedModel: BudgetModelType = BudgetModelType.RULE_50_30_20,
    val isSaving: Boolean = false,
) {
    private val incomeAmount: Long? get() = incomeCurrency.parseAmount(incomeText)
    private val skipsIncome: Boolean get() = incomeName.isBlank() && incomeText.isBlank()

    /** El ingreso es opcional, pero si se empieza a cargar tiene que estar completo. */
    val isValid: Boolean get() = !isSaving && (skipsIncome || (incomeName.isNotBlank() && (incomeAmount ?: 0) > 0))
}

/** Al terminar no hace falta navegar: la app pasa sola a la pantalla principal cuando el onboarding queda completo. */
@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val incomeRepository: IncomeRepository,
    private val budgetPlanRepository: BudgetPlanRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(OnboardingState())
    val state: StateFlow<OnboardingState> = _state.asStateFlow()

    fun onDisplayCurrencySelect(currency: Currency) = _state.update {
        // Mientras no se haya elegido otra, la moneda del ingreso acompaña a la principal.
        val incomeCurrency = if (it.incomeCurrency == it.displayCurrency) currency else it.incomeCurrency
        it.copy(displayCurrency = currency, incomeCurrency = incomeCurrency, incomeText = incomeCurrency.sanitizeAmountInput(it.incomeText))
    }

    fun onIncomeNameChange(value: String) = _state.update { it.copy(incomeName = value) }
    fun onIncomeChange(value: String) = _state.update { it.copy(incomeText = it.incomeCurrency.sanitizeAmountInput(value)) }
    fun onIncomeCurrencySelect(currency: Currency) = _state.update {
        it.copy(incomeCurrency = currency, incomeText = currency.sanitizeAmountInput(it.incomeText))
    }
    fun onModelSelect(model: BudgetModelType) = _state.update { it.copy(selectedModel = model) }

    fun finish() {
        val current = _state.value
        if (!current.isValid) return
        _state.update { it.copy(isSaving = true) }
        viewModelScope.launch {
            val amount = current.incomeCurrency.parseAmount(current.incomeText)
            if (current.incomeName.isNotBlank() && amount != null) {
                incomeRepository.save(IncomeEntity(name = current.incomeName.trim(), amount = amount, currency = current.incomeCurrency))
            }
            budgetPlanRepository.update {
                it.copy(
                    modelType = current.selectedModel,
                    necesidadesPercent = current.selectedModel.necesidadesPercent,
                    deseosPercent = current.selectedModel.deseosPercent,
                    ahorroPercent = current.selectedModel.ahorroPercent,
                    displayCurrency = current.displayCurrency,
                    onboardingCompleted = true,
                )
            }
        }
    }
}
