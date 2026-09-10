# Administración móvil y avisos de cotización

## Funciones y permisos

La navegación inferior contiene Inicio, Fechas, Cotizaciones y Más. Los listados incluyen búsqueda, filtros y paginación. Abrir una solicitud no cambia su estado; el contador suma las solicitudes nuevas de todo el equipo.

| Rol activo | Acceso |
| --- | --- |
| Administrador | Operaciones, cotizaciones, caja, reseñas, blogs y comentarios, galería y usuarios |
| Personal | Operaciones, cotizaciones, caja y lectura de blogs públicos |
| Visualizador | Consultas operativas, cotizaciones y caja sin cambios; lectura de blogs públicos |
| Usuario | Pendiente de autorización móvil |

La aplicación vuelve a comprobar la cuenta al retomarse y mientras está activa. Laravel comprueba los permisos en cada petición. La suspensión o pérdida de acceso revoca las sesiones; pasar a Visualizador retira los tokens de notificaciones. Se conservan las protecciones de la propia cuenta y del último administrador activo.

Fechas abre en hoy, con calendario mensual, cabañas y agenda del día. Consultar estadía permite seleccionar llegada, salida y personas, con un máximo de 31 noches. La salida no ocupa esa noche y las cotizaciones no bloquean disponibilidad. Buscar registros permite encontrar también cotizaciones vencidas. La edición consulta disponibilidad excluyendo el registro actual y envía solamente los campos cambiados. Confirmación, renovación, cancelación, entrada y salida son acciones separadas.

Reseñas conserva la publicación automática existente y permite revisar, ocultar, aprobar, responder y eliminar. Blogs incluye lectura formateada y moderación de publicaciones y comentarios; no incluye creación de artículos.

Galería admite selección múltiple nativa, vista previa, categorías, álbum opcional y visibilidad. General y publicación activa son los valores iniciales. JPG, PNG y WebP: hasta 10 MiB; MP4 y MOV: hasta 150 MiB. Cada archivo conserva su progreso y resultado. Cancelar o reintentar conserva los archivos confirmados como exitosos. Si se pierde la respuesta del servidor, comprobar la galería antes de reintentar para evitar una carga duplicada.

## Firebase configurado

- Proyecto de Google/Firebase: cabanasplayaterco.
- Paquete Android: com.playaterco.cabanas_playa_terco_admin.
- Cuenta de servicio dedicada: playaterco-push@cabanasplayaterco.iam.gserviceaccount.com.
- Permiso asignado: roles/firebasecloudmessaging.admin.
- Configuración Android: mobile/android/app/google-services.json, excluida de Git.

La clave JSON privada está fuera del repositorio, bajo el directorio privado de configuración de la máquina de desarrollo. Nunca copiarla a Flutter, public/, storage/app/public, archivos de compilación ni Git. La configuración pública de Android y la clave privada de servidor son archivos distintos.

Para otra máquina, descargar la configuración Android desde Firebase y colocarla en android/app/google-services.json. La compilación local funciona sin Firebase, con bandeja y contador disponibles; Más muestra el estado de los avisos.

## Activación en el servidor de producción

Los cambios de código y la configuración local no despliegan automáticamente el backend de producción.

1. Desplegar el backend con sus dependencias de Composer, incluidas google/auth y Guzzle ya presentes.
2. Copiar la cuenta de servicio a una ruta privada fuera del directorio público y del repositorio. Dar acceso de lectura únicamente al usuario que ejecuta PHP y el programador.
3. Añadir al .env del servidor:

   ~~~dotenv
   FIREBASE_PROJECT_ID=cabanasplayaterco
   GOOGLE_APPLICATION_CREDENTIALS=/ruta/privada/fcm-service-account.json
   ~~~

4. Ejecutar php artisan migrate --force y php artisan config:cache. La migración aditiva enlaza device_tokens con personal_access_tokens. Los tokens antiguos sin sesión deben volver a registrarse desde la app.
5. Mantener el cron existente ejecutando php artisan schedule:run cada minuto. routes/console.php ejecuta queue:work database --queue=push --stop-when-empty --max-time=45 --timeout=25 --tries=3 cada minuto, con exclusión de solapamiento.
6. Verificar php artisan schedule:list. No es necesario instalar un proceso permanente adicional para esta cola. El envío push usa explícitamente la conexión database aunque otra función use QUEUE_CONNECTION=sync.
7. Revisar php artisan queue:failed y storage/logs/laravel.log ante errores. Tras corregir la causa, reintentar los trabajos pertinentes con queue:retry. Los intentos están limitados a tres, con espera de 60 y 300 segundos.
8. Para video, configurar PHP upload_max_filesize=160M, post_max_size=170M y un tiempo de ejecución adecuado; comprobar también los límites de cuerpo/tiempo del proxy o servidor web.

El guardado web se mantiene aunque falle la cola o FCM. El trabajo comprueba otra vez usuario activo, rol, sesión vigente y token antes de enviar. FCM usa HTTP v1 con OAuth de cuenta de servicio; no se utiliza una clave legacy. Los dispositivos UNREGISTERED se retiran.

## Android y notificaciones

