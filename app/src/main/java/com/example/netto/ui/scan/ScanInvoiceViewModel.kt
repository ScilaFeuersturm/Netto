package com.example.netto.ui.scan

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.ocr.InvoiceOcrParser
import com.example.netto.ocr.OcrResultHolder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ScanState(
    val isProcessing: Boolean = false,
    val isReady: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ScanInvoiceViewModel @Inject constructor(
    private val ocrParser: InvoiceOcrParser,
    private val ocrResultHolder: OcrResultHolder,
) : ViewModel() {

    private val _state = MutableStateFlow(ScanState())
    val state: StateFlow<ScanState> = _state.asStateFlow()

    fun processImage(bitmap: Bitmap) {
        _state.value = ScanState(isProcessing = true)
        viewModelScope.launch {
            try {
                val result = ocrParser.parse(bitmap)
                ocrResultHolder.set(result, bitmap)
                _state.value = ScanState(isReady = true)
            } catch (e: Exception) {
                _state.value = ScanState(
                    error = "No pudimos leer la factura automáticamente. Probá con más luz o cargá los datos a mano."
                )
            }
        }
    }

    fun consumeError() {
        _state.value = _state.value.copy(error = null)
    }
}
