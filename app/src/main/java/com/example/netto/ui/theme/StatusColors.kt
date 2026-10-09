package com.example.netto.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.example.netto.domain.model.ObligationStatus

/** Colores semánticos por estado de obligación, coherentes en ambos temas. [bar] es la barra de urgencia. */
data class StatusPalette(val container: Color, val onContainer: Color, val bar: Color)

@Composable
fun ObligationStatus.toPalette(): StatusPalette {
    val colors = MaterialTheme.colorScheme
    return when (this) {
        ObligationStatus.VENCIDO, ObligationStatus.HOY ->
            StatusPalette(colors.errorContainer, colors.onErrorContainer, colors.error)
        ObligationStatus.PROXIMO ->
            StatusPalette(colors.tertiaryContainer, colors.onTertiaryContainer, colors.tertiary)
        ObligationStatus.AL_DIA ->
            StatusPalette(colors.surfaceVariant, colors.onSurfaceVariant, MintMuted)
        ObligationStatus.PAGADO ->
            StatusPalette(colors.primaryContainer, colors.onPrimaryContainer, MintMuted)
    }
}
