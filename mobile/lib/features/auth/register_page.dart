import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/google_authenticator.dart';
import '../../core/providers.dart';
import '../../shared/widgets.dart';
import 'auth_widgets.dart';

class RegisterPage extends ConsumerStatefulWidget {
  const RegisterPage({super.key});

  @override
  ConsumerState<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends ConsumerState<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  bool _showPassword = false;
  bool _showConfirmation = false;
  bool _googleLoading = false;
  String? _formError;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmation.dispose();
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
            const SizedBox(height: 26),
            const AuthIntro(
              eyebrow: 'Solicitud de acceso',
              title: 'Crea tu cuenta',
              description:
                  'Regístrate y un administrador revisará tu solicitud antes de habilitar el panel.',
            ),
            const SizedBox(height: 26),
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
                    fieldKey: const Key('register-name-field'),
                    label: 'Nombre completo',
                    hint: 'Tu nombre',
                    icon: Icons.person_outline_rounded,
                    controller: _name,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.name],
                    validator: AuthValidators.name,
                  ),
                  const SizedBox(height: 18),
                  AuthTextField(
                    fieldKey: const Key('register-email-field'),
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
                    fieldKey: const Key('register-password-field'),
                    label: 'Contraseña',
                    hint: 'Mínimo 8 caracteres',
                    icon: Icons.lock_outline_rounded,
                    controller: _password,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.newPassword],
                    obscureText: !_showPassword,
                    validator: AuthValidators.newPassword,
                    suffixIcon: IconButton(
                      key: const Key('register-password-toggle'),
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
                  const SizedBox(height: 18),
                  AuthTextField(
                    fieldKey: const Key('register-confirmation-field'),
                    label: 'Confirmar contraseña',
                    hint: 'Repite tu contraseña',
                    icon: Icons.lock_reset_rounded,
                    controller: _confirmation,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.newPassword],
                    obscureText: !_showConfirmation,
                    validator: (value) {
                      if ((value ?? '').isEmpty) {
                        return 'Confirma tu contraseña.';
                      }
                      if (value != _password.text) {
                        return 'Las contraseñas no coinciden.';
                      }
                      return null;
                    },
                    onFieldSubmitted: (_) => _submit(),
                    suffixIcon: IconButton(
                      key: const Key('register-confirmation-toggle'),
                      tooltip: _showConfirmation
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña',
                      onPressed: () => setState(
                        () => _showConfirmation = !_showConfirmation,
                      ),
                      icon: Icon(
                        _showConfirmation
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  AuthPrimaryButton(
                    buttonKey: const Key('register-submit-button'),
                    label: 'Crear cuenta',
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
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                const Text(
                  '¿Ya tienes cuenta?',
                  style: TextStyle(color: authMuted),
                ),
                TextButton(
                  key: const Key('back-to-login-button'),
                  onPressed: isBusy ? null : () => context.go('/login'),
                  child: const Text(
                    'Inicia sesión',
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
          .register(_name.text.trim(), _email.text.trim(), _password.text);
      if (mounted) context.go('/pending-approval', extra: result.user);
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
