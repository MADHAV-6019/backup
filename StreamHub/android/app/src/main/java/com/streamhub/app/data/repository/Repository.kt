package com.streamhub.app.data.repository

import com.streamhub.app.data.models.Episode
import com.streamhub.app.data.models.MediaItem
import com.streamhub.app.data.models.StreamSource
import com.streamhub.app.data.network.ApiService
import com.streamhub.app.data.network.responses.TmdbInfoResponse
import com.streamhub.app.data.network.responses.TmdbSearchResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Locale

class Repository(private val apiService: ApiService) {

    suspend fun search(query: String, page: Int = 1): List<MediaItem> = withContext(Dispatchers.IO) {
        val response = apiService.search(query, page)
        response.results.mapNotNull { it.toMediaItem() }
    }

    suspend fun getTrending(page: Int = 1): List<MediaItem> = withContext(Dispatchers.IO) {
        val response = apiService.getTrending(page)
        response.results.mapNotNull { it.toMediaItem() }
    }

    suspend fun getMediaInfo(tmdbId: String, type: String): TmdbInfoResponse? = withContext(Dispatchers.IO) {
        try {
            apiService.getMediaInfo(tmdbId, type)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun getEpisodes(tmdbId: String, season: Int): List<Episode> = withContext(Dispatchers.IO) {
        try {
            val episodes = apiService.getEpisodes(tmdbId, season)
            episodes.map {
                Episode(
                    id = it.id,
                    title = it.title,
                    episodeNumber = it.episode,
                    seasonNumber = it.season ?: season,
                    image = it.image ?: "",
                    overview = it.description ?: ""
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    suspend fun getStreamingUrls(episodeId: String, mediaId: String): List<StreamSource> = withContext(Dispatchers.IO) {
        try {
            // Fallback strategy: Try FlixHQ first
            val response = try {
                apiService.getStreamingLinks(episodeId, mediaId)
            } catch (e: Exception) {
                // If FlixHQ fails, try Fmovies
                apiService.getStreamingLinksFmovies(episodeId, mediaId)
            }
            
            response.sources?.map {
                StreamSource(
                    url = it.url,
                    quality = it.quality ?: "auto",
                    isM3U8 = it.isM3U8 ?: it.url.contains(".m3u8")
                )
            } ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    fun buildEpisodeId(title: String, tmdbId: String, type: String, season: Int = 1, episode: Int = 1): String {
        // Slug = lowercase, remove special chars, replace spaces with hyphens
        val slug = title.lowercase(Locale.ROOT)
            .replace(Regex("[^a-z0-9 ]"), "")
            .trim()
            .replace(Regex("\\s+"), "-")

        return if (type == "movie") {
            "movie/watch-$slug-$tmdbId"
        } else {
            "tv/watch-$slug-$tmdbId/season-$season/episode-$episode"
        }
    }

    private fun TmdbSearchResult.toMediaItem(): MediaItem? {
        if (id.isBlank() || title.isBlank() || type.isNullOrBlank()) return null
        
        return MediaItem(
            id = id.hashCode(), // Generate an Int id since tmdbId is String in the API but Int in MediaItem as per spec, wait, spec says: id:Int, tmdbId:String
            tmdbId = id,
            title = title,
            image = image ?: "",
            rating = rating ?: 0.0,
            releaseDate = releaseDate ?: "",
            type = type.lowercase(Locale.ROOT),
            description = "",
            genres = emptyList()
        )
    }
}
