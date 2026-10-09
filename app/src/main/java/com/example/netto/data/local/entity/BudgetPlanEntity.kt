package com.example.netto.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey
import com.example.netto.domain.model.BudgetModelType
import com.example.netto.domain.model.Currency

/** Preferencias de cada usuario (una fila por usuario): modelo de ahorro/gasto activo y moneda de visualización. */
@Entity(
    tableName = "budget_plan",
    foreignKeys = [ForeignKey(entity = UserEntity::class, parentColumns = ["id"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)],
)
data class BudgetPlanEntity(
    @PrimaryKey val userId: Long = 0,
    val modelType: BudgetModelType = BudgetModelType.RULE_50_30_20,
    val necesidadesPercent: Int = BudgetModelType.RULE_50_30_20.necesidadesPercent,
    val deseosPercent: Int = BudgetModelType.RULE_50_30_20.deseosPercent,
    val ahorroPercent: Int = BudgetModelType.RULE_50_30_20.ahorroPercent,
    val reminderDaysBefore: Int = 3,
    /** Moneda en la que se muestran los totales; cada monto conserva su moneda original. */
    val displayCurrency: Currency = Currency.PYG,
    val onboardingCompleted: Boolean = false,
)
