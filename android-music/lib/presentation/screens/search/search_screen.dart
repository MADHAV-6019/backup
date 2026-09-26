import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/presentation/providers/search_provider.dart';
import 'package:melody_flow/presentation/widgets/song_tile.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _controller = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  Timer? _debounce;
  late final AnimationController _entryController;
  late final Animation<double> _titleFade;
  late final Animation<double> _searchBarFade;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() => setState(() {}));
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _titleFade = CurvedAnimation(
      parent: _entryController,
      curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
    );
    _searchBarFade = CurvedAnimation(
      parent: _entryController,
      curve: const Interval(0.2, 0.7, curve: Curves.easeOut),
    );
    _entryController.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _debounce?.cancel();
    _entryController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      context.read<SearchProvider>().search(query);
    });
  }

  @override
  Widget build(BuildContext context) {
    final searchProvider = context.watch<SearchProvider>();

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FadeTransition(
                  opacity: _titleFade,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0, 0.2),
                      end: Offset.zero,
                    ).animate(_titleFade),
                    child: Row(
                      children: [
                        Text(
                          'Search',
                          style: Theme.of(context)
                              .textTheme
                              .displayMedium
                              ?.copyWith(
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.5,
                              ),
                        ),
                        const Spacer(),
                        // Mic button for visual flair
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppTheme.bgSurface,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppTheme.primaryPurple
                                  .withValues(alpha: 0.15),
                            ),
                          ),
                          child: const Icon(
                            Icons.mic_none_rounded,
                            color: AppTheme.textMuted,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                // Search bar with animated border
                FadeTransition(
                  opacity: _searchBarFade,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    decoration: BoxDecoration(
                      color: AppTheme.bgSurface,
                      borderRadius:
                          BorderRadius.circular(AppTheme.radiusRound),
                      border: Border.all(
                        color: _focusNode.hasFocus
                            ? AppTheme.primaryCyan
                                .withValues(alpha: 0.4)
                            : Colors.white.withValues(alpha: 0.05),
                        width: _focusNode.hasFocus ? 1.5 : 0.5,
                      ),
                      boxShadow: _focusNode.hasFocus
                          ? [
                              BoxShadow(
                                color: AppTheme.primaryCyan
                                    .withValues(alpha: 0.1),
                                blurRadius: 20,
                                spreadRadius: 2,
                              ),
                            ]
                          : null,
                    ),
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      onChanged: _onSearchChanged,
                      style: const TextStyle(
                        color: AppTheme.textPrimary,
                        fontSize: 15,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Songs, artists, albums...',
                        hintStyle: TextStyle(
                          color:
                              AppTheme.textMuted.withValues(alpha: 0.6),
                          fontSize: 15,
                        ),
                        prefixIcon: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          child: Icon(
                            Icons.search_rounded,
                            color: _focusNode.hasFocus
                                ? AppTheme.primaryCyan
                                : AppTheme.textMuted,
                          ),
                        ),
                        suffixIcon: _controller.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(
                                  Icons.clear_rounded,
                                  color: AppTheme.textMuted,
                                  size: 20,
                                ),
                                onPressed: () {
                                  _controller.clear();
                                  searchProvider.clearSearch();
                                  setState(() {});
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                // Source chips
                FadeTransition(
                  opacity: _searchBarFade,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _SourceChip(
                          label: 'All',
                          emoji: '🎵',
                          isActive: searchProvider.activeSource == 'all',
                          onTap: () => searchProvider.setSource('all'),
                        ),
                        const SizedBox(width: 8),
                        _SourceChip(
                          label: 'JioSaavn',
                          emoji: '🎶',
                          isActive:
                              searchProvider.activeSource == 'jiosaavn',
                          onTap: () =>
                              searchProvider.setSource('jiosaavn'),
                          color: const Color(0xFF2BC5B4),
                        ),
                        const SizedBox(width: 8),
                        _SourceChip(
                          label: 'YouTube Music',
                          emoji: '▶️',
                          isActive:
                              searchProvider.activeSource == 'youtube',
                          onTap: () =>
                              searchProvider.setSource('youtube'),
                          color: const Color(0xFFFF4444),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          // Results count badge
          if (searchProvider.hasResults)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color:
                          AppTheme.primaryCyan.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${searchProvider.results.length} results',
                      style: TextStyle(
                        color: AppTheme.primaryCyan,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                ],
              ),
            ),
          const SizedBox(height: 4),
          Expanded(
            child: searchProvider.isSearching
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 36,
                          height: 36,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            color: AppTheme.primaryCyan,
                            backgroundColor: AppTheme.primaryCyan
                                .withValues(alpha: 0.1),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Searching...',
                          style: TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  )
                : searchProvider.error != null
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.accentPink
                                    .withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.error_outline_rounded,
                                color: AppTheme.accentPink,
                                size: 40,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              searchProvider.error!,
                              style: const TextStyle(
                                color: AppTheme.textSecondary,
                                fontSize: 14,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () {
                                if (_controller.text.isNotEmpty) {
                                  searchProvider
                                      .search(_controller.text);
                                }
                              },
                              child: Text(
                                'Retry',
                                style: TextStyle(
                                  color: AppTheme.primaryCyan,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      )
                    : searchProvider.hasResults
                        ? ListView.builder(
                            physics:
                                const BouncingScrollPhysics(),
                            padding: const EdgeInsets.only(
                                bottom: 140),
                            itemCount:
                                searchProvider.results.length,
                            itemBuilder: (context, index) {
                              return SongTile(
                                song: searchProvider
                                    .results[index],
                                playQueue:
                                    searchProvider.results,
                                queueIndex: index,
                                heroTagPrefix: 'search',
                              );
                            },
                          )
                        : searchProvider.query.isEmpty
                            ? _EmptySearchState()
                            : Center(
                                child: Column(
                                  mainAxisSize:
                                      MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding:
                                          const EdgeInsets.all(20),
                                      decoration: BoxDecoration(
                                        color: AppTheme.bgSurface
                                            .withValues(
                                                alpha: 0.5),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons
                                            .search_off_rounded,
                                        color:
                                            AppTheme.textMuted,
                                        size: 48,
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                    Text(
                                      'No results found',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            color: AppTheme
                                                .textSecondary,
                                            fontWeight:
                                                FontWeight.w600,
                                          ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Try a different search term',
                                      style: TextStyle(
                                        color:
                                            AppTheme.textMuted,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
          ),
        ],
      ),
    );
  }
}

class _SourceChip extends StatelessWidget {
  final String label;
  final String emoji;
  final bool isActive;
  final VoidCallback onTap;
  final Color? color;

  const _SourceChip({
    required this.label,
    required this.emoji,
    required this.isActive,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = color ?? AppTheme.primaryCyan;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOutCubic,
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          gradient: isActive
              ? LinearGradient(
                  colors: [
                    activeColor.withValues(alpha: 0.2),
                    activeColor.withValues(alpha: 0.08),
                  ],
                )
              : null,
          color: isActive ? null : AppTheme.bgSurface,
          borderRadius:
              BorderRadius.circular(AppTheme.radiusRound),
          border: Border.all(
            color: isActive
                ? activeColor.withValues(alpha: 0.4)
                : Colors.white.withValues(alpha: 0.04),
            width: isActive ? 1 : 0.5,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.15),
                    blurRadius: 8,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 12)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color:
                    isActive ? activeColor : AppTheme.textSecondary,
                fontSize: 13,
                fontWeight:
                    isActive ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptySearchState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.primaryPurple.withValues(alpha: 0.1),
                      AppTheme.primaryCyan.withValues(alpha: 0.05),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                ),
                child: ShaderMask(
                  shaderCallback: (bounds) =>
                      AppTheme.primaryGradient.createShader(bounds),
                  child: const Icon(
                    Icons.headphones_rounded,
                    size: 64,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Find your music',
                style:
                    Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
              ),
              const SizedBox(height: 8),
              Text(
                'Search across JioSaavn & YouTube Music',
                style: TextStyle(
                  color: AppTheme.textSecondary.withValues(alpha: 0.8),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 28),
              // Suggested genre chips
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: [
                  _GenreChip(label: '🎸 Rock', color: const Color(0xFFFF6B6B)),
                  _GenreChip(label: '🎤 Pop', color: const Color(0xFF6BCB77)),
                  _GenreChip(label: '🎷 Jazz', color: const Color(0xFFFFD93D)),
                  _GenreChip(label: '🎹 Classical', color: const Color(0xFF4D96FF)),
                  _GenreChip(label: '🎧 Electronic', color: const Color(0xFFB983FF)),
                  _GenreChip(label: '🪕 Folk', color: const Color(0xFFFF8B8B)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GenreChip extends StatelessWidget {
  final String label;
  final Color color;

  const _GenreChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 0.5,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
