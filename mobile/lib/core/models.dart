typedef JsonMap = Map<String, dynamic>;

JsonMap asMap(Object? value) {
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  return <String, dynamic>{};
}

List<JsonMap> asList(Object? value) {
  if (value is List) {
    return value.map((item) => asMap(item)).toList();
  }
  return <JsonMap>[];
}

int asInt(Object? value, [int fallback = 0]) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double asDouble(Object? value, [double fallback = 0]) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.isAdmin,
    required this.isStaff,
  });

  factory UserProfile.fromJson(JsonMap json) => UserProfile(
        id: asInt(json['id']),
        name: json['name']?.toString() ?? 'Usuario',
        email: json['email']?.toString() ?? '',
        isAdmin: json['is_admin'] == true,
        isStaff: json['is_staff'] == true,
      );

  final int id;
  final String name;
  final String email;
  final bool isAdmin;
  final bool isStaff;
}

class AuthSession {
  const AuthSession({required this.user, required this.token});

  final UserProfile user;
  final String token;
}

class DashboardStats {
  const DashboardStats(this.values);

  factory DashboardStats.fromJson(JsonMap json) => DashboardStats(json);

  final JsonMap values;

  int get unansweredLeads => asInt(values['unanswered_leads']);
  int get upcomingArrivals => asInt(values['upcoming_arrivals']);
  double get monthlyIncome => asDouble(values['monthly_income']);
  double get upcomingExpenses => asDouble(values['upcoming_expenses']);
}

class StaffOption {
  const StaffOption({required this.id, required this.fullName, required this.roleLabel});

  factory StaffOption.fromJson(JsonMap json) => StaffOption(
        id: asInt(json['id']),
        fullName: json['full_name']?.toString() ?? '',
        roleLabel: json['role_label']?.toString() ?? json['role']?.toString() ?? '',
      );

  final int id;
  final String fullName;
  final String roleLabel;
}

class PlannerResult {
  const PlannerResult({
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.cabins,
    required this.suggestions,
    required this.summary,
  });

  factory PlannerResult.fromJson(JsonMap json) => PlannerResult(
        checkIn: json['check_in']?.toString() ?? '',
        checkOut: json['check_out']?.toString() ?? '',
        guests: json['guests'] == null ? null : asInt(json['guests']),
        cabins: asList(json['cabins']).map(PlannerCabin.fromJson).toList(),
        suggestions: asList(json['suggestions']).map(PlannerSuggestion.fromJson).toList(),
        summary: asMap(json['summary']),
      );

  final String checkIn;
  final String checkOut;
  final int? guests;
  final List<PlannerCabin> cabins;
  final List<PlannerSuggestion> suggestions;
  final JsonMap summary;
}

class PlannerCabin {
  const PlannerCabin({
    required this.id,
    required this.name,
    required this.mapSlot,
    required this.maxGuests,
    required this.fitsGuests,
    required this.availableForRange,
    required this.segments,
  });

  factory PlannerCabin.fromJson(JsonMap json) => PlannerCabin(
        id: asInt(json['cabin_id']),
        name: json['name']?.toString() ?? asMap(json['cabin'])['name']?.toString() ?? 'Cabana',
        mapSlot: json['map_slot']?.toString(),
        maxGuests: asInt(json['max_guests']),
        fitsGuests: json['fits_guests'] == true,
        availableForRange: json['available_for_range'] == true,
        segments: asList(json['segments']).map(PlannerSegment.fromJson).toList(),
      );

  final int id;
  final String name;
  final String? mapSlot;
  final int maxGuests;
  final bool fitsGuests;
  final bool availableForRange;
  final List<PlannerSegment> segments;
}

class PlannerSegment {
  const PlannerSegment({
    required this.checkIn,
    required this.checkOut,
    required this.state,
    required this.tone,
    required this.label,
    required this.isAvailable,
    required this.reservation,
    required this.quotes,
    required this.block,
  });

