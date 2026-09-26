package com.cinemaos.app.database.di

import android.content.Context
import androidx.room.Room
import com.cinemaos.app.database.CinemaDatabase
import com.cinemaos.app.database.dao.ContinueWatchingDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideCinemaDatabase(@ApplicationContext context: Context): CinemaDatabase {
        return Room.databaseBuilder(
            context,
            CinemaDatabase::class.java,
            "cinema_os_db"
        ).build()
    }

    @Provides
    fun provideContinueWatchingDao(database: CinemaDatabase): ContinueWatchingDao {
        return database.continueWatchingDao()
    }
}
