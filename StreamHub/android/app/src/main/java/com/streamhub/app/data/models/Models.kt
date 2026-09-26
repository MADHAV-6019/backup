package com.streamhub.app.data.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class MediaItem(
    val id: Int,
    val tmdbId: String,
    val title: String,
    val image: String,
    val rating: Double,
    val releaseDate: String,
    val type: String, // "movie" or "tv"
    val description: String,
    val genres: List<String>
) : Parcelable

@Parcelize
data class StreamSource(
    val url: String,
    val quality: String,
    val isM3U8: Boolean
) : Parcelable

@Parcelize
data class Episode(
    val id: String,
    val title: String,
    val episodeNumber: Int,
    val seasonNumber: Int,
    val image: String,
    val overview: String
) : Parcelable
