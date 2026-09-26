package com.streamhub.app.data.network.responses

import com.google.gson.annotations.SerializedName

data class TmdbSearchResponse(
    @SerializedName("results") val results: List<TmdbSearchResult>
)

data class TrendingResponse(
    @SerializedName("results") val results: List<TmdbSearchResult>
)

data class TmdbSearchResult(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("image") val image: String?,
    @SerializedName("rating") val rating: Double?,
    @SerializedName("releaseDate") val releaseDate: String?,
    @SerializedName("type") val type: String?
)

data class TmdbInfoResponse(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("image") val image: String?,
    @SerializedName("cover") val cover: String?,
    @SerializedName("rating") val rating: Double?,
    @SerializedName("releaseDate") val releaseDate: String?,
    @SerializedName("description") val description: String?,
    @SerializedName("genres") val genres: List<String>?,
    @SerializedName("episodes") val episodes: List<EpisodeData>?,
    @SerializedName("seasons") val seasons: List<SeasonData>?
)

data class SeasonData(
    @SerializedName("season") val season: Int,
    @SerializedName("title") val title: String?,
    @SerializedName("image") val image: String?,
    @SerializedName("episodes") val episodes: List<EpisodeData>?
)

data class EpisodeData(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("episode") val episode: Int,
    @SerializedName("season") val season: Int?,
    @SerializedName("image") val image: String?,
    @SerializedName("description") val description: String?
)

data class StreamResponse(
    @SerializedName("sources") val sources: List<SourceData>?,
    @SerializedName("subtitles") val subtitles: List<SubtitleData>?,
    @SerializedName("download") val download: String?
)

data class SourceData(
    @SerializedName("url") val url: String,
    @SerializedName("quality") val quality: String?,
    @SerializedName("isM3U8") val isM3U8: Boolean?
)

data class SubtitleData(
    @SerializedName("url") val url: String,
    @SerializedName("lang") val lang: String?
)
