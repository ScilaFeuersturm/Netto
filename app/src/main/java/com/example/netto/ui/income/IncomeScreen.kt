package com.example.netto.ui.income

import com.example.netto.ui.components.ButtonShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.ui.components.CurrencySelector
import com.example.netto.util.formatMoney
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IncomeScreen(
    onBack: () -> Unit,
    viewModel: IncomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val form by viewModel.form.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tus ingresos", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, contentDescription = "Volver") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Ingreso mensual total", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(state.total.formatMoney(state.converter.target), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                }
            }

            items(state.incomes, key = { it.id }) { income ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(income.name, fontWeight = FontWeight.Medium)
                        Text("Día ${income.dayOfMonth} de cada mes", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(income.amount.formatMoney(income.currency), fontWeight = FontWeight.Bold)
                        if (income.currency != state.converter.target) {
                            state.converter.convert(income.amount, income.currency)?.let { converted ->
                                Text(
                                    "≈ ${converted.formatMoney(state.converter.target)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                    IconButton(onClick = { viewModel.delete(income) }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Eliminar", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }

            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Agregar fuente de ingreso", fontWeight = FontWeight.SemiBold)
                        OutlinedTextField(
                            value = form.name,
                            onValueChange = viewModel::onNameChange,
                            label = { Text("Nombre (ej. Sueldo)") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        OutlinedTextField(
                            value = form.amountText,
                            onValueChange = viewModel::onAmountChange,
                            label = { Text("Monto mensual") },
                            prefix = { Text("${form.currency.symbol} ") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                        )
                        CurrencySelector(selected = form.currency, onSelect = viewModel::onCurrencyChange)
                        OutlinedTextField(
                            value = form.dayOfMonth,
                            onValueChange = viewModel::onDayChange,
                            label = { Text("Día de cobro (1-31)") },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Button(
                            shape = ButtonShape,
                            onClick = { viewModel.addIncome() },
                            enabled = form.isValid,
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("Agregar") }
                    }
                }
            }
        }
    }
}
