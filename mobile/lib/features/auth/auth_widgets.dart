import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const authBackground = Color(0xFFF4F8F7);
const authPrimary = Color(0xFF155E5B);
const authAccent = Color(0xFF0E7490);
const authText = Color(0xFF171717);
const authMuted = Color(0xFF5F6368);

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final keyboardOpen = media.viewInsets.bottom > 0;
    final reduceMotion = media.disableAnimations;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: const Color(0xFF082F2E),
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFF082F2E),
        resizeToAvoidBottomInset: false,
        body: Stack(
          fit: StackFit.expand,
          children: [
            const _AuthBackdrop(),
            SafeArea(
              child: Padding(
                padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
                child: SingleChildScrollView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: EdgeInsets.fromLTRB(
                    18,
                    keyboardOpen ? 8 : 12,
                    18,
                    12,
                  ),
                  child: Align(
                    alignment: Alignment.topCenter,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 430),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const AuthBrandHeader(),
                          const SizedBox(height: 12),
                          TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0, end: 1),
                            duration: reduceMotion
                                ? Duration.zero
                                : const Duration(milliseconds: 420),
                            curve: Curves.easeOutCubic,
                            builder: (context, value, child) => Opacity(
                              opacity: value,
                              child: Transform.translate(
                                offset: Offset(0, 12 * (1 - value)),
                                child: child,
                              ),
                            ),
                            child: Container(
                              key: const Key('auth-form-panel'),
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: authBackground.withValues(alpha: 0.97),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: Colors.white),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color(0x26002120),
                                    blurRadius: 30,
                                    offset: Offset(0, 12),
                                  ),
                                ],
                              ),
                              child: Theme(
                                data: Theme.of(context).copyWith(
                                  inputDecorationTheme:
                                      const InputDecorationTheme(
                                        filled: true,
                                        fillColor: Colors.white,
                                        isDense: true,
                                        floatingLabelBehavior:
                                            FloatingLabelBehavior.always,
                                        constraints: BoxConstraints(
                                          minHeight: 54,
                                        ),
                                        contentPadding: EdgeInsets.symmetric(
                                          horizontal: 16,
                                          vertical: 15,
                                        ),
                                        labelStyle: TextStyle(
                                          color: Color(0xFF485B59),
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                        ),
                                        hintStyle: TextStyle(
                                          color: Color(0xFF788582),
                                          fontSize: 14,
                                        ),
                                        prefixIconColor: Color(0xFF8A8A8A),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(14),
                                          ),
                                          borderSide: BorderSide(
                                            color: Color(0xFFDADDDC),
                                          ),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(14),
                                          ),
                                          borderSide: BorderSide(
                                            color: Color(0xFFDADDDC),
                                          ),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(14),
                                          ),
                                          borderSide: BorderSide(
                                            color: authPrimary,
                                            width: 1.7,
                                          ),
                                        ),
                                        errorBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(14),
                                          ),
                                          borderSide: BorderSide(
                                            color: Color(0xFFB42318),
                                          ),
                                        ),
                                        focusedErrorBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(14),
                                          ),
                                          borderSide: BorderSide(
                                            color: Color(0xFFB42318),
                                            width: 1.7,
                                          ),
                                        ),
                                      ),
                                ),
                                child: child,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AuthBrandHeader extends StatelessWidget {
  const AuthBrandHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Semantics(
          label: 'Cabañas Playa Terco',
          image: true,
          child: Image.asset(
            'assets/branding/terco_logo_nav.png',
            key: const Key('playa-terco-logo'),
            width: 78,
            height: 52,
            fit: BoxFit.contain,
          ),
        ),
        const SizedBox(width: 10),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Playa Terco',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Text(
                'Panel administrativo',
                style: TextStyle(color: Color(0xFFDEEFEB), fontSize: 10),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.82),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFFD8E7E5)),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_on_outlined, size: 16, color: authPrimary),
              SizedBox(width: 4),
              Text(
                'Nuquí',
                style: TextStyle(
                  color: authPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class AuthModeSwitch extends StatelessWidget {
  const AuthModeSwitch({
    super.key,
    required this.registering,
    required this.enabled,
    required this.onChanged,
  });

  final bool registering;
  final bool enabled;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFE6EEEB),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          children: [
            _tab(
              label: 'Iniciar sesión',
              selected: !registering,
              key: const Key('back-to-login-button'),
            ),
            _tab(
              label: 'Crear cuenta',
              selected: registering,
              key: const Key('open-register-button'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tab({
    required String label,
    required bool selected,
    required Key key,
  }) {
    return Expanded(
      child: Semantics(
        selected: selected,
        child: TextButton(
          key: key,
          onPressed: enabled ? (selected ? () {} : onChanged) : null,
          style: TextButton.styleFrom(
            minimumSize: const Size(0, 48),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
            backgroundColor: selected ? Colors.white : Colors.transparent,
            foregroundColor: selected ? authPrimary : authMuted,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            textStyle: TextStyle(
              fontSize: 13,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
            ),
          ),
          child: Text(label, textAlign: TextAlign.center),
        ),
      ),
    );
  }
}

class AuthIntro extends StatelessWidget {
  const AuthIntro({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.description,
  });

  final String eyebrow;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow.toUpperCase(),
          style: const TextStyle(
            color: authAccent,
            fontSize: 12,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.9,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: const TextStyle(
            color: authText,
            fontSize: 32,
            height: 1.08,
            fontWeight: FontWeight.w700,
            letterSpacing: -1.05,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          description,
          style: const TextStyle(color: authMuted, fontSize: 15, height: 1.55),
        ),
      ],
    );
  }
}

class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.label,
    required this.hint,
    required this.icon,
    required this.controller,
    this.fieldKey,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.autofillHints,
    this.suffixIcon,
    this.onFieldSubmitted,
  });

  final String label;
  final String hint;
  final IconData icon;
  final TextEditingController controller;
  final Key? fieldKey;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final Iterable<String>? autofillHints;
  final Widget? suffixIcon;
  final ValueChanged<String>? onFieldSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      key: fieldKey,
      controller: controller,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      obscureText: obscureText,
      autofillHints: autofillHints,
      validator: validator,
      onFieldSubmitted: onFieldSubmitted,
      style: const TextStyle(color: authText, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        errorMaxLines: 2,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: suffixIcon,
      ),
    );
  }
}