  factory PlannerSegment.fromJson(JsonMap json) => PlannerSegment(
        checkIn: json['check_in']?.toString() ?? '',
        checkOut: json['check_out']?.toString() ?? '',
        state: json['state']?.toString() ?? 'available',
        tone: json['tone']?.toString() ?? 'green',
        label: json['label']?.toString() ?? 'Disponible',
        isAvailable: json['is_available'] == true,
        reservation: json['reservation'] == null
            ? null
            : PlannerReservation.fromJson(asMap(json['reservation'])),
        quotes: asList(json['quotes']).map(PlannerReservation.fromJson).toList(),
        block: json['block'] == null ? null : PlannerBlock.fromJson(asMap(json['block'])),
      );

  final String checkIn;
  final String checkOut;
  final String state;
  final String tone;
  final String label;
  final bool isAvailable;
  final PlannerReservation? reservation;
  final List<PlannerReservation> quotes;
  final PlannerBlock? block;
}

class PlannerReservation {
  const PlannerReservation({
    required this.id,
    required this.status,
    required this.leaderName,
    required this.statusLabel,
    required this.guestsCount,
    required this.checkIn,
    required this.checkOut,
    required this.notes,
    required this.source,
    required this.expiresAt,
    required this.confirmedAt,
    required this.cabinIds,
    required this.cabinNames,
    required this.assignedName,
  });

  factory PlannerReservation.fromJson(JsonMap json) {
    final staff = asMap(json['assigned_staff']);
    return PlannerReservation(
      id: asInt(json['id']),
      status: json['status']?.toString() ?? '',
      leaderName: json['leader_name']?.toString(),
      statusLabel: json['status_label']?.toString() ?? '',
      guestsCount: asInt(json['guests_count']),
      checkIn: json['check_in']?.toString() ?? '',
      checkOut: json['check_out']?.toString() ?? '',
      notes: json['notes']?.toString(),
      source: json['source']?.toString(),
      expiresAt: json['expires_at']?.toString(),
      confirmedAt: json['confirmed_at']?.toString(),
      cabinIds: (json['cabin_ids'] as List? ?? const []).map(asInt).toList(),
      cabinNames: (json['cabin_names'] as List? ?? const []).map((item) => item.toString()).toList(),
      assignedName: staff['full_name']?.toString(),
    );
  }

  final int id;
  final String status;
  final String? leaderName;
  final String statusLabel;
  final int guestsCount;
  final String checkIn;
  final String checkOut;
  final String? notes;
  final String? source;
  final String? expiresAt;
  final String? confirmedAt;
  final List<int> cabinIds;
  final List<String> cabinNames;
  final String? assignedName;
}

class PlannerBlock {
  const PlannerBlock({
    required this.id,
    required this.reason,
    required this.notes,
    required this.appliesToAll,
    required this.checkIn,
    required this.checkOut,
    required this.cabinIds,
    required this.cabinNames,
  });

  factory PlannerBlock.fromJson(JsonMap json) => PlannerBlock(
        id: asInt(json['id']),
        reason: json['reason']?.toString() ?? 'Bloqueo',
        notes: json['notes']?.toString(),
        appliesToAll: json['applies_to_all'] == true,
        checkIn: json['check_in']?.toString() ?? '',
        checkOut: json['check_out']?.toString() ?? '',
        cabinIds: (json['cabin_ids'] as List? ?? const []).map(asInt).toList(),
        cabinNames: (json['cabin_names'] as List? ?? const []).map((item) => item.toString()).toList(),
      );

  final int id;
  final String reason;
  final String? notes;
  final bool appliesToAll;
  final String checkIn;
  final String checkOut;
  final List<int> cabinIds;
  final List<String> cabinNames;
}

class PlannerSuggestion {
  const PlannerSuggestion({
    required this.cabinIds,
    required this.capacity,
    required this.capacityExtra,
    required this.cabinsCount,
    required this.names,
  });

