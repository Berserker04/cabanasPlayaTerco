import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../features/dashboard/dashboard_page.dart';
import '../features/leads/leads_page.dart';
import 'data_events.dart';
import 'providers.dart';
import 'router.dart';

class NotificationStatus extends Notifier<String?> {
  @override
  String? build() => 'Preparando avisos del teléfono…';
  void set(String? value) => state = value;
}

final notificationStatusProvider =
    NotifierProvider<NotificationStatus, String?>(NotificationStatus.new);

class NotificationRetry extends Notifier<int> {
  @override
  int build() => 0;
  void retry() => state++;
}

final notificationRetryProvider = NotifierProvider<NotificationRetry, int>(
  NotificationRetry.new,
);
final appMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Lives above navigation so listeners survive opening a detail or switching tabs.
class NotificationCoordinator extends ConsumerStatefulWidget {
  const NotificationCoordinator({super.key, required this.child});
  final Widget child;
  @override
  ConsumerState<NotificationCoordinator> createState() =>
      _NotificationCoordinatorState();
}

class _NotificationCoordinatorState
    extends ConsumerState<NotificationCoordinator>
    with WidgetsBindingObserver {
  Timer? _timer;
  bool _recovered = false;
  bool _active = true;
  String? _session;
  bool _staff = false;
  Future<void> _work = Future.value();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ref.listenManual(
      authControllerProvider.select(
        (value) => (
          value.value?.token,
          value.value?.user.isStaff ?? false,
          value.isLoading,
        ),
      ),
      (_, next) {
        if (next.$3) return;
        _session = next.$1;
        _staff = next.$2;
        _timer?.cancel();
        if (_session != null) _startTimer();
        _work = _work.then((_) => _configure()).catchError((Object _) {});
      },
      fireImmediately: true,
    );
    ref.listenManual(notificationRetryProvider, (_, next) {
      _work = _work.then((_) => _configure()).catchError((Object _) {});
    });
  }

  void _startTimer() {
    _timer?.cancel();
    if (_active && _session != null) {
      _timer = Timer.periodic(const Duration(seconds: 60), (_) => _refresh());
    }
  }

  Future<void> _refresh({bool resumed = false}) async {
    await ref.read(authControllerProvider.notifier).refreshUser();
    if (!mounted || _session == null) return;
    ref.invalidate(newLeadsCountProvider);
    ref.invalidate(dashboardProvider);
    if (resumed) {
      ref.read(dataRevisionProvider.notifier).changed();
      if (_staff) {
        _work = _work
            .then((_) => _configure(requestPermission: false))
            .catchError((Object _) {});
        await _work;
      }
    }
  }

  Future<void> _configure({bool requestPermission = true}) async {
    if (!mounted) return;
    final push = ref.read(pushTokenServiceProvider);
    final session = _session;
    if (session == null || !_staff) {
      appMessengerKey.currentState?.clearSnackBars();
      await push.stop(deleteToken: true);
    } else {
      await push.start(
        requestPermission: requestPermission,
        onToken: (token) async {
          if (mounted && _session == session && _staff) {
            await ref.read(apiRepositoryProvider).registerDeviceToken(token);
          }
        },
        onStatus: (status) {
          if (mounted && _session == session) {
            ref.read(notificationStatusProvider.notifier).set(status);
          }
        },
        onOpen: (id) {
          if (mounted && _session == session && _staff) {
            appMessengerKey.currentState?.clearSnackBars();
            ref.read(dataRevisionProvider.notifier).changed();
            ref.read(routerProvider).push('/leads/$id');
          }
        },
        onMessage: (id, body) {
          if (!mounted || _session != session || !_staff) return;
          ref.read(dataRevisionProvider.notifier).changed();
          appMessengerKey.currentState?.removeCurrentSnackBar();
          appMessengerKey.currentState?.showSnackBar(
            SnackBar(
              persist: false,
              showCloseIcon: true,
              content: Text(
                'Nueva cotización. $body',
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
              duration: const Duration(seconds: 12),
              action: SnackBarAction(
                label: 'Ver',
                onPressed: () {
                  if (mounted && _session == session && _staff) {
                    ref.read(routerProvider).push('/leads/$id');
                  }
                },
              ),
            ),
          );
        },
      );
    }
    if (!mounted ||
        _recovered ||
        ref.read(authControllerProvider).value?.user.isAdmin != true) {
      return;
    }
    _recovered = true;
    try {
      final lost = await ImagePicker().retrieveLostData();
      if (!mounted ||
          ref.read(authControllerProvider).value?.user.isAdmin != true) {
        return;
      }
      if (lost.files?.isNotEmpty == true) {
        ref.read(routerProvider).push('/gallery/upload', extra: lost.files);
      } else if (lost.exception != null) {
        appMessengerKey.currentState?.showSnackBar(
          const SnackBar(
            content: Text(
              'No se recuperó la selección de archivos. Vuelve a seleccionarlos en Galería.',
            ),
          ),
        );
      }
    } catch (_) {
      /* Some platforms do not implement lost-data recovery. */
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _active = state == AppLifecycleState.resumed;
    _timer?.cancel();
    if (_active) {
      _startTimer();
      unawaited(_refresh(resumed: true));
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
