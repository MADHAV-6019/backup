package com.cinemaos.app.domain.models

data class TvShow(
    val id: String,
    val title: String,
    val posterUrl: String,
    val backdropUrl: String,
    val overview: String,
    val firstAirDate: String,
    val voteAverage: Double,
    val genres: List<String> = emptyList(),
    val seasons: List<Season> = emptyList()
)

data class Season(
    val seasonNumber: Int,
    val name: String,
    val episodeCount: Int,
    val episodes: List<Episode> = emptyList()
)

data class Episode(
    val id: String,
    val name: String,
    val episodeNumber: Int,
    val seasonNumber: Int,
    val overview: String,
    val stillUrl: String
)
