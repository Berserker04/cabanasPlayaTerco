import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/models.dart';
import 'auth_widgets.dart';

class PendingApprovalPage extends StatelessWidget {
  const PendingApprovalPage({super.key, this.user});

  final UserProfile? user;

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const AuthBrandHeader(),
          const SizedBox(height: 38),
          Container(
            width: 72,
            height: 72,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              color: Color(0xFFDDF4F1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.schedule_rounded,
              size: 36,
              color: authPrimary,
            ),
          ),
          const SizedBox(height: 24),
          const AuthIntro(
            eyebrow: 'Solicitud recibida',
            title: 'Tu acceso está pendiente',
            description:
                'Creamos tu cuenta correctamente. Un administrador debe asignarte un rol operativo antes de que puedas entrar al panel.',
          ),
          if (user?.email.isNotEmpty == true) ...[
            const SizedBox(height: 22),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.86),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFDADDDC)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.mail_outline_rounded, color: authPrimary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      user!.email,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: authText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 28),
          AuthPrimaryButton(
            buttonKey: const Key('pending-back-to-login-button'),
            label: 'Volver al inicio de sesión',
            onPressed: () => context.go('/login'),
          ),
          const AuthSecurityNote(),
        ],
      ),
    );
  }
}
