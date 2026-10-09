package com.example.netto.ui.budget

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Balance
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.PieChart
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.domain.model.BudgetModelType
import com.example.netto.ui.components.AlertBanner
import com.example.netto.ui.components.BudgetProgressBar
import com.example.netto.ui.components.Dot
import com.example.netto.ui.components.HeroCard
import com.example.netto.ui.components.HeroTileBox
import com.example.netto.ui.components.IconBox
import com.example.netto.ui.components.NettoCard
import com.example.netto.ui.components.NettoProgressBar
import com.example.netto.ui.components.PrimaryButton
import com.example.netto.ui.components.ScreenPadding
import com.example.netto.ui.components.Tag
import com.example.netto.ui.theme.AmountDisplayStyle
import com.example.netto.ui.theme.HeroOnColor
import com.example.netto.ui.theme.HeroOnColorMuted
import com.example.netto.ui.theme.HeroTile
import com.example.netto.ui.theme.Mint
import com.example.netto.ui.theme.MintMuted
import com.example.netto.util.formatAmount
import com.example.netto.util.formatMoney
import com.example.netto.util.longEs
import java.time.YearMonth

@Composable
fun BudgetScreen(
    onManageIncome: () -> Unit,
    viewModel: BudgetViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val necesidadesColor = MaterialTheme.colorScheme.secondary
    val deseosColor = MaterialTheme.colorScheme.tertiary
    val ahorroColor = MintMuted

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = ScreenPadding,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(MaterialTheme.colorScheme.primaryContainer)
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.AutoAwesome, contentDescription = null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(
                            state.plan.modelType.title,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(start = 4.dp),
                        )
                    }
                    Text("Estrategia de Ahorro", style = MaterialTheme.typography.headlineMedium)
                }
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable(onClick = onManageIncome),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Tune, contentDescription = "Gestionar ingresos")
                }
            }
        }

        if (state.totalIncome == 0L) {
            item {
                NettoCard(onClick = onManageIncome) {
                    Text("Todavía no cargaste tu ingreso mensual.", style = MaterialTheme.typography.titleSmall)
                    Text(
                        "Cargalo para que Netto pueda calcular cuánto asignar a cada modelo de ahorro.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                    Text(
                        "Ir a Ingresos →",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }
        }

        item { SavingsHero(state, onManageIncome) }

        item {
            IncomeDistributionCard(
                state = state,
                necesidadesColor = necesidadesColor,
                deseosColor = deseosColor,
                ahorroColor = ahorroColor,
            )
        }

        item {
            NettoCard {
                Text("Progreso este mes", style = MaterialTheme.typography.titleLarge)
                Text(
                    "Gastos del mes contra lo asignado a cada grupo",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    BudgetProgressBar(
                        label = "Necesidades",
                        spent = state.necesidadesSpent,
                        allocated = state.necesidadesAllocated,
                        currency = state.currency,
                        color = necesidadesColor,
                    )
                    BudgetProgressBar(
                        label = "Deseos",
                        spent = state.deseosSpent,
                        allocated = state.deseosAllocated,
                        currency = state.currency,
                        color = deseosColor,
                    )
                }
            }
        }

        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.onBackground)
                Text(
                    "Modelos sugeridos",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 8.dp),
                )
                Tag("${BudgetModelType.entries.size} opciones")
            }
        }

        items(BudgetModelType.entries.toList()) { model ->
            BudgetModelCard(
                model = model,
                selected = state.plan.modelType == model,
                onSelect = { viewModel.selectModel(model) },
            )
        }

        if (state.plan.modelType == BudgetModelType.CUSTOM) {
            item {
                CustomPercentEditor(
                    necesidades = state.plan.necesidadesPercent,
                    deseos = state.plan.deseosPercent,
                    ahorro = state.plan.ahorroPercent,
                    onSave = viewModel::updateCustomPercents,
                )
            }
        }
    }
}

