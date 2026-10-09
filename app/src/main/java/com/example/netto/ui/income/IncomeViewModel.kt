package com.example.netto.ui.income

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.local.entity.IncomeEntity
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.IncomeRepository
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.util.parseAmount
import com.example.netto.util.sanitizeAmountInput
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class IncomeUiState(
    val incomes: List<IncomeEntity> = emptyList(),
    /** Total convertido a la moneda de visualización. */
    val total: Long = 0,
    val converter: CurrencyConverter = CurrencyConverter.identity(Currency.PYG),
)

data class NewIncomeForm(
    val name: String = "",
    val amountText: String = "",
    val currency: Currency = Currency.PYG,
    val dayOfMonth: String = "1",
) {
    val amount: Long? get() = currency.parseAmount(amountText)
    val isValid: Boolean get() = name.isNotBlank() && (amount ?: 0) > 0
}

@HiltViewModel
class IncomeViewModel @Inject constructor(
    private val repository: IncomeRepository,
    private val currencyRepository: CurrencyRepository,
) : ViewModel() {

    val uiState: StateFlow<IncomeUiState> = combine(
        repository.observeAll(),
        currencyRepository.observeConverter(),
    ) { incomes, converter ->
        IncomeUiState(incomes = incomes, total = converter.sum(incomes, { it.amount }, { it.currency }), converter = converter)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), IncomeUiState())

    private val _form = MutableStateFlow(NewIncomeForm())
    val form: StateFlow<NewIncomeForm> = _form.asStateFlow()

    init {
        viewModelScope.launch { resetForm() }
    }

    fun onNameChange(value: String) = _form.update { it.copy(name = value) }
    fun onAmountChange(value: String) = _form.update { it.copy(amountText = it.currency.sanitizeAmountInput(value)) }
    fun onCurrencyChange(value: Currency) = _form.update { it.copy(currency = value, amountText = value.sanitizeAmountInput(it.amountText)) }
    fun onDayChange(value: String) = _form.update { it.copy(dayOfMonth = value.filter { c -> c.isDigit() }.take(2)) }

    fun addIncome() {
        val current = _form.value
        val amount = current.amount
        if (!current.isValid || amount == null) return
        viewModelScope.launch {
            repository.save(
                IncomeEntity(
                    name = current.name.trim(),
                    amount = amount,
                    currency = current.currency,
                    dayOfMonth = current.dayOfMonth.toIntOrNull()?.coerceIn(1, 31) ?: 1,
                )
            )
            resetForm()
        }
    }

    fun delete(income: IncomeEntity) {
        viewModelScope.launch { repository.delete(income) }
    }

    /** El formulario arranca en la moneda de visualización del usuario. */
    private suspend fun resetForm() {
        _form.value = NewIncomeForm(currency = currencyRepository.observeDisplayCurrency().first())
    }
}
