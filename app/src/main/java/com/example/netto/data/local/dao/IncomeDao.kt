package com.example.netto.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.netto.data.local.entity.IncomeEntity
import com.example.netto.domain.model.Currency
import kotlinx.coroutines.flow.Flow

@Dao
interface IncomeDao {
    @Query("SELECT * FROM incomes WHERE userId = :userId ORDER BY dayOfMonth ASC")
    fun observeAll(userId: Long): Flow<List<IncomeEntity>>

    @Query("SELECT DISTINCT currency FROM incomes WHERE userId = :userId")
    fun observeCurrencies(userId: Long): Flow<List<Currency>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(income: IncomeEntity): Long

    @Update
    suspend fun update(income: IncomeEntity)

    @Delete
    suspend fun delete(income: IncomeEntity)
}
