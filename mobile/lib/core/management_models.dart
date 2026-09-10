import 'models.dart';

class PageResult<T> {
  const PageResult(this.items, this.page, this.lastPage, this.total, this.meta);
  factory PageResult.fromJson(JsonMap json, T Function(JsonMap) parse) {
    final meta = asMap(json['meta']);
    final page = asInt(meta['current_page'], 1);
    final perPage = asInt(meta['per_page'], 20);
    final total = asInt(meta['total']);
    return PageResult(
      asList(json['data']).map(parse).toList(),
      page,
      asInt(meta['last_page'], perPage > 0 ? (total / perPage).ceil() : page),
      total,
      meta,
    );
  }
  final List<T> items;
  final int page, lastPage, total;
  final JsonMap meta;
  bool get hasMore => page < lastPage;
}

class MediaItem {
  MediaItem.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get url => data['url']?.toString() ?? '';
  String get thumbnail => data['thumbnail_url']?.toString() ?? url;
  String get alt => data['alt']?.toString() ?? '';
  bool get isVideo => data['type'] == 'video';
}

class ReviewItem {
  ReviewItem.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get author => data['author_name']?.toString() ?? 'Turista';
  String get title => data['title']?.toString() ?? '';
  String get body => data['body']?.toString() ?? '';
  String get status => data['status']?.toString() ?? 'pending';
  String get response => data['admin_response']?.toString() ?? '';
  int get rating => asInt(data['rating']);
  String get date => data['created_at']?.toString() ?? '';
  List<MediaItem> get media =>
      asList(data['media']).map(MediaItem.fromJson).toList();
}

class PostItem {
  PostItem.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get slug => data['slug']?.toString() ?? '';
  String get title => data['title']?.toString() ?? '';
  String get body => data['body']?.toString() ?? '';
  String get summary => (data['summary'] ?? data['excerpt'] ?? '').toString();
  String get status => data['status']?.toString() ?? 'published';
  String get type => data['type']?.toString() ?? 'article';
  String get author =>
      asMap(data['author'])['name']?.toString() ?? 'Playa Terco';
  String? get cover => data['featured_image']?.toString();
  int get commentsCount => asInt(data['comments_count']);
  List<MediaItem> get media =>
      asList(data['media']).map(MediaItem.fromJson).toList();
  List<CommentItem> get comments =>
      asList(data['comments']).map(CommentItem.fromJson).toList();
}

class CommentItem {
  CommentItem.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get author =>
      (data['author_name'] ?? asMap(data['user'])['name'] ?? 'Turista')
          .toString();
  String get body => data['body']?.toString() ?? '';
  String get status => data['status']?.toString() ?? 'pending';
  String? get parentBody => asMap(data['parent'])['body']?.toString();
  List<CommentItem> get replies =>
      asList(data['replies']).map(CommentItem.fromJson).toList();
}

class RoleOption {
  RoleOption.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get name => data['name']?.toString() ?? '';
  String get label => data['display_name']?.toString() ?? name;
  String get description => data['description']?.toString() ?? '';
}

class ManagedUser {
  ManagedUser.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get name => data['name']?.toString() ?? '';
  String get email => data['email']?.toString() ?? '';
  String get phone => data['phone']?.toString() ?? '';
  String get status => data['status']?.toString() ?? 'active';
  List<int> get roleIds =>
      (data['role_ids'] as List? ?? []).map((v) => asInt(v)).toList();
  List<String> get roles =>
      (data['roles'] as List? ?? []).map((v) => v.toString()).toList();
}

class GalleryItem extends MediaItem {
  GalleryItem.fromJson(super.data) : super.fromJson();
  String get caption => data['caption']?.toString() ?? '';
  String get category => data['category']?.toString() ?? 'general';
  int? get albumId =>
      data['gallery_album_id'] == null ? null : asInt(data['gallery_album_id']);
  bool get active => data['is_active'] == true;
  String get albumTitle => asMap(data['album'])['title']?.toString() ?? '';
}

class AlbumOption {
  AlbumOption.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get title => data['title']?.toString() ?? '';
}

class CalendarDay {
  CalendarDay.fromJson(JsonMap json)
    : date = DateTime.parse(json['date'] as String),
      available = asInt(json['available']),
      total = asInt(json['total']);
  final DateTime date;
  final int available, total;
}

class AvailabilityMonth {
  AvailabilityMonth.fromJson(JsonMap json)
    : days = asList(json['days']).map(CalendarDay.fromJson).toList();
  final List<CalendarDay> days;
}

class BookingRecord {
  BookingRecord.fromJson(this.data);
  final JsonMap data;
  int get id => asInt(data['id']);
  String get name => data['leader_name']?.toString() ?? 'Sin nombre';
  String get checkIn => data['check_in']?.toString() ?? '';
  String get checkOut => data['check_out']?.toString() ?? '';
  String get status => data['status']?.toString() ?? 'pending';
  String get statusLabel => data['is_expired_quote'] == true
      ? 'Cotización vencida'
      : data['status_label']?.toString() ?? status;
  int get guests => asInt(data['guests_count'], 1);
  List<int> get cabinIds => data['cabin_ids'] is List
      ? (data['cabin_ids'] as List).map((v) => asInt(v)).toList()
      : asList(data['cabins']).map((v) => asInt(v['id'])).toList();
  List<String> get cabinNames => data['cabin_names'] is List
      ? (data['cabin_names'] as List).map((v) => v.toString()).toList()
      : asList(data['cabins']).map((v) => v['name']?.toString() ?? '').toList();
}

class AgendaResult {
  AgendaResult.fromJson(JsonMap json)
    : reservations = asList(
        json['reservations'],
      ).map(BookingRecord.fromJson).toList(),
      blocks = asList(json['blocks']).map(PlannerBlock.fromJson).toList();
  final List<BookingRecord> reservations;
  final List<PlannerBlock> blocks;
}

const moderationLabels = {
  'approved': 'Publicada',
  'pending': 'Pendiente',
  'rejected': 'Oculta',
};
const postLabels = {
  'published': 'Publicado',
  'draft': 'Borrador',
  'archived': 'Archivado',
};
const roleLabels = {
  'admin': 'Administrador',
  'staff': 'Personal',
  'viewer': 'Visualizador',
  'user': 'Usuario',
};
const galleryCategories = {
  'general': 'General',
  'cabins': 'Cabañas',
  'beach': 'Playa',
  'nature': 'Naturaleza',
  'food': 'Gastronomía',
  'activities': 'Actividades',
  'events': 'Eventos',
};
