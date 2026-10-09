package com.example.netto.data.repository

import com.example.netto.data.auth.SessionManager
import com.example.netto.data.local.dao.IncomeDao
import com.example.netto.data.local.entity.IncomeEntity
import com.example.netto.domain.model.Currency
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import javax.inject.Inject
import javax.inject.Singleton

@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class IncomeRepository @Inject constructor(
    private val incomeDao: IncomeDao,
    private val session: SessionManager,
) {
    fun observeAll(): Flow<List<IncomeEntity>> =
        session.userId.flatMapLatest { userId -> if (userId == null) flowOf(emptyList()) else incomeDao.observeAll(userId) }

    fun observeCurrencies(): Flow<List<Currency>> =
        session.userId.flatMapLatest { userId -> if (userId == null) flowOf(emptyList()) else incomeDao.observeCurrencies(userId) }

    suspend fun save(income: IncomeEntity): Long = incomeDao.upsert(income.copy(userId = session.requireUserId()))

    suspend fun delete(income: IncomeEntity) = incomeDao.delete(income)
}
