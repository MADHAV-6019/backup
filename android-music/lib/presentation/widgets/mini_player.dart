import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/presentation/providers/player_provider.dart';
import 'package:melody_flow/presentation/screens/player/player_screen.dart';

/// Premium glassmorphic mini player with progress glow, marquee text,
/// and smooth swipe-to-dismiss for navigation.
class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final song = player.currentSong;

    if (song == null) return const SizedBox.shrink();

    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          PageRouteBuilder(
            pageBuilder: (_, _a, _b) => const PlayerScreen(),
            transitionsBuilder: (_, animation, _a, child) {
              return SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 1),
                  end: Offset.zero,
                ).animate(CurvedAnimation(
                  parent: animation,
                  curve: Curves.easeOutCubic,
                )),
                child: child,
              );
            },
            transitionDuration: const Duration(milliseconds: 400),
          ),
        );
      },
      onVerticalDragEnd: (details) {
        // Swipe up → open full player
        if (details.primaryVelocity != null &&
            details.primaryVelocity! < -300) {
          Navigator.of(context).push(
            PageRouteBuilder(
              pageBuilder: (_, _a, _b) => const PlayerScreen(),
              transitionsBuilder: (_, animation, _a, child) {
                return SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 1),
                    end: Offset.zero,
                  ).animate(CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeOutCubic,
                  )),
                  child: child,
                );
              },
              transitionDuration: const Duration(milliseconds: 400),
            ),
          );
        }
      },
      child: Container(
        margin: const EdgeInsets.fromLTRB(12, 0, 12, 4),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF1A1A2E).withValues(alpha: 0.94),
                    const Color(0xFF16213E).withValues(alpha: 0.90),
                    const Color(0xFF0D1B2A).withValues(alpha: 0.94),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: player.isPlaying
                      ? AppTheme.primaryCyan.withValues(alpha: 0.18)
                      : Colors.white.withValues(alpha: 0.06),
                  width: 0.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: player.isPlaying
                        ? AppTheme.primaryPurple.withValues(alpha: 0.20)
                        : AppTheme.primaryPurple.withValues(alpha: 0.10),
                    blurRadius: 24,
                    offset: const Offset(0, 4),
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.5),
                    blurRadius: 12,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Animated progress bar with glow
                  _GlowingProgressBar(
                    progress: player.progress,
                    isPlaying: player.isPlaying,
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 6, 10),
                    child: Row(
                      children: [
                        // Thumbnail with animated border glow
                        _AnimatedThumbnail(
                          imageUrl: song.thumbnailUrl,
                          isPlaying: player.isPlaying,
                        ),
                        const SizedBox(width: 12),
                        // Song info with marquee-like overflow
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                song.title,
                                style: TextStyle(
                                  color: player.isPlaying
                                      ? AppTheme.textPrimary
                                      : AppTheme.textSecondary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  // Source indicator dot
                                  Container(
                                    width: 5,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: song.source == 'jiosaavn'
                                          ? const Color(0xFF2BC5B4)
                                          : const Color(0xFFFF4444),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Expanded(
                                    child: Text(
                                      song.artist,
                                      style: TextStyle(
                                        color: AppTheme.textSecondary
                                            .withValues(alpha: 0.7),
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
                        // Controls
                        if (player.isLoading)
                          const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.primaryCyan,
                            ),
                          )
                        else ...[
                          _MiniControlButton(
                            icon: player.isPlaying
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            onTap: player.togglePlayPause,
                            isPrimary: true,
                            size: 32,
                          ),
                          const SizedBox(width: 2),
                          _MiniControlButton(
                            icon: Icons.skip_next_rounded,
                            onTap:
                                player.hasNext ? player.playNext : null,
                            size: 24,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Animated thumbnail with pulsing glow when playing
class _AnimatedThumbnail extends StatefulWidget {
  final String imageUrl;
  final bool isPlaying;

  const _AnimatedThumbnail({
    required this.imageUrl,
    required this.isPlaying,
  });

  @override
  State<_AnimatedThumbnail> createState() => _AnimatedThumbnailState();
}

class _AnimatedThumbnailState extends State<_AnimatedThumbnail>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
    if (widget.isPlaying) _pulseController.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant _AnimatedThumbnail oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isPlaying && !_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    } else if (!widget.isPlaying && _pulseController.isAnimating) {
      _pulseController.stop();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (_, child) {
        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(11),
            boxShadow: widget.isPlaying
                ? [
                    BoxShadow(
                      color: AppTheme.primaryCyan.withValues(
                          alpha: 0.15 + _pulseController.value * 0.15),
                      blurRadius: 8 + _pulseController.value * 6,
                    ),
                  ]
                : null,
          ),
          child: child,
        );
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(11),
        child: SizedBox(
          width: 48,
          height: 48,
          child: widget.imageUrl.isNotEmpty
              ? CachedNetworkImage(
                  imageUrl: widget.imageUrl,
                  fit: BoxFit.cover,
                  placeholder: (_, _a) => _placeholderIcon(),
                  errorWidget: (_, _a, _b) => _placeholderIcon(),
                )
              : _placeholderIcon(),
        ),
      ),
    );
  }

  Widget _placeholderIcon() {
    return Container(
      color: AppTheme.bgSurface,
      child: const Icon(Icons.music_note_rounded,
          color: AppTheme.textMuted, size: 20),
    );
  }
}

/// Animated glowing progress bar
class _GlowingProgressBar extends StatelessWidget {
  final double progress;
  final bool isPlaying;

  const _GlowingProgressBar({
    required this.progress,
    this.isPlaying = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 3,
      child: Stack(
        children: [
          // Track
          Container(
            height: 3,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.06),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(18),
              ),
            ),
          ),
          // Progress with glow
          AnimatedFractionallySizedBox(
            duration: const Duration(milliseconds: 300),
            widthFactor: progress.clamp(0.0, 1.0),
            child: Container(
              height: 3,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryPurple, AppTheme.primaryCyan],
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(18),
                ),
                boxShadow: isPlaying
                    ? [
                        BoxShadow(
                          color:
                              AppTheme.primaryCyan.withValues(alpha: 0.6),
                          blurRadius: 8,
                        ),
                      ]
                    : [
                        BoxShadow(
                          color:
                              AppTheme.primaryCyan.withValues(alpha: 0.3),
                          blurRadius: 4,
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

/// Animated fractionally sized box for smooth progress
class AnimatedFractionallySizedBox extends ImplicitlyAnimatedWidget {
  final double widthFactor;
  final Widget child;

  const AnimatedFractionallySizedBox({
    super.key,
    required super.duration,
    required this.widthFactor,
    required this.child,
  });

  @override
  AnimatedFractionallySizedBoxState createState() =>
      AnimatedFractionallySizedBoxState();
}

class AnimatedFractionallySizedBoxState
    extends AnimatedWidgetBaseState<AnimatedFractionallySizedBox> {
  Tween<double>? _widthFactor;

  @override
  void forEachTween(TweenVisitor<dynamic> visitor) {
    _widthFactor = visitor(_widthFactor, widget.widthFactor,
        (dynamic value) => Tween<double>(begin: value as double)) as Tween<double>?;
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      widthFactor: _widthFactor?.evaluate(animation) ?? widget.widthFactor,
      child: widget.child,
    );
  }
}

/// Mini control button with tap feedback
class _MiniControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final bool isPrimary;
  final double size;

  const _MiniControlButton({
    required this.icon,
    required this.onTap,
    this.isPrimary = false,
    this.size = 24,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        splashColor: AppTheme.primaryCyan.withValues(alpha: 0.1),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(
            icon,
            color: onTap != null
                ? (isPrimary
                    ? AppTheme.textPrimary
                    : AppTheme.textSecondary)
                : AppTheme.textMuted.withValues(alpha: 0.3),
            size: size,
          ),
        ),
      ),
    );
  }
}
