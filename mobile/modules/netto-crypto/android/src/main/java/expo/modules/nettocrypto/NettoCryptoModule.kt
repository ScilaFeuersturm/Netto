package expo.modules.nettocrypto

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/** PBKDF2 con javax.crypto, igual que la versión Android original de Netto. */
class NettoCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NettoCrypto")

    AsyncFunction("pbkdf2") { algorithm: String, password: String, saltBase64: String, iterations: Int, keyLength: Int ->
      val javaAlgorithm = when (algorithm) {
        "SHA256" -> "PBKDF2WithHmacSHA256"
        "SHA1" -> "PBKDF2WithHmacSHA1"
        else -> throw IllegalArgumentException("Algoritmo no soportado: $algorithm")
      }
      val salt = Base64.decode(saltBase64, Base64.NO_WRAP)
      val spec = PBEKeySpec(password.toCharArray(), salt, iterations, keyLength * 8)
      try {
        val derived = SecretKeyFactory.getInstance(javaAlgorithm).generateSecret(spec).encoded
        Base64.encodeToString(derived, Base64.NO_WRAP)
      } finally {
        spec.clearPassword()
      }
    }
  }
}
