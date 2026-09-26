package com.cinemaos.app.player

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.os.Build
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.media3.ui.PlayerView
import com.cinemaos.app.player.components.PlayerControls
import com.cinemaos.app.viewmodels.PlayerViewModel

@Composable
fun PlayerScreen(
    url: String, // Kept for backwards compatibility but ViewModel handles sources now
    viewModel: PlayerViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val playerManager = viewModel.playerManager
    val exoPlayer = remember { playerManager.initializePlayer(context) }
    
    val uiState by viewModel.uiState.collectAsState()
    val isPlaying by playerManager.isPlaying.collectAsState()
    val currentPosition by playerManager.currentPosition.collectAsState()
    val duration by playerManager.duration.collectAsState()
    
    var showControls by remember { mutableStateOf(true) }

    DisposableEffect(lifecycleOwner) {
        val activity = context as? ComponentActivity
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> {
                    viewModel.startProgressTracking()
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val params = PictureInPictureParams.Builder()
                            .setAspectRatio(Rational(16, 9))
                            .build()
                        activity?.setPictureInPictureParams(params)
                    }
                }
                Lifecycle.Event.ON_STOP -> {
                    viewModel.stopProgressTracking()
                }
                else -> {}
            }
        }
        
        lifecycleOwner.lifecycle.addObserver(observer)

        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            playerManager.release()
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = false
                }
            },
            modifier = Modifier
                .fillMaxSize()
                .clickable { showControls = !showControls }
        )

        if (showControls) {
            PlayerControls(
                isPlaying = isPlaying,
                currentPosition = currentPosition,
                duration = duration,
                onPlayPauseToggle = {
                    if (isPlaying) playerManager.pause() else playerManager.resume()
                },
                onSeek = { pos -> playerManager.seekTo(pos) },
                onNextEpisode = {
                    // Logic to skip to next episode
                },
                onSettingsClick = {
                    // Logic to show TrackSelectionDialog for quality/subs/audio
                }
            )
        }
    }
}
