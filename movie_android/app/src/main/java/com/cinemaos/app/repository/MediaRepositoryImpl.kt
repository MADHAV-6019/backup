package com.cinemaos.app.repository

import com.cinemaos.app.core.utils.Resource
import com.cinemaos.app.domain.models.Movie
import com.cinemaos.app.domain.repository.MediaRepository
import com.cinemaos.app.repository.provider.ProviderManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaRepositoryImpl @Inject constructor(
    private val providerManager: ProviderManager
) : MediaRepository {

    override fun getTrendingMovies(page: Int): Flow<Resource<List<Movie>>> = flow {
        emit(Resource.Loading())
        try {
            // Note: Since 'trending' isn't explicitly in the new Provider interface,
            // we'll map it to a generic search for demonstration, or you could add getTrending() to Provider.
            val movies = providerManager.search("trending", page)
            emit(Resource.Success(movies))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Failed to fetch trending movies"))
        }
    }

    override fun getPopularMovies(page: Int): Flow<Resource<List<Movie>>> = flow {
        emit(Resource.Loading())
        try {
            val movies = providerManager.search("popular", page)
            emit(Resource.Success(movies))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Failed to fetch popular movies"))
        }
    }

    override fun searchMedia(query: String, page: Int): Flow<Resource<List<Movie>>> = flow {
        emit(Resource.Loading())
        try {
            val movies = providerManager.search(query, page)
            emit(Resource.Success(movies))
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Search failed"))
        }
    }

    override fun getMovieDetails(id: String): Flow<Resource<Movie>> = flow {
        emit(Resource.Loading())
        try {
            val movie = providerManager.getMovie(id)
            if (movie != null) {
                emit(Resource.Success(movie))
            } else {
                emit(Resource.Error("Movie not found"))
            }
        } catch (e: Exception) {
            emit(Resource.Error(e.localizedMessage ?: "Failed to fetch movie details"))
        }
    }
}
