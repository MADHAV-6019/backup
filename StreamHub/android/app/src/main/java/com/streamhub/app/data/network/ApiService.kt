package com.streamhub.app.data.network

import com.streamhub.app.data.network.responses.EpisodeData
import com.streamhub.app.data.network.responses.StreamResponse
import com.streamhub.app.data.network.responses.TmdbInfoResponse
import com.streamhub.app.data.network.responses.TmdbSearchResponse
import com.streamhub.app.data.network.responses.TrendingResponse
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    @GET("meta/tmdb/{query}")
    suspend fun search(
        @Path("query") query: String,
        @Query("page") page: Int = 1
    ): TmdbSearchResponse

    @GET("meta/tmdb/trending")
    suspend fun getTrending(
        @Query("page") page: Int = 1
    ): TrendingResponse

    @GET("meta/tmdb/info/{id}")
    suspend fun getMediaInfo(
        @Path("id") id: String,
        @Query("type") type: String
    ): TmdbInfoResponse

    @GET("meta/tmdb/episodes/{id}")
    suspend fun getEpisodes(
        @Path("id") id: String,
        @Query("season") season: Int
    ): List<EpisodeData>

    @GET("movies/flixhq/watch")
    suspend fun getStreamingLinks(
        @Query("episodeId") episodeId: String,
        @Query("mediaId") mediaId: String
    ): StreamResponse

    @GET("movies/fmovies/watch")
    suspend fun getStreamingLinksFmovies(
        @Query("episodeId") episodeId: String,
        @Query("mediaId") mediaId: String
    ): StreamResponse
}