@Composable
private fun SavingsHero(state: BudgetUiState, onManageIncome: () -> Unit) {
    val progress = if (state.ahorroGoal <= 0) 0f else (state.ahorroReal.toFloat() / state.ahorroGoal).coerceIn(0f, 1f)
    HeroCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.AutoMirrored.Outlined.TrendingUp, contentDescription = null, tint = HeroOnColorMuted, modifier = Modifier.size(16.dp))
                    Text(
                        "Capacidad de ahorro de este mes",
                        style = MaterialTheme.typography.bodySmall,
                        color = HeroOnColorMuted,
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(state.currency.symbol, style = MaterialTheme.typography.titleMedium, color = HeroOnColorMuted, modifier = Modifier.padding(end = 6.dp, bottom = 8.dp))
                    Text(state.ahorroReal.formatAmount(state.currency), style = AmountDisplayStyle, color = HeroOnColor, maxLines = 1)
                }
            }
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(HeroTile),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Savings, contentDescription = null, tint = HeroOnColor)
            }
        }

        HeroTileBox(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Dot(Mint)
                Text(
                    "Meta de ahorro (${state.plan.ahorroPercent}%)",
                    style = MaterialTheme.typography.titleSmall,
                    color = HeroOnColor,
                    modifier = Modifier
                        .weight(1f)
                        .padding(start = 8.dp),
                )
                Text("${(progress * 100).toInt()}% completado", style = MaterialTheme.typography.labelMedium, color = Mint)
            }
            NettoProgressBar(
                fraction = progress,
                color = Mint,
                trackColor = Color.Black.copy(alpha = 0.25f),
                modifier = Modifier.padding(vertical = 10.dp),
            )
            Row {
                Text("Actual: ${state.ahorroReal.formatMoney(state.currency)}", style = MaterialTheme.typography.labelSmall, color = HeroOnColorMuted, modifier = Modifier.weight(1f))
                Text("Meta: ${state.ahorroGoal.formatMoney(state.currency)}", style = MaterialTheme.typography.labelSmall, color = HeroOnColorMuted)
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onManageIncome)
                .padding(vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Ingreso mensual: ${state.totalIncome.formatMoney(state.currency)}",
                style = MaterialTheme.typography.labelMedium,
                color = HeroOnColorMuted,
                modifier = Modifier.weight(1f),
            )
            Text("Gestionar ingresos", style = MaterialTheme.typography.labelMedium, color = HeroOnColor)
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = HeroOnColor, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun IncomeDistributionCard(
    state: BudgetUiState,
    necesidadesColor: Color,
    deseosColor: Color,
    ahorroColor: Color,
) {
    val plan = state.plan
    NettoCard {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f)) {
                Text("Distribución de Ingresos", style = MaterialTheme.typography.titleLarge)
                Text(
                    "Cómo se reparte tu ingreso según tu modelo",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Tag(
                YearMonth.now().longEs(),
                container = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(start = 8.dp),
            )
        }

        Row(
            Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
                .height(10.dp),
        ) {
            listOf(
                plan.necesidadesPercent to necesidadesColor,
                plan.deseosPercent to deseosColor,
                plan.ahorroPercent to ahorroColor,
            ).filter { it.first > 0 }.forEachIndexed { index, (percent, color) ->
                if (index > 0) Spacer(Modifier.width(3.dp))
                Box(
                    Modifier
                        .weight(percent.toFloat())
                        .height(10.dp)
                        .clip(RoundedCornerShape(50))
                        .background(color),
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            DistributionLegend("Necesidades", plan.necesidadesPercent, state.necesidadesAllocated.formatMoney(state.currency), necesidadesColor, Modifier.weight(1f))
            DistributionLegend("Deseos", plan.deseosPercent, state.deseosAllocated.formatMoney(state.currency), deseosColor, Modifier.weight(1f))
            DistributionLegend("Ahorro", plan.ahorroPercent, state.ahorroGoal.formatMoney(state.currency), ahorroColor, Modifier.weight(1f))
        }

        val overNecesidades = state.necesidadesSpent - state.necesidadesAllocated
        val overDeseos = state.deseosSpent - state.deseosAllocated
        val note = when {
            state.totalIncome == 0L -> null
            overNecesidades > 0 -> "Tus necesidades de este mes superan lo asignado por ${overNecesidades.formatMoney(state.currency)}, y eso reduce tu margen de ahorro."
            overDeseos > 0 -> "Tus deseos de este mes superan lo asignado por ${overDeseos.formatMoney(state.currency)}. Revisá qué podés posponer."
            else -> null
        }
        note?.let {
            AlertBanner(message = it, icon = Icons.Outlined.Info, modifier = Modifier.padding(top = 16.dp))
        }
    }
}

@Composable
private fun DistributionLegend(label: String, percent: Int, amount: String, color: Color, modifier: Modifier = Modifier) {
    Column(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Dot(color)
            Text(label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(start = 6.dp))
        }
        Text("$percent%", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(amount, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private val BudgetModelType.icon: ImageVector
    get() = when (this) {
        BudgetModelType.RULE_50_30_20 -> Icons.Outlined.PieChart
        BudgetModelType.RULE_70_20_10 -> Icons.Outlined.Balance
        BudgetModelType.PAY_YOURSELF_FIRST -> Icons.Outlined.Savings
        BudgetModelType.CUSTOM -> Icons.Outlined.Tune
    }

@Composable
private fun BudgetModelCard(model: BudgetModelType, selected: Boolean, onSelect: () -> Unit) {
    NettoCard {
        Row(verticalAlignment = Alignment.Top) {
            IconBox(
                model.icon,
                container = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer,
            )
            Column(
                Modifier
                    .weight(1f)
                    .padding(start = 12.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(model.title, style = MaterialTheme.typography.titleMedium)
                Text(model.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(model.source, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Reparto", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(
                    "${model.necesidadesPercent} / ${model.deseosPercent} / ${model.ahorroPercent}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
            }
            if (selected) {
                Tag("Activo")
            } else {
                PrimaryButton(
                    text = "Activar",
                    onClick = onSelect,
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun CustomPercentEditor(
    necesidades: Int,
    deseos: Int,
    ahorro: Int,
    onSave: (Int, Int, Int) -> Unit,
) {
    var necesidadesText by remember(necesidades) { mutableStateOf(necesidades.toString()) }
    var deseosText by remember(deseos) { mutableStateOf(deseos.toString()) }
    var ahorroText by remember(ahorro) { mutableStateOf(ahorro.toString()) }
    val sum = (necesidadesText.toIntOrNull() ?: 0) + (deseosText.toIntOrNull() ?: 0) + (ahorroText.toIntOrNull() ?: 0)

    NettoCard {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Personalizar porcentajes", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(value = necesidadesText, onValueChange = { necesidadesText = it.filter(Char::isDigit) }, label = { Text("Necesidades %") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = deseosText, onValueChange = { deseosText = it.filter(Char::isDigit) }, label = { Text("Deseos %") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = ahorroText, onValueChange = { ahorroText = it.filter(Char::isDigit) }, label = { Text("Ahorro %") }, modifier = Modifier.fillMaxWidth())
            Text(
                text = if (sum == 100) "Suma: 100% ✓" else "Suma: $sum% (debe ser 100%)",
                color = if (sum == 100) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
            PrimaryButton(
                text = "Guardar porcentajes",
                onClick = { onSave(necesidadesText.toInt(), deseosText.toInt(), ahorroText.toInt()) },
                enabled = sum == 100,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