  factory PlannerSuggestion.fromJson(JsonMap json) => PlannerSuggestion(
        cabinIds: (json['cabin_ids'] as List? ?? const []).map((item) => asInt(item)).toList(),
        capacity: asInt(json['capacity']),
        capacityExtra: asInt(json['capacity_extra']),
        cabinsCount: asInt(json['cabins_count']),
        names: asList(json['cabins']).map((item) => item['name']?.toString() ?? '').toList(),
      );

  final List<int> cabinIds;
  final int capacity;
  final int capacityExtra;
  final int cabinsCount;
  final List<String> names;
}

class ReservationSummary {
  const ReservationSummary({
    required this.id,
    required this.leaderName,
    required this.statusLabel,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.totalPrice,
    required this.totalPaid,
    required this.balanceDue,
    required this.cabinNames,
  });

  factory ReservationSummary.fromJson(JsonMap json) => ReservationSummary(
        id: asInt(json['id']),
        leaderName: json['leader_name']?.toString() ?? 'Sin lider',
        statusLabel: json['status_label']?.toString() ?? '',
        checkIn: json['check_in']?.toString() ?? '',
        checkOut: json['check_out']?.toString() ?? '',
        guests: asInt(json['guests_count']),
        totalPrice: json['total_price'] == null ? null : asDouble(json['total_price']),
        totalPaid: asDouble(json['total_paid']),
        balanceDue: json['balance_due'] == null ? null : asDouble(json['balance_due']),
        cabinNames: asList(json['cabins']).map((item) => item['name']?.toString() ?? '').toList(),
      );

  final int id;
  final String leaderName;
  final String statusLabel;
  final String checkIn;
  final String checkOut;
  final int guests;
  final double? totalPrice;
  final double totalPaid;
  final double? balanceDue;
  final List<String> cabinNames;
}

class LeadItem {
  const LeadItem({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.status,
    required this.statusLabel,
    required this.message,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
  });

  factory LeadItem.fromJson(JsonMap json) => LeadItem(
        id: asInt(json['id']),
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString(),
        phone: json['phone']?.toString(),
        status: json['status']?.toString() ?? 'new',
        statusLabel: json['status_label']?.toString() ?? '',
        message: json['message']?.toString(),
        checkIn: json['check_in']?.toString(),
        checkOut: json['check_out']?.toString(),
        guests: json['guests_count'] == null ? null : asInt(json['guests_count']),
      );

  final int id;
  final String name;
  final String? email;
  final String? phone;
  final String status;
  final String statusLabel;
  final String? message;
  final String? checkIn;
  final String? checkOut;
  final int? guests;
}

class FinanceSummary {
  const FinanceSummary({
    required this.incomeTotal,
    required this.expenseTotal,
    required this.pendingExpenseTotal,
    required this.netTotal,
  });

  factory FinanceSummary.fromJson(JsonMap json) => FinanceSummary(
        incomeTotal: asDouble(json['income_total']),
        expenseTotal: asDouble(json['expense_total']),
        pendingExpenseTotal: asDouble(json['pending_expense_total']),
        netTotal: asDouble(json['net_total']),
      );

  final double incomeTotal;
  final double expenseTotal;
  final double pendingExpenseTotal;
  final double netTotal;
}

class ExpenseItem {
  const ExpenseItem({
    required this.id,
    required this.category,
    required this.description,
    required this.amount,
    required this.statusLabel,
    required this.dueDate,
  });

  factory ExpenseItem.fromJson(JsonMap json) => ExpenseItem(
        id: asInt(json['id']),
        category: json['category']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        amount: asDouble(json['amount']),
        statusLabel: json['status_label']?.toString() ?? '',
        dueDate: json['due_date']?.toString() ?? '',
      );

  final int id;
  final String category;
  final String description;
  final double amount;
  final String statusLabel;
  final String dueDate;
}
