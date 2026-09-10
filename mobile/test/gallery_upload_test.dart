import 'dart:typed_data';
import 'package:cabanas_playa_terco_admin/core/api_repository.dart';
import 'package:cabanas_playa_terco_admin/core/management_models.dart';
import 'package:cabanas_playa_terco_admin/core/models.dart';
import 'package:cabanas_playa_terco_admin/core/push_token_service.dart';
import 'package:cabanas_playa_terco_admin/features/gallery/gallery_upload_page.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'management_test.dart' show host;

class _Uploads extends ApiRepository {
  _Uploads({this.cancel = false}) : super(Dio(), PushTokenService());
  final bool cancel;
  final calls = <String>[];
  bool retry = false;
  @override
  Future<List<AlbumOption>> albums() async => [];
  @override
  Future<GalleryItem> uploadGallery(
    String path,
    String name,
    JsonMap fields, {
    required ProgressCallback onProgress,
    required CancelToken cancelToken,
  }) async {
    calls.add(name);
    expect(fields['category'], 'general');
    expect(fields['is_active'], '1');
    onProgress(1, 2);
    if (name == 'second.mp4' && !retry) {
      if (cancel) throw await cancelToken.whenCancel;
      throw DioException(
        requestOptions: RequestOptions(),
        type: DioExceptionType.connectionError,
      );
    }
    onProgress(2, 2);
    return GalleryItem.fromJson({'id': calls.length});
  }
}

void main() {
  for (final cancel in [false, true]) {
    testWidgets(
      cancel
          ? 'cancel preserves successful files and permits retry'
          : 'connection failure retries only unsuccessful files',
      (tester) async {
        final api = _Uploads(cancel: cancel);
        final files = ['first.mp4', 'second.mp4']
            .map((name) => XFile.fromData(Uint8List(4), name: name, path: name))
            .toList();
        await tester.pumpWidget(
          host(GalleryUploadPage(recovered: files), api: api),
        );
        await tester.pumpAndSettle();
        Future<void> press(String label) async {
          final target = find.text(label);
          await tester.pump(const Duration(seconds: 5));
          await tester.scrollUntilVisible(
            target,
            250,
            scrollable: find
                .byWidgetPredicate(
                  (w) =>
                      w is Scrollable && w.axisDirection == AxisDirection.down,
                )
                .first,
          );
          await tester.pumpAndSettle();
          expect(target.hitTestable(), findsOneWidget);
          await tester.tap(target);
          await tester.pumpAndSettle();
        }

        await press('Subir archivos pendientes');
        if (cancel) await press('Cancelar subida');
        expect(api.calls, ['first.mp4', 'second.mp4']);
        expect(find.text('Subido'), findsOneWidget);
        expect(
          find.textContaining(
            cancel ? 'Subida cancelada' : 'No se pudo confirmar',
          ),
          findsOneWidget,
        );
        api.retry = true;
        await press('Subir archivos pendientes');
        expect(api.calls, ['first.mp4', 'second.mp4', 'second.mp4']);
        expect(find.text('Subido'), findsNWidgets(2));
        expect(find.text('Volver a la galería'), findsOneWidget);
      },
    );
  }
}
