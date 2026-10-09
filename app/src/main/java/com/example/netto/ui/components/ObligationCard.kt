package com.example.netto.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.domain.model.ObligationStatus
import com.example.netto.ui.theme.toPalette
import com.example.netto.domain.model.CurrencyConverter
import com.example.netto.util.formatMoney
import com.example.netto.util.shortEs
import com.example.netto.util.urgencyFraction

/**
 * Tarjeta de factura/vencimiento: ícono de categoría, nombre, monto, chip de vencimiento,
 * barra de urgencia y acción para marcarla como pagada.
 * Con [emphasized] el botón de pago es el principal (verde oscuro), como en el primer vencimiento del inicio.
 * Si se pasa [converter] y la factura está en otra moneda, se muestra también el equivalente en la moneda de visualización.
 */
@Composable
fun ObligationCard(
    obligation: ObligationEntity,
    status: ObligationStatus,
    onClick: () -> Unit,
    onMarkPaid: () -> Unit,
    modifier: Modifier = Modifier,
    converter: CurrencyConverter? = null,
    emphasized: Boolean = false,
) {
    val palette = status.toPalette()
    val isPaid = status == ObligationStatus.PAGADO

    NettoCard(modifier = modifier, onClick = onClick) {
        Row(verticalAlignment = Alignment.Top) {
            IconBox(obligation.category.icon)

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = obligation.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = obligation.reference?.takeIf { it.isNotBlank() }?.let { "Ref: $it" } ?: obligation.category.label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = obligation.amount.formatMoney(obligation.currency),
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                if (converter != null && obligation.currency != converter.target) {
                    converter.convert(obligation.amount, obligation.currency)?.let { converted ->
                        Text(
                            text = "≈ ${converted.formatMoney(converter.target)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                StatusChip(status = status, dueDate = obligation.dueDate)
            }
        }

        NettoProgressBar(
            fraction = urgencyFraction(obligation.dueDate, isPaid),
            color = palette.bar,
            modifier = Modifier.padding(top = 14.dp),
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (isPaid) Icons.Outlined.TaskAlt else Icons.Outlined.CalendarMonth,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = if (isPaid) {
                    "Pagada el ${(obligation.paidDate ?: obligation.dueDate).shortEs()}"
                } else {
                    "Vence el ${obligation.dueDate.shortEs()}" + if (obligation.isRecurring) " • Mensual" else ""
                },
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 6.dp),
            )
            if (!isPaid) {
                val buttonPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                if (emphasized) {
                    PrimaryButton(
                        text = "Pagar ahora",
                        onClick = onMarkPaid,
                        icon = Icons.Outlined.CheckCircle,
                        contentPadding = buttonPadding,
                    )
                } else {
                    TonalButton(
                        text = "Marcar pagada",
                        onClick = onMarkPaid,
                        icon = Icons.Outlined.Check,
                        contentPadding = buttonPadding,
                    )
                }
            }
        }
    }
}
