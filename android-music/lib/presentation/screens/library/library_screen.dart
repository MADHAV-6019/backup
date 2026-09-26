import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/presentation/providers/library_provider.dart';
import 'package:melody_flow/presentation/widgets/song_tile.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen>
    with TickerProviderStateMixin {
  late final TabController _tabController;
  late final AnimationController _entryController;
  late final Animation<double> _headerFade;
  late final Animation<double> _tabsFade;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _headerFade = CurvedAnimation(
      parent: _entryController,
      curve: const Interval(0.0, 0.5, curve: Curves.easeOut),
    );
    _tabsFade = CurvedAnimation(
      parent: _entryController,
      curve: const Interval(0.2, 0.8, curve: Curves.easeOut),
    );
    _entryController.forward();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _entryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── Header with stats ───────────────
          FadeTransition(
            opacity: _headerFade,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, 0.15),
                end: Offset.zero,
              ).animate(_headerFade),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Library',
                      style: Theme.of(context)
                          .textTheme
                          .displayMedium
                          ?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                    ),
                    const Spacer(),
                    // Quick stats
                    _StatBadge(
                      icon: Icons.favorite_rounded,
                      count: library.favorites.length,
                      color: AppTheme.accentPink,
                    ),
                    const SizedBox(width: 8),
                    _StatBadge(
                      icon: Icons.history_rounded,
                      count: library.recentSongs.length,
                      color: AppTheme.primaryCyan,
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ─── Tab bar ────────────────────────
          FadeTransition(
            opacity: _tabsFade,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
              child: Container(
                height: 46,
                decoration: BoxDecoration(
                  color: AppTheme.bgSurface.withValues(alpha: 0.6),
                  borderRadius:
                      BorderRadius.circular(AppTheme.radiusRound),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.04),
                    width: 0.5,
                  ),
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius:
                        BorderRadius.circular(AppTheme.radiusRound),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryPurple
                            .withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  labelColor: Colors.white,
                  unselectedLabelColor: AppTheme.textMuted,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  tabs: [
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('❤️ '),
                          Flexible(
                            child: Text(
                              'Favorites (${library.favorites.length})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Tab(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('🕐 '),
                          Flexible(
                            child: Text(
                              'Recent (${library.recentSongs.length})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ─── Content ────────────────────────
          Expanded(
            child: FadeTransition(
              opacity: _tabsFade,
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Favorites tab
                  library.favorites.isEmpty
                      ? _EmptyState(
                          icon: Icons.favorite_border_rounded,
                          title: 'No favorites yet',
                          subtitle: 'Tap ❤️ on any song to save it',
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.accentPink
                                  .withValues(alpha: 0.1),
                              AppTheme.accentPink
                                  .withValues(alpha: 0.03),
                            ],
                          ),
                          accentColor: AppTheme.accentPink,
                        )
                      : ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.only(
                              top: 8, bottom: 140),
                          itemCount: library.favorites.length,
                          itemBuilder: (context, index) {
                            return SongTile(
                              song: library.favorites[index],
                              playQueue: library.favorites,
                              queueIndex: index,
                              heroTagPrefix: 'fav',
                            );
                          },
                        ),
                  // Recent tab
                  library.recentSongs.isEmpty
                      ? _EmptyState(
                          icon: Icons.history_rounded,
                          title: 'Nothing played yet',
                          subtitle:
                              'Your listening history will show up here',
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryCyan
                                  .withValues(alpha: 0.1),
                              AppTheme.primaryCyan
                                  .withValues(alpha: 0.03),
                            ],
                          ),
                          accentColor: AppTheme.primaryCyan,
                        )
                      : ListView.builder(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.only(
                              top: 8, bottom: 140),
                          itemCount: library.recentSongs.length,
                          itemBuilder: (context, index) {
                            return SongTile(
                              song: library.recentSongs[index],
                              playQueue: library.recentSongs,
                              queueIndex: index,
                              heroTagPrefix: 'librecent',
                            );
                          },
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

/// Compact stat badge for header
class _StatBadge extends StatelessWidget {
  final IconData icon;
  final int count;
  final Color color;

  const _StatBadge({
    required this.icon,
    required this.count,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.15),
          width: 0.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 5),
          Text(
            '$count',
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Gradient gradient;
  final Color accentColor;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
    this.accentColor = AppTheme.primaryCyan,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: gradient,
              shape: BoxShape.circle,
            ),
            child: ShaderMask(
              shaderCallback: (bounds) =>
                  AppTheme.primaryGradient.createShader(bounds),
              child: Icon(
                icon,
                size: 56,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: TextStyle(
              color: AppTheme.textMuted.withValues(alpha: 0.8),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
