package com.example.netto.ui.obligations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.domain.model.ObligationStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

enum class ObligationFilter(val label: String) {
    TODOS("Todas"), VENCIDOS("Vencidas"), PROXIMOS("Por vencer"), AL_DIA("Al día"), PAGADOS("Pagadas");

    fun matches(status: ObligationStatus): Boolean = when (this) {
        TODOS -> true
        VENCIDOS -> status == ObligationStatus.VENCIDO
        PROXIMOS -> status == ObligationStatus.HOY || status == ObligationStatus.PROXIMO
        AL_DIA -> status == ObligationStatus.AL_DIA
        PAGADOS -> status == ObligationStatus.PAGADO
    }
}

data class ObligationsUiState(
    val items: List<Pair<ObligationEntity, ObligationStatus>> = emptyList(),
    val filter: ObligationFilter = ObligationFilter.TODOS,
    val counts: Map<ObligationFilter, Int> = emptyMap(),
    /** Sin pagar con vencimiento este mes o ya vencidas. */
    val pendingThisMonth: Long = 0,
    val activeCount: Int = 0,
    val nextDue: ObligationEntity? = null,
    val converter: CurrencyConverter = CurrencyConverter.identity(Currency.PYG),
)

@HiltViewModel
class ObligationsViewModel @Inject constructor(
    private val repository: ObligationRepository,
    currencyRepository: CurrencyRepository,
) : ViewModel() {

    private val filterFlow = MutableStateFlow(ObligationFilter.TODOS)

    val uiState: StateFlow<ObligationsUiState> = combine(
        repository.observeAll(),
        filterFlow,
        currencyRepository.observeConverter(),
    ) { obligations, filter, converter ->
        val today = LocalDate.now()
        val currentMonth = YearMonth.from(today)
        val all = obligations.map { it to ObligationStatus.from(it.dueDate, it.isPaid, today) }
        val unpaid = obligations.filter { !it.isPaid }
        ObligationsUiState(
            items = all
                .filter { (_, status) -> filter.matches(status) }
                .sortedWith(compareBy({ it.first.isPaid }, { it.first.dueDate })),
            filter = filter,
            counts = ObligationFilter.entries.associateWith { f -> all.count { (_, status) -> f.matches(status) } },
            pendingThisMonth = converter.sum(
                unpaid.filter { YearMonth.from(it.dueDate) <= currentMonth },
                { it.amount },
                { it.currency },
            ),
            activeCount = unpaid.size,
            nextDue = unpaid.minByOrNull { it.dueDate },
            converter = converter,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ObligationsUiState())

    fun setFilter(filter: ObligationFilter) {
        filterFlow.value = filter
    }

    fun markAsPaid(obligation: ObligationEntity) {
        viewModelScope.launch { repository.markAsPaid(obligation) }
    }

    fun delete(obligation: ObligationEntity) {
        viewModelScope.launch { repository.delete(obligation) }
    }
}
