package com.example.netto.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.auth.AuthRepository
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.util.parseAmount
import com.example.netto.util.sanitizeAmountInput
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.math.BigDecimal
import javax.inject.Inject

data class ProfileUiState(
    val name: String = "",
    val email: String = "",
    val converter: CurrencyConverter = CurrencyConverter.identity(Currency.PYG),
    val isRefreshing: Boolean = false,
    val message: String? = null,
    val calculatorText: String = "",
    val calculatorCurrency: Currency = Currency.USD,
) {
    val calculatorAmount: Long? get() = calculatorCurrency.parseAmount(calculatorText)
}

private data class LocalState(
    val isRefreshing: Boolean = false,
    val message: String? = null,
    val calculatorText: String = "",
    val calculatorCurrency: Currency = Currency.USD,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val currencyRepository: CurrencyRepository,
) : ViewModel() {

    private val local = MutableStateFlow(LocalState())

    val uiState: StateFlow<ProfileUiState> = combine(
        authRepository.observeCurrentUser(),
        currencyRepository.observeConverter(),
        local,
    ) { user, converter, local ->
        ProfileUiState(
            name = user?.name.orEmpty(),
            email = user?.email.orEmpty(),
            converter = converter,
            isRefreshing = local.isRefreshing,
            message = local.message,
            calculatorText = local.calculatorText,
            calculatorCurrency = local.calculatorCurrency,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProfileUiState())

    fun setDisplayCurrency(currency: Currency) {
        viewModelScope.launch { currencyRepository.setDisplayCurrency(currency) }
    }

    fun refreshRates() {
        if (local.value.isRefreshing) return
        local.update { it.copy(isRefreshing = true, message = null) }
        viewModelScope.launch {
            val result = currencyRepository.refresh()
            local.update {
                it.copy(
                    isRefreshing = false,
                    message = if (result.isSuccess) "Cotizaciones actualizadas." else "No pudimos actualizar las cotizaciones. Revisá tu conexión.",
                )
            }
        }
    }

    /** [text] es lo que vale 1 US$ en [currency], con coma decimal ("1450,50"). Devuelve false si no es válido. */
    fun setManualRate(currency: Currency, text: String): Boolean {
        val rate = text.replace(".", "").replace(',', '.').toBigDecimalOrNull()
        if (rate == null || rate.signum() <= 0 || currency == Currency.USD) return false
        viewModelScope.launch {
            currencyRepository.setManualRate(currency, rate)
            local.update { it.copy(message = "Cotización de ${currency.code} guardada.") }
        }
        return true
    }

    fun onCalculatorTextChange(value: String) =
        local.update { it.copy(calculatorText = it.calculatorCurrency.sanitizeAmountInput(value)) }

    fun onCalculatorCurrencyChange(value: Currency) =
        local.update { it.copy(calculatorCurrency = value, calculatorText = value.sanitizeAmountInput(it.calculatorText)) }

    fun logout() {
        viewModelScope.launch { authRepository.logout() }
    }

    companion object {
        /** Para precargar el diálogo de edición con la cotización actual. */
        fun rateToInput(rate: BigDecimal): String = rate.stripTrailingZeros().toPlainString().replace('.', ',')
    }
}
