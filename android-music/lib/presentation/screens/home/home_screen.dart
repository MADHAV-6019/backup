import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/data/repositories/music_repository.dart';
import 'package:melody_flow/presentation/providers/player_provider.dart';
import 'package:melody_flow/presentation/providers/library_provider.dart';
import 'package:melody_flow/presentation/widgets/song_tile.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with TickerProviderStateMixin {
  final MusicRepository _repo = MusicRepository();
  List<Song> _trendingSongs = [];
  bool _isLoading = true;

  // Staggered entrance animations
  late final AnimationController _fadeController;
  late final Animation<double> _headerFade;
  late final Animation<double> _quickPlayFade;
  late final Animation<double> _trendingFade;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _headerFade = CurvedAnimation(
      parent: _fadeController,
      curve: const Interval(0.0, 0.4, curve: Curves.easeOut),
    );
    _quickPlayFade = CurvedAnimation(
      parent: _fadeController,
      curve: const Interval(0.2, 0.6, curve: Curves.easeOut),
    );
    _trendingFade = CurvedAnimation(
      parent: _fadeController,
      curve: const Interval(0.4, 1.0, curve: Curves.easeOut),
    );
    _fadeController.forward();
    _loadTrending();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _loadTrending() async {
    setState(() => _isLoading = true);
    try {
      _trendingSongs = await _repo.getTrending(limit: 30);
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();
    final recentSongs = library.recentSongs;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadTrending,
        color: AppTheme.primaryCyan,
        backgroundColor: AppTheme.bgCard,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            // ─── Header ────────────────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _headerFade,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.15),
                    end: Offset.zero,
                  ).animate(_headerFade),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
                    child: Row(
                      children: [
                        // Animated gradient logo
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            gradient: AppTheme.primaryGradient,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primaryPurple
                                    .withValues(alpha: 0.35),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.music_note_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getGreeting(),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: AppTheme.textMuted,
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                            ShaderMask(
                              shaderCallback: (bounds) =>
                                  AppTheme.primaryGradient.createShader(bounds),
                              child: Text(
                                'MelodyFlow',
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.5,
                                      color: Colors.white,
                                    ),
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        // Notification bell
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppTheme.bgSurface,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color:
                                  AppTheme.primaryCyan.withValues(alpha: 0.15),
                            ),
                          ),
                          child: const Icon(
                            Icons.notifications_none_rounded,
                            color: AppTheme.textMuted,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // ─── Quick Play Section ────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _quickPlayFade,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.2),
                    end: Offset.zero,
                  ).animate(_quickPlayFade),
                  child: Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppTheme.accentPink
                                        .withValues(alpha: 0.2),
                                    AppTheme.accentOrange
                                        .withValues(alpha: 0.1),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                '🔥',
                                style: TextStyle(fontSize: 16),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Quick Play',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.3,
                                  ),
                            ),
                            const Spacer(),
                            if (!_isLoading && _trendingSongs.isNotEmpty)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryCyan
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  'See All',
                                  style: TextStyle(
                                    color: AppTheme.primaryCyan,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      if (_isLoading)
                        SizedBox(
                          height: 210,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: 5,
                            itemBuilder: (_, _a) => const _ShimmerCard(),
                          ),
                        )
                      else if (_trendingSongs.isNotEmpty)
                        SizedBox(
                          height: 210,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
                            itemCount:
                                _trendingSongs.length.clamp(0, 10),
                            itemBuilder: (context, index) {
                              final song = _trendingSongs[index];
                              return _QuickPlayCard(
                                song: song,
                                index: index,
                                onTap: () {
                                  context
                                      .read<PlayerProvider>()
                                      .playQueue(
                                        _trendingSongs,
                                        startIndex: index,
                                      );
                                  library.addToRecent(song);
                                },
                              );
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),

            // ─── Recently Played ─────────────
            if (recentSongs.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: FadeTransition(
                  opacity: _trendingFade,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppTheme.primaryCyan
                                    .withValues(alpha: 0.2),
                                AppTheme.primaryPurple
                                    .withValues(alpha: 0.1),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            '🕐',
                            style: TextStyle(fontSize: 16),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Recently Played',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.3,
                              ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    return SongTile(
                      song: recentSongs[index],
                      playQueue: recentSongs,
                      queueIndex: index,
                      heroTagPrefix: 'recent',
                    );
                  },
                  childCount: recentSongs.length.clamp(0, 10),
                ),
              ),
            ],

            // ─── Trending Now ────────────────
            SliverToBoxAdapter(
              child: FadeTransition(
                opacity: _trendingFade,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryPurple
                                  .withValues(alpha: 0.2),
                              AppTheme.accentPink
                                  .withValues(alpha: 0.1),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          '📈',
                          style: TextStyle(fontSize: 16),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Trending Now',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                      ),
                      const Spacer(),
                      if (!_isLoading && _trendingSongs.isNotEmpty)
                        Text(
                          '${_trendingSongs.length} songs',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(
                                color: AppTheme.textMuted,
                              ),
                        ),
                    ],
                  ),
                ),
              ),
            ),

            if (_isLoading)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, _a) => const _ShimmerTile(),
                  childCount: 8,
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    return SongTile(
                      song: _trendingSongs[index],
                      playQueue: _trendingSongs,
                      queueIndex: index,
                      heroTagPrefix: 'trending',
                    );
                  },
                  childCount: _trendingSongs.length,
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 140)),
          ],
        ),
      ),
    );
  }
}

