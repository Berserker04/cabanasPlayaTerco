import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import 'models.dart';
import 'management_models.dart';
import 'push_token_service.dart';

class ApiRepository {
  ApiRepository(this._dio, this._pushTokenService);

  final Dio _dio;
  final PushTokenService _pushTokenService;

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final payload = await _devicePayload();
    payload.addAll({'email': email, 'password': password});

    final response = await _dio.post<JsonMap>(
      '/auth/mobile/login',
      data: payload,
    );

    return AuthResult.fromJson(response.data ?? const <String, dynamic>{});
  }

  Future<AuthResult> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _dio.post<JsonMap>(
      '/auth/mobile/register',
      data: {
        'name': name,
        'email': email,
        'password': password,
        'password_confirmation': password,
      },
    );

    return AuthResult.fromJson(response.data ?? const <String, dynamic>{});
  }

  Future<AuthResult> loginWithGoogle(String idToken) async {
    final payload = await _devicePayload();
    payload['id_token'] = idToken;

    final response = await _dio.post<JsonMap>(
      '/auth/mobile/google',
      data: payload,
    );

    return AuthResult.fromJson(response.data ?? const <String, dynamic>{});
  }

  Future<UserProfile> currentUser() async {
    final response = await _dio.get<JsonMap>('/auth/user');
    return UserProfile.fromJson(asMap(response.data?['data']));
  }

  Future<void> logout() async {
    try {
      await _pushTokenService.stop(deleteToken: true);
    } catch (_) {
      // Revoking the authenticated session must still run if a plugin fails.
    }
    try {
      await _dio.post<JsonMap>('/auth/mobile/logout');
    } on DioException {
      // Token cleanup remains local even if the network request fails.
    }
  }

  Future<JsonMap> _devicePayload() async {
    final payload = <String, dynamic>{
      'device_name': 'Flutter ${defaultTargetPlatform.name}',
      'platform': defaultTargetPlatform.name,
    };
    return payload;
  }

  Future<DashboardStats> dashboardStats() async {
    final response = await _dio.get<JsonMap>('/admin/dashboard/stats');
    return DashboardStats.fromJson(asMap(response.data?['data']));
  }

  Future<PlannerResult> planner({
    required String checkIn,
    required String checkOut,
    required int guests,
    int? excludeReservationId,
  }) async {
    final response = await _dio.get<JsonMap>(
      '/admin/availability/planner',
      queryParameters: {
        'check_in': checkIn,
        'check_out': checkOut,
        'guests': guests,
        'exclude_reservation_id': ?excludeReservationId,
      },
    );
    return PlannerResult.fromJson(asMap(response.data?['data']));
  }

  Future<List<StaffOption>> staffOptions() async {
    final response = await _dio.get<JsonMap>('/admin/staff/options');
    return asList(response.data?['data']).map(StaffOption.fromJson).toList();
  }

  Future<void> createReservation(JsonMap payload) async {
    await _dio.post<JsonMap>('/admin/reservations', data: payload);
  }

  Future<void> updateReservation(int id, JsonMap payload) async {
    await _dio.put<JsonMap>('/admin/reservations/$id', data: payload);
  }

  Future<void> createBlock(JsonMap payload) async {
    await _dio.post<JsonMap>('/admin/availability-blocks', data: payload);
  }

  Future<void> updateBlock(int id, JsonMap payload) async {
    await _dio.put<JsonMap>('/admin/availability-blocks/$id', data: payload);
  }

  Future<void> deleteBlock(int id) async {
    await _dio.delete<JsonMap>('/admin/availability-blocks/$id');
  }

  Future<List<ReservationSummary>> reservations({String? status}) async {
    final response = await _dio.get<JsonMap>(
      '/admin/reservations',
      queryParameters: {
        if (status != null && status != 'all') 'status': status,
      },
    );
    return asList(
      response.data?['data'],
    ).map(ReservationSummary.fromJson).toList();
  }

  Future<void> createPayment({
    required int reservationId,
    required double amount,
    required String method,
    required String paymentDate,
    String? reference,
  }) async {
    await _dio.post<JsonMap>(
      '/admin/payments',
      data: {
        'reservation_id': reservationId,
        'amount': amount,
        'method': method,
        'status': 'completed',
        'payment_date': paymentDate,
        if (reference != null && reference.isNotEmpty) 'reference': reference,
      },
    );
  }

  Future<List<LeadItem>> leads() async {
    final response = await _dio.get<JsonMap>('/admin/leads');
    return asList(response.data?['data']).map(LeadItem.fromJson).toList();
  }

  Future<void> updateLead(
    int id, {
    required String status,
    String? notes,
  }) async {
    final payload = <String, Object?>{'status': status};
    if (notes != null) {
      payload['notes'] = notes;
    }

    await _dio.put<JsonMap>('/admin/leads/$id', data: payload);
  }

  Future<FinanceSummary> financeSummary({String? month}) async {
    final queryParameters = <String, Object?>{};
    if (month != null) {
      queryParameters['month'] = month;
    }

    final response = await _dio.get<JsonMap>(
      '/admin/finance/summary',
      queryParameters: queryParameters,
    );
    return FinanceSummary.fromJson(asMap(response.data?['data']));
  }

  Future<List<ExpenseItem>> expenses() async {
    final response = await _dio.get<JsonMap>('/admin/expenses');
    return asList(response.data?['data']).map(ExpenseItem.fromJson).toList();
  }

  Future<void> createExpense(JsonMap payload) async {
    await _dio.post<JsonMap>('/admin/expenses', data: payload);
  }

  Future<PageResult<T>> page<T>(
    String path,
    T Function(JsonMap) parse, {
    int page = 1,
    String search = '',
    Map<String, Object?> filters = const {},
  }) async {
    final response = await _dio.get<JsonMap>(
      path,
      queryParameters: {
        'page': page,
        'per_page': 20,
        if (search.trim().isNotEmpty) 'search': search.trim(),
        ...Map.fromEntries(
          filters.entries.where((e) => e.value != null && e.value != ''),
        ),
      },
    );
    return PageResult.fromJson(response.data ?? {}, parse);
  }

  Future<JsonMap> detail(String path) async {
    final response = await _dio.get<JsonMap>(path);
    return asMap(response.data?['data']);
  }

  Future<void> update(String path, JsonMap payload) async {
    await _dio.put<JsonMap>(path, data: payload);
  }

  Future<void> remove(String path) async {
    await _dio.delete<JsonMap>(path);
  }

  Future<AvailabilityMonth> calendar(String month) async {
    final response = await _dio.get<JsonMap>(
      '/admin/availability/calendar',
      queryParameters: {'month': month},
    );
    return AvailabilityMonth.fromJson(asMap(response.data?['data']));
  }

  Future<AgendaResult> agenda(String from, String to) async {
    final response = await _dio.get<JsonMap>(
      '/admin/availability/agenda',
      queryParameters: {'from': from, 'to': to},
    );
    return AgendaResult.fromJson(asMap(response.data?['data']));
  }

  Future<List<AlbumOption>> albums() async {
    final response = await _dio.get<JsonMap>('/admin/gallery-albums');
    return asList(response.data?['data']).map(AlbumOption.fromJson).toList();
  }

  Future<GalleryItem> uploadGallery(
    String path,
    String name,
    JsonMap fields, {
    required ProgressCallback onProgress,
    required CancelToken cancelToken,
  }) async {
    final response = await _dio.post<JsonMap>(
      '/admin/gallery',
      data: FormData.fromMap({
        ...fields,
        'file': await MultipartFile.fromFile(path, filename: name),
      }),
      onSendProgress: onProgress,
      cancelToken: cancelToken,
      options: Options(
        sendTimeout: const Duration(minutes: 15),
        receiveTimeout: const Duration(minutes: 3),
      ),
    );
    return GalleryItem.fromJson(asMap(response.data?['data']));
  }

  Future<void> registerDeviceToken(String token) async {
    await _dio.post<JsonMap>(
      '/auth/mobile/device-token',
      data: {
        'token': token,
        'platform': defaultTargetPlatform.name,
        'device_name': 'Flutter ${defaultTargetPlatform.name}',
      },
    );
  }

  Future<void> unregisterDeviceToken() async {
    await _dio.delete<JsonMap>('/auth/mobile/device-token');
  }
}
