package com.example.netto.data.repository

import com.example.netto.data.auth.SessionManager
import com.example.netto.data.local.dao.BudgetPlanDao
import com.example.netto.data.local.entity.BudgetPlanEntity
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BudgetPlanRepository @Inject constructor(
    private val budgetPlanDao: BudgetPlanDao,
    private val session: SessionManager,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observe(): Flow<BudgetPlanEntity> = session.userId.flatMapLatest { userId ->
        if (userId == null) flowOf(BudgetPlanEntity())
        else budgetPlanDao.observe(userId).map { it ?: BudgetPlanEntity(userId = userId) }
    }

    suspend fun get(): BudgetPlanEntity {
        val userId = session.requireUserId()
        return budgetPlanDao.get(userId) ?: BudgetPlanEntity(userId = userId)
    }

    suspend fun save(plan: BudgetPlanEntity) = budgetPlanDao.upsert(plan.copy(userId = session.requireUserId()))

    suspend fun update(transform: (BudgetPlanEntity) -> BudgetPlanEntity) = save(transform(get()))
}
