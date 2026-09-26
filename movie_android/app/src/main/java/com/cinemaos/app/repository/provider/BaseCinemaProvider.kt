package com.cinemaos.app.repository.provider

import com.cinemaos.app.core.security.EncryptionUtils
import com.cinemaos.app.domain.models.Movie
import com.cinemaos.app.domain.models.StreamSource
import com.cinemaos.app.domain.models.Subtitle
import com.cinemaos.app.domain.models.SubtitleType
import com.cinemaos.app.network.CinemaApi
import com.cinemaos.app.network.models.MovieNetworkDto
import com.cinemaos.app.network.models.ScrapedSourcesDto
import com.cinemaos.app.network.models.StreamSourceNetworkDto
import com.cinemaos.app.network.models.SubtitleNetworkDto
import kotlinx.serialization.json.Json

/**
 * Abstract base implementation of [Provider].
 *
 * Provides all the heavy lifting: secret generation, API calls, response
 * decryption, and domain model mapping.
 *
 * Concrete provider subclasses only need to supply their own [name],
 * and can override behaviours if a specific provider has unique quirks.
 *
 * The UI layer NEVER touches this class.
 */
abstract class BaseCinemaProvider(
    private val api: CinemaApi,
    private val json: Json
) : Provider {

    override suspend fun search(query: String, page: Int): List<Movie> {
        val response = api.searchMedia(query, page)
        return if (response.success && response.data != null) {
            response.data.map { it.toDomain() }
        } else {
            emptyList()
        }
    }

    override suspend fun getMovie(id: String): Movie? {
        val response = api.getMovieDetails(id)
        return if (response.success && response.data != null) {
            response.data.toDomain()
        } else {
            null
        }
    }

    override suspend fun getSources(mediaId: String): List<StreamSource> {
        // Build content string for the HMAC secret
        val contentString = EncryptionUtils.buildContentString(
            tmdbId = mediaId,
            imdbId = null,
            seasonId = null,
            episodeId = null
        )

        // Generate the HMAC-SHA256 based request secret
        val secret = EncryptionUtils.generateRequestSecret(contentString)

        // Call the scrape endpoint — the only place Retrofit is used for sources
        val response = api.scrapeSources(
            type = "movie",
            tmdbId = mediaId,
            imdbId = null,
            title = null,
            releaseYear = null,
            seasonId = null,
            episodeId = null,
            secret = secret,
            gt = "true",
            scraper = "default"
        )

        // Decrypt if needed
        val jsonString = if (response.encrypted && response.salt != null) {
            val ciphertext = response.cin ?: response.mao ?: return emptyList()
            decryptResponse(ciphertext, response.salt)
        } else {
            return emptyList()
        }

        // Parse and map to domain models
        val dto = json.decodeFromString<ScrapedSourcesDto>(jsonString)
        return dto.sources.map { it.toDomain() }
    }

    override suspend fun decryptResponse(encryptedData: String, salt: String): String {
        return EncryptionUtils.decryptGCM(encryptedData, salt)
    }

    // ───── Mapping helpers ─────────────────────────────────────────────────

    protected fun MovieNetworkDto.toDomain() = Movie(
        id = id,
        title = title,
        posterUrl = posterUrl,
        backdropUrl = backdropUrl,
        overview = overview,
        releaseDate = releaseDate,
        voteAverage = voteAverage,
        runtime = runtime,
        genres = genres ?: emptyList(),
        director = director,
        cast = cast ?: emptyList()
    )

    protected fun StreamSourceNetworkDto.toDomain() = StreamSource(
        serverName = serverName,
        url = url,
        quality = quality,
        language = language,
        isHls = isHls,
        subtitles = subtitles.map { it.toDomain() }
    )

    protected fun SubtitleNetworkDto.toDomain() = Subtitle(
        language = language,
        url = url,
        type = when (type.lowercase()) {
            "vtt" -> SubtitleType.VTT
            "srt" -> SubtitleType.SRT
            "ass" -> SubtitleType.ASS
            else  -> SubtitleType.UNKNOWN
        }
    )
}
