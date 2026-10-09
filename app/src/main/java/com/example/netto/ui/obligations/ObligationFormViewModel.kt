package com.example.netto.ui.obligations

import android.graphics.Bitmap
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.data.repository.CurrencyRepository
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.ObligationCategory
import com.example.netto.ocr.OcrResultHolder
import com.example.netto.ui.navigation.NettoRoutes
import com.example.netto.util.parseAmount
import com.example.netto.util.sanitizeAmountInput
import com.example.netto.util.toAmountInput
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class ObligationFormState(
    val id: Long = 0,
    val name: String = "",
    val reference: String = "",
    val amountText: String = "",
    val currency: Currency = Currency.PYG,
    val dueDate: LocalDate = LocalDate.now().plusDays(7),
    val category: ObligationCategory = ObligationCategory.SERVICIOS,
    val isRecurring: Boolean = true,
    val notes: String = "",
    val scannedImage: Bitmap? = null,
    val ocrRawText: String? = null,
    val isEditing: Boolean = false,
    /** Se conservan al editar para no "despagar" una factura ya pagada. */
    val isPaid: Boolean = false,
    val paidDate: LocalDate? = null,
    val isSaved: Boolean = false,
) {
    val amount: Long? get() = currency.parseAmount(amountText)
    val isValid: Boolean get() = name.isNotBlank() && (amount ?: 0) > 0
}

@HiltViewModel
class ObligationFormViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: ObligationRepository,
    private val ocrResultHolder: OcrResultHolder,
    private val currencyRepository: CurrencyRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ObligationFormState())
    val state: StateFlow<ObligationFormState> = _state.asStateFlow()

    init {
        val obligationId = savedStateHandle.get<Long>(NettoRoutes.OBLIGATION_ID_ARG) ?: -1L
        if (obligationId > 0) {
            viewModelScope.launch {
                repository.getById(obligationId)?.let { obligation ->
                    _state.value = ObligationFormState(
                        id = obligation.id,
                        name = obligation.name,
                        reference = obligation.reference.orEmpty(),
                        amountText = obligation.amount.toAmountInput(obligation.currency),
                        currency = obligation.currency,
                        dueDate = obligation.dueDate,
                        category = obligation.category,
                        isRecurring = obligation.isRecurring,
                        notes = obligation.notes.orEmpty(),
                        isEditing = true,
                        isPaid = obligation.isPaid,
                        paidDate = obligation.paidDate,
                    )
                }
            }
        } else {
            // Una factura nueva arranca en la moneda de visualización del usuario.
            viewModelScope.launch {
                val currency = currencyRepository.observeDisplayCurrency().first()
                _state.update { it.copy(currency = currency, amountText = currency.sanitizeAmountInput(it.amountText)) }
            }
            ocrResultHolder.consume()?.let { (result, image) ->
                val missingBoth = result.suggestedAmount == null && result.suggestedDueDate == null
                _state.value = _state.value.copy(
                    name = "Factura escaneada",
                    amountText = result.suggestedAmount?.toString().orEmpty(),
                    dueDate = result.suggestedDueDate ?: _state.value.dueDate,
                    scannedImage = image,
                    ocrRawText = result.rawText,
                    notes = if (missingBoth) {
                        "No pudimos detectar el monto ni la fecha automáticamente. Texto leído: " +
                            result.rawText.take(300)
                    } else "",
                )
            }
        }
    }

    fun onNameChange(value: String) { _state.value = _state.value.copy(name = value) }
    fun onReferenceChange(value: String) { _state.value = _state.value.copy(reference = value) }
    fun onAmountChange(value: String) = _state.update { it.copy(amountText = it.currency.sanitizeAmountInput(value)) }
    fun onCurrencyChange(value: Currency) = _state.update { it.copy(currency = value, amountText = value.sanitizeAmountInput(it.amountText)) }
    fun onDueDateChange(value: LocalDate) { _state.value = _state.value.copy(dueDate = value) }
    fun onCategoryChange(value: ObligationCategory) { _state.value = _state.value.copy(category = value) }
    fun onRecurringChange(value: Boolean) { _state.value = _state.value.copy(isRecurring = value) }
    fun onNotesChange(value: String) { _state.value = _state.value.copy(notes = value) }

    fun save() {
        val current = _state.value
        val amount = current.amount
        if (!current.isValid || amount == null) return
        viewModelScope.launch {
            repository.save(
                ObligationEntity(
                    id = current.id,
                    name = current.name.trim(),
                    reference = current.reference.trim().ifBlank { null },
                    amount = amount,
                    currency = current.currency,
                    dueDate = current.dueDate,
                    category = current.category,
                    isRecurring = current.isRecurring,
                    notes = current.notes.trim().ifBlank { null },
                    isPaid = current.isPaid,
                    paidDate = current.paidDate,
                    createdFromOcr = current.scannedImage != null,
                )
            )
            _state.value = current.copy(isSaved = true)
        }
    }

    fun delete() {
        val current = _state.value
        if (current.id == 0L) return
        viewModelScope.launch {
            repository.getById(current.id)?.let { repository.delete(it) }
            _state.value = current.copy(isSaved = true)
        }
    }
}
