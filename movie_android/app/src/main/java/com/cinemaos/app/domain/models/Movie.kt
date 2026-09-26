package com.cinemaos.app.domain.models

data class Movie(
    val id: String,
    val title: String,
    val posterUrl: String,
    val backdropUrl: String,
    val overview: String,
    val releaseDate: String,
    val voteAverage: Double,
    val runtime: Int? = null,
    val genres: List<String> = emptyList(),
    val director: String? = null,
    val cast: List<String> = emptyList()
)
