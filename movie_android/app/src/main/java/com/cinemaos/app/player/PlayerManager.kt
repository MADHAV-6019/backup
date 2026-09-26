package com.cinemaos.app.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionParameters
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PlayerManager @Inject constructor() {
    
    private var exoPlayer: ExoPlayer? = null
    
    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()
    
    private val _playbackState = MutableStateFlow(Player.STATE_IDLE)
    val playbackState: StateFlow<Int> = _playbackState.asStateFlow()

    private val _currentPosition = MutableStateFlow(0L)
    val currentPosition: StateFlow<Long> = _currentPosition.asStateFlow()

    private val _duration = MutableStateFlow(0L)
    val duration: StateFlow<Long> = _duration.asStateFlow()

    var onErrorCallback: ((PlaybackException) -> Unit)? = null

    fun initializePlayer(context: Context): ExoPlayer {
        if (exoPlayer == null) {
            // Buffer tuning
            val loadControl = DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    32000, // min buffer
                    64000, // max buffer
                    2500,  // buffer for playback
                    5000   // buffer for playback after rebuffer
                )
                .build()

            exoPlayer = ExoPlayer.Builder(context)
                .setLoadControl(loadControl)
                .build().apply {
                    addListener(object : Player.Listener {
                        override fun onIsPlayingChanged(isPlaying: Boolean) {
                            _isPlaying.value = isPlaying
                        }

                        override fun onPlaybackStateChanged(playbackState: Int) {
                            _playbackState.value = playbackState
                        }

                        override fun onPlayerError(error: PlaybackException) {
                            onErrorCallback?.invoke(error)
                        }
                    })
                }
        }
        return exoPlayer!!
    }

    fun playMedia(url: String, startPosition: Long = 0L) {
        val player = exoPlayer ?: return
        
        val mediaItemBuilder = MediaItem.Builder().setUri(url)
            
        // Stream Type Detection
        when {
            url.contains(".m3u8", ignoreCase = true) -> mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
            url.contains(".mpd", ignoreCase = true) -> mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_MPD)
            url.contains(".mp4", ignoreCase = true) -> mediaItemBuilder.setMimeType(MimeTypes.APPLICATION_MP4)
        }
        
        player.setMediaItem(mediaItemBuilder.build(), startPosition)
        player.prepare()
        player.playWhenReady = true
    }

    fun updateProgress() {
        val player = exoPlayer ?: return
        _currentPosition.value = player.currentPosition
        _duration.value = player.duration
    }
    
    fun seekTo(position: Long) {
        exoPlayer?.seekTo(position)
    }

    fun pause() {
        exoPlayer?.pause()
    }

    fun resume() {
        exoPlayer?.play()
    }

    fun setPlaybackSpeed(speed: Float) {
        exoPlayer?.playbackParameters = PlaybackParameters(speed)
    }

    // A simple track override - in a real app you'd map C.TRACK_TYPE_VIDEO/AUDIO to TrackGroup indices
    fun setTrackSelectionParameters(params: TrackSelectionParameters) {
        exoPlayer?.trackSelectionParameters = params
    }
    
    fun getTrackSelectionParameters(): TrackSelectionParameters? {
        return exoPlayer?.trackSelectionParameters
    }

    fun release() {
        exoPlayer?.release()
        exoPlayer = null
    }
}
