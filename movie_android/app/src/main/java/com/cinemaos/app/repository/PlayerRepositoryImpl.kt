package com.cinemaos.app.repository

import com.cinemaos.app.core.utils.Resource
import com.cinemaos.app.domain.models.StreamSource
import com.cinemaos.app.domain.repository.PlayerRepository
import com.cinemaos.app.repository.provider.ProviderManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlayerRepositoryImpl @Inject constructor(
    private val providerManager: ProviderManager
) : PlayerRepository {

    override fun getStreamSources(mediaId: String): Flow<Resource<List<StreamSource>>> = flow {
        emit(Resource.Loading())
        try {
            // ProviderManager handles the failover logic across all registered providers
            val sources = providerManager.getSources(mediaId)
            
            if (sources.isNotEmpty()) {
                emit(Resource.Success(sources))
            } else {
                emit(Resource.Error("No streaming sources found across any provider."))
            }
        } catch (e: Exception) {
            e.printStackTrace()
            emit(Resource.Error(e.localizedMessage ?: "Failed to fetch stream sources"))
        }
    }
}
