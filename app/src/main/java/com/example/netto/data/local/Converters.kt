package com.example.netto.data.local

import androidx.room.TypeConverter
import com.example.netto.domain.model.BudgetModelType
import com.example.netto.domain.model.Currency
import com.example.netto.domain.model.ObligationCategory
import java.time.LocalDate

class Converters {
    @TypeConverter
    fun fromEpochDay(value: Long?): LocalDate? = value?.let { LocalDate.ofEpochDay(it) }

    @TypeConverter
    fun localDateToEpochDay(date: LocalDate?): Long? = date?.toEpochDay()

    @TypeConverter
    fun fromCategoryName(value: String?): ObligationCategory? = value?.let { ObligationCategory.valueOf(it) }

    @TypeConverter
    fun categoryToName(category: ObligationCategory?): String? = category?.name

    @TypeConverter
    fun fromBudgetModelName(value: String?): BudgetModelType? = value?.let { BudgetModelType.valueOf(it) }

    @TypeConverter
    fun budgetModelToName(model: BudgetModelType?): String? = model?.name

    @TypeConverter
    fun fromCurrencyCode(value: String?): Currency? = value?.let { Currency.valueOf(it) }

    @TypeConverter
    fun currencyToCode(currency: Currency?): String? = currency?.name
}
