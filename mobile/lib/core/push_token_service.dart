import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class PushTokenService {
  final _local = FlutterLocalNotificationsPlugin();
  final List<StreamSubscription<Object?>> _subscriptions = [];
  bool _localReady = false;
  bool _launchChecked = false;
  int _generation = 0;
  bool get configured => Firebase.apps.isNotEmpty;
  final _seen = <String>{};

  Future<String?> getToken() async {
    if (!configured) return null;
    return FirebaseMessaging.instance.getToken();
  }

  Future<void> start({
    bool requestPermission = true,
    required Future<void> Function(String) onToken,
    required void Function(int, String) onMessage,
    required void Function(int) onOpen,
    required void Function(String?) onStatus,
  }) async {
    await stop();
    final generation = _generation;
    if (!configured) {
      onStatus('Los avisos del teléfono no están disponibles en esta versión.');
      return;
    }
    try {
      await _local.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('ic_notification'),
          iOS: DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false,
          ),
        ),
        onDidReceiveNotificationResponse: (response) {
          final id = int.tryParse(response.payload ?? '');
          if (generation == _generation && id != null && id > 0) onOpen(id);
        },
      );
      _localReady = true;
      await _local
          .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin
          >()
          ?.createNotificationChannel(
            const AndroidNotificationChannel(
              'quotations',
              'Cotizaciones de la web',
              description: 'Nuevas solicitudes de turistas',
              importance: Importance.high,
            ),
          );
      if (generation != _generation) return;
      final messaging = FirebaseMessaging.instance;
      // Permission is requested only from an authenticated staff session.
      final permission = requestPermission
          ? await messaging.requestPermission()
          : await messaging.getNotificationSettings();
      if (generation != _generation) return;
      if (permission.authorizationStatus == AuthorizationStatus.denied) {
        onStatus(
          'Las notificaciones están desactivadas. Las solicitudes siguen en Cotizaciones.',
        );
        return;
      }
      Future<void> register(String token) async {
        if (generation != _generation) return;
        try {
          await onToken(token);
          if (generation == _generation) onStatus(null);
        } catch (_) {
          if (generation == _generation) {
            onStatus(
              'No se pudo activar el aviso del teléfono. Puedes reintentar.',
            );
          }
        }
      }

      void openMessage(RemoteMessage message) {
        if (generation != _generation ||
            message.data['type'] != 'lead.created') {
          return;
        }
        final id = int.tryParse(message.data['lead_id']?.toString() ?? '');
        if (id != null && id > 0) onOpen(id);
      }

      _subscriptions.add(messaging.onTokenRefresh.listen(register));
      _subscriptions.add(
        FirebaseMessaging.onMessageOpenedApp.listen(openMessage),
      );
      _subscriptions.add(
        FirebaseMessaging.onMessage.listen((message) {
          if (generation != _generation ||
              message.data['type'] != 'lead.created') {
            return;
          }
          final id = int.tryParse(message.data['lead_id']?.toString() ?? '');
          if (id == null || id < 1) return;
          final key = message.messageId ?? 'lead-$id';
          if (!_seen.add(key)) return;
          if (_seen.length > 100) _seen.remove(_seen.first);
          onMessage(
            id,
            message.notification?.body ??
                'Un turista dejó una solicitud de cotización.',
          );
        }),
      );
      final token = await getToken();
      if (token != null) await register(token);
      if (!_launchChecked) {
        _launchChecked = true;
        final initial = await messaging.getInitialMessage();
        if (initial != null) openMessage(initial);
        final localLaunch = await _local.getNotificationAppLaunchDetails();
        final launchId = int.tryParse(
          localLaunch?.notificationResponse?.payload ?? '',
        );
        if (generation == _generation &&
            localLaunch?.didNotificationLaunchApp == true &&
            launchId != null) {
          onOpen(launchId);
        }
      }
    } catch (_) {
      if (generation == _generation) {
        onStatus(
          'No se pudo activar el aviso del teléfono. Puedes reintentar.',
        );
      }
    }
  }

  Future<void> stop({bool deleteToken = false}) async {
    _generation++;
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
    _seen.clear();
    if (_localReady) await _local.cancelAll();
    if (deleteToken && configured) {
      try {
        await FirebaseMessaging.instance.deleteToken();
      } catch (_) {}
    }
  }
}
