# Playa Terco Admin

Aplicación administrativa móvil de Cabañas Playa Terco.

## Ejecución local

El backend debe estar disponible bajo `/api/v1`. En el emulador de Android se
usa `10.0.2.2` por defecto. Para un dispositivo conectado por USB:

La primera vez, copia `config/development.example.json` a
`config/development.local.json` y completa los IDs de OAuth. Este archivo local
queda excluido de Git. Para ejecutar conservando la configuración de Google:

```powershell
adb reverse tcp:8000 tcp:8000
flutter run --dart-define-from-file=config/development.local.json
```

En VS Code, abre la carpeta `mobile` y usa la configuración
`Playa Terco Admin (Android USB)` después de establecer el reenvío con ADB.

## Acceso con Google

Mientras no se proporcionen credenciales OAuth, la aplicación mantiene visible
el botón de Google con el estado `Pendiente` y explica la configuración que
falta. Para activarlo:

1. Crear un cliente OAuth de tipo **Aplicación web** en el mismo proyecto de
   Google Cloud que el cliente Android. Configurar su ID tanto en
   `GOOGLE_CLIENT_ID` del `.env` de Laravel como en `GOOGLE_SERVER_CLIENT_ID` de
   `config/development.local.json`. El ID Android no sirve como `serverClientId`.
2. Registrar Android con el paquete
   `com.playaterco.cabanas_playa_terco_admin` y las huellas SHA del certificado.
3. Para iOS, crear el cliente correspondiente, registrar el esquema de URL
   invertido en `ios/Runner/Info.plist` y pasar `GOOGLE_IOS_CLIENT_ID`.

El cliente Android registra el paquete y la firma ante Google; su JSON descargado
no es un archivo `google-services.json` y no se incorpora a la app. El cliente web
identifica al servidor que valida el token. Para este flujo móvil no hacen falta
orígenes JavaScript, URLs de redirección ni un secreto de cliente dentro de Flutter.
El inicio de sesión de la web mediante Laravel Socialite tiene una configuración
adicional independiente: secreto del cliente y URL de callback.

Referencia: [configuración oficial de Google Sign-In para Flutter Android](https://pub.dev/packages/google_sign_in_android#integration).

Compilación Android con la misma configuración:

```powershell
flutter build apk --debug --dart-define-from-file=config/development.local.json
```

No se deben versionar secretos ni archivos de credenciales privados. Una cuenta
nueva, incluida una cuenta de Google, queda con rol `user` y no recibe un token
administrativo hasta que un administrador le asigne `viewer`, `staff` o `admin`.
Visualizador puede consultar operaciones sin modificarlas.

## Administración y notificaciones

Los seis flujos, permisos, Firebase HTTP v1, cola de envío, despliegue y pruebas
reales por ADB están documentados en [Administración móvil](../docs/mobile-administration.md).
La configuración Android de Firebase se coloca en `android/app/google-services.json`;
la cuenta de servicio privada se guarda únicamente fuera del repositorio, en el servidor.

## Validación

```powershell
flutter analyze
flutter test
flutter build apk --debug --dart-define-from-file=config/development.local.json
```
