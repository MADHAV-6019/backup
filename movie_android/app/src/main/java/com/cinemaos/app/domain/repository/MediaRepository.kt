package com.cinemaos.app.domain.repository

import com.cinemaos.app.core.utils.Resource
import com.cinemaos.app.domain.models.Movie
import kotlinx.coroutines.flow.Flow

interface MediaRepository {
    fun getTrendingMovies(page: Int): Flow<Resource<List<Movie>>>
    fun getPopularMovies(page: Int): Flow<Resource<List<Movie>>>
    fun searchMedia(query: String, page: Int): Flow<Resource<List<Movie>>>
    fun getMovieDetails(id: String): Flow<Resource<Movie>>
}