/// Premium quick play card with scale animation and gradient overlay
class _QuickPlayCard extends StatefulWidget {
  final Song song;
  final int index;
  final VoidCallback onTap;

  const _QuickPlayCard({
    required this.song,
    required this.index,
    required this.onTap,
  });

  @override
  State<_QuickPlayCard> createState() => _QuickPlayCardState();
}

class _QuickPlayCardState extends State<_QuickPlayCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      lowerBound: 0.0,
      upperBound: 0.04,
    );
    _scale = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final isPlaying = player.currentSong?.id == widget.song.id;

    return GestureDetector(
      onTapDown: (_) => _scaleController.forward(),
      onTapUp: (_) {
        _scaleController.reverse();
        widget.onTap();
      },
      onTapCancel: () => _scaleController.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(
          scale: _scale.value,
          child: child,
        ),
        child: Container(
          width: 155,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Card with image
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: isPlaying
                            ? AppTheme.primaryCyan.withValues(alpha: 0.3)
                            : Colors.black.withValues(alpha: 0.3),
                        blurRadius: isPlaying ? 16 : 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        // Thumbnail
                        widget.song.thumbnailUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl:
                                    widget.song.highResThumbnailUrl ??
                                        widget.song.thumbnailUrl,
                                fit: BoxFit.cover,
                                placeholder: (_, _a) => Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        AppTheme.bgSurface,
                                        AppTheme.bgCard,
                                      ],
                                    ),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                        Icons.music_note_rounded,
                                        color: AppTheme.textMuted,
                                        size: 36),
                                  ),
                                ),
                                errorWidget: (_, _a, _b) => Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        AppTheme.bgSurface,
                                        AppTheme.bgCard,
                                      ],
                                    ),
                                  ),
                                  child: const Center(
                                    child: Icon(
                                        Icons.music_note_rounded,
                                        color: AppTheme.textMuted,
                                        size: 36),
                                  ),
                                ),
                              )
                            : Container(
                                decoration: const BoxDecoration(
                                  gradient: AppTheme.cardGradient,
                                ),
                                child: const Center(
                                  child: Icon(
                                      Icons.music_note_rounded,
                                      color: AppTheme.textMuted,
                                      size: 40),
                                ),
                              ),
                        // Gradient overlay
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.75),
                              ],
                              stops: const [0.0, 0.35, 1.0],
                            ),
                          ),
                        ),
                        // Number badge
                        Positioned(
                          top: 8,
                          left: 8,
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              gradient: widget.index < 3
                                  ? AppTheme.primaryGradient
                                  : null,
                              color: widget.index < 3
                                  ? null
                                  : Colors.black.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: Center(
                              child: Text(
                                '${widget.index + 1}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                        // Playing indicator or play button
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              gradient: isPlaying
                                  ? const LinearGradient(
                                      colors: [
                                        AppTheme.primaryCyan,
                                        AppTheme.primaryPurple,
                                      ],
                                    )
                                  : AppTheme.primaryGradient,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: (isPlaying
                                          ? AppTheme.primaryCyan
                                          : AppTheme.primaryPurple)
                                      .withValues(alpha: 0.5),
                                  blurRadius: 10,
                                ),
                              ],
                            ),
                            child: Icon(
                              isPlaying
                                  ? Icons.equalizer_rounded
                                  : Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ),
                        // Active border
                        if (isPlaying)
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: AppTheme.primaryCyan
                                      .withValues(alpha: 0.5),
                                  width: 1.5,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              // Title
              Text(
                widget.song.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isPlaying
                      ? AppTheme.primaryCyan
                      : AppTheme.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 1),
              // Artist
              Text(
                widget.song.artist,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: AppTheme.textMuted.withValues(alpha: 0.8),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShimmerCard extends StatelessWidget {
  const _ShimmerCard();

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.bgCard,
      highlightColor: AppTheme.bgElevated,
      child: Container(
        width: 155,
        margin: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

class _ShimmerTile extends StatelessWidget {
  const _ShimmerTile();

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.bgCard,
      highlightColor: AppTheme.bgElevated,
      child: Container(
        height: 70,
        margin: const EdgeInsets.symmetric(
          horizontal: AppTheme.spacingMd,
          vertical: AppTheme.spacingXs,
        ),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        ),
      ),
    );
  }
}
