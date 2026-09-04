import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/google_authenticator.dart';
import '../../core/providers.dart';
import '../../shared/widgets.dart';
import 'auth_widgets.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _showPassword = false;
  bool _googleLoading = false;
  String? _formError;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final googleConfigured = ref
        .watch(googleAuthenticatorProvider)
        .isConfigured;
    final isBusy = auth.isLoading || _googleLoading;

    return AuthScaffold(
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AuthBrandHeader(),
            const SizedBox(height: 30),
            const AuthIntro(
              eyebrow: 'Panel administrativo',
              title: 'Qué bueno tenerte de vuelta',
              description:
                  'Ingresa para gestionar reservas, disponibilidad y la operación de Playa Terco.',
            ),
            const SizedBox(height: 28),
            if (_formError != null) ...[
              AuthErrorBanner(message: _formError!),
              const SizedBox(height: 18),
            ],
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AuthTextField(
                    fieldKey: const Key('login-email-field'),
                    label: 'Correo electrónico',
                    hint: 'tu@email.com',
                    icon: Icons.mail_outline_rounded,
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    validator: AuthValidators.email,
                  ),
                  const SizedBox(height: 18),
                  AuthTextField(
                    fieldKey: const Key('login-password-field'),
                    label: 'Contraseña',
                    hint: 'Ingresa tu contraseña',
                    icon: Icons.lock_outline_rounded,
                    controller: _password,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                    obscureText: !_showPassword,
                    validator: AuthValidators.loginPassword,
                    onFieldSubmitted: (_) => _submit(),
                    suffixIcon: IconButton(
                      key: const Key('login-password-toggle'),
                      tooltip: _showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña',
                      onPressed: () =>
                          setState(() => _showPassword = !_showPassword),
                      icon: Icon(
                        _showPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  AuthPrimaryButton(
                    buttonKey: const Key('login-submit-button'),
                    label: 'Iniciar sesión',
                    loading: auth.isLoading && !_googleLoading,
                    onPressed: isBusy ? null : _submit,
                  ),
                ],
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 22),
              child: AuthDivider(),
            ),
            GoogleAuthButton(
              configured: googleConfigured,
              loading: _googleLoading,
              onPressed: isBusy ? null : () => _submitGoogle(googleConfigured),
            ),
            const SizedBox(height: 22),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  '¿Primera vez por aquí?',
                  style: TextStyle(color: authMuted),
                ),
                TextButton(
                  key: const Key('open-register-button'),
                  onPressed: isBusy ? null : () => context.go('/register'),
                  child: const Text(
                    'Crear cuenta',
                    style: TextStyle(
                      color: authPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 1, color: Color(0xFFDADDDC)),
            const AuthSecurityNote(),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    FocusManager.instance.primaryFocus?.unfocus();
    if (!_formKey.currentState!.validate()) return;
    setState(() => _formError = null);

    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .login(_email.text.trim(), _password.text);
      if (mounted && result.approvalRequired) {
        context.go('/pending-approval', extra: result.user);
      }
    } catch (error) {
      if (mounted) setState(() => _formError = errorMessage(error));
    }
  }

  Future<void> _submitGoogle(bool googleConfigured) async {
    if (!googleConfigured) {
      setState(() {
        _formError =
            'Google estará disponible cuando se configuren las credenciales de la aplicación.';
      });
      return;
    }

    setState(() {
      _formError = null;
      _googleLoading = true;
    });

    try {
      final result = await ref
          .read(authControllerProvider.notifier)
          .loginWithGoogle();
      if (mounted && result.approvalRequired) {
        context.go('/pending-approval', extra: result.user);
      }
    } on GoogleAuthNotConfigured {
      if (mounted) {
        setState(() {
          _formError =
              'Google estará disponible cuando se configuren las credenciales de la aplicación.';
        });
      }
    } catch (error) {
      if (mounted) setState(() => _formError = errorMessage(error));
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }
}
