package com.example.netto.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.ObligationCategory
import java.time.LocalDate

/** Una obligación de pago: factura de servicio, cuota, gasto recurrente, etc. [amount] está en unidad mínima de [currency]. */
@Entity(
    tableName = "obligations",
    foreignKeys = [ForeignKey(entity = UserEntity::class, parentColumns = ["id"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("userId")],
)
data class ObligationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: Long = 0,
    val name: String,
    val reference: String? = null,
    val amount: Long,
    val currency: Currency,
    val dueDate: LocalDate,
    val category: ObligationCategory,
    val isRecurring: Boolean = false,
    val isPaid: Boolean = false,
    val paidDate: LocalDate? = null,
    val notes: String? = null,
    val createdFromOcr: Boolean = false,
    val createdAt: LocalDate = LocalDate.now(),
)
