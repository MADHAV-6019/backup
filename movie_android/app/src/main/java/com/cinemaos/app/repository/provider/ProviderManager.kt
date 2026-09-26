package com.cinemaos.app.repository.provider

import com.cinemaos.app.domain.models.Movie
import com.cinemaos.app.domain.models.StreamSource
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages all registered [Provider] instances.
 *
 * Responsibilities:
 * - Maintains the ordered list of providers.
 * - Exposes a single orchestration entry point used by the Repository layer.
 * - Handles provider failover: if the primary provider returns no sources,
 *   it tries the next provider in the list automatically.
 *
 * Usage contract:
 * ViewModel -> Repository -> ProviderManager -> Provider -> CinemaApi
 *
 * The UI never touches ProviderManager directly.
 */
@Singleton
class ProviderManager @Inject constructor(
    private val defaultProvider: DefaultCinemaProvider
) {
    /**
     * Ordered list of providers.
     * The first provider is tried first. If it fails, the next is used.
     * Add new providers here as they are registered.
     */
    private val providers: List<Provider> = listOf(defaultProvider)

    /**
     * Returns the active provider (first in priority order).
     */
    fun getActiveProvider(): Provider = providers.first()

    /**
     * Returns all registered providers.
     */
    fun getProviders(): List<Provider> = providers

    /**
     * Search across the active provider.
     */
    suspend fun search(query: String, page: Int): List<Movie> {
        return getActiveProvider().search(query, page)
    }

    /**
     * Fetch full movie/show details through the active provider.
     */
    suspend fun getMovie(id: String): Movie? {
        return getActiveProvider().getMovie(id)
    }

    /**
     * Fetch streaming sources with automatic provider failover.
     *
     * If the primary provider returns an empty list (or throws), the next
     * registered provider is tried automatically. If all fail, an empty
     * list is returned and the Repository emits a Resource.Error.
     */
    suspend fun getSources(mediaId: String): List<StreamSource> {
        for (provider in providers) {
            try {
                val sources = provider.getSources(mediaId)
                if (sources.isNotEmpty()) return sources
            } catch (e: Exception) {
                e.printStackTrace()
                // Log the failure and attempt the next provider
            }
        }
        return emptyList()
    }
}
