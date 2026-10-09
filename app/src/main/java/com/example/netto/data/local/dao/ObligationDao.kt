package com.example.netto.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.domain.model.Currency
import kotlinx.coroutines.flow.Flow

@Dao
interface ObligationDao {
    @Query("SELECT * FROM obligations WHERE userId = :userId ORDER BY isPaid ASC, dueDate ASC")
    fun observeAll(userId: Long): Flow<List<ObligationEntity>>

    @Query("SELECT * FROM obligations WHERE id = :id AND userId = :userId")
    suspend fun getById(id: Long, userId: Long): ObligationEntity?

    @Query("SELECT DISTINCT currency FROM obligations WHERE userId = :userId")
    fun observeCurrencies(userId: Long): Flow<List<Currency>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(obligation: ObligationEntity): Long

    @Update
    suspend fun update(obligation: ObligationEntity)

    @Delete
    suspend fun delete(obligation: ObligationEntity)
}
