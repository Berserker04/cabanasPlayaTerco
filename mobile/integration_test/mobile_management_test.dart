import 'dart:io';
import 'package:cabanas_playa_terco_admin/main.dart' as app;
import 'package:cabanas_playa_terco_admin/core/models.dart';
import 'package:cabanas_playa_terco_admin/core/providers.dart';
import 'package:cabanas_playa_terco_admin/core/router.dart';
import 'package:cabanas_playa_terco_admin/features/availability/booking_editor.dart';
import 'package:cabanas_playa_terco_admin/features/availability/booking_detail.dart';
import 'package:cabanas_playa_terco_admin/features/availability/editor_fields.dart';
import 'package:cabanas_playa_terco_admin/features/blog/blog_page.dart';
import 'package:cabanas_playa_terco_admin/features/reviews/reviews_page.dart';
import 'package:cabanas_playa_terco_admin/features/users/users_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:integration_test/integration_test.dart';

/// Requires the isolated MobileQaServer.php on desktop port 8011 and
/// adb reverse tcp:8000 tcp:8011. No production account or database is used.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'six mobile management flows against isolated Laravel API',
    (tester) async {
      await app.main();
      await tester.pumpAndSettle(const Duration(milliseconds: 300));
      final container = ProviderScope.containerOf(
        tester.element(find.byType(app.PlayaTercoAdminApp)),
      );
      final dio = container.read(dioProvider);
      // Refuse to mutate unless the QA router explicitly identifies itself.
      final probe = await dio.get<JsonMap>('/posts');
      expect(probe.headers.value('x-qa-isolated'), 'mobile-sqlite-mail-faked');
      final auth = container.read(authControllerProvider.notifier);
      if (container.read(authControllerProvider).value != null) {
        await auth.logout();
        await tester.pumpAndSettle();
      }
      Future<void> settle() =>
          tester.pumpAndSettle(const Duration(milliseconds: 250));
      Future<void> tap(Finder target) async {
        FocusManager.instance.primaryFocus?.unfocus();
        await settle();
        if (target.hitTestable().evaluate().isEmpty) {
          final scrolls = find.byWidgetPredicate(
            (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
          );
          if (scrolls.evaluate().isNotEmpty) {
            await tester.scrollUntilVisible(
              target,
              250,
              scrollable: scrolls.last,
              maxScrolls: 35,
            );
            await settle();
          }
        }
        await tester.ensureVisible(target);
        await settle();
        if (target.hitTestable().evaluate().isEmpty) {
          await tester.pump(const Duration(seconds: 5));
          await tester.ensureVisible(target);
          await settle();
        }
        expect(target.hitTestable(), findsOneWidget);
        await tester.tap(target);
        await settle();
      }

      Future<void> login(String role) async {
        await tester.enterText(
          find.byKey(const Key('login-email-field')),
          '$role.mobile.qa@example.test',
        );
        await tester.enterText(
          find.byKey(const Key('login-password-field')),
          'MobileQa-2026!',
        );
        await tap(find.byKey(const Key('login-submit-button')));
        expect(find.text('Operación de hoy'), findsOneWidget);
      }

      Future<void> go(String path) async {
        container
            .read(routerProvider)
            .routerDelegate
            .navigatorKey
            .currentState
            ?.popUntil((route) => route.isFirst);
        await settle();
        container.read(routerProvider).go(path);
        await settle();
      }

      Future<JsonMap> detail(String path) =>
          container.read(apiRepositoryProvider).detail(path);
      await login('admin');
      for (final prefix in ['Grupo móvil ', 'Grupo editado ']) {
        final previous = await dio.get<JsonMap>(
          '/admin/reservations',
          queryParameters: {'search': prefix, 'per_page': 100},
        );
        for (final record in asList(previous.data?['data'])) {
          if (record['status'] != 'cancelled') {
            await dio.put(
              '/admin/reservations/${record['id']}',
              data: {'status': 'cancelled'},
            );
          }
        }
      }
      await tap(find.text('Fechas'));
      await tap(find.byTooltip('Mes siguiente'));
      await tap(find.byTooltip('Mes anterior'));
      expect(find.text('Disponibilidad'), findsOneWidget);
      final today = todayInBogota();
      final stamp = DateTime.now().millisecondsSinceEpoch;
      final nav = Navigator.of(
        tester.element(find.text('Disponibilidad')),
        rootNavigator: true,
      );
      nav.push(
        MaterialPageRoute<void>(
          builder: (_) => BookingEditor(
            arrival: today.add(const Duration(days: 10)),
            departure: today.add(const Duration(days: 12)),
            cabinIds: const [1],
            guests: 2,
          ),
        ),
      );
      await settle();
      await tester.enterText(
        find.byType(TextFormField).first,
        'Grupo móvil $stamp',
      );
      await tap(find.text('Guardar registro'));
      final list = await dio.get<JsonMap>('/admin/reservations');
      final created = asList(
        list.data?['data'],
      ).firstWhere((r) => r['leader_name'] == 'Grupo móvil $stamp');
      expect(created['status'], 'pending');
      final before = await detail('/admin/reservations/${created['id']}');
      nav.push(
        MaterialPageRoute<void>(
          builder: (_) => BookingEditor(
            id: created['id'] as int,
            arrival: today,
            departure: today.add(const Duration(days: 1)),
          ),
        ),
      );
      await settle();
      await tester.enterText(
        find.byType(TextFormField).first,
        'Grupo editado $stamp',
      );
      await tap(find.text('Guardar registro'));
      final after = await detail('/admin/reservations/${created['id']}');
      expect(after['leader_name'], 'Grupo editado $stamp');
      for (final key in [
        'status',
        'source',
        'expires_at',
        'total_price',
        'notes',
        'check_in',
        'check_out',
        'assigned_to',
        'display_color',
      ]) {
        expect(after[key], before[key], reason: 'Editing must preserve $key');
      }
      nav.push(
        MaterialPageRoute<void>(
          builder: (_) => BookingDetail(created['id'] as int),
        ),
      );
      await settle();
      await tap(find.text('Confirmar ocupación'));
      await tap(find.widgetWithText(FilledButton, 'Confirmar'));
      expect(
        (await detail('/admin/reservations/${created['id']}'))['status'],
        'confirmed',
      );
      nav.pop();
      await settle();
      debugPrint('QA: disponibilidad y edición verificadas');

      await go('/reviews');
      await tester.enterText(
        find.byKey(const Key('collection-search')),
        'Reseña QA 23',
      );
      await tester.pump(const Duration(milliseconds: 450));
      await settle();
      await tap(find.text('Reseña QA 23').last);
      expect(find.byType(ReviewDetailPage), findsOneWidget);
      await tap(find.byType(DropdownButtonFormField<String>));
      await tester.tap(find.text('Oculta').last);
      await settle();
      await tester.enterText(
        find.byWidgetPredicate(
          (w) =>
              w is TextField &&
              w.decoration?.labelText == 'Respuesta de administración',
        ),
        'Respuesta móvil QA',
      );
      await tap(find.text('Guardar cambios'));
      final reviews = await dio.get<JsonMap>(
        '/admin/reviews',
        queryParameters: {'search': 'Reseña QA 23'},
      );
      final review = asList(reviews.data?['data']).first;
      expect(review['status'], 'rejected');
      expect(review['admin_response'], 'Respuesta móvil QA');
      final publicReviews = await dio.get<JsonMap>('/reviews');
      expect(
        asList(publicReviews.data?['data']).any((r) => r['id'] == review['id']),
        false,
      );
      debugPrint('QA: reseña moderada y reflejada en API pública');

      await go('/blogs');
      await tester.enterText(
        find.byKey(const Key('collection-search')),
        'Publicación QA 23',
      );
      await tester.pump(const Duration(milliseconds: 450));
      await settle();
      await tap(find.text('Publicación QA 23').last);
      expect(find.byType(PostDetailPage), findsOneWidget);
      final heading = find.text('Una visita a Playa Terco', findRichText: true);
      await tester.scrollUntilVisible(
        heading,
        250,
        scrollable: find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .last,
      );
      expect(heading, findsOneWidget);
      await tap(find.byTooltip('Moderar publicación'));
      await tap(find.text('Archivar'));
      final posts = await dio.get<JsonMap>(
        '/admin/posts',
        queryParameters: {'search': 'Publicación QA 23'},
      );
      final post = asList(posts.data?['data']).first;
      expect(post['status'], 'archived');
      await tap(find.byTooltip('Moderar publicación'));
      await tap(find.text('Publicar / reactivar'));
      expect(
        (await detail('/admin/posts/${post['id']}'))['status'],
        'published',
      );
      await go('/blogs');
      await tap(find.byTooltip('Moderar comentarios'));
      expect(find.byType(CommentsPage), findsOneWidget);
      await tap(find.byType(PopupMenuButton<String>).first);
      await tap(find.text('Publicar').last);
      debugPrint('QA: lectura, publicación y comentarios de blog verificados');

      await go('/users');
      await tester.enterText(
        find.byKey(const Key('collection-search')),
        'user.mobile.qa',
      );
      await tester.pump(const Duration(milliseconds: 450));
      await settle();
      await tap(find.text('User Mobile QA'));
      expect(find.byType(UserEditPage), findsOneWidget);
      final viewerRole = find.widgetWithText(CheckboxListTile, 'Visualizador');
      if (!(tester.widget<CheckboxListTile>(viewerRole).value ?? false)) {
        await tap(viewerRole);
      }
      await tap(find.text('Guardar permisos'));
      await tap(find.widgetWithText(FilledButton, 'Confirmar'));
      final users = await dio.get<JsonMap>(
        '/admin/users',
        queryParameters: {'search': 'user.mobile.qa'},
      );
      expect(asList(users.data?['data']).first['roles'], contains('viewer'));
      debugPrint('QA: asignación de permisos verificada');

      await go('/gallery');
      final bytes = await rootBundle.load('assets/branding/auth_sunset.jpg');
      final file = File(
        '${Directory.systemTemp.path}/playaterco-qa-$stamp.jpg',
      );
      await file.writeAsBytes(bytes.buffer.asUint8List());
      container
          .read(routerProvider)
          .push('/gallery/upload', extra: [XFile(file.path)]);
      await settle();
      await tester.enterText(find.byType(TextField), 'Foto móvil QA $stamp');
      await tap(find.text('Subir archivos pendientes'));
      for (
        var attempt = 0;
        attempt < 30 && find.text('Subido').evaluate().isEmpty;
        attempt++
      ) {
        await tester.pump(const Duration(seconds: 1));
      }
      await settle();
      expect(find.text('Subido'), findsOneWidget);
      final media = await dio.get<JsonMap>(
        '/admin/gallery',
        queryParameters: {'search': 'Foto móvil QA $stamp'},
      );
      expect(asList(media.data?['data']).first['category'], 'general');
      expect(asList(media.data?['data']).first['is_active'], true);
      debugPrint('QA: subida de imagen real verificada');

      await go('/leads');
      await tester.enterText(
        find.byKey(const Key('collection-search')),
        'Solicitud QA 23',
      );
      await tester.pump(const Duration(milliseconds: 450));
      await settle();
      await tap(find.text('Solicitud QA 23').last);
      expect(find.text('Solicitud de cotización'), findsOneWidget);
      final leadList = await dio.get<JsonMap>(
        '/admin/leads',
        queryParameters: {'search': 'Solicitud QA 23'},
      );
      final lead = asList(leadList.data?['data']).first;
      final initialStatus = lead['status'];
      expect(
        (await detail('/admin/leads/${lead['id']}'))['status'],
        initialStatus,
      );
      await tester.enterText(find.byType(TextField), 'Seguimiento móvil QA');
      await tap(find.text('Marcar contactada'));
      expect(
        (await detail('/admin/leads/${lead['id']}'))['status'],
        'contacted',
      );
      await tap(find.text('Cerrar solicitud'));
      await tap(find.text('Sin reserva'));
      expect((await detail('/admin/leads/${lead['id']}'))['status'], 'lost');
      expect(find.text('No pudimos completar la acción.'), findsNothing);
      debugPrint('QA: bandeja, notas y cierre de cotización verificados');

      await auth.logout();
      await settle();
      await login('viewer');
      await go('/more');
      expect(find.text('Usuarios'), findsNothing);
      expect(find.text('Galería'), findsNothing);
      await go('/users');
      expect(find.text('Blogs'), findsOneWidget);
      await go('/blogs');
      await tester.enterText(
        find.byKey(const Key('collection-search')),
        'Publicación QA 23',
      );
      await tester.pump(const Duration(milliseconds: 450));
      await settle();
      await tap(find.text('Publicación QA 23').last);
      expect(find.byTooltip('Moderar publicación'), findsNothing);
      await go('/availability');
      expect(find.text('Registrar'), findsNothing);
      await auth.logout();
      await settle();
      expect(find.byKey(const Key('login-submit-button')), findsOneWidget);
      debugPrint('QA: Visualizador y cierre de sesión verificados');
      await tester.pumpWidget(const SizedBox.shrink());
      await settle();
    },
    timeout: const Timeout(Duration(minutes: 8)),
  );
}
