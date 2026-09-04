import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_page.dart';
import '../features/availability/availability_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/finance/finance_page.dart';
import '../features/leads/leads_page.dart';
import '../features/shell/admin_shell.dart';
import 'providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final isLoggedIn = auth.value != null;
  final isLoading = auth.isLoading;

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      if (isLoading) return null;
      final isLogin = state.matchedLocation == '/login';
      if (!isLoggedIn && !isLogin) return '/login';
      if (isLoggedIn && isLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => const NoTransitionPage(child: LoginPage()),
      ),
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => const NoTransitionPage(child: DashboardPage()),
          ),
          GoRoute(
            path: '/availability',
            pageBuilder: (context, state) => const NoTransitionPage(child: AvailabilityPage()),
          ),
          GoRoute(
            path: '/reservations',
            redirect: (context, state) => '/availability',
          ),
          GoRoute(
            path: '/leads',
            pageBuilder: (context, state) => const NoTransitionPage(child: LeadsPage()),
          ),
          GoRoute(
            path: '/finance',
            pageBuilder: (context, state) => const NoTransitionPage(child: FinancePage()),
          ),
        ],
      ),
    ],
  );
});
