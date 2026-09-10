import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/router.dart';
import 'core/notification_coordinator.dart';

@pragma('vm:entry-point')
Future<void> firebaseBackgroundMessage(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Android displays notification payloads. Inbox state is refreshed on resume.
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundMessage);
  } catch (_) {
    // Firebase is optional in local/dev builds until platform config files exist.
  }

  await initializeDateFormatting('es_CO');
  runApp(const ProviderScope(child: PlayaTercoAdminApp()));
}

class PlayaTercoAdminApp extends ConsumerWidget {
  const PlayaTercoAdminApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return NotificationCoordinator(
      child: MaterialApp.router(
        scaffoldMessengerKey: appMessengerKey,
        locale: const Locale('es', 'CO'),
        supportedLocales: const [Locale('es', 'CO')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        title: 'Cabañas Playa Terco',
        debugShowCheckedModeBanner: false,
        builder: (context, child) => ColoredBox(
          color: Theme.of(context).scaffoldBackgroundColor,
          child: SafeArea(top: false, child: child!),
        ),
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF0F766E),
            brightness: Brightness.light,
          ),
          scaffoldBackgroundColor: const Color(0xFFF7F7F2),
          cardTheme: const CardThemeData(
            elevation: 0,
            margin: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
          inputDecorationTheme: const InputDecorationTheme(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(8)),
            ),
          ),
        ),
        routerConfig: router,
      ),
    );
  }
}
