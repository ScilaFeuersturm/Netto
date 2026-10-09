package com.example.netto.data.repository

import com.example.netto.data.auth.SessionManager
import com.example.netto.data.local.dao.ObligationDao
import com.example.netto.data.local.dao.PaymentHistoryDao
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.data.local.entity.PaymentHistoryEntity
import com.example.netto.domain.model.Currency
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class ObligationRepository @Inject constructor(
    private val obligationDao: ObligationDao,
    private val paymentHistoryDao: PaymentHistoryDao,
    private val session: SessionManager,
) {
    fun observeAll(): Flow<List<ObligationEntity>> =
        session.userId.flatMapLatest { userId -> if (userId == null) flowOf(emptyList()) else obligationDao.observeAll(userId) }

    fun observePaymentHistory(): Flow<List<PaymentHistoryEntity>> =
        session.userId.flatMapLatest { userId -> if (userId == null) flowOf(emptyList()) else paymentHistoryDao.observeAll(userId) }

    fun observeCurrencies(): Flow<List<Currency>> =
        session.userId.flatMapLatest { userId -> if (userId == null) flowOf(emptyList()) else obligationDao.observeCurrencies(userId) }

    suspend fun getById(id: Long): ObligationEntity? = obligationDao.getById(id, session.requireUserId())

    suspend fun save(obligation: ObligationEntity): Long = obligationDao.upsert(obligation.copy(userId = session.requireUserId()))

    suspend fun delete(obligation: ObligationEntity) = obligationDao.delete(obligation)

    /** Marca una obligación como pagada, registra el historial y, si es recurrente, genera la próxima cuota. */
    suspend fun markAsPaid(obligation: ObligationEntity, paidDate: LocalDate = LocalDate.now()) {
        val paid = obligation.copy(isPaid = true, paidDate = paidDate)
        obligationDao.update(paid)
        paymentHistoryDao.insert(
            PaymentHistoryEntity(
                userId = obligation.userId,
                obligationId = obligation.id,
                obligationName = obligation.name,
                category = obligation.category,
                amount = obligation.amount,
                currency = obligation.currency,
                paidDate = paidDate,
            )
        )
        if (obligation.isRecurring) {
            obligationDao.upsert(
                obligation.copy(
                    id = 0,
                    dueDate = obligation.dueDate.plusMonths(1),
                    isPaid = false,
                    paidDate = null,
                    createdFromOcr = false,
                )
            )
        }
    }
}
