package com.example.netto.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CurrencyExchange
import androidx.compose.material.icons.outlined.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.netto.domain.model.Currency
import com.example.netto.ui.auth.LoginScreen
import com.example.netto.ui.auth.RegisterScreen
import com.example.netto.ui.budget.BudgetScreen
import com.example.netto.ui.components.AlertBanner
import com.example.netto.ui.dashboard.DashboardScreen
import com.example.netto.ui.history.HistoryScreen
import com.example.netto.ui.income.IncomeScreen
import com.example.netto.ui.navigation.NettoRoutes
import com.example.netto.ui.navigation.bottomNavItems
import com.example.netto.ui.obligations.ObligationFormScreen
import com.example.netto.ui.obligations.ObligationsListScreen
import com.example.netto.ui.onboarding.OnboardingScreen
import com.example.netto.ui.profile.ProfileScreen
import com.example.netto.ui.scan.ScanInvoiceScreen

/**
 * Cada estado de la app tiene su propio NavHost. Al iniciar/cerrar sesión o terminar el onboarding
 * cambia [AppState] y se pasa al grafo correspondiente sin tener que navegar a mano.
 */
@Composable
fun NettoApp(appViewModel: AppViewModel = hiltViewModel()) {
    val appState by appViewModel.appState.collectAsState()

    when (appState) {
        AppState.LOADING -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        AppState.LOGGED_OUT -> {
            val navController = rememberNavController()
            NavHost(navController = navController, startDestination = NettoRoutes.LOGIN) {
                composable(NettoRoutes.LOGIN) {
                    LoginScreen(onGoToRegister = { navController.navigate(NettoRoutes.REGISTER) })
                }
                composable(NettoRoutes.REGISTER) {
                    RegisterScreen(onGoToLogin = {
                        if (!navController.popBackStack()) navController.navigate(NettoRoutes.LOGIN)
                    })
                }
            }
        }
        AppState.ONBOARDING -> {
            val header by appViewModel.header.collectAsState()
            OnboardingScreen(userName = header.firstName)
        }
        AppState.READY -> {
            val navController = rememberNavController()
            NavHost(navController = navController, startDestination = NettoRoutes.DASHBOARD) {
                mainGraph(navController, appViewModel)
            }
        }
    }
}

private fun NavHostController.navigateToTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private fun androidx.navigation.NavGraphBuilder.mainGraph(navController: NavHostController, appViewModel: AppViewModel) {
    composable(NettoRoutes.DASHBOARD) {
        MainScaffold(navController, appViewModel) { header ->
            DashboardScreen(
                userName = header.firstName,
                onAddObligation = { navController.navigate(NettoRoutes.obligationForm()) },
                onScanInvoice = { navController.navigate(NettoRoutes.SCAN_INVOICE) },
                onObligationClick = { id -> navController.navigate(NettoRoutes.obligationForm(id)) },
                onSeeAll = { navController.navigateToTab(NettoRoutes.OBLIGATIONS) },
                onOpenReports = { navController.navigateToTab(NettoRoutes.HISTORY) },
            )
        }
    }
    composable(NettoRoutes.OBLIGATIONS) {
        MainScaffold(navController, appViewModel) {
            ObligationsListScreen(
                onAddObligation = { navController.navigate(NettoRoutes.obligationForm()) },
                onScanInvoice = { navController.navigate(NettoRoutes.SCAN_INVOICE) },
                onObligationClick = { id -> navController.navigate(NettoRoutes.obligationForm(id)) },
            )
        }
    }
    composable(NettoRoutes.BUDGET) {
        MainScaffold(navController, appViewModel) {
            BudgetScreen(onManageIncome = { navController.navigate(NettoRoutes.INCOME) })
        }
    }
    composable(NettoRoutes.HISTORY) {
        MainScaffold(navController, appViewModel) {
            HistoryScreen(onAddObligation = { navController.navigate(NettoRoutes.obligationForm()) })
        }
    }
    composable(
        route = "${NettoRoutes.OBLIGATION_FORM}?${NettoRoutes.OBLIGATION_ID_ARG}={${NettoRoutes.OBLIGATION_ID_ARG}}",
        arguments = listOf(navArgument(NettoRoutes.OBLIGATION_ID_ARG) { type = NavType.LongType; defaultValue = -1L }),
    ) {
        ObligationFormScreen(
            onDone = { navController.popBackStack() },
            onBack = { navController.popBackStack() },
        )
    }
    composable(NettoRoutes.SCAN_INVOICE) {
        ScanInvoiceScreen(
            onBack = { navController.popBackStack() },
            onManualEntry = {
                navController.navigate(NettoRoutes.obligationForm()) {
                    popUpTo(NettoRoutes.SCAN_INVOICE) { inclusive = true }
                }
            },
            onOcrReady = {
                navController.navigate(NettoRoutes.obligationForm()) {
                    popUpTo(NettoRoutes.SCAN_INVOICE) { inclusive = true }
                }
            },
        )
    }
    composable(NettoRoutes.INCOME) {
        IncomeScreen(onBack = { navController.popBackStack() })
    }
    composable(NettoRoutes.PROFILE) {
        ProfileScreen(onBack = { navController.popBackStack() })
    }
}

