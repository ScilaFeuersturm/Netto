package com.example.netto.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.auth.AuthRepository
import com.example.netto.data.auth.SessionManager
import com.example.netto.data.repository.BudgetPlanRepository
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.IncomeRepository
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.domain.model.Currency
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/** En qué parte de la app está el usuario: sin sesión, configurando su cuenta o usando la app. */
enum class AppState { LOADING, LOGGED_OUT, ONBOARDING, READY }

/** Datos del encabezado común a las pestañas principales. */
data class HeaderState(
    val userName: String = "",
    val displayCurrency: Currency = Currency.PYG,
    /** Monedas cuya cotización hace falta para convertir los montos cargados y todavía no se conoce. */
    val missingRates: List<Currency> = emptyList(),
) {
    val firstName: String get() = userName.trim().substringBefore(' ')
    val initials: String
        get() = userName.trim().split(' ').filter { it.isNotBlank() }.take(2)
            .joinToString("") { it.first().uppercase() }
}

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class AppViewModel @Inject constructor(
    session: SessionManager,
    budgetPlanRepository: BudgetPlanRepository,
    authRepository: AuthRepository,
    obligationRepository: ObligationRepository,
    incomeRepository: IncomeRepository,
    private val currencyRepository: CurrencyRepository,
) : ViewModel() {

    val appState: StateFlow<AppState> = session.userId
        .flatMapLatest { userId ->
            if (userId == null) flowOf(AppState.LOGGED_OUT)
            else budgetPlanRepository.observe().map { if (it.onboardingCompleted) AppState.READY else AppState.ONBOARDING }
        }
        .distinctUntilChanged()
        .stateIn(viewModelScope, SharingStarted.Eagerly, AppState.LOADING)

    val header: StateFlow<HeaderState> = combine(
        authRepository.observeCurrentUser(),
        currencyRepository.observeConverter(),
        obligationRepository.observeCurrencies(),
        incomeRepository.observeCurrencies(),
    ) { user, converter, obligationCurrencies, incomeCurrencies ->
        val foreign = (obligationCurrencies + incomeCurrencies).toSet() - converter.target
        val needed = if (foreign.isEmpty()) emptySet() else foreign + converter.target
        HeaderState(
            userName = user?.name.orEmpty(),
            displayCurrency = converter.target,
            missingRates = needed.filterNot { converter.rates.has(it) }.sorted(),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HeaderState())

    init {
        // Cotizaciones frescas al abrir la app; si no hay conexión se siguen usando las guardadas.
        viewModelScope.launch { currencyRepository.refreshIfStale() }
    }

    fun setDisplayCurrency(currency: Currency) {
        viewModelScope.launch { currencyRepository.setDisplayCurrency(currency) }
    }
}
