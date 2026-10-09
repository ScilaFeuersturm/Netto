package com.example.netto.ui.onboarding

import com.example.netto.ui.components.ButtonShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.netto.domain.model.BudgetModelType
import com.example.netto.ui.components.CurrencySelector

@Composable
fun OnboardingScreen(
    userName: String,
    viewModel: OnboardingViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .imePadding()
            .padding(horizontal = 24.dp),
        contentPadding = PaddingValues(vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Text(
                if (userName.isBlank()) "Bienvenido a Netto" else "¡Hola, $userName!",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                "Configuremos tu cuenta en un minuto. Podés cambiar todo esto más adelante.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp),
            )
        }

        item {
            Text("¿En qué moneda querés ver tus totales?", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                "Cada ingreso y factura guarda su propia moneda; los totales se convierten a esta.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            CurrencySelector(
                selected = state.displayCurrency,
                onSelect = viewModel::onDisplayCurrencySelect,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        item {
            Text("Tu ingreso mensual (opcional)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                "Si preferís, cargalo después desde Ahorro → Gestionar ingresos.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                value = state.incomeName,
                onValueChange = viewModel::onIncomeNameChange,
                label = { Text("Nombre (ej. Sueldo)") },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            )
            OutlinedTextField(
                value = state.incomeText,
                onValueChange = viewModel::onIncomeChange,
                label = { Text("Monto en ${state.incomeCurrency.label.lowercase()}") },
                prefix = { Text("${state.incomeCurrency.symbol} ") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            )
            CurrencySelector(
                selected = state.incomeCurrency,
                onSelect = viewModel::onIncomeCurrencySelect,
                modifier = Modifier.padding(top = 8.dp),
            )
        }

        item {
            Text("Elegí un modelo de ahorro para empezar", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                "Podés cambiarlo cuando quieras desde la pestaña Ahorro.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        items(BudgetModelType.entries.toList()) { model ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (state.selectedModel == model) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
                ),
                onClick = { viewModel.onModelSelect(model) },
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = state.selectedModel == model, onClick = { viewModel.onModelSelect(model) })
                    Column(Modifier.padding(start = 8.dp)) {
                        Text(model.title, fontWeight = FontWeight.SemiBold)
                        Text(model.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        item {
            Button(
                shape = ButtonShape,
                onClick = { viewModel.finish() },
                enabled = state.isValid,
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Empezar") }
        }
    }
}