@Composable
private fun MainScaffold(
    navController: NavHostController,
    appViewModel: AppViewModel,
    content: @Composable (HeaderState) -> Unit,
) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val header by appViewModel.header.collectAsState()
    val openProfile = { navController.navigate(NettoRoutes.PROFILE) { launchSingleTop = true } }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            NettoTopBar(
                header = header,
                onCurrencySelect = appViewModel::setDisplayCurrency,
                onProfileClick = openProfile,
            )
        },
        bottomBar = {
            NettoBottomBar(currentRoute = currentRoute, onSelect = { navController.navigateToTab(it) })
        },
    ) { padding ->
        Column(Modifier.padding(padding)) {
            if (header.missingRates.isNotEmpty()) {
                AlertBanner(
                    message = "Falta la cotización de ${header.missingRates.joinToString { it.code }}, así que algunos montos " +
                        "no se suman a los totales. Conectate a internet o cargala a mano desde tu perfil.",
                    critical = true,
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(onClick = openProfile),
                )
            }
            Box(Modifier.weight(1f)) {
                content(header)
            }
        }
    }
}

@Composable
private fun NettoTopBar(
    header: HeaderState,
    onCurrencySelect: (Currency) -> Unit,
    onProfileClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Netto",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.weight(1f),
        )
        CurrencyMenu(selected = header.displayCurrency, onSelect = onCurrencySelect)
        Box(
            modifier = Modifier
                .padding(start = 10.dp)
                .size(38.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer)
                .clickable(onClick = onProfileClick),
            contentAlignment = Alignment.Center,
        ) {
            if (header.initials.isNotEmpty()) {
                Text(header.initials, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onPrimaryContainer)
            } else {
                Icon(
                    Icons.Outlined.Person,
                    contentDescription = "Perfil",
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(22.dp),
                )
            }
        }
    }
}

/** Selector rápido de la moneda en la que se muestran los totales. */
@Composable
private fun CurrencyMenu(selected: Currency, onSelect: (Currency) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        Row(
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable { expanded = true }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.CurrencyExchange, contentDescription = null, modifier = Modifier.size(16.dp))
            Text(
                selected.code,
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.padding(horizontal = 6.dp),
            )
            Icon(Icons.Outlined.KeyboardArrowDown, contentDescription = "Cambiar moneda", modifier = Modifier.size(16.dp))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            Currency.entries.forEach { currency ->
                DropdownMenuItem(
                    text = { Text("${currency.symbol}  ${currency.label}") },
                    onClick = {
                        expanded = false
                        onSelect(currency)
                    },
                    trailingIcon = if (currency == selected) {
                        { Text("✓", color = MaterialTheme.colorScheme.secondary) }
                    } else null,
                )
            }
        }
    }
}

@Composable
private fun NettoBottomBar(currentRoute: String?, onSelect: (String) -> Unit) {
    Column(Modifier.background(MaterialTheme.colorScheme.background)) {
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
        ) {
            bottomNavItems.forEach { item ->
                val selected = currentRoute == item.route
                val color = if (selected) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clip(MaterialTheme.shapes.small)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = ripple(bounded = true),
                            onClick = { onSelect(item.route) },
                        )
                        .padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Icon(item.icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
                    Text(
                        text = item.label,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        color = color,
                    )
                }
            }
        }
    }
}
