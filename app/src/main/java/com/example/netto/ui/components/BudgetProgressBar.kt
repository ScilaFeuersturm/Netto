package com.example.netto.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.netto.domain.model.Currency
import com.example.netto.util.formatMoney

/** Barra de progreso de un balde de presupuesto (necesidades/deseos/ahorro): gastado vs. asignado. */
@Composable
fun BudgetProgressBar(
    label: String,
    spent: Long,
    allocated: Long,
    currency: Currency,
    color: Color,
    modifier: Modifier = Modifier,
) {
    val fraction = if (allocated <= 0) 0f else (spent.toFloat() / allocated.toFloat()).coerceIn(0f, 1f)
    val isOver = spent > allocated

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Dot(color)
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 8.dp),
            )
            Text(
                text = spent.formatMoney(currency),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (isOver) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = " / ${allocated.formatMoney(currency)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        NettoProgressBar(
            fraction = fraction,
            color = if (isOver) MaterialTheme.colorScheme.error else color,
            height = 8.dp,
        )
    }
}
