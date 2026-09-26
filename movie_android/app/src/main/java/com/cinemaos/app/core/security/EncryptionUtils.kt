package com.cinemaos.app.core.security

import android.util.Base64
import java.security.spec.KeySpec
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

object EncryptionUtils {
    // Placeholders for real keys/passwords
    private const val PRIMARY_KEY = "PLACEHOLDER_PRIMARY_KEY"
    private const val SECONDARY_KEY = "PLACEHOLDER_SECONDARY_KEY"
    private const val PBKDF2_PASSWORD = "PLACEHOLDER_PBKDF2_PASSWORD"

    /**
     * Builds the content string in the exact order: tmdbId, imdbId, seasonId, episodeId
     */
    fun buildContentString(
        tmdbId: String?,
        imdbId: String?,
        seasonId: String?,
        episodeId: String?
    ): String {
        val parts = mutableListOf<String>()
        if (!tmdbId.isNullOrEmpty()) parts.add("tmdbId:$tmdbId")
        if (!imdbId.isNullOrEmpty()) parts.add("imdbId:$imdbId")
        if (!seasonId.isNullOrEmpty()) parts.add("seasonId:$seasonId")
        if (!episodeId.isNullOrEmpty()) parts.add("episodeId:$episodeId")
        return parts.joinToString("|")
    }

    /**
     * Generates HMAC-SHA256 hash
     */
    private fun hmacSha256(key: String, data: String): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(key.toByteArray(Charsets.UTF_8), "HmacSHA256")
        mac.init(secretKey)
        return mac.doFinal(data.toByteArray(Charsets.UTF_8))
    }

    /**
     * Converts a byte array to a lowercase hexadecimal string
     */
    private fun ByteArray.toHex(): String {
        return joinToString("") { "%02x".format(it) }
    }

    /**
     * Generates the request secret:
     * hash1 = HMAC_SHA256(primaryKey, contentString)
     * secret = HMAC_SHA256(secondaryKey, hash1)
     */
    fun generateRequestSecret(contentString: String): String {
        val hash1 = hmacSha256(PRIMARY_KEY, contentString)
        // Convert hash1 to string before hashing again, or pass raw bytes?
        // Usually, the first hash is passed as a hex string to the second hash in these web client flows.
        // Assuming hex string based on typical JS implementations.
        val hash1Hex = hash1.toHex()
        val secret = hmacSha256(SECONDARY_KEY, hash1Hex)
        return secret.toHex()
    }

    /**
     * Decrypts the AES-256-GCM payload using PBKDF2-HMAC-SHA256 key derivation.
     * @param ciphertextBase64 The base64 encoded ciphertext (e.g. from `cin` or `mao`)
     * @param saltHex The salt provided in the response (assumed hex or base64? Usually hex if it's salt. Let's decode as hex).
     */
    fun decryptGCM(ciphertextBase64: String, saltHex: String): String {
        try {
            val saltBytes = saltHex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
            
            // PBKDF2 with 100,000 iterations, 256-bit (32 byte) key
            val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val spec: KeySpec = PBEKeySpec(PBKDF2_PASSWORD.toCharArray(), saltBytes, 100000, 256)
            val secretKeyBytes = factory.generateSecret(spec).encoded
            val secretKey = SecretKeySpec(secretKeyBytes, "AES")

            val cipherTextWithIv = Base64.decode(ciphertextBase64, Base64.DEFAULT)
            // GCM typical IV size is 12 bytes. Assuming the IV is prepended to the ciphertext.
            val iv = cipherTextWithIv.copyOfRange(0, 12)
            val encryptedBytes = cipherTextWithIv.copyOfRange(12, cipherTextWithIv.size)

            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val gcmSpec = GCMParameterSpec(128, iv) // 128 bit auth tag
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)

            val decryptedBytes = cipher.doFinal(encryptedBytes)
            return String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            e.printStackTrace()
            return "{}"
        }
    }
}
