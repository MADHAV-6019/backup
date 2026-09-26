package com.cinemaos.app.network

import com.cinemaos.app.network.models.BaseNetworkResponse
import com.cinemaos.app.network.models.MovieNetworkDto
import com.cinemaos.app.network.models.ScrapeResponseDto
import com.cinemaos.app.network.models.StreamSourceNetworkDto
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface CinemaApi {
    @GET("v1/movies/trending")
    suspend fun getTrendingMovies(
        @Query("page") page: Int
    ): BaseNetworkResponse<List<MovieNetworkDto>>

    @GET("v1/movies/popular")
    suspend fun getPopularMovies(
        @Query("page") page: Int
    ): BaseNetworkResponse<List<MovieNetworkDto>>

    @GET("v1/search")
    suspend fun searchMedia(
        @Query("query") query: String,
        @Query("page") page: Int
    ): BaseNetworkResponse<List<MovieNetworkDto>>

    @GET("v1/movies/{id}")
    suspend fun getMovieDetails(
        @Path("id") id: String
    ): BaseNetworkResponse<MovieNetworkDto>

    @GET("v1/movies/{id}/streams")
    suspend fun getMovieStreams(
        @Path("id") id: String
    ): BaseNetworkResponse<List<StreamSourceNetworkDto>>

    @GET("/api/providerv4/scrape")
    suspend fun scrapeSources(
        @Query("type") type: String, // "movie" or "tv"
        @Query("tmdbId") tmdbId: String?,
        @Query("imdbId") imdbId: String?,
        @Query("title") title: String?,
        @Query("releaseYear") releaseYear: String?,
        @Query("seasonId") seasonId: String?,
        @Query("episodeId") episodeId: String?,
        @Query("secret") secret: String,
        @Query("_gt") gt: String,
        @Query("scraper") scraper: String
    ): ScrapeResponseDto
}
