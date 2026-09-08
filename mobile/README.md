# Playa Terco Admin

Aplicación administrativa móvil de Cabañas Playa Terco.

## Ejecución local

El backend debe estar disponible bajo `/api/v1`. En el emulador de Android se
usa `10.0.2.2` por defecto. Para un dispositivo conectado por USB:

```powershell
adb reverse tcp:8000 tcp:8000
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Acceso con Google

Mientras no se proporcionen credenciales OAuth, la aplicación mantiene visible
el botón de Google con el estado `Pendiente` y explica la configuración que
falta. Para activarlo:

1. Crear un cliente OAuth web para el backend y configurar su ID tanto en
   `GOOGLE_CLIENT_ID` de Laravel como en `GOOGLE_SERVER_CLIENT_ID` de Flutter.
2. Registrar Android con el paquete
   `com.playaterco.cabanas_playa_terco_admin` y las huellas SHA del certificado.
3. Para iOS, crear el cliente correspondiente, registrar el esquema de URL
   invertido en `ios/Runner/Info.plist` y pasar `GOOGLE_IOS_CLIENT_ID`.

Ejemplo de compilación Android:

```powershell
flutter build apk --debug `
  --dart-define=GOOGLE_SERVER_CLIENT_ID=000000000000-example.apps.googleusercontent.com
```

No se deben versionar secretos ni archivos de credenciales privados. Una cuenta
nueva, incluida una cuenta de Google, queda con rol `user` y no recibe un token
administrativo hasta que un administrador le asigne `staff` o `admin`.

## Validación

```powershell
flutter analyze
flutter test
flutter build apk --debug
```
