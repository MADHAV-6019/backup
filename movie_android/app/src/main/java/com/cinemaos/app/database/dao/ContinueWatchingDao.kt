package com.cinemaos.app.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.cinemaos.app.database.entity.ContinueWatchingEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ContinueWatchingDao {
    @Query("SELECT * FROM continue_watching ORDER BY lastWatchedTimestamp DESC")
    fun getAllContinueWatching(): Flow<List<ContinueWatchingEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(entity: ContinueWatchingEntity)

    @Query("DELETE FROM continue_watching WHERE mediaId = :mediaId")
    suspend fun deleteByMediaId(mediaId: String)
    
    @Query("SELECT * FROM continue_watching WHERE mediaId = :mediaId LIMIT 1")
    suspend fun getByMediaId(mediaId: String): ContinueWatchingEntity?
}