El permiso se solicita después de iniciar sesión. Administrador y Personal reciben los avisos. Con la app abierta se muestra un aviso con acceso a la solicitud; en segundo plano Android muestra la notificación. Al tocarla se resuelve la sesión antes de abrir /leads/{id}. Cerrar sesión elimina la asociación de la sesión y el token FCM local.

El contador se actualiza al iniciar, retomar, recibir un aviso y cada 60 segundos en primer plano. Funciona también con el permiso de notificaciones desactivado. Una aplicación detenida expresamente desde Ajustes de Android no recibe mensajes hasta abrirse de nuevo; esto difiere de salir normalmente de la app.

En el teléfono de prueba se observaron entregas de FCM con retraso, además de entregas inmediatas. La aceptación del envío por Firebase no garantiza una hora de recepción en el dispositivo. La bandeja y su contador no dependen de esa entrega.

La configuración y aceptación realizadas corresponden a Android. iOS requiere su registro Firebase/APNs y validación independiente.

Referencias: [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [recepción en Flutter](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages), [selector nativo](https://pub.dev/packages/image_picker).

## Compilación y prueba aislada

Desde mobile:

~~~powershell
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --dart-define-from-file=config/development.local.json
adb install -r build/app/outputs/flutter-apk/app-debug.apk
~~~

El APK de desarrollo utiliza la API definida en config/development.local.json. Con API en 127.0.0.1:8000, mantener adb reverse tcp:8000 tcp:8000 y el backend local disponible. Para distribución, compilar con HTTPS del backend desplegado y el certificado de firma de distribución.

El recorrido automatizado usa exclusivamente un servidor QA con SQLite y correo simulado:

~~~powershell
# Terminal 1, backend
php tests/Support/MobileQaServer.php seed
php -d upload_max_filesize=160M -d post_max_size=170M -S 127.0.0.1:8011 tests/Support/MobileQaServer.php
# Terminal 2, mobile
adb reverse tcp:8000 tcp:8011
flutter test integration_test/mobile_management_test.dart -d DEVICE_ID --dart-define-from-file=config/development.local.json
# Restaurar al finalizar
adb reverse tcp:8000 tcp:8000
~~~

Aceptar el permiso nativo de notificaciones en el teléfono cuando Android lo solicite. El test rechaza cualquier API que no devuelva X-QA-Isolated: mobile-sqlite-mail-faked. Las cuentas QA y su contraseña se definen únicamente en tests/Support/MobileQaServer.php; no se crean en la base real.

Para probar el formulario web, ejecutar Next con NEXT_PUBLIC_API_URL=http://127.0.0.1:8011/api/v1 y un directorio .next separado. El comando php tests/Support/MobileQaServer.php queue procesa los avisos QA con Firebase real; status informa cantidades sin exponer tokens. La base y archivos QA están bajo storage/framework/testing/mobile-admin.

No entregar el APK que genera integration_test: volver a compilar la entrada normal lib/main.dart e instalarla.

## Verificación del 9 de septiembre de 2026

- PHPUnit: 171 pruebas y 1801 aserciones correctas.
- Flutter: 24 pruebas correctas, incluidas conservación de campos al editar, refresco del detalle, paginación, pantalla de 320 × 640 con escalado de texto no lineal de Android, permisos y cancelación/reintento de archivos.
- flutter analyze: sin incidencias.
- Integración Android mediante ADB en el teléfono 24116RACCG: recorrido completo correcto contra Laravel QA. Se verificaron reserva y edición, moderación de reseña reflejada en la API pública, lectura y moderación de blog/comentarios, asignación de permisos, subida de fotografía real, seguimiento de cotización y Visualizador/cierre de sesión.
- Firebase HTTP v1: envío real correcto con la aplicación abierta, en segundo plano y cerrada normalmente; aviso nativo y apertura de su detalle desde una solicitud enviada en el formulario web QA. La bandeja y el contador se comprobaron también con el permiso de notificaciones denegado.
- Selector nativo Android: selección múltiple de foto y video, regreso a la revisión conservando los archivos y subida conjunta correcta. Video MP4 de 7,8 MiB reproducido bajo demanda; el servidor sirve su contenido con respuestas HTTP 206 para reproducción por rangos.
- Se corrigieron y comprobaron el refresco del detalle después de guardar, la repetición del aviso inicial al volver de otra pantalla, los controles de videos verticales y los botones superpuestos con la barra de navegación de Android.
- Comprobación final física: resolución equivalente a 320 × 640 y texto del sistema al 180 %, calendario y teclado numérico sin desbordamientos. Se restauraron tamaño, escala de texto y ajuste de pantalla encendida del teléfono. logcat-final.txt no contiene excepciones Flutter, desbordamientos ni fallos fatales de la aplicación durante esta comprobación.
- Cierre de sesión final: cero dispositivos elegibles para avisos, cero trabajos pendientes y cero trabajos fallidos en QA.

Los registros de validación quedan en mobile/build/integration-qa.log, mobile/build/flutter-tests-final.log, mobile/build/analyze-final.log y backend/storage/logs/mobile-final-tests.log. Son archivos locales de compilación, excluidos de Git.

APK de desarrollo entregado: mobile/build/app/outputs/flutter-apk/app-debug.apk (201 MiB). SHA-256: 93382f888509afc9bb43ff125a00b699312e02734fe723fe643a8d42df8dacc2.
