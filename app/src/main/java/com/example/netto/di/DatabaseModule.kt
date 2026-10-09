package com.example.netto.di

import android.content.Context
import androidx.room.Room
import com.example.netto.data.local.NettoDatabase
import com.example.netto.data.local.dao.BudgetPlanDao
import com.example.netto.data.local.dao.IncomeDao
import com.example.netto.data.local.dao.ObligationDao
import com.example.netto.data.local.dao.PaymentHistoryDao
import com.example.netto.data.local.dao.UserDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): NettoDatabase =
        Room.databaseBuilder(context, NettoDatabase::class.java, "netto.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideObligationDao(db: NettoDatabase): ObligationDao = db.obligationDao()

    @Provides
    fun provideIncomeDao(db: NettoDatabase): IncomeDao = db.incomeDao()

    @Provides
    fun provideBudgetPlanDao(db: NettoDatabase): BudgetPlanDao = db.budgetPlanDao()

    @Provides
    fun providePaymentHistoryDao(db: NettoDatabase): PaymentHistoryDao = db.paymentHistoryDao()

    @Provides
    fun provideUserDao(db: NettoDatabase): UserDao = db.userDao()
}
