package com.streamhub.app.ui

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.streamhub.app.data.models.MediaItem
import com.streamhub.app.data.network.RetrofitClient
import com.streamhub.app.data.repository.Repository
import com.streamhub.app.databinding.ActivityDetailBinding
import kotlinx.coroutines.launch

class DetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDetailBinding
    private val repository = Repository(RetrofitClient.apiService)
    
    private var mediaItem: MediaItem? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { finish() }

        mediaItem = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra("media_item", MediaItem::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra("media_item")
        }

        mediaItem?.let { item ->
            populateUi(item)
            loadExtraInfo(item)
        } ?: run {
            Toast.makeText(this, "Failed to load media details", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun populateUi(item: MediaItem) {
        binding.tvTitle.text = item.title
        binding.tvRating.text = "★ ${item.rating}"
        
        Glide.with(this)
            .load(item.image)
            .into(binding.ivPoster)

        binding.btnPlay.setOnClickListener {
            playMedia(item)
        }
    }

    private fun loadExtraInfo(item: MediaItem) {
        lifecycleScope.launch {
            val info = repository.getMediaInfo(item.tmdbId, item.type)
            info?.let {
                binding.tvDescription.text = it.description ?: "No description available."
                
                if (!it.genres.isNullOrEmpty()) {
                    binding.tvGenres.text = it.genres.joinToString(" • ")
                }
                
                if (!it.cover.isNullOrBlank()) {
                    Glide.with(this@DetailActivity)
                        .load(it.cover)
                        .into(binding.ivCover)
                } else if (!it.image.isNullOrBlank()) {
                    Glide.with(this@DetailActivity)
                        .load(it.image)
                        .into(binding.ivCover)
                }
            }
        }
    }

    private fun playMedia(item: MediaItem) {
        binding.loadingOverlay.visibility = View.VISIBLE
        binding.btnPlay.isEnabled = false

        lifecycleScope.launch {
            try {
                // Determine episode id, assuming episode 1 season 1 for now if TV, or standard movie slug
                val episodeId = repository.buildEpisodeId(
                    title = item.title,
                    tmdbId = item.tmdbId,
                    type = item.type,
                    season = 1,
                    episode = 1
                )

                val sources = repository.getStreamingUrls(episodeId, item.tmdbId)

                binding.loadingOverlay.visibility = View.GONE
                binding.btnPlay.isEnabled = true

                if (sources.isNotEmpty()) {
                    // Pick best quality: 1080p > 720p > auto/any
                    val bestSource = sources.find { it.quality.contains("1080") }
                        ?: sources.find { it.quality.contains("720") }
                        ?: sources.first()

                    val intent = Intent(this@DetailActivity, PlayerActivity::class.java).apply {
                        putExtra("video_url", bestSource.url)
                    }
                    startActivity(intent)
                } else {
                    Toast.makeText(this@DetailActivity, "No streams available at the moment.", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                binding.loadingOverlay.visibility = View.GONE
                binding.btnPlay.isEnabled = true
                Toast.makeText(this@DetailActivity, "Error fetching streams.", Toast.LENGTH_LONG).show()
            }
        }
    }
}
