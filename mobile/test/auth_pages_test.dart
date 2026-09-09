import 'dart:async';

import 'package:cabanas_playa_terco_admin/core/google_authenticator.dart';
import 'package:cabanas_playa_terco_admin/core/models.dart';
import 'package:cabanas_playa_terco_admin/core/providers.dart';
import 'package:cabanas_playa_terco_admin/features/auth/auth_widgets.dart';
import 'package:cabanas_playa_terco_admin/features/auth/login_page.dart';
import 'package:cabanas_playa_terco_admin/features/auth/pending_approval_page.dart';
import 'package:cabanas_playa_terco_admin/features/auth/register_page.dart';
import 'package:cabanas_playa_terco_admin/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('login shows brand, validates fields and toggles password', (
    tester,
  ) async {
    await tester.pumpWidget(_testApp(const LoginPage()));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('playa-terco-logo')), findsOneWidget);
    expect(find.text('Panel administrativo'), findsOneWidget);
    expect(find.text('Qué bueno tenerte de vuelta'), findsNothing);
    expect(find.text('Continuar con Google'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('login-submit-button')));
    await tester.tap(find.byKey(const Key('login-submit-button')));
    await tester.pump();

    expect(find.text('Ingresa un correo válido.'), findsOneWidget);
    expect(find.text('Ingresa tu contraseña.'), findsOneWidget);

    expect(find.byTooltip('Mostrar contraseña'), findsOneWidget);
    await tester.tap(find.byKey(const Key('login-password-toggle')));
    await tester.pump();
    expect(find.byTooltip('Ocultar contraseña'), findsOneWidget);
  });

  testWidgets('login explains when Google credentials are pending', (
    tester,
  ) async {
    await tester.pumpWidget(_testApp(const LoginPage()));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('google-auth-button')));
    await tester.tap(find.byKey(const Key('google-auth-button')));
    await tester.pump();

    expect(find.byKey(const Key('auth-error-banner')), findsOneWidget);
    expect(find.textContaining('Google estará disponible'), findsOneWidget);
  });

  testWidgets('registration validates required account fields', (tester) async {
    await tester.pumpWidget(_testApp(const RegisterPage()));
    await tester.pumpAndSettle();

    expect(find.byType(RegisterPage), findsOneWidget);
    await tester.ensureVisible(find.byKey(const Key('register-submit-button')));
    await tester.tap(find.byKey(const Key('register-submit-button')));
    await tester.pump();

    expect(find.text('Ingresa tu nombre completo.'), findsOneWidget);
    expect(find.text('Ingresa un correo válido.'), findsOneWidget);
    expect(find.text('Usa al menos 8 caracteres.'), findsOneWidget);
    expect(find.text('Confirma tu contraseña.'), findsOneWidget);
  });

  testWidgets('pending approval page identifies the requested account', (
    tester,
  ) async {
    const user = UserProfile(
      id: 7,
      name: 'Operadora',
      email: 'operadora@example.com',
      isAdmin: false,
      isStaff: false,
    );

    await tester.pumpWidget(
      const MaterialApp(home: PendingApprovalPage(user: user)),
    );

    expect(find.text('Tu acceso está pendiente'), findsOneWidget);
    expect(find.text('operadora@example.com'), findsOneWidget);
  });

  testWidgets('auth button exposes its loading state', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AuthPrimaryButton(
            label: 'Ingresar',
            onPressed: null,
            loading: true,
          ),
        ),
      ),
    );

    expect(find.byKey(const Key('auth-loading-indicator')), findsOneWidget);
  });

  testWidgets('registration stays mounted while loading and opens pending', (
    tester,
  ) async {
    late _ControlledAuthController controller;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith(() {
            controller = _ControlledAuthController();
            return controller;
          }),
          googleAuthenticatorProvider.overrideWithValue(
            _FakeGoogleAuthenticator(),
          ),
        ],
        child: const PlayaTercoAdminApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const Key('open-register-button')));
    await tester.tap(find.byKey(const Key('open-register-button')));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byKey(const Key('register-name-field')),
      'Validación ADB',
    );
    await tester.enterText(
      find.byKey(const Key('register-email-field')),
      'registro@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('register-password-field')),
      'Terco2026a',
    );
    await tester.enterText(
      find.byKey(const Key('register-confirmation-field')),
      'Terco2026a',
    );
    await tester.ensureVisible(find.byKey(const Key('register-submit-button')));
    await tester.tap(find.byKey(const Key('register-submit-button')));
    await tester.pump();

    expect(find.byType(RegisterPage), findsOneWidget);
    expect(find.byKey(const Key('auth-loading-indicator')), findsOneWidget);

    controller.completeRegistration();
    await tester.pumpAndSettle();

    expect(find.text('Tu acceso está pendiente'), findsOneWidget);
    expect(find.text('registro@example.com'), findsOneWidget);
  });

  for (final page in [const LoginPage(), const RegisterPage()]) {
    testWidgets('${page.runtimeType} fits Google on a compact phone', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(360, 740);
      tester.view.padding = FakeViewPadding(top: 24, bottom: 24);
      addTearDown(tester.view.reset);

      await tester.pumpWidget(_testApp(page));
      await tester.pumpAndSettle();

      final google = find.byKey(const Key('google-auth-button'));
      expect(google.hitTestable(), findsOneWidget);
      expect(tester.getRect(google).bottom, lessThanOrEqualTo(716));
      for (final field in tester.widgetList<TextFormField>(
        find.byType(TextFormField),
      )) {
        expect(find.byKey(field.key!).hitTestable(), findsOneWidget);
      }
      final submit = find.byKey(
        Key(
          page is LoginPage ? 'login-submit-button' : 'register-submit-button',
        ),
      );
      expect(submit.hitTestable(), findsOneWidget);
      expect(tester.getRect(submit).left, tester.getRect(google).left);
      expect(tester.getRect(submit).width, tester.getRect(google).width);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('registration remains usable with large text and keyboard', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(360, 740);
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _testApp(const RegisterPage(), textScaler: TextScaler.linear(1.8)),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    tester.view.viewInsets = FakeViewPadding(bottom: 300);
    await tester.pumpAndSettle();
    final confirmation = find.byKey(const Key('register-confirmation-field'));
    await tester.ensureVisible(confirmation);
    await tester.enterText(confirmation, 'Example123');
    await tester.pumpAndSettle();
    expect(confirmation.hitTestable(), findsOneWidget);
    expect(tester.takeException(), isNull);

    tester.view.viewInsets = FakeViewPadding();
    await tester.pumpAndSettle();
    final google = find.byKey(const Key('google-auth-button'));
    await tester.ensureVisible(google);
    expect(google.hitTestable(), findsOneWidget);
  });

  testWidgets('reduced motion leaves auth visible without animation', (
    tester,
  ) async {
    await tester.pumpWidget(_testApp(const LoginPage(), reduceMotion: true));
    await tester.pumpAndSettle();

    final animations = tester.widgetList<TweenAnimationBuilder<double>>(
      find.byType(TweenAnimationBuilder<double>),
    );
    expect(animations, isNotEmpty);
    expect(
      animations.every((widget) => widget.duration == Duration.zero),
      isTrue,
    );
    expect(
      find.byKey(const Key('login-submit-button')).hitTestable(),
      findsOneWidget,
    );
  });
}

