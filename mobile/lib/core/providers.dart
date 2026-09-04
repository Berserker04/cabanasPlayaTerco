import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_repository.dart';
import 'app_config.dart';
import 'google_authenticator.dart';
import 'models.dart';
import 'push_token_service.dart';
import 'secure_token_store.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final tokenStoreProvider = Provider<SecureTokenStore>((ref) {
  return SecureTokenStore(ref.watch(secureStorageProvider));
});

final pushTokenServiceProvider = Provider<PushTokenService>((ref) {
  return PushTokenService();
});

final googleAuthenticatorProvider = Provider<GoogleAuthenticator>((ref) {
  return NativeGoogleAuthenticator();
});

final dioProvider = Provider<Dio>((ref) {
  final tokenStore = ref.watch(tokenStoreProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Accept': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await tokenStore.read();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ),
  );

  return dio;
});

final apiRepositoryProvider = Provider<ApiRepository>((ref) {
  return ApiRepository(
    ref.watch(dioProvider),
    ref.watch(pushTokenServiceProvider),
  );
});

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSession?>(AuthController.new);

class AuthController extends AsyncNotifier<AuthSession?> {
  @override
  Future<AuthSession?> build() async {
    final tokenStore = ref.watch(tokenStoreProvider);
    final repository = ref.watch(apiRepositoryProvider);
    final token = await tokenStore.read();
    if (token == null || token.isEmpty) {
      return null;
    }

    try {
      final user = await repository.currentUser();
      return AuthSession(user: user, token: token);
    } catch (_) {
      await tokenStore.clear();
      return null;
    }
  }

  Future<AuthResult> login(String email, String password) {
    return _authenticate(
      () => ref
          .read(apiRepositoryProvider)
          .login(email: email, password: password),
    );
  }

  Future<AuthResult> register(String name, String email, String password) {
    return _authenticate(
      () => ref
          .read(apiRepositoryProvider)
          .register(name: name, email: email, password: password),
    );
  }

  Future<AuthResult> loginWithGoogle() {
    return _authenticate(() async {
      final idToken = await ref
          .read(googleAuthenticatorProvider)
          .authenticate();
      return ref.read(apiRepositoryProvider).loginWithGoogle(idToken);
    });
  }

  Future<AuthResult> _authenticate(
    Future<AuthResult> Function() request,
  ) async {
    state = const AsyncLoading();
    try {
      final tokenStore = ref.read(tokenStoreProvider);
      final result = await request();
      final session = result.session;

      if (session != null) {
        await tokenStore.save(session.token);
      }

      state = AsyncData(session);
      return result;
    } catch (error, stackTrace) {
      state = AsyncError(error, stackTrace);
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await ref.read(apiRepositoryProvider).logout();
      await ref.read(googleAuthenticatorProvider).signOut();
    } finally {
      await ref.read(tokenStoreProvider).clear();
      state = const AsyncData(null);
    }
  }
}
