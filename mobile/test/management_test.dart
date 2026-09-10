import 'dart:async';
import 'package:cabanas_playa_terco_admin/core/api_repository.dart';
import 'package:cabanas_playa_terco_admin/core/management_models.dart';
import 'package:cabanas_playa_terco_admin/core/models.dart';
import 'package:cabanas_playa_terco_admin/core/providers.dart';
import 'package:cabanas_playa_terco_admin/core/push_token_service.dart';
import 'package:cabanas_playa_terco_admin/features/availability/availability_page.dart';
import 'package:cabanas_playa_terco_admin/features/availability/booking_editor.dart';
import 'package:cabanas_playa_terco_admin/features/availability/booking_detail.dart';
import 'package:cabanas_playa_terco_admin/features/availability/editor_fields.dart';
import 'package:cabanas_playa_terco_admin/features/gallery/gallery_upload_page.dart';
import 'package:cabanas_playa_terco_admin/features/shell/more_page.dart';
import 'package:cabanas_playa_terco_admin/shared/management_widgets.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

const _viewer = UserProfile(
  id: 1,
  name: 'Consulta',
  email: 'viewer@example.test',
  isAdmin: false,
  isStaff: false,
  roles: ['viewer'],
);
const _admin = UserProfile(
  id: 2,
  name: 'Admin',
  email: 'admin@example.test',
  isAdmin: true,
  isStaff: true,
  roles: ['admin'],
);

class _Auth extends AuthController {
  _Auth(this.user);
  final UserProfile user;
  @override
  Future<AuthSession?> build() async => AuthSession(user: user, token: 'test');
}

class _AndroidLargeText extends TextScaler {
  const _AndroidLargeText();
  @override
  double scale(double fontSize) => fontSize * (fontSize > 24 ? 1.1 : 1.8);
  @override
  double get textScaleFactor => 1.8;
}

Widget host(
  Widget page, {
  UserProfile user = _viewer,
  ApiRepository? api,
  double scale = 1,
  TextScaler? scaler,
}) => ProviderScope(
  overrides: [
    authControllerProvider.overrideWith(() => _Auth(user)),
    if (api != null) apiRepositoryProvider.overrideWithValue(api),
  ],
  child: MaterialApp(
    locale: const Locale('es', 'CO'),
    supportedLocales: const [Locale('es', 'CO')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: scaler ?? TextScaler.linear(scale)),
      child: child!,
    ),
    home: Scaffold(body: page),
  ),
);

ApiRepository mockApi(FutureOr<JsonMap> Function(RequestOptions) reply) {
  final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (request, handler) async {
        try {
          handler.resolve(
            Response(
              requestOptions: request,
              data: await reply(request),
              statusCode: 200,
            ),
          );
        } catch (error) {
          handler.reject(DioException(requestOptions: request, error: error));
        }
      },
    ),
  );
  return ApiRepository(dio, PushTokenService());
}

