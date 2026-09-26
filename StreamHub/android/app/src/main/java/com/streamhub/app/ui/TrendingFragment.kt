package com.streamhub.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.streamhub.app.data.network.RetrofitClient
import com.streamhub.app.data.repository.Repository
import com.streamhub.app.databinding.FragmentTrendingBinding
import com.streamhub.app.ui.adapters.MediaAdapter
import kotlinx.coroutines.launch

class TrendingFragment : Fragment() {

    private var _binding: FragmentTrendingBinding? = null
    private val binding get() = _binding!!

    private val repository = Repository(RetrofitClient.apiService)
    private lateinit val trendingAdapter: MediaAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentTrendingBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        loadTrendingData()
    }

    private fun setupRecyclerView() {
        trendingAdapter = MediaAdapter(isHorizontal = false) { item ->
            val intent = Intent(requireContext(), DetailActivity::class.java).apply {
                putExtra("media_item", item)
            }
            startActivity(intent)
        }
        binding.rvTrendingGrid.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = trendingAdapter
        }
    }

    private fun loadTrendingData() {
        binding.shimmerTrendingGrid.startShimmer()
        binding.shimmerTrendingGrid.visibility = View.VISIBLE
        binding.tvError.visibility = View.GONE
        
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val results = repository.getTrending(1)
                
                binding.shimmerTrendingGrid.stopShimmer()
                binding.shimmerTrendingGrid.visibility = View.GONE
                
                if (results.isNotEmpty()) {
                    binding.rvTrendingGrid.visibility = View.VISIBLE
                    trendingAdapter.submitList(results)
                } else {
                    binding.tvError.visibility = View.VISIBLE
                    binding.tvError.text = "No trending content available"
                }
            } catch (e: Exception) {
                binding.shimmerTrendingGrid.stopShimmer()
                binding.shimmerTrendingGrid.visibility = View.GONE
                binding.tvError.visibility = View.VISIBLE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
