package com.example.netto.domain.model

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Pets
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.ui.graphics.vector.ImageVector

/** Categorías de obligaciones/gastos. [bucket] indica si financieramente es una necesidad o un deseo,
 * usado para calcular el progreso contra los modelos de presupuesto (50/30/20, etc). */
enum class ObligationCategory(val label: String, val icon: ImageVector, val bucket: BudgetBucket) {
    SERVICIOS("Servicios (luz, agua, gas)", Icons.Filled.Bolt, BudgetBucket.NECESIDADES),
    INTERNET("Internet / Telefonía", Icons.Filled.Wifi, BudgetBucket.NECESIDADES),
    VIVIENDA("Vivienda / Alquiler", Icons.Filled.Home, BudgetBucket.NECESIDADES),
    EDUCACION("Educación", Icons.Filled.School, BudgetBucket.NECESIDADES),
    SALUD("Salud", Icons.Filled.LocalHospital, BudgetBucket.NECESIDADES),
    TRANSPORTE("Transporte", Icons.Filled.DirectionsCar, BudgetBucket.NECESIDADES),
    ALIMENTACION("Alimentación", Icons.Filled.Fastfood, BudgetBucket.NECESIDADES),
    DEUDAS("Deudas / Préstamos", Icons.Filled.Favorite, BudgetBucket.NECESIDADES),
    MASCOTAS("Mascotas", Icons.Filled.Pets, BudgetBucket.DESEOS),
    OCIO("Ocio / Entretenimiento", Icons.Filled.SportsEsports, BudgetBucket.DESEOS),
    OTROS("Otros", Icons.Filled.MoreHoriz, BudgetBucket.DESEOS),
}

enum class BudgetBucket { NECESIDADES, DESEOS, AHORRO }