void main() {
  testWidgets(
    'confirming a booking refreshes its detail without a false error',
    (tester) async {
      var confirmed = false;
      final api = mockApi((request) {
        if (request.method == 'PUT') {
          confirmed = true;
          return {'data': {}};
        }
        return {
          'data': {
            'id': 7,
            'leader_name': 'Grupo',
            'status': confirmed ? 'confirmed' : 'pending',
            'status_label': confirmed ? 'Ocupación confirmada' : 'Cotización',
            'check_in': '2030-01-01',
            'check_out': '2030-01-02',
          },
        };
      });
      await tester.pumpWidget(
        host(const BookingDetail(7), user: _admin, api: api),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirmar ocupación'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Confirmar'));
      await tester.pumpAndSettle();
      expect(find.text('Ocupación confirmada'), findsOneWidget);
      expect(find.text('No pudimos completar la acción.'), findsNothing);
      expect(tester.takeException(), null);
    },
  );
  setUpAll(() => initializeDateFormatting('es_CO'));
  test('pagination preserves team counters and final page', () {
    final page = PageResult<LeadItem>.fromJson({
      'data': [
        {'id': 3, 'name': 'Ana', 'status': 'new'},
      ],
      'meta': {'current_page': 2, 'last_page': 3, 'total': 45, 'new_count': 9},
    }, LeadItem.fromJson);
    expect(page.page, 2);
    expect(page.hasMore, true);
    expect(page.meta['new_count'], 9);
    final empty = PageResult<LeadItem>.fromJson({
      'data': [],
      'meta': {'current_page': 1, 'last_page': 1, 'total': 0},
    }, LeadItem.fromJson);
    expect(empty.hasMore, false);
  });
  test('reservation edits preserve origin, lifecycle and expiry', () {
    final original = {
      'leader_name': 'Ana',
      'notes': null,
      'status': 'expired',
      'source': 'website',
      'expires_at': '2026-09-08T12:00:00Z',
      'display_color': '#001122',
      'assigned_to': 5,
    };
    expect(
      bookingChanges(original, {'leader_name': 'Ana María', 'notes': ''}),
      {'leader_name': 'Ana María'},
    );
    expect(original['expires_at'], '2026-09-08T12:00:00Z');
  });
  test('Bogota operational day is independent of the device timezone', () {
    expect(
      todayInBogota(DateTime.parse('2026-09-10T03:30:00Z')),
      DateTime(2026, 9, 9),
    );
    expect(
      todayInBogota(DateTime.parse('2026-09-10T05:00:00Z')),
      DateTime(2026, 9, 10),
    );
  });
  test(
    'media validation accepts limits and rejects invalid files before upload',
    () {
      expect(mediaFileError('PLAYA.JPG', 10 * 1024 * 1024), null);
      expect(
        mediaFileError('playa.webp', 10 * 1024 * 1024 + 1),
        contains('10 MB'),
      );
      expect(mediaFileError('video.MOV', 150 * 1024 * 1024), null);
      expect(
        mediaFileError('video.mp4', 150 * 1024 * 1024 + 1),
        contains('150 MB'),
      );
      expect(mediaFileError('archivo.pdf', 10), isNotNull);
      expect(mediaFileError('vacio.png', 0), isNotNull);
    },
  );
  test('agenda supports several cabins and detail resource shapes', () {
    final agenda = BookingRecord.fromJson({
      'cabin_ids': [1, 2],
      'cabin_names': ['Sol', 'Mar'],
    });
    final detail = BookingRecord.fromJson({
      'cabins': [
        {'id': 1, 'name': 'Sol'},
        {'id': 2, 'name': 'Mar'},
      ],
    });
    expect(agenda.cabinIds, detail.cabinIds);
    expect(agenda.cabinNames, detail.cabinNames);
    expect(_viewer.canAccessPanel, true);
  });
  testWidgets('viewer sees public reading and operations without admin menus', (
    tester,
  ) async {
    await tester.pumpWidget(host(const MorePage()));
    await tester.pumpAndSettle();
    expect(find.text('Blogs'), findsOneWidget);
    expect(find.text('Caja'), findsOneWidget);
    expect(find.text('Usuarios'), findsNothing);
    expect(find.text('Galería'), findsNothing);
    expect(find.text('Reseñas'), findsNothing);
  });
  testWidgets(
    'collection ignores stale searches and appends subsequent pages',
    (tester) async {
      final stale = Completer<PageResult<String>>();
      await tester.pumpWidget(
        host(
          CollectionPage<String>(
            title: 'Listado',
            load: (page, search, filters) async {
              if (search == 'viejo') return stale.future;
              return PageResult(['$search página $page'], page, 2, 2, {});
            },
            itemBuilder: (_, item, meta) => Text(item),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'viejo');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.enterText(find.byType(TextField), 'actual');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      stale.complete(const PageResult(['resultado obsoleto'], 1, 1, 1, {}));
      await tester.pumpAndSettle();
      expect(find.text('resultado obsoleto'), findsNothing);
      expect(find.text('actual página 1'), findsOneWidget);
      await tester.tap(find.text('Cargar más'));
      await tester.pumpAndSettle();
      expect(find.text('actual página 2'), findsOneWidget);
    },
  );
  testWidgets('calendar remains usable on small phone with enlarged text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final requestedMonths = <String>[];
    final api = mockApi((request) {
      if (request.path.endsWith('/calendar')) {
        final month = request.queryParameters['month'] as String;
        requestedMonths.add(month);
        final date = DateTime.parse('$month-01');
        return {
          'data': {
            'days': List.generate(
              DateUtils.getDaysInMonth(date.year, date.month),
              (i) => {
                'date': '$month-${(i + 1).toString().padLeft(2, '0')}',
                'available': 2,
                'total': 5,
              },
            ),
          },
        };
      }
      if (request.path.endsWith('/agenda')) {
        return {
          'data': {'reservations': [], 'blocks': []},
        };
      }
      return {
        'data': {'cabins': [], 'suggestions': [], 'summary': {}},
      };
    });
    await tester.pumpWidget(
      host(
        const AvailabilityPage(),
        api: api,
        scaler: const _AndroidLargeText(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byTooltip('Mes siguiente'));
    await tester.tap(find.byTooltip('Mes siguiente'));
    await tester.pumpAndSettle();
    expect(requestedMonths.length, 2);
    expect(requestedMonths.first, isNot(requestedMonths.last));
    expect(tester.takeException(), null);
    expect(find.text('Registrar'), findsNothing);
  });
  testWidgets(
    'editing a quote rechecks its own exclusion and sends only changed fields',
    (tester) async {
      JsonMap? update;
      final requests = <RequestOptions>[];
      final today = todayInBogota();
      final api = mockApi((request) {
        requests.add(request);
        if (request.method == 'PUT') {
          update = Map<String, dynamic>.from(request.data as Map);
          return {'data': {}};
        }
        if (request.path.endsWith('/reservations/7')) {
          return {
            'data': {
              'id': 7,
              'leader_name': 'Ana',
              'leader_phone': '+573001234567',
              'leader_whatsapp': null,
              'guests_count': 2,
              'status': 'pending',
              'status_label': 'Cotización',
              'source': 'phone',
              'expires_at': '2030-01-01T12:00:00Z',
              'check_in': today.toIso8601String().split('T').first,
              'check_out': today
                  .add(const Duration(days: 1))
                  .toIso8601String()
                  .split('T')
                  .first,
              'cabins': [
                {'id': 1, 'name': 'Cabaña'},
              ],
              'total_price': 123456,
              'notes': 'Original',
            },
          };
        }
        return {
          'data': {
            'cabins': [
              {
                'id': 1,
                'name': 'Cabaña',
                'max_guests': 8,
                'available_for_range': true,
                'segments': [],
              },
            ],
            'suggestions': [],
          },
        };
      });
      await tester.pumpWidget(
        host(
          BookingEditor(
            id: 7,
            arrival: today,
            departure: today.add(const Duration(days: 1)),
          ),
          user: _admin,
          api: api,
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextFormField).first, 'Ana María');
      FocusManager.instance.primaryFocus?.unfocus();
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(FilledButton, 'Guardar registro'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Guardar registro'));
      await tester.pumpAndSettle();
      expect(update, {'leader_name': 'Ana María'});
      expect(
        requests.where((r) => r.path.endsWith('/planner')).length,
        greaterThanOrEqualTo(2),
      );
      expect(
        requests
            .where((r) => r.path.endsWith('/planner'))
            .every((r) => r.queryParameters['exclude_reservation_id'] == 7),
        true,
      );
    },
  );
}
