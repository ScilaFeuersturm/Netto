package com.example.netto.data.auth

import android.database.sqlite.SQLiteConstraintException
import com.example.netto.data.local.dao.UserDao
import com.example.netto.data.local.entity.UserEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

sealed interface AuthResult {
    data object Success : AuthResult
    data class Error(val message: String) : AuthResult
}

/** Registro e inicio de sesión con cuentas locales (sin backend). */
@Singleton
class AuthRepository @Inject constructor(
    private val userDao: UserDao,
    private val session: SessionManager,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    fun observeCurrentUser(): Flow<UserEntity?> =
        session.userId.flatMapLatest { id -> if (id == null) flowOf(null) else userDao.observeById(id) }

    suspend fun register(name: String, email: String, password: String): AuthResult {
        val normalizedEmail = email.normalizeEmail()
        if (userDao.findByEmail(normalizedEmail) != null) {
            return AuthResult.Error("Ya existe una cuenta con ese email.")
        }
        // PBKDF2 es costoso a propósito: se calcula fuera del hilo principal.
        val hash = withContext(Dispatchers.Default) { PasswordHasher.hash(password) }
        val id = try {
            userDao.insert(UserEntity(name = name.trim(), email = normalizedEmail, passwordHash = hash))
        } catch (e: SQLiteConstraintException) {
            return AuthResult.Error("Ya existe una cuenta con ese email.")
        }
        session.start(id)
        return AuthResult.Success
    }

    suspend fun login(email: String, password: String): AuthResult {
        val user = userDao.findByEmail(email.normalizeEmail())
        val valid = user != null && withContext(Dispatchers.Default) { PasswordHasher.verify(password, user.passwordHash) }
        if (!valid) return AuthResult.Error("Email o contraseña incorrectos.")
        session.start(user!!.id)
        return AuthResult.Success
    }

    suspend fun logout() = session.clear()

    private fun String.normalizeEmail() = trim().lowercase()
}
