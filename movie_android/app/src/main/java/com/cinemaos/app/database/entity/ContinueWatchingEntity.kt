package com.cinemaos.app.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "continue_watching")
data class ContinueWatchingEntity(
    @PrimaryKey
    val mediaId: String,
    val title: String,
    val posterUrl: String,
    val isTvShow: Boolean,
    val seasonNumber: Int? = null,
    val episodeNumber: Int? = null,
    val currentPositionMs: Long,
    val durationMs: Long,
    val lastWatchedTimestamp: Long
)
