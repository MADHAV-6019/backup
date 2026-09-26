package com.cinemaos.app.viewmodels

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cinemaos.app.core.utils.Resource
import com.cinemaos.app.database.dao.ContinueWatchingDao
import com.cinemaos.app.database.entity.ContinueWatchingEntity
import com.cinemaos.app.domain.models.StreamSource
import com.cinemaos.app.domain.repository.PlayerRepository
import com.cinemaos.app.player.PlayerManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val isLoading: Boolean = false,
    val sources: List<StreamSource> = emptyList(),
    val activeSource: StreamSource? = null,
    val error: String? = null
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val repository: PlayerRepository,
    private val continueWatchingDao: ContinueWatchingDao,
    val playerManager: PlayerManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val mediaId: String = checkNotNull(savedStateHandle["mediaId"])
    
    // Assume title and poster are passed or fetched; defaulting for now
    private val mediaTitle = "Movie" 
    private val mediaPosterUrl = ""

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()
    
    private var saveProgressJob: Job? = null
    private var lastKnownPosition: Long = 0L

    init {
        setupPlayerErrorListener()
        loadSources()
    }

    private fun setupPlayerErrorListener() {
        playerManager.onErrorCallback = { error ->
            // Fallback Logic
            val currentSources = _uiState.value.sources
            val currentActive = _uiState.value.activeSource
            
            val currentIndex = currentSources.indexOf(currentActive)
            if (currentIndex != -1 && currentIndex < currentSources.size - 1) {
                // Switch to next available server automatically
                val nextSource = currentSources[currentIndex + 1]
                lastKnownPosition = playerManager.currentPosition.value // capture before switch
                switchSource(nextSource, lastKnownPosition)
            } else {
                _uiState.value = _uiState.value.copy(error = "Playback failed and no fallback servers available: ${error.message}")
            }
        }
    }

    private fun loadSources() {
        viewModelScope.launch {
            // First check continue watching
            val cwEntity = continueWatchingDao.getByMediaId(mediaId)
            val startPosition = cwEntity?.currentPositionMs ?: 0L
            lastKnownPosition = startPosition

            repository.getStreamSources(mediaId).collect { resource ->
                when (resource) {
                    is Resource.Loading -> {
                        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                    }
                    is Resource.Success -> {
                        val sources = resource.data ?: emptyList()
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            sources = sources,
                            activeSource = sources.firstOrNull()
                        )
                        // Trigger play on first source
                        sources.firstOrNull()?.let { 
                            // Playback triggers in PlayerScreen, but if we do it here:
                            // we'll just let UI react to activeSource change.
                        }
                    }
                    is Resource.Error -> {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = resource.message
                        )
                    }
                }
            }
        }
    }
    
    fun switchSource(source: StreamSource, startPosition: Long = 0L) {
        _uiState.value = _uiState.value.copy(activeSource = source)
        playerManager.playMedia(source.url, startPosition)
    }

    fun startProgressTracking() {
        saveProgressJob?.cancel()
        saveProgressJob = viewModelScope.launch {
            while (true) {
                playerManager.updateProgress()
                
                val currentPos = playerManager.currentPosition.value
                val duration = playerManager.duration.value
                
                if (currentPos > 0 && duration > 0) {
                    lastKnownPosition = currentPos
                    continueWatchingDao.insertOrUpdate(
                        ContinueWatchingEntity(
                            mediaId = mediaId,
                            title = mediaTitle,
                            posterUrl = mediaPosterUrl,
                            isTvShow = false,
                            currentPositionMs = currentPos,
                            durationMs = duration,
                            lastWatchedTimestamp = System.currentTimeMillis()
                        )
                    )
                }
                delay(5000) // Save every 5 seconds
            }
        }
    }
    
    fun stopProgressTracking() {
        saveProgressJob?.cancel()
    }
    
    override fun onCleared() {
        super.onCleared()
        stopProgressTracking()
    }
}
