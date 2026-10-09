package com.example.netto.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.netto.domain.model.ObligationStatus
import com.example.netto.ui.theme.toPalette
import com.example.netto.util.dueLabel
import java.time.LocalDate

/** Chip de vencimiento con el color del estado: "Vence en 2 días", "Vence mañana", "Pagada". */
@Composable
fun StatusChip(status: ObligationStatus, dueDate: LocalDate, modifier: Modifier = Modifier) {
    val palette = status.toPalette()
    Tag(
        text = dueLabel(dueDate, status),
        container = palette.container,
        contentColor = palette.onContainer,
        modifier = modifier,
    )
}
