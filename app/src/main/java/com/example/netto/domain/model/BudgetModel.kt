package com.example.netto.domain.model

/**
 * Modelos de ahorro/gasto sugeridos, basados en reglas de finanzas personales
 * de uso extendido. Los porcentajes son sobre el ingreso mensual total.
 */
enum class BudgetModelType(
    val title: String,
    val description: String,
    val source: String,
    val necesidadesPercent: Int,
    val deseosPercent: Int,
    val ahorroPercent: Int,
) {
    RULE_50_30_20(
        title = "Regla 50/30/20",
        description = "50% para necesidades, 30% para deseos y 20% para ahorro o pago de deudas. " +
            "Un buen punto de partida equilibrado para la mayoría de los ingresos.",
        source = "Popularizada por la senadora Elizabeth Warren en \"All Your Worth\" (2005)",
        necesidadesPercent = 50,
        deseosPercent = 30,
        ahorroPercent = 20,
    ),
    RULE_70_20_10(
        title = "Regla 70/20/10",
        description = "70% para gastos del día a día, 20% para ahorro y 10% para inversión o donación. " +
            "Recomendada cuando los gastos fijos son altos en relación al ingreso.",
        source = "Variante clásica de presupuesto proporcional usada en educación financiera",
        necesidadesPercent = 70,
        deseosPercent = 20,
        ahorroPercent = 10,
    ),
    PAY_YOURSELF_FIRST(
        title = "Ahorro del 10% primero",
        description = "Separá el 10% de tu ingreso apenas lo recibís, antes de gastar en cualquier otra cosa. " +
            "El resto (90%) se reparte libremente entre necesidades y deseos.",
        source = "\"Pay yourself first\", principio de George S. Clason en \"El hombre más rico de Babilonia\" (1926)",
        necesidadesPercent = 60,
        deseosPercent = 30,
        ahorroPercent = 10,
    ),
    CUSTOM(
        title = "Personalizado",
        description = "Definí vos los porcentajes de necesidades, deseos y ahorro según tu realidad.",
        source = "Definido por vos",
        necesidadesPercent = 50,
        deseosPercent = 30,
        ahorroPercent = 20,
    ),
}
