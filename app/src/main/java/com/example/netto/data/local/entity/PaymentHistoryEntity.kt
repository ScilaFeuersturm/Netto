package com.example.netto.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.ObligationCategory
import java.time.LocalDate

/** Registro histórico de un pago realizado, conservado aunque la obligación original cambie. */
@Entity(
    tableName = "payment_history",
    foreignKeys = [ForeignKey(entity = UserEntity::class, parentColumns = ["id"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)],
    indices = [Index("userId")],
)
data class PaymentHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val userId: Long = 0,
    val obligationId: Long,
    val obligationName: String,
    val category: ObligationCategory,
    val amount: Long,
    val currency: Currency,
    val paidDate: LocalDate,
)
