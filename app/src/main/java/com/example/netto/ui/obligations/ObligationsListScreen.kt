package com.example.netto.ui.obligations

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.DocumentScanner
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.ui.components.Dot
import com.example.netto.ui.components.HeroCard
import com.example.netto.ui.components.IconBox
import com.example.netto.ui.components.NettoCard
import com.example.netto.ui.components.ObligationCard
import com.example.netto.ui.components.PrimaryButton
import com.example.netto.ui.components.ScreenPadding
import com.example.netto.ui.components.Tag
import com.example.netto.ui.theme.AmountDisplayStyle
import com.example.netto.ui.theme.HeroOnColor
import com.example.netto.ui.theme.HeroOnColorMuted
import com.example.netto.ui.theme.OverlineStyle
import com.example.netto.util.formatAmount
import com.example.netto.util.formatMoney
import com.example.netto.util.dueLabel
import com.example.netto.util.longEs
import com.example.netto.domain.model.ObligationStatus
import java.time.LocalDate
import java.time.YearMonth

@Composable
fun ObligationsListScreen(
    onAddObligation: () -> Unit,
    onScanInvoice: () -> Unit,
    onObligationClick: (Long) -> Unit,
    viewModel: ObligationsViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = ScreenPadding,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { CycleHero(state) }

        item { ScanCard(onScanInvoice) }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(ObligationFilter.entries) { filter ->
                    FilterPill(
                        text = "${filter.label} (${state.counts[filter] ?: 0})",
                        selected = state.filter == filter,
                        onClick = { viewModel.setFilter(filter) },
                    )
                }
            }
        }

        if (state.items.isEmpty()) {
            item {
                NettoCard {
                    Text(
                        "No hay facturas en esta categoría.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        items(state.items, key = { it.first.id }) { (obligation, status) ->
            ObligationCard(
                obligation = obligation,
                status = status,
                onClick = { onObligationClick(obligation.id) },
                onMarkPaid = { viewModel.markAsPaid(obligation) },
                converter = state.converter,
            )
        }

        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .clickable(onClick = onAddObligation)
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.AddCircleOutline, contentDescription = null, modifier = Modifier.size(20.dp))
                Text(
                    "Agregar servicio manual",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun CycleHero(state: ObligationsUiState) {
    HeroCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = HeroOnColorMuted, modifier = Modifier.size(18.dp))
            Text(
                "CICLO ${YearMonth.now().longEs().uppercase()}",
                style = OverlineStyle,
                color = HeroOnColorMuted,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 6.dp),
            )
            if (state.activeCount > 0) {
                Tag(text = "${state.activeCount} ${if (state.activeCount == 1) "factura activa" else "facturas activas"}")
            }
        }
        Column {
            Text("Total por pagar este mes", style = MaterialTheme.typography.bodyMedium, color = HeroOnColorMuted)
            Row(verticalAlignment = Alignment.Bottom) {
                Text(state.converter.target.symbol, style = MaterialTheme.typography.titleMedium, color = HeroOnColorMuted, modifier = Modifier.padding(end = 6.dp, bottom = 8.dp))
                Text(state.pendingThisMonth.formatAmount(state.converter.target), style = AmountDisplayStyle, color = HeroOnColor, maxLines = 1)
            }
        }
        state.nextDue?.let { next ->
            val status = ObligationStatus.from(next.dueDate, false, LocalDate.now())
            Row(verticalAlignment = Alignment.CenterVertically) {
                Dot(MaterialTheme.colorScheme.tertiary)
                Text(
                    "Próximo: ${next.name} • ${dueLabel(next.dueDate, status)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = HeroOnColor,
                    maxLines = 1,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                )
                Text(next.amount.formatMoney(next.currency), style = MaterialTheme.typography.labelMedium, color = HeroOnColorMuted)
            }
        }
    }
}

@Composable
private fun ScanCard(onScanInvoice: () -> Unit) {
    NettoCard {
        Row(verticalAlignment = Alignment.Top) {
            IconBox(Icons.Outlined.DocumentScanner, container = MaterialTheme.colorScheme.primaryContainer, size = 48.dp)
            Column(
                Modifier
                    .weight(1f)
                    .padding(start = 12.dp),
            ) {
                Text("Escanear Factura", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Sacale una foto o elegí una imagen. Detectamos automáticamente el monto y la fecha límite.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        PrimaryButton(
            text = "Abrir escáner",
            onClick = onScanInvoice,
            icon = Icons.Outlined.CameraAlt,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
        )
    }
}

@Composable
private fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        color = if (selected) colors.onPrimary else colors.onSurface,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) colors.primary else colors.surface)
            .then(if (selected) Modifier else Modifier.border(1.dp, colors.outlineVariant, RoundedCornerShape(50)))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    )
}
