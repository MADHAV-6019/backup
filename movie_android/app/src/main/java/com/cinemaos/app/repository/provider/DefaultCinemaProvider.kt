package com.cinemaos.app.repository.provider

import com.cinemaos.app.network.CinemaApi
import kotlinx.serialization.json.Json
import javax.inject.Inject

/**
 * The default concrete implementation of [BaseCinemaProvider].
 *
 * Extend this class or create a new [BaseCinemaProvider] subclass to
 * register additional providers (e.g., a different scraping backend).
 *
 * Registered via [ProviderManager].
 */
class DefaultCinemaProvider @Inject constructor(
    api: CinemaApi,
    json: Json
) : BaseCinemaProvider(api, json) {

    override val name: String = "CinemaOS Default"
}
