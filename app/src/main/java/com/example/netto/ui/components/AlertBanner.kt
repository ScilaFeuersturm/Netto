package com.example.netto.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.NotificationImportant
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/** Aviso en línea. Por defecto es neutro (gris verdoso); con [critical] usa los colores de error. */
@Composable
fun AlertBanner(
    message: String,
    modifier: Modifier = Modifier,
    critical: Boolean = false,
    icon: ImageVector = Icons.Outlined.NotificationImportant,
) {
    val container: Color
    val content: Color
    val iconTint: Color
    if (critical) {
        container = MaterialTheme.colorScheme.errorContainer
        content = MaterialTheme.colorScheme.onErrorContainer
        iconTint = MaterialTheme.colorScheme.error
    } else {
        container = MaterialTheme.colorScheme.surfaceVariant
        content = MaterialTheme.colorScheme.onSurface
        iconTint = MaterialTheme.colorScheme.onSurface
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(container)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = iconTint, modifier = Modifier.size(20.dp))
        Text(
            text = message,
            modifier = Modifier.padding(start = 10.dp),
            color = content,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