Widget _testApp(
  Widget child, {
  TextScaler textScaler = TextScaler.noScaling,
  bool reduceMotion = false,
}) {
  return ProviderScope(
    overrides: [
      authControllerProvider.overrideWith(_FakeAuthController.new),
      googleAuthenticatorProvider.overrideWithValue(_FakeGoogleAuthenticator()),
    ],
    child: MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: textScaler, disableAnimations: reduceMotion),
        child: child!,
      ),
      home: child,
    ),
  );
}

class _FakeAuthController extends AuthController {
  @override
  Future<AuthSession?> build() async => null;
}

class _FakeGoogleAuthenticator implements GoogleAuthenticator {
  @override
  bool get isConfigured => false;

  @override
  Future<String> authenticate() => throw const GoogleAuthNotConfigured();

  @override
  Future<void> signOut() async {}
}

class _ControlledAuthController extends AuthController {
  final _registration = Completer<AuthResult>();

  @override
  Future<AuthSession?> build() async => null;

  @override
  Future<AuthResult> register(
    String name,
    String email,
    String password,
  ) async {
    state = const AsyncLoading();
    final result = await _registration.future;
    state = const AsyncData(null);
    return result;
  }

  void completeRegistration() {
    _registration.complete(
      const AuthResult(
        user: UserProfile(
          id: 12,
          name: 'Validación ADB',
          email: 'registro@example.com',
          isAdmin: false,
          isStaff: false,
        ),
        approvalRequired: true,
      ),
    );
  }
}
