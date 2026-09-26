package com.cinemaos.app.network.models

import kotlinx.serialization.Serializable

@Serializable
data class BaseNetworkResponse<T>(
    val success: Boolean,
    val data: T?,
    val message: String?
)

@Serializable
data class MovieNetworkDto(
    val id: String,
    val title: String,
    val posterUrl: String,
    val backdropUrl: String,
    val overview: String,
    val releaseDate: String,
    val voteAverage: Double,
    val runtime: Int? = null,
    val genres: List<String>? = null,
    val director: String? = null,
    val cast: List<String>? = null
)

@Serializable
data class StreamSourceNetworkDto(
    val serverName: String,
    val url: String,
    val quality: String,
    val language: String,
    val isHls: Boolean = true,
    val subtitles: List<SubtitleNetworkDto> = emptyList()
)

@Serializable
data class SubtitleNetworkDto(
    val language: String,
    val url: String,
    val type: String // "vtt", "srt"
)

@Serializable
data class ScrapeResponseDto(
    val encrypted: Boolean,
    val cin: String? = null,
    val mao: String? = null,
    val salt: String? = null,
    val version: String? = null
)

@Serializable
data class ScrapedSourcesDto(
    val sources: List<StreamSourceNetworkDto>
)
