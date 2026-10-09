package com.example.netto.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.netto.data.local.entity.PaymentHistoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentHistoryDao {
    @Query("SELECT * FROM payment_history WHERE userId = :userId ORDER BY paidDate DESC")
    fun observeAll(userId: Long): Flow<List<PaymentHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: PaymentHistoryEntity): Long
}
