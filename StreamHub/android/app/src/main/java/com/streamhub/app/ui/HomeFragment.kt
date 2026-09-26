package com.streamhub.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.streamhub.app.data.network.RetrofitClient
import com.streamhub.app.data.repository.Repository
import com.streamhub.app.databinding.FragmentHomeBinding
import com.streamhub.app.ui.adapters.MediaAdapter
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    
    private val repository = Repository(RetrofitClient.apiService)
    private lateinit val trendingAdapter: MediaAdapter
    private lateinit val popularAdapter: MediaAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupRecyclerViews()
        loadData()
    }

    private fun setupRecyclerViews() {
        trendingAdapter = MediaAdapter(isHorizontal = true) { item ->
            val intent = Intent(requireContext(), DetailActivity::class.java).apply {
                putExtra("media_item", item)
            }
            startActivity(intent)
        }
        binding.rvTrending.apply {
            layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
            adapter = trendingAdapter
        }

        popularAdapter = MediaAdapter(isHorizontal = true) { item ->
            val intent = Intent(requireContext(), DetailActivity::class.java).apply {
                putExtra("media_item", item)
            }
            startActivity(intent)
        }
        binding.rvPopular.apply {
            layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
            adapter = popularAdapter
        }
    }

    private fun loadData() {
        binding.shimmerTrending.startShimmer()
        binding.shimmerPopular.startShimmer()
        
        viewLifecycleOwner.lifecycleScope.launch {
            val trendingPage1 = repository.getTrending(1)
            val popularPage2 = repository.getTrending(2) // Using trending page 2 for popular as per requirements
            
            binding.shimmerTrending.stopShimmer()
            binding.shimmerTrending.visibility = View.GONE
            binding.rvTrending.visibility = View.VISIBLE
            trendingAdapter.submitList(trendingPage1)

            binding.shimmerPopular.stopShimmer()
            binding.shimmerPopular.visibility = View.GONE
            binding.rvPopular.visibility = View.VISIBLE
            popularAdapter.submitList(popularPage2)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
