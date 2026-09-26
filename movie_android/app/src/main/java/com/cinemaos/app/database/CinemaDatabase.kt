package com.cinemaos.app.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.cinemaos.app.database.dao.ContinueWatchingDao
import com.cinemaos.app.database.entity.ContinueWatchingEntity

@Database(entities = [ContinueWatchingEntity::class], version = 1, exportSchema = false)
abstract class CinemaDatabase : RoomDatabase() {
    abstract fun continueWatchingDao(): ContinueWatchingDao
}
