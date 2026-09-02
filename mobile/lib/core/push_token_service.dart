import 'package:firebase_messaging/firebase_messaging.dart';

class PushTokenService {
  Future<String?> getToken() async {
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      return messaging.getToken();
    } catch (_) {
      return null;
    }
  }
}
