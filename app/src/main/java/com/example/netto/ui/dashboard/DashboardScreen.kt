package com.example.netto.ui.dashboard

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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.DocumentScanner
import androidx.compose.material.icons.outlined.IosShare
import androidx.compose.material.icons.outlined.NorthEast
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.SouthWest
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.data.local.entity.PaymentHistoryEntity
import com.example.netto.domain.model.ObligationStatus
import com.example.netto.ui.components.AlertBanner
import com.example.netto.ui.components.Dot
import com.example.netto.ui.components.HeroCard
import com.example.netto.ui.components.HeroTileBox
import com.example.netto.ui.components.IconBox
import com.example.netto.ui.components.NettoCard
import com.example.netto.ui.components.ObligationCard
import com.example.netto.ui.components.ScreenPadding
import com.example.netto.ui.components.SectionHeader
import com.example.netto.ui.components.Tag
import com.example.netto.ui.theme.AmountDisplayStyle
import com.example.netto.ui.theme.HeroOnColor
import com.example.netto.ui.theme.HeroOnColorMuted
import com.example.netto.ui.theme.HeroTile
import com.example.netto.ui.theme.OverlineStyle
import com.example.netto.util.formatAmount
import com.example.netto.util.formatMoney
import com.example.netto.util.shortEs
import java.time.LocalDate

@Composable
fun DashboardScreen(
    userName: String,
    onAddObligation: () -> Unit,
    onScanInvoice: () -> Unit,
    onObligationClick: (Long) -> Unit,
    onSeeAll: () -> Unit,
    onOpenReports: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val pendingCount = state.vencidosCount + state.proximosCount
    val currency = state.converter.target

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = ScreenPadding,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { Greeting(userName = userName, hasAlerts = state.vencidosCount > 0, onBellClick = onSeeAll) }

        item { BalanceHero(state) }

        if (state.isOverBudget) {
            item {
                AlertBanner(
                    message = "Tus gastos de este mes superan tu ingreso por ${state.overBudgetAmount.formatMoney(currency)}. Revisá qué podés mover o posponer.",
                    critical = true,
                    icon = Icons.Outlined.WarningAmber,
                )
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionHeader(title = "Acciones rápidas")
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    QuickAction(
                        icon = Icons.Outlined.DocumentScanner,
                        title = "Escanear",
                        highlighted = true,
                        onClick = onScanInvoice,
                        modifier = Modifier.weight(1f),
                    )
                    QuickAction(
                        icon = Icons.Outlined.AddCircleOutline,
                        title = "Registrar",
                        onClick = onAddObligation,
                        modifier = Modifier.weight(1f),
                    )
                    QuickAction(
                        icon = Icons.Outlined.IosShare,
                        title = "Reporte",
                        onClick = onOpenReports,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        item {
            SectionHeader(
                title = "Vencimientos",
                count = pendingCount,
                actionText = "Ver agenda completa",
                onAction = onSeeAll,
            )
        }

        if (state.dueThisWeekCount > 0) {
            item {
                val plural = state.dueThisWeekCount > 1
                AlertBanner(
                    message = "Tenés ${state.dueThisWeekCount} ${if (plural) "facturas" else "factura"} por pagar esta semana.",
                )
            }
        }

        if (state.upcoming.isEmpty() && !state.isLoading) {
            item {
                NettoCard {
                    Text(
                        "Todavía no cargaste ningún pago. Tocá \"Registrar\" o \"Escanear\" para empezar.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        itemsIndexed(state.upcoming.take(3), key = { _, it -> it.id }) { index, obligation ->
            val status = ObligationStatus.from(obligation.dueDate, false, LocalDate.now())
            ObligationCard(
                obligation = obligation,
                status = status,
                onClick = { onObligationClick(obligation.id) },
                onMarkPaid = { viewModel.markAsPaid(obligation.id) },
                converter = state.converter,
                emphasized = index == 0,
            )
        }

        if (state.recentPayments.isNotEmpty()) {
            item {
                SectionHeader(title = "Actividad reciente", actionText = "Historial completo", onAction = onOpenReports)
            }
            item { RecentActivity(state.recentPayments) }
        }

        if (state.userHasData) {
            item { PaidProgressCard(state.paidThisMonthPercent) }
        }
    }
}

@Composable
private fun Greeting(userName: String, hasAlerts: Boolean, onBellClick: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Mi balance general",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Dot(MaterialTheme.colorScheme.secondary, Modifier.padding(start = 6.dp), size = 6.dp)
            }
            Text(if (userName.isBlank()) "¡Hola!" else "¡Hola, $userName!", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onBackground)
        }
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable(onClick = onBellClick),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Notifications, contentDescription = "Vencimientos", tint = MaterialTheme.colorScheme.onSurface)
            if (hasAlerts) {
                Dot(
                    MaterialTheme.colorScheme.error,
                    Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 10.dp, end = 10.dp),
                )
            }
        }
    }
}

