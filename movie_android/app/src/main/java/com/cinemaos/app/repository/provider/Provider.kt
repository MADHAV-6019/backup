package com.cinemaos.app.repository.provider

import com.cinemaos.app.domain.models.Movie
import com.cinemaos.app.domain.models.StreamSource
import com.cinemaos.app.domain.models.Subtitle

/**
 * Base contract for all streaming providers.
 * Every provider must implement this interface.
 * The UI layer must never see this interface directly.
 * Access is strictly through ProviderManager -> Repository.
 */
interface Provider {
    val name: String

    /**
     * Search for movies/TV shows by query and page number.
     */
    suspend fun search(query: String, page: Int): List<Movie>

    /**
     * Fetch the full detail of a single media item by its ID.
     */
    suspend fun getMovie(id: String): Movie?

    /**
     * Fetch available stream sources for a given media ID.
     * Internally handles secret generation and the scrape API call.
     */
    suspend fun getSources(mediaId: String): List<StreamSource>

    /**
     * Decrypt a raw encrypted payload from the provider's API.
     * @param encryptedData Base64 encoded ciphertext (cin or mao field)
     * @param salt Hex-encoded salt used for PBKDF2 key derivation
     * @return Decrypted JSON string
     */
    suspend fun decryptResponse(encryptedData: String, salt: String): String
}
