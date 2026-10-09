package com.example.netto.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.netto.domain.model.Currency

/** Chips para elegir una de las monedas soportadas ("Gs. PYG", "$ ARS", "US$ USD"). */
@Composable
fun CurrencySelector(
    selected: Currency,
    onSelect: (Currency) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Currency.entries.forEach { currency ->
            FilterChip(
                selected = currency == selected,
                onClick = { onSelect(currency) },
                label = { Text("${currency.symbol} ${currency.code}") },
            )
        }
    }
}
