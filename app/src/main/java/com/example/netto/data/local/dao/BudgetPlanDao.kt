package com.example.netto.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.netto.data.local.entity.BudgetPlanEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BudgetPlanDao {
    @Query("SELECT * FROM budget_plan WHERE userId = :userId")
    fun observe(userId: Long): Flow<BudgetPlanEntity?>

    @Query("SELECT * FROM budget_plan WHERE userId = :userId")
    suspend fun get(userId: Long): BudgetPlanEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(plan: BudgetPlanEntity)
}
