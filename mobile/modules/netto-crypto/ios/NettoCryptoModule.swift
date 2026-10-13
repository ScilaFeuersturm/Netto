import CommonCrypto
import ExpoModulesCore

/// PBKDF2 con CommonCrypto. En JavaScript puro las 120.000 iteraciones tardaban decenas de segundos.
public class NettoCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NettoCrypto")

    AsyncFunction("pbkdf2") { (algorithm: String, password: String, saltBase64: String, iterations: Int, keyLength: Int) -> String in
      guard let salt = Data(base64Encoded: saltBase64) else {
        throw Exception(name: "InvalidSalt", description: "La sal no es base64 válido")
      }
      let prf: CCPseudoRandomAlgorithm
      switch algorithm {
      case "SHA256": prf = CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256)
      case "SHA1": prf = CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA1)
      default: throw Exception(name: "InvalidAlgorithm", description: "Algoritmo no soportado: \(algorithm)")
      }
      let passwordBytes = Array(password.utf8)
      var derived = [UInt8](repeating: 0, count: keyLength)
      let status = salt.withUnsafeBytes { saltBytes in
        passwordBytes.withUnsafeBufferPointer { passwordPointer in
          CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordPointer.baseAddress.map { UnsafeRawPointer($0).assumingMemoryBound(to: CChar.self) },
            passwordBytes.count,
            saltBytes.bindMemory(to: UInt8.self).baseAddress,
            salt.count,
            prf,
            UInt32(iterations),
            &derived,
            keyLength
          )
        }
      }
      guard status == kCCSuccess else {
        throw Exception(name: "Pbkdf2Failed", description: "PBKDF2 falló con código \(status)")
      }
      return Data(derived).base64EncodedString()
    }
  }
}
