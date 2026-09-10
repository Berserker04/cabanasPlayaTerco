import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../features/auth/login_page.dart';
import '../features/auth/pending_approval_page.dart';
import '../features/auth/register_page.dart';
import '../features/availability/availability_page.dart';
import '../features/availability/reservation_records_page.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/finance/finance_page.dart';
import '../features/leads/leads_page.dart';
import '../features/blog/blog_page.dart';
import '../features/reviews/reviews_page.dart';
import '../features/users/users_page.dart';
import '../features/gallery/gallery_page.dart';
import '../features/gallery/gallery_upload_page.dart';
import '../features/shell/admin_shell.dart';
import '../features/shell/more_page.dart';
import 'models.dart';
import 'providers.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final access = ref.watch(
    authControllerProvider.select(
      (auth) => (
        auth.value?.user.id,
        auth.value?.user.canAccessPanel ?? false,
        auth.value?.user.isAdmin ?? false,
        auth.value?.user.isStaff ?? false,
      ),
    ),
  );
  final router = GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final path = state.uri.path;
      final isAuth = const {
        '/login',
        '/register',
        '/pending-approval',
      }.contains(path);
      if (!access.$2 && !isAuth) return '/login';
      if (access.$2 && isAuth) return '/dashboard';
      if (!access.$3 &&
          [
            '/reviews',
            '/users',
            '/gallery',
          ].any((prefix) => path == prefix || path.startsWith('$prefix/'))) {
        return '/more';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/availability/records',
        builder: (_, state) => const ReservationRecordsPage(),
      ),
      GoRoute(path: '/login', builder: (_, state) => const LoginPage()),
      GoRoute(path: '/register', builder: (_, state) => const RegisterPage()),
      GoRoute(
        path: '/pending-approval',
        builder: (_, state) => PendingApprovalPage(
          user: state.extra is UserProfile ? state.extra as UserProfile : null,
        ),
      ),
      GoRoute(
        path: '/leads/:id',
        builder: (_, state) =>
            LeadDetailPage(int.tryParse(state.pathParameters['id'] ?? '') ?? 0),
      ),
      GoRoute(
        path: '/gallery/upload',
        builder: (_, state) => GalleryUploadPage(
          recovered: state.extra is List<XFile>
              ? state.extra as List<XFile>
              : const [],
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: DashboardPage()),
          ),
          GoRoute(
            path: '/availability',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: AvailabilityPage()),
          ),
          GoRoute(
            path: '/reservations',
            redirect: (_, state) => '/availability',
          ),
          GoRoute(
            path: '/leads',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: LeadsPage()),
          ),
          GoRoute(
            path: '/more',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: MorePage()),
          ),
          GoRoute(
            path: '/finance',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: FinancePage()),
          ),
          GoRoute(
            path: '/blogs',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: BlogPage()),
          ),
          GoRoute(
            path: '/reviews',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: ReviewsPage()),
          ),
          GoRoute(
            path: '/users',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: UsersPage()),
          ),
          GoRoute(
            path: '/gallery',
            pageBuilder: (_, state) =>
                const NoTransitionPage(child: GalleryPage()),
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
