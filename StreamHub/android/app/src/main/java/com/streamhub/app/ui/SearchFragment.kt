package com.streamhub.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.streamhub.app.data.network.RetrofitClient
import com.streamhub.app.data.repository.Repository
import com.streamhub.app.databinding.FragmentSearchBinding
import com.streamhub.app.ui.adapters.MediaAdapter
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SearchFragment : Fragment() {

    private var _binding: FragmentSearchBinding? = null
    private val binding get() = _binding!!

    private val repository = Repository(RetrofitClient.apiService)
    private lateinit val searchAdapter: MediaAdapter
    private var searchJob: Job? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentSearchBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        setupSearchView()
    }

    private fun setupRecyclerView() {
        searchAdapter = MediaAdapter(isHorizontal = false) { item ->
            val intent = Intent(requireContext(), DetailActivity::class.java).apply {
                putExtra("media_item", item)
            }
            startActivity(intent)
        }
        binding.rvSearch.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = searchAdapter
        }
    }

    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                query?.let { performSearch(it) }
                return true
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                searchJob?.cancel()
                if (newText.isNullOrBlank()) {
                    searchAdapter.submitList(emptyList())
                    binding.tvEmptyState.visibility = View.GONE
                    binding.tvError.visibility = View.GONE
                } else {
                    searchJob = viewLifecycleOwner.lifecycleScope.launch {
                        delay(500) // 500ms debounce
                        performSearch(newText)
                    }
                }
                return true
            }
        })
    }

    private fun performSearch(query: String) {
        binding.progressBar.visibility = View.VISIBLE
        binding.tvEmptyState.visibility = View.GONE
        binding.tvError.visibility = View.GONE
        binding.rvSearch.visibility = View.GONE

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val results = repository.search(query, 1)
                binding.progressBar.visibility = View.GONE
                
                if (results.isEmpty()) {
                    binding.tvEmptyState.visibility = View.VISIBLE
                } else {
                    binding.rvSearch.visibility = View.VISIBLE
                    searchAdapter.submitList(results)
                }
            } catch (e: Exception) {
                binding.progressBar.visibility = View.GONE
                binding.tvError.visibility = View.VISIBLE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
