package com.streamhub.app.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.streamhub.app.data.models.MediaItem
import com.streamhub.app.databinding.ItemMediaHorizontalBinding
import com.streamhub.app.databinding.ItemMediaVerticalBinding

class MediaAdapter(
    private val isHorizontal: Boolean = true,
    private val onItemClick: (MediaItem) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val items = mutableListOf<MediaItem>()

    fun submitList(newItems: List<MediaItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun getItemViewType(position: Int): Int {
        return if (isHorizontal) 0 else 1
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == 0) {
            val binding = ItemMediaHorizontalBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            HorizontalViewHolder(binding)
        } else {
            val binding = ItemMediaVerticalBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            VerticalViewHolder(binding)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val item = items[position]
        if (holder is HorizontalViewHolder) {
            holder.bind(item)
        } else if (holder is VerticalViewHolder) {
            holder.bind(item)
        }
    }

    override fun getItemCount() = items.size

    inner class HorizontalViewHolder(private val binding: ItemMediaHorizontalBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: MediaItem) {
            binding.tvTitle.text = item.title
            binding.tvRating.text = "★ ${item.rating}"
            
            Glide.with(binding.ivPoster)
                .load(item.image)
                .centerCrop()
                .into(binding.ivPoster)

            binding.root.setOnClickListener { onItemClick(item) }
        }
    }

    inner class VerticalViewHolder(private val binding: ItemMediaVerticalBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: MediaItem) {
            binding.tvTitle.text = item.title
            binding.tvRating.text = "★ ${item.rating}"
            
            Glide.with(binding.ivPoster)
                .load(item.image)
                .centerCrop()
                .into(binding.ivPoster)

            binding.root.setOnClickListener { onItemClick(item) }
        }
    }
}
