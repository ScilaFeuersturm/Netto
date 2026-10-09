package com.example.netto.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.data.remote.ExchangeRateApi
import com.example.netto.domain.model.Currency
import com.example.netto.ui.components.CurrencySelector
import com.example.netto.ui.components.NettoCard
import com.example.netto.ui.components.ScreenPadding
import com.example.netto.ui.components.TonalButton
import com.example.netto.util.formatMoney
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val updatedAtFormatter = DateTimeFormatter.ofPattern("d MMM, HH:mm", Locale.Builder().setLanguage("es").build())

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var editingRate by remember { mutableStateOf<Currency?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tu perfil", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = ScreenPadding,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item { AccountCard(state.name, state.email) }

            item {
                NettoCard {
                    Text("Moneda de visualización", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Los totales de todas las pantallas se muestran convertidos a esta moneda.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    CurrencySelector(
                        selected = state.converter.target,
                        onSelect = viewModel::setDisplayCurrency,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }

            item { RatesCard(state, onEdit = { editingRate = it }, onRefresh = viewModel::refreshRates) }

            item {
                CalculatorCard(
                    state = state,
                    onTextChange = viewModel::onCalculatorTextChange,
                    onCurrencyChange = viewModel::onCalculatorCurrencyChange,
                )
            }

            item {
                TonalButton(
                    text = "Cerrar sesión",
                    onClick = viewModel::logout,
                    icon = Icons.AutoMirrored.Outlined.Logout,
                    container = MaterialTheme.colorScheme.errorContainer,
                    contentColor = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }

    editingRate?.let { currency ->
        EditRateDialog(
            currency = currency,
            initial = state.converter.rates.rate(currency)?.let(ProfileViewModel::rateToInput).orEmpty(),
            onDismiss = { editingRate = null },
            onSave = { text -> if (viewModel.setManualRate(currency, text)) editingRate = null },
        )
    }
}

@Composable
private fun AccountCard(name: String, email: String) {
    NettoCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    name.trim().split(' ').filter { it.isNotBlank() }.take(2).joinToString("") { it.first().uppercase() },
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
            Column(Modifier.padding(start = 14.dp)) {
                Text(name, style = MaterialTheme.typography.titleMedium)
                Text(email, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun RatesCard(state: ProfileUiState, onEdit: (Currency) -> Unit, onRefresh: () -> Unit) {
    val rates = state.converter.rates
    NettoCard {
        Text("Cotizaciones", style = MaterialTheme.typography.titleMedium)
        Text(
            "Podés editarlas a mano, por ejemplo para usar el dólar blue o paralelo.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Column(Modifier.padding(top = 8.dp)) {
            Currency.entries.filter { it != Currency.USD }.forEach { currency ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "1 ${Currency.USD.symbol} = " + (rates.rate(currency)?.let { it.toMoney(currency) } ?: "sin cotización"),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { onEdit(currency) }) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Editar cotización de ${currency.label}")
                    }
                }
            }
        }

        val updatedAt = rates.updatedAt
        Text(
            when {
                updatedAt == null -> "Todavía no se descargaron cotizaciones."
                rates.isManual -> "Editada a mano · ${updatedAtFormatter.format(updatedAt.atZone(ZoneId.systemDefault()))}"
                else -> "Oficial · ${updatedAtFormatter.format(updatedAt.atZone(ZoneId.systemDefault()))} · Fuente: ${ExchangeRateApi.SOURCE_NAME}"
            },
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        TonalButton(
            text = if (state.isRefreshing) "Actualizando…" else "Actualizar cotización oficial",
            onClick = onRefresh,
            icon = Icons.Outlined.Sync,
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
        )
        state.message?.let {
            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

@Composable
private fun CalculatorCard(
    state: ProfileUiState,
    onTextChange: (String) -> Unit,
    onCurrencyChange: (Currency) -> Unit,
) {
    NettoCard {
        Text("Calculadora de cambio", style = MaterialTheme.typography.titleMedium)
        OutlinedTextField(
            value = state.calculatorText,
            onValueChange = onTextChange,
            label = { Text("Monto") },
            prefix = { Text("${state.calculatorCurrency.symbol} ") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp),
        )
        CurrencySelector(
            selected = state.calculatorCurrency,
            onSelect = onCurrencyChange,
            modifier = Modifier.padding(top = 8.dp),
        )
        val amount = state.calculatorAmount
        if (amount != null) {
            Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Currency.entries.filter { it != state.calculatorCurrency }.forEach { target ->
                    val converted = state.converter.convert(amount, state.calculatorCurrency, target)
                    Text(
                        converted?.formatMoney(target) ?: "${target.code}: falta la cotización",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun EditRateDialog(
    currency: Currency,
    initial: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
) {
    var text by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cotización de ${currency.label.lowercase()}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "¿Cuánto vale 1 ${Currency.USD.symbol}? Se reemplaza la próxima vez que actualices la cotización oficial.",
                    style = MaterialTheme.typography.bodySmall,
                )
                OutlinedTextField(
                    value = text,
                    onValueChange = { value -> text = value.filter { it.isDigit() || it == ',' || it == '.' } },
                    prefix = { Text("${currency.symbol} ") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
        },
        confirmButton = { TextButton(onClick = { onSave(text) }) { Text("Guardar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } },
    )
}

/** Cotización (unidades por USD) formateada en la moneda: "Gs. 7.850", "$ 1.450,50". */
private fun BigDecimal.toMoney(currency: Currency): String =
    setScale(currency.decimals, RoundingMode.HALF_UP).unscaledValue().toLong().formatMoney(currency)
