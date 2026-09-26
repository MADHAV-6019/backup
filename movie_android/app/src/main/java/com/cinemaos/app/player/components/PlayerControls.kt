package com.cinemaos.app.player.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp

@Composable
fun PlayerControls(
    isPlaying: Boolean,
    currentPosition: Long,
    duration: Long,
    onPlayPauseToggle: () -> Unit,
    onSeek: (Long) -> Unit,
    onNextEpisode: () -> Unit,
    onSettingsClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var dragAmount by remember { mutableStateOf(0f) }
    var seekingPosition by remember { mutableStateOf<Long?>(null) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { dragAmount = 0f },
                    onDragEnd = { 
                        seekingPosition?.let { onSeek(it) }
                        seekingPosition = null 
                    }
                ) { change, dragAmountChange ->
                    change.consume()
                    // Horizontal drag for seeking
                    if (duration > 0) {
                        dragAmount += dragAmountChange.x
                        val seekRatio = dragAmount / size.width
                        val seekMs = (duration * seekRatio).toLong()
                        seekingPosition = (currentPosition + seekMs).coerceIn(0, duration)
                    }
                }
            }
    ) {
        // Top right settings
        IconButton(
            onClick = onSettingsClick,
            modifier = Modifier.align(Alignment.TopEnd).padding(16.dp)
        ) {
            Text("SET", color = Color.White)
        }

        // Center Controls
        Row(
            modifier = Modifier.align(Alignment.Center),
            horizontalArrangement = Arrangement.spacedBy(32.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onPlayPauseToggle) {
                Text(
                    text = if (isPlaying) "PAUSE" else "PLAY",
                    color = Color.White,
                    style = MaterialTheme.typography.titleLarge
                )
            }
            
            IconButton(onClick = onNextEpisode) {
                Text(text = "NEXT", color = Color.White)
            }
        }
        
        // Bottom Progress Bar
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            val displayPos = seekingPosition ?: currentPosition
            val progress = if (duration > 0) displayPos.toFloat() / duration else 0f
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = formatTime(displayPos), color = Color.White)
                Text(text = formatTime(duration), color = Color.White)
            }
            
            Slider(
                value = progress,
                onValueChange = { 
                    val newPos = (it * duration).toLong()
                    onSeek(newPos) 
                },
                modifier = Modifier.fillMaxWidth(),
                colors = SliderDefaults.colors(
                    thumbColor = MaterialTheme.colorScheme.primary,
                    activeTrackColor = MaterialTheme.colorScheme.primary
                )
            )
        }
        
        // Display seek overlay if actively seeking
        if (seekingPosition != null) {
            Text(
                text = formatTime(seekingPosition!!),
                color = Color.White,
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.align(Alignment.TopCenter).padding(top = 32.dp)
            )
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%02d:%02d", minutes, seconds)
}
