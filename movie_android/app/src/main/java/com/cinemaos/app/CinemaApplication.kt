package com.cinemaos.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class CinemaApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
