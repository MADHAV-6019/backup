package com.cinemaos.app.ui.theme

import androidx.compose.ui.graphics.Color

val PrimaryRed = Color(0xFFE50914)
val BackgroundDark = Color(0xFF141414)
val SurfaceDark = Color(0xFF1F1F1F)
val TextPrimary = Color(0xFFFFFFFF)
val TextSecondary = Color(0xFFB3B3B3)

// Dark Color Scheme
val DarkColors = androidx.compose.material3.darkColorScheme(
    primary = PrimaryRed,
    background = BackgroundDark,
    surface = SurfaceDark,
    onPrimary = TextPrimary,
    onBackground = TextPrimary,
    onSurface = TextSecondary
)
