package com.example.netto.ocr

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import java.time.LocalDate
import javax.inject.Inject
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class InvoiceOcrResult(
    val rawText: String,
    val suggestedAmount: Long?,
    val suggestedDueDate: LocalDate?,
)

/**
 * Extrae monto a pagar y fecha de vencimiento de una foto de factura usando ML Kit Text Recognition,
 * que corre 100% on-device (sin backend, consistente con el almacenamiento local de la app).
 */
class InvoiceOcrParser @Inject constructor() {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

    suspend fun parse(bitmap: Bitmap): InvoiceOcrResult {
        val text = recognizeText(bitmap)
        return InvoiceOcrResult(
            rawText = text,
            suggestedAmount = extractAmount(text),
            suggestedDueDate = extractDueDate(text),
        )
    }

    private suspend fun recognizeText(bitmap: Bitmap): String = suspendCancellableCoroutine { continuation ->
        val image = InputImage.fromBitmap(bitmap, 0)
        recognizer.process(image)
            .addOnSuccessListener { visionText -> continuation.resume(visionText.text) }
            .addOnFailureListener { error -> continuation.resumeWithException(error) }
    }

    private fun extractAmount(text: String): Long? {
        // 1) Buscamos cerca de una palabra clave típica de "monto a pagar".
        AMOUNT_KEYWORD_REGEX.findAll(text).forEach { match ->
            match.groupValues[2].toAmountOrNull()?.let { return it }
        }

        // 2) Si no hay palabra clave, nos quedamos con el número más grande con separador de miles
        //    (los importes suelen ser el valor más alto de la factura; NIS/cuentas suelen ser más chicos
        //    o no llevan puntos de miles reales).
        val withSeparators = THOUSANDS_REGEX.findAll(text).mapNotNull { it.value.toAmountOrNull() }.toList()
        if (withSeparators.isNotEmpty()) return withSeparators.max()

        // 3) Último recurso: una tira de 5 a 9 dígitos sueltos (monto sin separador de miles).
        return PLAIN_DIGITS_REGEX.findAll(text).mapNotNull { it.value.toLongOrNull() }.maxOrNull()
    }

    private fun extractDueDate(text: String): LocalDate? {
        val keywordMatch = DATE_KEYWORD_REGEX.find(text)?.groupValues?.get(2)
        keywordMatch?.let(::parseNumericDate)?.let { return it }

        val keywordTextMonth = DATE_KEYWORD_TEXT_MONTH_REGEX.find(text)?.groupValues?.get(2)
        keywordTextMonth?.let(::parseTextMonthDate)?.let { return it }

        val today = LocalDate.now()
        val allDates = NUMERIC_DATE_REGEX.findAll(text).mapNotNull { parseNumericDate(it.value) } +
            TEXT_MONTH_DATE_REGEX.findAll(text).mapNotNull { parseTextMonthDate(it.value) }
        val dates = allDates.toList()
        return dates.filter { !it.isBefore(today) }.minByOrNull { it.toEpochDay() }
            ?: dates.maxByOrNull { it.toEpochDay() }
    }

    private fun String.toAmountOrNull(): Long? =
        this.replace(".", "").replace(",", "").filter { it.isDigit() }.takeIf { it.length in 4..12 }?.toLongOrNull()

    private fun parseNumericDate(raw: String): LocalDate? {
        val parts = raw.replace(".", "/").replace("-", "/").split("/")
        if (parts.size != 3) return null
        return try {
            val day = parts[0].toInt()
            val month = parts[1].toInt()
            val year = parts[2].toInt().let { if (it < 100) it + 2000 else it }
            LocalDate.of(year, month, day)
        } catch (e: Exception) {
            null
        }
    }

    private fun parseTextMonthDate(raw: String): LocalDate? {
        val match = TEXT_MONTH_DATE_REGEX.find(raw) ?: return null
        val day = match.groupValues[1].toIntOrNull() ?: return null
        val month = MONTHS[match.groupValues[2].lowercase()] ?: return null
        val year = match.groupValues[3].toIntOrNull() ?: return null
        return try {
            LocalDate.of(year, month, day)
        } catch (e: Exception) {
            null
        }
    }

    companion object {
        private val MONTHS = mapOf(
            "enero" to 1, "febrero" to 2, "marzo" to 3, "abril" to 4,
            "mayo" to 5, "junio" to 6, "julio" to 7, "agosto" to 8,
            "septiembre" to 9, "setiembre" to 9, "octubre" to 10,
            "noviembre" to 11, "diciembre" to 12,
        )

        // Montos con separador de miles ("." en formato paraguayo), ej. 1.045.000
        private val THOUSANDS_REGEX = Regex("""\d{1,3}(?:\.\d{3})+""")
        private val PLAIN_DIGITS_REGEX = Regex("""\b\d{5,9}\b""")
        private val AMOUNT_KEYWORD_REGEX = Regex(
            """(?i)(total\s*a\s*pagar|monto\s*a\s*pagar|importe\s*total|importe\s*a\s*pagar|""" +
                """saldo\s*a\s*pagar|a\s*pagar|total\s*:?|monto\s*:?|importe\s*:?)[^\d]{0,20}([\d][\d.,]{3,})"""
        )

        private val NUMERIC_DATE_REGEX = Regex("""\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}""")
        private val DATE_KEYWORD_REGEX = Regex(
            """(?i)(fecha\s*de\s*vencimiento|vencimiento|vence\s*el|pagar\s*hasta|válido\s*hasta)""" +
                """[^\d]{0,20}(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4})"""
        )

        private val TEXT_MONTH_DATE_REGEX = Regex(
            """(?i)(\d{1,2})\s*(?:de)?\s*""" +
                """(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)""" +
                """\s*(?:de|del)?\s*(\d{4})"""
        )
        private val DATE_KEYWORD_TEXT_MONTH_REGEX = Regex(
            """(?i)(fecha\s*de\s*vencimiento|vencimiento|vence\s*el|pagar\s*hasta|válido\s*hasta)""" +
                """[^\d]{0,10}(\d{1,2}\s*(?:de)?\s*(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|""" +
                """septiembre|setiembre|octubre|noviembre|diciembre)\s*(?:de|del)?\s*\d{4})"""
        )
    }
}
