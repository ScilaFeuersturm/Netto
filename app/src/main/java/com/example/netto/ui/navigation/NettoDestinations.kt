package com.example.netto.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.ui.graphics.vector.ImageVector

object NettoRoutes {
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val PROFILE = "profile"
    const val DASHBOARD = "dashboard"
    const val OBLIGATIONS = "obligations"
    const val OBLIGATION_FORM = "obligation_form"
    const val OBLIGATION_ID_ARG = "obligationId"
    const val SCAN_INVOICE = "scan_invoice"
    const val INCOME = "income"
    const val BUDGET = "budget"
    const val HISTORY = "history"

    fun obligationForm(obligationId: Long? = null) =
        "$OBLIGATION_FORM?$OBLIGATION_ID_ARG=${obligationId ?: -1L}"
}

data class BottomNavItem(val route: String, val label: String, val icon: ImageVector)

val bottomNavItems = listOf(
    BottomNavItem(NettoRoutes.DASHBOARD, "Inicio", Icons.Outlined.GridView),
    BottomNavItem(NettoRoutes.OBLIGATIONS, "Facturas", Icons.AutoMirrored.Outlined.ReceiptLong),
    BottomNavItem(NettoRoutes.BUDGET, "Ahorro", Icons.Outlined.AutoAwesome),
    BottomNavItem(NettoRoutes.HISTORY, "Reportes", Icons.Outlined.Assessment),
)
