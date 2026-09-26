import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:just_audio/just_audio.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/presentation/providers/player_provider.dart';
import 'package:melody_flow/presentation/providers/library_provider.dart';

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen>
    with TickerProviderStateMixin {
  late final AnimationController _rotationController;
  late final AnimationController _entryController;
  late final Animation<double> _artworkScale;
  late final Animation<double> _infoSlide;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    );
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _artworkScale = CurvedAnimation(
      parent: _entryController,
      curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack),
    );
    _infoSlide = CurvedAnimation(
      parent: _entryController,
      curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
    );

    _entryController.forward();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final player = context.read<PlayerProvider>();
      if (player.isPlaying) {
        _rotationController.repeat();
      }
    });
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _entryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final library = context.watch<LibraryProvider>();
    final song = player.currentSong;

    if (song == null) {
      return const Scaffold(
        body: Center(child: Text('No song playing')),
      );
    }

    // Sync rotation with play state
    if (player.isPlaying && !_rotationController.isAnimating) {
      _rotationController.repeat();
    } else if (!player.isPlaying && _rotationController.isAnimating) {
      _rotationController.stop();
    }

    final isFav = library.isFavorite(song);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: AppTheme.playerGradient,
        ),
        child: Stack(
          children: [
            // Blurred background artwork
            if (song.thumbnailUrl.isNotEmpty)
              Positioned.fill(
                child: ImageFiltered(
                  imageFilter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                  child: CachedNetworkImage(
                    imageUrl:
                        song.highResThumbnailUrl ?? song.thumbnailUrl,
                    fit: BoxFit.cover,
                    color: Colors.black.withValues(alpha: 0.5),
                    colorBlendMode: BlendMode.darken,
                    errorWidget: (_, _a, _b) => const SizedBox(),
                  ),
                ),
              ),

            // Animated ambient glow
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -0.3),
                    radius: 1.2,
                    colors: [
                      AppTheme.primaryPurple.withValues(alpha: 0.08),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            // Dark gradient overlay
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.bgDark.withValues(alpha: 0.3),
                      AppTheme.bgDark.withValues(alpha: 0.6),
                      AppTheme.bgDark.withValues(alpha: 0.95),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: const [0.0, 0.5, 1.0],
                  ),
                ),
              ),
            ),

            // Content
            SafeArea(
              child: Column(
                children: [
                  // ─── Top Bar ────────────────────
                  Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    child: Row(
                      children: [
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => Navigator.of(context).pop(),
                            borderRadius: BorderRadius.circular(20),
                            child: const Padding(
                              padding: EdgeInsets.all(8),
                              child: Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: AppTheme.textPrimary,
                                size: 32,
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: Column(
                            children: [
                              ShaderMask(
                                shaderCallback: (bounds) => AppTheme
                                    .primaryGradient
                                    .createShader(bounds),
                                child: Text(
                                  'NOW PLAYING',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        letterSpacing: 3,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (song.source == 'jiosaavn'
                                          ? const Color(0xFF2BC5B4)
                                          : const Color(0xFFFF4444))
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  song.source == 'jiosaavn'
                                      ? 'JioSaavn'
                                      : 'YouTube',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: song.source == 'jiosaavn'
                                        ? const Color(0xFF2BC5B4)
                                        : const Color(0xFFFF4444),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () =>
                                _showOptions(context, song, library),
                            borderRadius: BorderRadius.circular(20),
                            child: const Padding(
                              padding: EdgeInsets.all(8),
                              child: Icon(
                                Icons.more_vert_rounded,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ─── Artwork ─────────────────
                  Expanded(
                    flex: 5,
                    child: Center(
                      child: Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 44),
                        child: ScaleTransition(
                          scale: _artworkScale,
                          child: AnimatedBuilder(
                            animation: _rotationController,
                            builder: (_, child) {
                              return Transform.rotate(
                                angle: _rotationController.value *
                                    2 *
                                    math.pi,
                                child: child,
                              );
                            },
                            child: AspectRatio(
                              aspectRatio: 1,
                              child: Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppTheme.primaryPurple
                                          .withValues(alpha: 0.4),
                                      blurRadius: 60,
                                      spreadRadius: 5,
                                    ),
                                    BoxShadow(
                                      color: AppTheme.primaryCyan
                                          .withValues(alpha: 0.15),
                                      blurRadius: 40,
                                      spreadRadius: 15,
                                    ),
                                  ],
                                ),
                                child: ClipOval(
                                  child: Stack(
                                    children: [
                                      // Image
                                      song.thumbnailUrl.isNotEmpty
                                          ? CachedNetworkImage(
                                              imageUrl:
                                                  song.highResThumbnailUrl ??
                                                      song.thumbnailUrl,
                                              fit: BoxFit.cover,
                                              width: double.infinity,
                                              height: double.infinity,
                                              placeholder: (_, _a) =>
                                                  _artworkPlaceholder(),
                                              errorWidget:
                                                  (_, _a, _b) =>
                                                      _artworkPlaceholder(),
                                            )
                                          : _artworkPlaceholder(),
                                      // Vinyl grooves effect
                                      Center(
                                        child: Container(
                                          width: double.infinity,
                                          height: double.infinity,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: Colors.black
                                                  .withValues(
                                                      alpha: 0.15),
                                              width: 24,
                                            ),
                                          ),
                                        ),
                                      ),
                                      // Vinyl center hole
                                      Center(
                                        child: Container(
                                          width: 44,
                                          height: 44,
                                          decoration: BoxDecoration(
                                            color: AppTheme.bgDark,
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: AppTheme.primaryCyan
                                                  .withValues(
                                                      alpha: 0.25),
                                              width: 2,
                                            ),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black
                                                    .withValues(
                                                        alpha: 0.5),
                                                blurRadius: 8,
                                              ),
                                            ],
                                          ),
                                          child: Center(
                                            child: Container(
                                              width: 12,
                                              height: 12,
                                              decoration:
                                                  const BoxDecoration(
                                                gradient: AppTheme
                                                    .primaryGradient,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // ─── Song Info ───────────────
                  FadeTransition(
                    opacity: _infoSlide,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, 0.3),
                        end: Offset.zero,
                      ).animate(_infoSlide),
                      child: Padding(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 36),
                        child: Column(
                          children: [
                            const SizedBox(height: 20),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        song.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: -0.5,
                                            ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        song.artist,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyLarge
                                            ?.copyWith(
                                              color:
                                                  AppTheme.textSecondary,
                                            ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                // Favourite button with glow and scale
                                _AnimatedFavoriteButton(
                                  isFavorite: isFav,
                                  onTap: () =>
                                      library.toggleFavorite(song),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // ─── Progress Bar ────────────
                  FadeTransition(
                    opacity: _infoSlide,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 36, vertical: 16),
                      child: Column(
                        children: [
                          SliderTheme(
                            data: SliderTheme.of(context).copyWith(
                              trackHeight: 4,
                              activeTrackColor: AppTheme.primaryCyan,
                              inactiveTrackColor:
                                  Colors.white.withValues(alpha: 0.08),
                              thumbColor: AppTheme.primaryCyan,
                              thumbShape:
                                  const RoundSliderThumbShape(
                                enabledThumbRadius: 7,
                              ),
                              overlayShape:
                                  const RoundSliderOverlayShape(
                                overlayRadius: 16,
                              ),
                              overlayColor: AppTheme.primaryCyan
                                  .withValues(alpha: 0.15),
                            ),
                            child: Slider(
                              value: player.progress.clamp(0.0, 1.0),
                              onChanged: player.seekToProgress,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4),
                            child: Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  formatDuration(player.position),
                                  style: TextStyle(
                                    color: AppTheme.textMuted
                                        .withValues(alpha: 0.8),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    fontFeatures: const [
                                      FontFeature.tabularFigures()
                                    ],
                                  ),
                                ),
                                Text(
                                  formatDuration(player.duration),
                                  style: TextStyle(
                                    color: AppTheme.textMuted
                                        .withValues(alpha: 0.8),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    fontFeatures: const [
                                      FontFeature.tabularFigures()
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // ─── Controls ─────────────────
                  FadeTransition(
                    opacity: _infoSlide,
                    child: Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 24),
                      child: Row(
                        mainAxisAlignment:
                            MainAxisAlignment.spaceEvenly,
                        children: [
                          _ControlButton(
                            icon: Icons.shuffle_rounded,
                            isActive: player.isShuffle,
                            onTap: player.toggleShuffle,
                            size: 22,
                          ),
                          _ControlButton(
                            icon: Icons.skip_previous_rounded,
                            onTap: player.playPrevious,
                            size: 36,
                          ),
                          // Play/Pause — hero button
                          _PlayPauseButton(
                            isPlaying: player.isPlaying,
                            isLoading: player.isLoading,
                            onTap: player.togglePlayPause,
                          ),
                          _ControlButton(
                            icon: Icons.skip_next_rounded,
                            onTap: player.playNext,
                            size: 36,
                          ),
                          _ControlButton(
                            icon: player.loopMode == LoopMode.one
                                ? Icons.repeat_one_rounded
                                : Icons.repeat_rounded,
                            isActive:
                                player.loopMode != LoopMode.off,
                            onTap: player.cycleLoopMode,
                            size: 22,
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _artworkPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: AppTheme.cardGradient,
      ),
      child: const Center(
        child: Icon(
          Icons.music_note_rounded,
          color: AppTheme.textMuted,
          size: 60,
        ),
      ),
    );
  }

  void _showOptions(
      BuildContext context, dynamic song, LibraryProvider library) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(20),
          ),
          border: Border(
            top: BorderSide(
              color: AppTheme.primaryCyan.withValues(alpha: 0.15),
              width: 0.5,
            ),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.textMuted.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              _BottomSheetItem(
                icon: library.isFavorite(song)
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                iconColor: library.isFavorite(song)
                    ? AppTheme.accentPink
                    : AppTheme.textSecondary,
                label: library.isFavorite(song)
                    ? 'Remove from Favorites'
                    : 'Add to Favorites',
                onTap: () {
                  library.toggleFavorite(song);
                  Navigator.pop(context);
                },
              ),
              _BottomSheetItem(
                icon: Icons.queue_music_rounded,
                label: 'Add to Queue',
                onTap: () {
                  context.read<PlayerProvider>().addToQueue(song);
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Added to queue'),
                      backgroundColor: AppTheme.bgElevated,
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Animated play/pause button with scale effect
class _PlayPauseButton extends StatefulWidget {
  final bool isPlaying;
  final bool isLoading;
  final VoidCallback onTap;

  const _PlayPauseButton({
    required this.isPlaying,
    required this.isLoading,
    required this.onTap,
  });

  @override
  State<_PlayPauseButton> createState() => _PlayPauseButtonState();
}

class _PlayPauseButtonState extends State<_PlayPauseButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scaleController;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 80),
      lowerBound: 0.0,
      upperBound: 1.0,
      value: 0.0,
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _scaleController.forward(),
      onTapUp: (_) {
        _scaleController.reverse();
        if (!widget.isLoading) widget.onTap();
      },
      onTapCancel: () => _scaleController.reverse(),
      child: AnimatedBuilder(
        animation: _scaleController,
        builder: (_, child) => Transform.scale(
          scale: 1.0 - _scaleController.value * 0.08,
          child: child,
        ),
        child: Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color:
                    AppTheme.primaryPurple.withValues(alpha: 0.45),
                blurRadius: 24,
                offset: const Offset(0, 6),
              ),
              BoxShadow(
                color:
                    AppTheme.primaryCyan.withValues(alpha: 0.2),
                blurRadius: 20,
              ),
            ],
          ),
          child: widget.isLoading
              ? const Center(
                  child: SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  ),
                )
              : AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    widget.isPlaying
                        ? Icons.pause_rounded
                        : Icons.play_arrow_rounded,
                    key: ValueKey(widget.isPlaying),
                    color: Colors.white,
                    size: 38,
                  ),
                ),
        ),
      ),
    );
  }
}

/// Animated favorite button with scale pop
class _AnimatedFavoriteButton extends StatefulWidget {
  final bool isFavorite;
  final VoidCallback onTap;

  const _AnimatedFavoriteButton({
    required this.isFavorite,
    required this.onTap,
  });

  @override
  State<_AnimatedFavoriteButton> createState() =>
      _AnimatedFavoriteButtonState();
}

class _AnimatedFavoriteButtonState extends State<_AnimatedFavoriteButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _bounceController;

  @override
  void initState() {
    super.initState();
    _bounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _bounceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          _bounceController.forward(from: 0);
          widget.onTap();
        },
        borderRadius: BorderRadius.circular(24),
        child: AnimatedBuilder(
          animation: _bounceController,
          builder: (_, child) {
            final scale =
                1.0 + math.sin(_bounceController.value * math.pi) * 0.25;
            return Transform.scale(scale: scale, child: child);
          },
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: widget.isFavorite
                ? BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color:
                            AppTheme.accentPink.withValues(alpha: 0.3),
                        blurRadius: 12,
                      ),
                    ],
                  )
                : null,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, animation) =>
                  ScaleTransition(scale: animation, child: child),
              child: Icon(
                widget.isFavorite
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                key: ValueKey(widget.isFavorite),
                color: widget.isFavorite
                    ? AppTheme.accentPink
                    : AppTheme.textSecondary,
                size: 28,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Control button with active state
class _ControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool isActive;
  final double size;

  const _ControlButton({
    required this.icon,
    required this.onTap,
    this.isActive = false,
    this.size = 24,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        splashColor: AppTheme.primaryCyan.withValues(alpha: 0.1),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(
            icon,
            color: isActive
                ? AppTheme.primaryCyan
                : size > 30
                    ? AppTheme.textPrimary
                    : AppTheme.textMuted,
            size: size,
          ),
        ),
      ),
    );
  }
}

/// Bottom sheet list item
class _BottomSheetItem extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final VoidCallback onTap;

  const _BottomSheetItem({
    required this.icon,
    this.iconColor,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          child: Row(
            children: [
              Icon(icon, color: iconColor ?? AppTheme.textSecondary),
              const SizedBox(width: 16),
              Text(
                label,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
