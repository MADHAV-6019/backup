package com.cinemaos.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.cinemaos.app.player.PlayerScreen
import com.cinemaos.app.ui.screens.DetailScreen
import com.cinemaos.app.ui.screens.HomeScreen
import com.cinemaos.app.ui.screens.SearchScreen

object Destinations {
    const val HOME = "home"
    const val SEARCH = "search"
    const val DETAILS = "details/{movieId}"
    const val PLAYER = "player/{mediaId}"

    fun createDetailsRoute(movieId: String) = "details/$movieId"
    fun createPlayerRoute(mediaId: String) = "player/$mediaId"
}

@Composable
fun CinemaOSNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Destinations.HOME
    ) {
        composable(Destinations.HOME) {
            HomeScreen(
                onNavigateToDetails = { movieId ->
                    navController.navigate(Destinations.createDetailsRoute(movieId))
                },
                onNavigateToSearch = {
                    navController.navigate(Destinations.SEARCH)
                }
            )
        }
        
        composable(Destinations.SEARCH) {
            SearchScreen(
                onNavigateToDetails = { movieId ->
                    navController.navigate(Destinations.createDetailsRoute(movieId))
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        
        composable(
            route = Destinations.DETAILS,
            arguments = listOf(navArgument("movieId") { type = NavType.StringType })
        ) {
            DetailScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onNavigateToPlayer = { mediaId ->
                    navController.navigate(Destinations.createPlayerRoute(mediaId))
                }
            )
        }

        composable(
            route = Destinations.PLAYER,
            arguments = listOf(navArgument("mediaId") { type = NavType.StringType })
        ) {
            // Placeholder video URL for the player screen since activeSource is managed by ViewModel
            // In a full implementation, you would pass the mediaId and the ViewModel would fetch the URL
            val dummyUrl = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            PlayerScreen(
                url = dummyUrl
            )
        }
    }
}
