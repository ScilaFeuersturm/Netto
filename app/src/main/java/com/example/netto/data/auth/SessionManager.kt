package com.example.netto.data.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.longPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

/** Guarda qué usuario tiene la sesión abierta. La sesión persiste hasta que el usuario cierra sesión. */
@Singleton
class SessionManager @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    val userId: Flow<Long?> = dataStore.data
        .catch { if (it is IOException) emit(emptyPreferences()) else throw it }
        .map { it[USER_ID_KEY] }
        .distinctUntilChanged()

    suspend fun currentUserId(): Long? = userId.first()

    suspend fun requireUserId(): Long = currentUserId() ?: throw IllegalStateException("No hay una sesión activa")

    suspend fun start(userId: Long) {
        dataStore.edit { it[USER_ID_KEY] = userId }
    }

    suspend fun clear() {
        dataStore.edit { it.remove(USER_ID_KEY) }
    }

    private companion object {
        val USER_ID_KEY = longPreferencesKey("session_user_id")
    }
}
