import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { panelPermissions, canAccessPanelPath, panelRoleLabel } from '../src/lib/panel-access.ts';

// Match the frontend's extensionless TypeScript imports when running in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
const { resolvePostAuthPath, sanitizeLocalPath } = await import('../src/lib/auth-redirect.ts');

function user(roles, overrides = {}) {
  return {
    status: 'active', roles, is_admin: roles.includes('admin'),
    is_staff: roles.includes('admin') || roles.includes('staff'), ...overrides,
  };
}

for (const [roles, canEnter, canOperate, canAdminister, label] of [
  [['admin'], true, true, true, 'Administrador'],
  [['staff'], true, true, false, 'Personal'],
  [['viewer'], true, false, false, 'Visualizador · Solo lectura'],
  [['user'], false, false, false, 'Usuario'],
  [[], false, false, false, 'Usuario'],
  [['user', 'viewer'], true, false, false, 'Visualizador · Solo lectura'],
  [['viewer', 'staff'], true, true, false, 'Personal'],
  [['viewer', 'admin'], true, true, true, 'Administrador'],
]) {
  test(`${roles.join(' + ') || 'no roles'}: access, actions, menu, and post-login destination`, () => {
    const account = user(roles);
    assert.deepEqual(panelPermissions(account), { canEnter, canOperate, canAdminister });
    assert.equal(panelRoleLabel(account), label);
    for (const path of ['/admin', '/admin/disponibilidad', '/admin/cabanas']) {
      assert.equal(canAccessPanelPath(account, path), canEnter);
      assert.equal(canAccessPanelPath(account, `${path}/?from=2030-09-10#agenda`), canEnter);
      assert.equal(resolvePostAuthPath(account, path), canEnter ? path : '/');
    }
    for (const path of ['/admin/usuarios', '/admin/resenas', '/admin/blog', '/admin/galeria', '/admin/cabanas/nueva', '/admin/cabanas/1/editar', '/admin/personal']) {
      assert.equal(canAccessPanelPath(account, path), canAdminister);
      assert.equal(resolvePostAuthPath(account, path), canAdminister ? path : canEnter ? '/admin' : '/');
    }
    assert.equal(resolvePostAuthPath(account, '/'), canEnter ? '/admin' : '/');
    assert.equal(resolvePostAuthPath(account, '/perfil'), '/perfil');
    assert.equal(canAccessPanelPath(account, '/admin-other'), false);
  });
}

test('suspended accounts and missing sessions have no panel permissions', () => {
  for (const account of [null, undefined, user(['admin'], { status: 'suspended', can_access_panel: true }), user(['staff'], { status: 'suspended' }), user(['viewer'], { status: 'suspended' })]) {
    assert.deepEqual(panelPermissions(account), { canEnter: false, canOperate: false, canAdminister: false });
    assert.equal(canAccessPanelPath(account, '/admin'), false);
  }
});

test('an explicit denial from the API takes precedence over cached role flags', () => {
  assert.equal(panelPermissions(user(['admin'], { can_access_panel: false })).canEnter, false);
  assert.equal(panelPermissions(user(['viewer'], { can_access_panel: true })).canOperate, false);
});

test('post-login destinations stay local and regular users cannot enter via query or hash', () => {
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/\nexample.com', '/\rexample.com']) {
    assert.equal(sanitizeLocalPath(path), '/');
    assert.equal(resolvePostAuthPath(user(['viewer']), path), '/admin');
  }
  for (const path of ['/admin?foo=1', '/admin#agenda', '/admin/usuarios?foo=1']) {
    assert.equal(resolvePostAuthPath(user(['user']), path), '/');
  }
});