@Composable
private fun BalanceHero(state: DashboardUiState) {
    val currency = state.converter.target
    HeroCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("SALDO DISPONIBLE DEL MES", style = OverlineStyle, color = HeroOnColorMuted, modifier = Modifier.weight(1f))
            val badge = when {
                state.vencidosCount > 0 -> "${state.vencidosCount} vencidas"
                state.totalIncome > 0 -> "${((state.pendingThisMonth * 100) / state.totalIncome).coerceAtLeast(0)}% comprometido"
                else -> null
            }
            badge?.let { Tag(text = it, container = HeroTile, contentColor = HeroOnColor) }
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = if (state.availableBalance < 0) "-${currency.symbol}" else currency.symbol,
                style = MaterialTheme.typography.titleMedium,
                color = HeroOnColorMuted,
                modifier = Modifier.padding(end = 6.dp, bottom = 8.dp),
            )
            Text(
                text = state.availableBalance.formatAmount(currency),
                style = AmountDisplayStyle,
                color = HeroOnColor,
                maxLines = 1,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            HeroMetric(Icons.Outlined.SouthWest, "Ingresos", state.totalIncome.formatMoney(currency), Modifier.weight(1f))
            HeroMetric(Icons.Outlined.NorthEast, "Pendiente del mes", state.pendingThisMonth.formatMoney(currency), Modifier.weight(1f))
        }
    }
}

@Composable
private fun HeroMetric(icon: ImageVector, label: String, value: String, modifier: Modifier = Modifier) {
    HeroTileBox(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBox(icon, container = HeroTile, tint = HeroOnColor, size = 32.dp)
            Column(Modifier.padding(start = 8.dp)) {
                Text(label, style = MaterialTheme.typography.labelSmall, color = HeroOnColorMuted, maxLines = 1)
                Text(
                    value,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = HeroOnColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun QuickAction(
    icon: ImageVector,
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    highlighted: Boolean = false,
) {
    NettoCard(modifier = modifier, onClick = onClick, contentPadding = 12.dp) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box {
                IconBox(
                    icon,
                    container = if (highlighted) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
                    size = 48.dp,
                )
                if (highlighted) {
                    Dot(MaterialTheme.colorScheme.secondary, Modifier.align(Alignment.TopEnd).padding(2.dp))
                }
            }
            Text(title, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 10.dp))
        }
    }
}

@Composable
private fun RecentActivity(payments: List<PaymentHistoryEntity>) {
    NettoCard(contentPadding = 0.dp) {
        payments.forEachIndexed { index, payment ->
            if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconBox(payment.category.icon, size = 40.dp)
                Column(
                    Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp),
                ) {
                    Text(
                        payment.obligationName,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${payment.category.label.substringBefore(" (")} • ${payment.paidDate.shortEs()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("-${payment.amount.formatMoney(payment.currency)}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Tag("Pagado")
                }
            }
        }
    }
}

@Composable
private fun PaidProgressCard(percent: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.TaskAlt, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(22.dp))
        }
        Column(
            Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
        ) {
            Text("Cuentas al día", style = MaterialTheme.typography.titleSmall)
            Text(
                "$percent% de tus pagos de este mes ya están cubiertos",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text("$percent%", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
    }
}
