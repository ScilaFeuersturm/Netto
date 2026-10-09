package com.example.netto.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.netto.data.local.dao.BudgetPlanDao
import com.example.netto.data.local.dao.IncomeDao
import com.example.netto.data.local.dao.ObligationDao
import com.example.netto.data.local.dao.PaymentHistoryDao
import com.example.netto.data.local.dao.UserDao
import com.example.netto.data.local.entity.BudgetPlanEntity
import com.example.netto.data.local.entity.IncomeEntity
import com.example.netto.data.local.entity.ObligationEntity
import com.example.netto.data.local.entity.PaymentHistoryEntity
import com.example.netto.data.local.entity.UserEntity

@Database(
    entities = [
        UserEntity::class,
        ObligationEntity::class,
        IncomeEntity::class,
        BudgetPlanEntity::class,
        PaymentHistoryEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class NettoDatabase : RoomDatabase() {
    abstract fun obligationDao(): ObligationDao
    abstract fun incomeDao(): IncomeDao
    abstract fun budgetPlanDao(): BudgetPlanDao
    abstract fun paymentHistoryDao(): PaymentHistoryDao
    abstract fun userDao(): UserDao
}
