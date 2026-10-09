package com.example.netto.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.example.netto.domain.model.Currency

/** Una fuente de ingreso mensual (sueldo, freelance, renta, etc). [amount] está en unidad mínima de [currency]. */
@Entity(
    tableName = "incomes",
    foreignKeys = [ForeignKey(entity = UserEntity::class, parentColumns = ["id"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("userId")],
)
data class IncomeEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: Long = 0,
    val name: String,
    val amount: Long,
    val currency: Currency,
    val dayOfMonth: Int = 1,
    val isRecurring: Boolean = true,
)
