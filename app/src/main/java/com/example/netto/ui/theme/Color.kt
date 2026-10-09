package com.example.netto.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Paleta de marca Netto — design system "Serene Financial Clarity"
val Forest = Color(0xFF1E3A2F) // primary
val ForestDeep = Color(0xFF0F2419) // botones y tarjetas hero
val ForestLight = Color(0xFF2E5040)
val Pine = Color(0xFF3D6B56) // secondary
val Amber = Color(0xFFD97706) // tertiary
val Slate = Color(0xFF707973) // neutral

// Variantes para superficies y contraste (tema claro)
val MintBackground = Color(0xFFF1FAF2)
val Mint = Color(0xFFBFEBD3)
val MintMuted = Color(0xFFA8D8C0)
val SageSurface = Color(0xFFE7EFE9)
val SageOutline = Color(0xFFC9D3CC)
val Ink = Color(0xFF14211B)
val InkMuted = Color(0xFF5C6660)
val AmberContainer = Color(0xFFFFE0C2)
val AmberDark = Color(0xFF7A3E00)
val Danger = Color(0xFFC62828)
val DangerContainer = Color(0xFFFCDADA)
val DangerDark = Color(0xFFA3191B)

// Variantes para el tema oscuro
val NightBackground = Color(0xFF0D1813)
val NightSurface = Color(0xFF15241D)
val NightSurfaceHigh = Color(0xFF1E3028)
val NightOutline = Color(0xFF52625A)
val NightText = Color(0xFFE3EEE7)
val NightTextMuted = Color(0xFFA9B8AF)

/** Fondo de las tarjetas destacadas (saldo, total por pagar, etc). Igual en ambos temas. */
val HeroBrush = Brush.linearGradient(listOf(ForestLight, Forest, ForestDeep))
val HeroOnColor = Color.White
val HeroOnColorMuted = Color(0xFFB9CEC3)
val HeroTile = Color.White.copy(alpha = 0.08f)
