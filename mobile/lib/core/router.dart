import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_page.dart';
import '../features/auth/pending_approval_page.dart';
import '../features/auth/register_page.dart';
import '../features/availability/availability_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/finance/finance_page.dart';
import '../features/leads/leads_page.dart';
import '../features/shell/admin_shell.dart';
import 'models.dart';
import 'providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(
    authControllerProvider.select((auth) => auth.value != null),
  );

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isAuthRoute = const {
        '/login',
        '/register',
        '/pending-approval',
      }.contains(state.matchedLocation);
      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) =>
            const NoTransitionPage(child: LoginPage()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) =>
            const NoTransitionPage(child: RegisterPage()),
      ),
      GoRoute(
        path: '/pending-approval',
        pageBuilder: (context, state) => NoTransitionPage(
          child: PendingApprovalPage(
            user: state.extra is UserProfile
                ? state.extra as UserProfile
                : null,
          ),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: DashboardPage()),
          ),
          GoRoute(
            path: '/availability',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AvailabilityPage()),
          ),
          GoRoute(
            path: '/reservations',
            redirect: (context, state) => '/availability',
          ),
          GoRoute(
            path: '/leads',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: LeadsPage()),
          ),
          GoRoute(
            path: '/finance',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: FinancePage()),
          ),
        ],
      ),
    ],
  );
});
