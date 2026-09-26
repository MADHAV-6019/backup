package com.cinemaos.app.domain.models

data class StreamSource(
    val serverName: String,
    val url: String,
    val quality: String, // "1080p", "720p", "Auto"
    val language: String,
    val isHls: Boolean,
    val subtitles: List<Subtitle> = emptyList()
)

data class Subtitle(
    val language: String,
    val url: String,
    val type: SubtitleType
)

enum class SubtitleType {
    VTT, SRT, ASS, UNKNOWN
}
