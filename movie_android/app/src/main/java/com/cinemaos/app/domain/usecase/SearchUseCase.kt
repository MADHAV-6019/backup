package com.cinemaos.app.domain.usecase

import com.cinemaos.app.core.utils.Resource
import com.cinemaos.app.domain.models.Movie
import com.cinemaos.app.domain.repository.MediaRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class SearchUseCase @Inject constructor(
    private val repository: MediaRepository
) {
    operator fun invoke(query: String, page: Int): Flow<Resource<List<Movie>>> {
        return repository.searchMedia(query, page)
    }
}
