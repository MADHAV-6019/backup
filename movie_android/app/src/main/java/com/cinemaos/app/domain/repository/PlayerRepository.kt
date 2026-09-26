package com.cinemaos.app.domain.repository

import com.cinemaos.app.core.utils.Resource
import com.cinemaos.app.domain.models.StreamSource
import kotlinx.coroutines.flow.Flow

interface PlayerRepository {
    fun getStreamSources(mediaId: String): Flow<Resource<List<StreamSource>>>
}
