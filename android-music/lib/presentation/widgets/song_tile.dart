import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/presentation/providers/player_provider.dart';
import 'package:melody_flow/presentation/providers/library_provider.dart';

/// Premium song list tile with glassmorphism, active state glow,
/// long-press context menu, and animated equalizer bars.
class SongTile extends StatefulWidget {
  final Song song;
  final VoidCallback? onTap;
  final List<Song>? playQueue;
  final int? queueIndex;
  final bool showSource;
  final String heroTagPrefix;

  const SongTile({
    super.key,
    required this.song,
    this.onTap,
    this.playQueue,
    this.queueIndex,
    this.showSource = true,
    this.heroTagPrefix = 'list',
  });

  @override
  State<SongTile> createState() => _SongTileState();
}

class _SongTileState extends State<SongTile>
    with SingleTickerProviderStateMixin {
  late final AnimationController _tapController;
  late final Animation<double> _tapScale;
  bool _isTapping = false;

  @override
  void initState() {
    super.initState();
    _tapController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _tapScale = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _tapController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _tapController.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (_isTapping) return; // Prevent rapid double-taps
    _isTapping = true;
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) _isTapping = false;
    });

    final player = context.read<PlayerProvider>();
    final library = context.read<LibraryProvider>();

    if (widget.onTap != null) {
      widget.onTap!();
    } else if (widget.playQueue != null) {
      player.playQueue(widget.playQueue!,
          startIndex: widget.queueIndex ?? 0);
    } else {
      player.playSong(widget.song);
    }
    library.addToRecent(widget.song);
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final library = context.watch<LibraryProvider>();
    final isCurrentSong = player.currentSong?.id == widget.song.id;
    final isPlaying = isCurrentSong && player.isPlaying;

    return GestureDetector(
      onTapDown: (_) => _tapController.forward(),
      onTapUp: (_) {
        _tapController.reverse();
        _handleTap();
      },
      onTapCancel: () => _tapController.reverse(),
      onLongPress: () => _showContextMenu(context, library),
      child: AnimatedBuilder(
        animation: _tapScale,
        builder: (_, child) => Transform.scale(
          scale: _tapScale.value,
          child: child,
        ),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 3,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            gradient: isCurrentSong
                ? LinearGradient(
                    colors: [
                      AppTheme.primaryPurple.withValues(alpha: 0.18),
                      AppTheme.primaryCyan.withValues(alpha: 0.08),
                    ],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  )
                : null,
            color: isCurrentSong ? null : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: isCurrentSong
                ? Border.all(
                    color: AppTheme.primaryCyan.withValues(alpha: 0.25),
                    width: 0.5,
                  )
                : null,
            boxShadow: isCurrentSong
                ? [
                    BoxShadow(
                      color:
                          AppTheme.primaryPurple.withValues(alpha: 0.1),
                      blurRadius: 12,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              // Thumbnail with active glow
              Hero(
                tag: 'song_art_${widget.heroTagPrefix}_${widget.song.id}',
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: isPlaying
                        ? [
                            BoxShadow(
                              color: AppTheme.primaryCyan
                                  .withValues(alpha: 0.3),
                              blurRadius: 10,
                            ),
                          ]
                        : null,
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: 52,
                      height: 52,
                      child: Stack(
                        children: [
                          widget.song.thumbnailUrl.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: widget.song.thumbnailUrl,
                                  fit: BoxFit.cover,
                                  width: 52,
                                  height: 52,
                                  placeholder: (_, _a) => _placeholder(),
                                  errorWidget: (_, _a, _b) =>
                                      _placeholder(),
                                )
                              : _placeholder(),
                          // Playing overlay
                          if (isPlaying)
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                color:
                                    Colors.black.withValues(alpha: 0.45),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.equalizer_rounded,
                                  color: AppTheme.primaryCyan,
                                  size: 22,
                                ),
                              ),
                            )
                          else if (isCurrentSong)
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                color:
                                    Colors.black.withValues(alpha: 0.35),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.pause_rounded,
                                  color: AppTheme.primaryCyan,
                                  size: 22,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              // Song info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.song.title,
                      style: TextStyle(
                        color: isCurrentSong
                            ? AppTheme.primaryCyan
                            : AppTheme.textPrimary,
                        fontSize: 15,
                        fontWeight: isCurrentSong
                            ? FontWeight.w700
                            : FontWeight.w500,
                        letterSpacing: -0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        if (widget.showSource) ...[
                          _SourceBadge(source: widget.song.source),
                          const SizedBox(width: 6),
                        ],
                        Expanded(
                          child: Text(
                            widget.song.artist,
                            style: TextStyle(
                              color: AppTheme.textSecondary
                                  .withValues(alpha: 0.8),
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // Duration
              if (widget.song.duration.inSeconds > 0)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Text(
                    formatDuration(widget.song.duration),
                    style: TextStyle(
                      color: isCurrentSong
                          ? AppTheme.primaryCyan.withValues(alpha: 0.7)
                          : AppTheme.textMuted.withValues(alpha: 0.7),
                      fontSize: 12,
                      fontFeatures: const [
                        FontFeature.tabularFigures()
                      ],
                    ),
                  ),
                ),
              // Playing indicator or favorite
              isPlaying
                  ? const _PlayingIndicator()
                  : Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () =>
                            library.toggleFavorite(widget.song),
                        borderRadius: BorderRadius.circular(20),
                        splashColor:
                            AppTheme.accentPink.withValues(alpha: 0.1),
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: AnimatedSwitcher(
                            duration:
                                const Duration(milliseconds: 250),
                            transitionBuilder: (child, animation) =>
                                ScaleTransition(
                              scale: animation,
                              child: child,
                            ),
                            child: Icon(
                              library.isFavorite(widget.song)
                                  ? Icons.favorite_rounded
                                  : Icons.favorite_border_rounded,
                              key: ValueKey(
                                  library.isFavorite(widget.song)),
                              color: library.isFavorite(widget.song)
                                  ? AppTheme.accentPink
                                  : AppTheme.textMuted
                                      .withValues(alpha: 0.5),
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  void _showContextMenu(BuildContext context, LibraryProvider library) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
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
              const SizedBox(height: 16),
              // Song header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 44,
                        height: 44,
                        child: widget.song.thumbnailUrl.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: widget.song.thumbnailUrl,
                                fit: BoxFit.cover,
                              )
                            : Container(
                                color: AppTheme.bgSurface,
                                child: const Icon(
                                    Icons.music_note_rounded,
                                    color: AppTheme.textMuted,
                                    size: 20),
                              ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.song.title,
                            style: const TextStyle(
                              color: AppTheme.textPrimary,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            widget.song.artist,
                            style: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Divider(
                  color: Colors.white.withValues(alpha: 0.05),
                  height: 1),
              const SizedBox(height: 8),
              _ContextMenuItem(
                icon: library.isFavorite(widget.song)
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                iconColor: library.isFavorite(widget.song)
                    ? AppTheme.accentPink
                    : AppTheme.textSecondary,
                label: library.isFavorite(widget.song)
                    ? 'Remove from Favorites'
                    : 'Add to Favorites',
                onTap: () {
                  library.toggleFavorite(widget.song);
                  Navigator.pop(ctx);
                },
              ),
              _ContextMenuItem(
                icon: Icons.queue_music_rounded,
                label: 'Add to Queue',
                onTap: () {
                  context.read<PlayerProvider>().addToQueue(widget.song);
                  Navigator.pop(ctx);
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
              _ContextMenuItem(
                icon: Icons.play_circle_outline_rounded,
                label: 'Play Next',
                onTap: () {
                  context.read<PlayerProvider>().addToQueue(widget.song);
                  Navigator.pop(ctx);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 52,
      height: 52,
      decoration: const BoxDecoration(
        gradient: AppTheme.cardGradient,
      ),
      child: const Icon(
        Icons.music_note_rounded,
        color: AppTheme.textMuted,
        size: 22,
      ),
    );
  }
}

class _SourceBadge extends StatelessWidget {
  final String source;
  const _SourceBadge({required this.source});

  @override
  Widget build(BuildContext context) {
    final isJiosaavn = source == 'jiosaavn';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isJiosaavn
            ? const Color(0xFF2BC5B4).withValues(alpha: 0.12)
            : const Color(0xFFFF0000).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: isJiosaavn
              ? const Color(0xFF2BC5B4).withValues(alpha: 0.2)
              : const Color(0xFFFF4444).withValues(alpha: 0.2),
          width: 0.5,
        ),
      ),
      child: Text(
        isJiosaavn ? 'JS' : 'YT',
        style: TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w700,
          color: isJiosaavn
              ? const Color(0xFF2BC5B4)
              : const Color(0xFFFF4444),
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

class _PlayingIndicator extends StatefulWidget {
  const _PlayingIndicator();

  @override
  State<_PlayingIndicator> createState() => _PlayingIndicatorState();
}

class _PlayingIndicatorState extends State<_PlayingIndicator>
    with TickerProviderStateMixin {
  late final List<AnimationController> _controllers;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(3, (i) {
      return AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 350 + i * 120),
      )..repeat(reverse: true);
    });
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8),
      child: SizedBox(
        width: 20,
        height: 20,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: List.generate(3, (i) {
            return AnimatedBuilder(
              animation: _controllers[i],
              builder: (_, _a) {
                return Container(
                  width: 3,
                  height: 5 + _controllers[i].value * 15,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        AppTheme.primaryCyan,
                        AppTheme.primaryPurple,
                      ],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                );
              },
            );
          }),
        ),
      ),
    );
  }
}

/// Bottom-sheet menu item
class _ContextMenuItem extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final VoidCallback onTap;

  const _ContextMenuItem({
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
