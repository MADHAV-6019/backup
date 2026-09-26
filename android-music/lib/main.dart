import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'package:melody_flow/config/theme.dart';
import 'package:melody_flow/data/repositories/music_repository.dart';
import 'package:melody_flow/presentation/providers/player_provider.dart';
import 'package:melody_flow/presentation/providers/search_provider.dart';
import 'package:melody_flow/presentation/providers/library_provider.dart';
import 'package:melody_flow/presentation/screens/main_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Hive.initFlutter();

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppTheme.bgDark,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  runApp(const MelodyFlowApp());
}

class MelodyFlowApp extends StatelessWidget {
  const MelodyFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    final musicRepo = MusicRepository();

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => PlayerProvider(repo: musicRepo),
        ),
        ChangeNotifierProvider(
          create: (_) => SearchProvider(repo: musicRepo),
        ),
        ChangeNotifierProvider(
          create: (_) => LibraryProvider()..init(),
        ),
      ],
      child: MaterialApp(
        title: 'MelodyFlow',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const MainShell(),
      ),
    );
  }
}
