package com.example.netto.ocr

import android.graphics.Bitmap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Puente en memoria (no persistido) entre la pantalla de escaneo y el formulario de obligación,
 * para evitar pasar bitmaps grandes como argumentos de navegación.
 */
@Singleton
class OcrResultHolder @Inject constructor() {
    var lastResult: InvoiceOcrResult? = null
    var lastImage: Bitmap? = null

    fun set(result: InvoiceOcrResult, image: Bitmap?) {
        lastResult = result
        lastImage = image
    }

    fun consume(): Pair<InvoiceOcrResult, Bitmap?>? {
        val result = lastResult ?: return null
        val image = lastImage
        lastResult = null
        lastImage = null
        return result to image
    }
}
