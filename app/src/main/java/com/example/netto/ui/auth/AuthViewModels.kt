package com.example.netto.ui.auth

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.netto.data.auth.AuthRepository
import com.example.netto.data.auth.AuthResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

const val MIN_PASSWORD_LENGTH = 8

private fun String.isValidEmail() = Patterns.EMAIL_ADDRESS.matcher(trim()).matches()

data class LoginState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
) {
    val canSubmit: Boolean get() = email.isValidEmail() && password.isNotEmpty() && !isLoading
}

/** Al iniciar sesión correctamente no hace falta navegar: la app reacciona al cambio de sesión. */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }

    fun submit() {
        val current = _state.value
        if (!current.canSubmit) return
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            val result = authRepository.login(current.email, current.password)
            if (result is AuthResult.Error) _state.update { it.copy(isLoading = false, error = result.message) }
        }
    }
}

data class RegisterState(
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
) {
    val emailError: String?
        get() = if (email.isNotBlank() && !email.isValidEmail()) "Ingresá un email válido" else null
    val passwordError: String?
        get() = if (password.isNotEmpty() && password.length < MIN_PASSWORD_LENGTH) "Usá al menos $MIN_PASSWORD_LENGTH caracteres" else null
    val confirmError: String?
        get() = if (confirmPassword.isNotEmpty() && confirmPassword != password) "Las contraseñas no coinciden" else null

    val canSubmit: Boolean
        get() = name.isNotBlank() && email.isValidEmail() && password.length >= MIN_PASSWORD_LENGTH &&
            confirmPassword == password && !isLoading
}

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(RegisterState())
    val state: StateFlow<RegisterState> = _state.asStateFlow()

    fun onNameChange(value: String) = _state.update { it.copy(name = value, error = null) }
    fun onEmailChange(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPasswordChange(value: String) = _state.update { it.copy(password = value, error = null) }
    fun onConfirmChange(value: String) = _state.update { it.copy(confirmPassword = value, error = null) }

    fun submit() {
        val current = _state.value
        if (!current.canSubmit) return
        _state.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            val result = authRepository.register(current.name, current.email, current.password)
            if (result is AuthResult.Error) _state.update { it.copy(isLoading = false, error = result.message) }
        }
    }
}
