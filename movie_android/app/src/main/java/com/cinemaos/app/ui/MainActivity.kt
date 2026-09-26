package com.cinemaos.app.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import com.cinemaos.app.ui.navigation.CinemaOSNavGraph
import com.cinemaos.app.ui.theme.CinemaOSTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CinemaOSTheme {
                val navController = rememberNavController()
                CinemaOSNavGraph(navController = navController)
            }
        }
    }
}