class AuthErrorBanner extends StatelessWidget {
  const AuthErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        key: const Key('auth-error-banner'),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF1F0),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFF2C5C0)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 20,
              color: Color(0xFFB42318),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Color(0xFF8C1D18), height: 1.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class AuthPrimaryButton extends StatelessWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.buttonKey,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final Key? buttonKey;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 52),
      child: FilledButton(
        key: buttonKey,
        onPressed: loading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: authPrimary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: authPrimary.withValues(alpha: 0.62),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        child: loading
            ? const SizedBox.square(
                key: Key('auth-loading-indicator'),
                dimension: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: Colors.white,
                ),
              )
            : Text(label, textAlign: TextAlign.center),
      ),
    );
  }
}

class GoogleAuthButton extends StatelessWidget {
  const GoogleAuthButton({
    super.key,
    required this.onPressed,
    required this.configured,
    this.loading = false,
  });

  final VoidCallback? onPressed;
  final bool configured;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 52),
      child: OutlinedButton(
        key: const Key('google-auth-button'),
        onPressed: loading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: authText,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          side: const BorderSide(color: Color(0xFFDADDDC)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              const SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: authPrimary,
                ),
              )
            else
              const _GoogleMark(),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                loading ? 'Conectando…' : 'Continuar con Google',
                textAlign: TextAlign.center,
              ),
            ),
            if (!configured && !loading) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF5D6),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'Pendiente',
                  style: TextStyle(
                    color: Color(0xFF7A5510),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Expanded(child: Divider(color: Color(0xFFDADDDC))),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'o',
            style: TextStyle(
              color: authMuted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(child: Divider(color: Color(0xFFDADDDC))),
      ],
    );
  }
}

class AuthSecurityNote extends StatelessWidget {
  const AuthSecurityNote({
    super.key,
    this.message = 'Acceso seguro a Playa Terco',
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.verified_user_outlined, size: 15, color: authAccent),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: authMuted,
                fontSize: 11,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

abstract final class AuthValidators {
  static String? name(String? value) {
    if ((value ?? '').trim().length < 2) return 'Ingresa tu nombre completo.';
    return null;
  }

  static String? email(String? value) {
    final email = (value ?? '').trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      return 'Ingresa un correo válido.';
    }
    return null;
  }

  static String? loginPassword(String? value) {
    if ((value ?? '').isEmpty) return 'Ingresa tu contraseña.';
    return null;
  }

  static String? newPassword(String? value) {
    if ((value ?? '').length < 8) return 'Usa al menos 8 caracteres.';
    return null;
  }
}

class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE5E5E5)),
      ),
      child: const Text(
        'G',
        style: TextStyle(
          color: Color(0xFF4285F4),
          fontSize: 15,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

class _AuthBackdrop extends StatelessWidget {
  const _AuthBackdrop();

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: IgnorePointer(
        child: ClipRect(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 1.04, end: 1),
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : const Duration(milliseconds: 1800),
            curve: Curves.easeOutCubic,
            builder: (context, scale, child) =>
                Transform.scale(scale: scale, child: child),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset(
                  'assets/branding/auth_sunset.jpg',
                  key: const Key('auth-sunset-background'),
                  fit: BoxFit.cover,
                  alignment: const Alignment(0.2, 0),
                  cacheWidth: 1536,
                  gaplessPlayback: true,
                ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x99062220),
                        Color(0x33062220),
                        Color(0xB3082F2E),
                      ],
                      stops: [0, 0.45, 1],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
