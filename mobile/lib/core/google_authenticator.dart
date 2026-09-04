import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'app_config.dart';

abstract interface class GoogleAuthenticator {
  bool get isConfigured;

  Future<String> authenticate();

  Future<void> signOut();
}

class GoogleAuthNotConfigured implements Exception {
  const GoogleAuthNotConfigured();
}

class NativeGoogleAuthenticator implements GoogleAuthenticator {
  final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  Future<void>? _initialization;

  @override
  bool get isConfigured {
    if (AppConfig.googleServerClientId.isEmpty) return false;
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return AppConfig.googleIosClientId.isNotEmpty;
    }
    return true;
  }

  @override
  Future<String> authenticate() async {
    if (!isConfigured) throw const GoogleAuthNotConfigured();

    await (_initialization ??= _googleSignIn.initialize(
      clientId: defaultTargetPlatform == TargetPlatform.iOS
          ? AppConfig.googleIosClientId
          : null,
      serverClientId: AppConfig.googleServerClientId,
    ));

    final account = await _googleSignIn.authenticate();
    final idToken = account.authentication.idToken;

    if (idToken == null || idToken.isEmpty) {
      throw StateError('Google no devolvió un token de identidad.');
    }

    return idToken;
  }

  @override
  Future<void> signOut() async {
    if (_initialization == null) return;
    await _googleSignIn.signOut();
  }
}
