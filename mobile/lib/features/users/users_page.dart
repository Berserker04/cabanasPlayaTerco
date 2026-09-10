import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/data_events.dart';
import '../../core/management_models.dart';
import '../../core/models.dart';
import '../../core/providers.dart';
import '../../shared/management_widgets.dart';
import '../../shared/widgets.dart';

class UsersPage extends ConsumerWidget {
  const UsersPage({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      CollectionPage<ManagedUser>(
        title: 'Usuarios',
        searchHint: 'Nombre, correo o teléfono',
        filters: const {
          'role': {'': 'Todos los roles', ...roleLabels},
          'status': {
            '': 'Todos los estados',
            'active': 'Activos',
            'suspended': 'Suspendidos',
          },
        },
        load: (page, search, filters) => ref
            .read(apiRepositoryProvider)
            .page(
              '/admin/users',
              ManagedUser.fromJson,
              page: page,
              search: search,
              filters: filters,
            ),
        itemBuilder: (context, user, meta) => Card(
          child: ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: const CircleAvatar(child: Icon(Icons.person_outline)),
            title: Text(user.name),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user.email),
                const SizedBox(height: 6),
                Text(user.roles.map((r) => roleLabels[r] ?? r).join(' · ')),
                if (user.status == 'suspended')
                  const Text(
                    'Cuenta suspendida',
                    style: TextStyle(color: Colors.red),
                  ),
              ],
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context, rootNavigator: true).push(
              MaterialPageRoute<void>(
                builder: (_) => UserEditPage(
                  user,
                  asList(
                    meta['available_roles'],
                  ).map(RoleOption.fromJson).toList(),
                ),
              ),
            ),
          ),
        ),
      );
}

class UserEditPage extends ConsumerStatefulWidget {
  const UserEditPage(this.user, this.roles, {super.key});
  final ManagedUser user;
  final List<RoleOption> roles;
  @override
  ConsumerState<UserEditPage> createState() => _UserEditPageState();
}

class _UserEditPageState extends ConsumerState<UserEditPage> {
  late Set<int> _roles;
  late bool _active;
  bool _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _roles = widget.user.roleIds.toSet();
    _active = widget.user.status == 'active';
  }

  Future<void> _save() async {
    if (_roles.isEmpty) {
      setState(() => _error = 'Selecciona al menos un rol.');
      return;
    }
    final names = widget.roles
        .where((r) => _roles.contains(r.id))
        .map((r) => r.label)
        .join(', ');
    if (!await confirmAction(
      context,
      'Actualizar permisos',
      '${widget.user.name}\nRoles: $names\nEstado: ${_active ? 'Activo' : 'Suspendido'}',
    )) {
      return;
    }
    if (!mounted) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(apiRepositoryProvider).update(
        '/admin/users/${widget.user.id}',
        {
          'role_ids': _roles.toList(),
          'status': _active ? 'active' : 'suspended',
        },
      );
      ref.read(dataRevisionProvider.notifier).changed();
      if (mounted) {
        showMessage(context, 'Permisos actualizados.');
        Navigator.pop(context);
      }
    } catch (error) {
      if (mounted) setState(() => _error = errorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final actor = ref.watch(authControllerProvider).value?.user;
    final own = actor?.id == widget.user.id;
    return Scaffold(
      appBar: AppBar(title: const Text('Permisos del usuario')),
      body: actor?.isAdmin != true
          ? const Center(
              child: Text('Solo un administrador puede asignar permisos.'),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  widget.user.name,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                SelectableText(widget.user.email),
                if (widget.user.phone.isNotEmpty)
                  SelectableText(widget.user.phone),
                const SizedBox(height: 20),
                Text(
                  'Roles de acceso',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                ...widget.roles.map(
                  (role) => CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _roles.contains(role.id),
                    title: Text(role.label),
                    subtitle: Text(role.description),
                    onChanged: _saving || (own && role.name == 'admin')
                        ? null
                        : (value) => setState(() {
                            if (value == true) {
                              _roles.add(role.id);
                            } else {
                              _roles.remove(role.id);
                            }
                          }),
                  ),
                ),
                const Divider(),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Cuenta activa'),
                  subtitle: const Text(
                    'Una cuenta suspendida pierde el acceso al sistema.',
                  ),
                  value: _active,
                  onChanged: _saving || own
                      ? null
                      : (value) => setState(() => _active = value),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Guardando…' : 'Guardar permisos'),
                ),
              ],
            ),
    );
  }
}
