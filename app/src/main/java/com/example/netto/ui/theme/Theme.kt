package com.example.netto.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = Forest,
    onPrimary = Color.White,
    primaryContainer = Mint,
    onPrimaryContainer = Forest,
    inversePrimary = Mint,
    secondary = Pine,
    onSecondary = Color.White,
    secondaryContainer = SageSurface,
    onSecondaryContainer = Forest,
    tertiary = Amber,
    onTertiary = Color.White,
    tertiaryContainer = AmberContainer,
    onTertiaryContainer = AmberDark,
    background = MintBackground,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = SageSurface,
    onSurfaceVariant = InkMuted,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color.White,
    surfaceContainerHigh = SageSurface,
    surfaceContainerHighest = SageSurface,
    outline = SageOutline,
    outlineVariant = SageSurface,
    error = Danger,
    onError = Color.White,
    errorContainer = DangerContainer,
    onErrorContainer = DangerDark,
)

private val DarkColors = darkColorScheme(
    primary = MintMuted,
    onPrimary = ForestDeep,
    primaryContainer = ForestLight,
    onPrimaryContainer = Mint,
    inversePrimary = Forest,
    secondary = Color(0xFF8CBFA6),
    onSecondary = ForestDeep,
    secondaryContainer = NightSurfaceHigh,
    onSecondaryContainer = Color(0xFFCFE8DA),
    tertiary = Color(0xFFF0A040),
    onTertiary = Color(0xFF3A1F00),
    tertiaryContainer = Color(0xFF5A3200),
    onTertiaryContainer = Color(0xFFFFDDB8),
    background = NightBackground,
    onBackground = NightText,
    surface = NightSurface,
    onSurface = NightText,
    surfaceVariant = NightSurfaceHigh,
    onSurfaceVariant = NightTextMuted,
    surfaceContainerLowest = NightBackground,
    surfaceContainerLow = NightSurface,
    surfaceContainer = NightSurface,
    surfaceContainerHigh = NightSurfaceHigh,
    surfaceContainerHighest = NightSurfaceHigh,
    outline = NightOutline,
    outlineVariant = NightSurfaceHigh,
    error = Color(0xFFFF8A80),
    onError = Color(0xFF3A0F0F),
    errorContainer = Color(0xFF6B1A1A),
    onErrorContainer = Color(0xFFFFDAD6),
)

private val NettoShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

@Composable
fun NettoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = NettoTypography,
        shapes = NettoShapes,
        content = content,
    )
}
