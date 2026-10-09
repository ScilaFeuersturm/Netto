package com.example.netto.ui.history

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingDown
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.ui.components.Dot
import com.example.netto.ui.components.HeroCard
import com.example.netto.ui.components.HeroTileBox
import com.example.netto.ui.components.IconBox
import com.example.netto.ui.components.NettoCard
import com.example.netto.ui.components.NettoProgressBar
import com.example.netto.ui.components.ScreenPadding
import com.example.netto.ui.components.Tag
import com.example.netto.ui.components.TonalButton
import com.example.netto.ui.theme.AmountDisplayStyle
import com.example.netto.ui.theme.HeroOnColor
import com.example.netto.ui.theme.HeroOnColorMuted
import com.example.netto.ui.theme.HeroTile
import com.example.netto.ui.theme.Mint
import com.example.netto.ui.theme.OverlineStyle
import com.example.netto.ui.theme.Slate
import com.example.netto.util.formatAmount
import com.example.netto.util.formatMoney
import com.example.netto.util.longEs
import com.example.netto.util.shortEs
import java.time.YearMonth

/** Pantalla "Reportes": flujo neto del mes, distribución de gastos por categoría e historial de pagos. */
@Composable
fun HistoryScreen(
    onAddObligation: () -> Unit,
    viewModel: HistoryViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val monthsListState = rememberLazyListState()

    // Con muchos meses, el elegido (al inicio, el actual) puede quedar fuera de pantalla.
    LaunchedEffect(state.months.size) {
        val index = state.months.indexOf(state.selectedMonth)
        if (index >= 0) monthsListState.scrollToItem(index)
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = ScreenPadding,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text(
                        "Período",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 6.dp),
                    )
                    if (state.totalExpenses > 0) Tag("${state.paidPercent}% pagado")
                }
                LazyRow(state = monthsListState, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.months) { month ->
                        MonthPill(month, selected = month == state.selectedMonth, onClick = { viewModel.selectMonth(month) })
                    }
                }
            }
        }

        item { NetFlowHero(state) }

        item { ExpenseDistributionCard(state) }

        item { PaymentHistoryCard(state) }

        item {
            TonalButton(
                text = "Registrar nuevo gasto",
                onClick = onAddObligation,
                icon = Icons.Outlined.AddCircleOutline,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun MonthPill(month: YearMonth, selected: Boolean, onClick: () -> Unit) {
    val colors = MaterialTheme.colorScheme
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) colors.primary else colors.surfaceVariant)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            month.longEs(),
            style = MaterialTheme.typography.labelLarge,
            color = if (selected) colors.onPrimary else colors.onSurface,
        )
        if (selected) {
            Icon(Icons.Outlined.Check, contentDescription = null, tint = colors.onPrimary, modifier = Modifier
                .padding(start = 6.dp)
                .size(16.dp))
        }
    }
}

@Composable
private fun NetFlowHero(state: ReportsUiState) {
    HeroCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("FLUJO NETO DISPONIBLE", style = OverlineStyle, color = HeroOnColorMuted, modifier = Modifier.weight(1f))
            Box(
                Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(HeroTile),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (state.netFlow >= 0) Icons.AutoMirrored.Outlined.TrendingUp else Icons.AutoMirrored.Outlined.TrendingDown,
                    contentDescription = null,
                    tint = HeroOnColor,
                )
            }
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                (if (state.netFlow >= 0) "+" else "-") + state.currency.symbol,
                style = MaterialTheme.typography.titleMedium,
                color = HeroOnColorMuted,
                modifier = Modifier.padding(end = 6.dp, bottom = 8.dp),
            )
            Text(state.netFlow.formatAmount(state.currency), style = AmountDisplayStyle, color = HeroOnColor, maxLines = 1)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            FlowTile(
                icon = Icons.Outlined.ArrowDownward,
                label = "Total ingresos",
                value = state.totalIncome.formatMoney(state.currency),
                caption = "Ingreso mensual",
                captionColor = Mint,
                modifier = Modifier.weight(1f),
            )
            FlowTile(
                icon = Icons.Outlined.ArrowUpward,
                label = "Total egresos",
                value = state.totalExpenses.formatMoney(state.currency),
                caption = "${state.expensesPercentOfIncome}% del ingreso",
                captionColor = MaterialTheme.colorScheme.tertiary,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun FlowTile(
    icon: ImageVector,
    label: String,
    value: String,
    caption: String,
    captionColor: Color,
    modifier: Modifier = Modifier,
) {
    HeroTileBox(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = HeroOnColorMuted, modifier = Modifier.size(14.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, color = HeroOnColorMuted, modifier = Modifier.padding(start = 4.dp))
        }
        Text(
            value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = HeroOnColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(caption, style = MaterialTheme.typography.labelSmall, color = captionColor)
    }
}

@Composable
private fun ExpenseDistributionCard(state: ReportsUiState) {
    val colors = MaterialTheme.colorScheme
    val palette = listOf(colors.primary, colors.secondary, Slate, colors.tertiary, colors.outline)

    NettoCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text("Distribución de Gastos", style = MaterialTheme.typography.titleLarge)
                Text(
                    "Desglose de ${state.totalExpenses.formatMoney(state.currency)} del mes",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.onSurfaceVariant,
                )
            }
            if (state.categories.isNotEmpty()) {
                val n = state.categories.size
                Tag(
                    "$n ${if (n == 1) "categoría" else "categorías"}",
                    container = colors.surfaceVariant,
                    contentColor = colors.secondary,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }
        }

        if (state.categories.isEmpty()) {
            Text(
                "No hay gastos registrados en este período.",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(top = 16.dp),
            )
        }

        Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.categories.forEachIndexed { index, share ->
                val color = palette[index % palette.size]
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Dot(color)
                        Text(
                            share.category.label,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 8.dp),
                        )
                        Text(share.amount.formatMoney(state.currency), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        Text(
                            "${share.percent}%",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.onSurfaceVariant,
                            modifier = Modifier.padding(start = 8.dp),
                        )
                    }
                    NettoProgressBar(fraction = share.percent / 100f, color = color, height = 8.dp)
                }
            }
        }
    }
}

@Composable
private fun PaymentHistoryCard(state: ReportsUiState) {
    NettoCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.History, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                "Historial de Pagos",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 8.dp),
            )
            Text(state.selectedMonth.longEs(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        if (state.payments.isEmpty()) {
            Text(
                "Todavía no registraste pagos en este período.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 12.dp),
            )
        }

        Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            state.payments.forEach { entry ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconBox(
                        entry.category.icon,
                        container = MaterialTheme.colorScheme.primaryContainer,
                        size = 40.dp,
                    )
                    Column(
                        Modifier
                            .weight(1f)
                            .padding(horizontal = 12.dp),
                    ) {
                        Text(entry.obligationName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            "Pagado el ${entry.paidDate.shortEs()}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(entry.amount.formatMoney(entry.currency), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
