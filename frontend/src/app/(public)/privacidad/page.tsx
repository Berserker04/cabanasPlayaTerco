import type { Metadata } from 'next';
import Link from 'next/link';
import { EMAIL, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Cómo utiliza Cabañas Playa Terco los datos de tu cuenta, consultas y publicaciones.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <Link href="/" className="text-sm font-medium text-primary underline underline-offset-4">
        Volver al inicio
      </Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">Política de privacidad</h1>
      <p className="mt-3 text-sm text-muted-foreground">Última actualización: 9 de septiembre de 2026</p>
      <div className="mt-10 space-y-9 text-base leading-8 text-muted-foreground [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <section>
          <h2>Quién gestiona tus datos</h2>
          <p>
            {SITE_NAME} utiliza este sitio para presentar sus alojamientos, atender consultas,
            gestionar estadías y permitir que sus visitantes compartan experiencias.
            Para consultas sobre tus datos puedes escribir a{' '}
            <a className="break-all text-primary underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
        </section>
        <section>
          <h2>Datos de tu cuenta e inicio de sesión con Google</h2>
          <p>
            Al crear una cuenta proporcionas tu nombre, correo y contraseña. La contraseña se
            almacena mediante un hash, no como texto legible. Si eliges entrar con Google,
            recibimos tu identificador de Google, nombre, dirección de correo y foto de perfil.
            Estos datos permiten identificarte, crear o vincular tu cuenta y mostrar tu perfil.
            El inicio de sesión no solicita acceso a tus correos de Gmail, contactos ni archivos
            de Google Drive. La aplicación no guarda tu contraseña de Google.
          </p>
        </section>
        <section>
          <h2>Consultas, reservas y contenido que compartes</h2>
          <p>
            Utilizamos los datos que incluyes en formularios, como teléfono, fechas de viaje y
            número de huéspedes, para responderte y gestionar tu solicitud. El personal autorizado
            puede gestionar información de huéspedes, reservas, pagos y documentos de la estadía
            en el panel de administración.
          </p>
          <p className="mt-3">
            Las reseñas, comentarios, experiencias y fotografías que publiques pueden ser visibles
            para otros visitantes, junto con tu nombre y foto de perfil. Evita publicar documentos
            de identidad, información privada o imágenes de otras personas sin su autorización.
            Desde tu perfil puedes gestionar el contenido que la aplicación permite editar o retirar.
          </p>
        </section>
        <section>
          <h2>Cookies y proveedores técnicos</h2>
          <p>
            Usamos cookies de sesión y de seguridad para mantener tu acceso y proteger los
            formularios. Vercel sirve el sitio web y Hostinger aloja la API, la base de datos y
            los archivos subidos. Estos servicios procesan las solicitudes necesarias para
            operar la aplicación, que pueden incluir dirección IP y registros técnicos.
            Google interviene cuando eliges su inicio de sesión. Los enlaces a WhatsApp y
            redes sociales abren servicios que tienen sus propias políticas de privacidad.
          </p>
        </section>
        <section>
          <h2>Conservación y solicitudes sobre tus datos</h2>
          <p>
            La aplicación guarda la información de cuentas, solicitudes y estadías en su base
            de datos y mantiene copias de seguridad para recuperación. Para consultar, corregir
            o solicitar la eliminación de tu cuenta o de tus datos, escribe a{' '}
            <a className="break-all text-primary underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>{' '}
            e indica la cuenta y la solicitud. Revisaremos la identidad de quien solicita el
            cambio y los registros involucrados para evitar que otra persona modifique tus datos.
            Revocar el acceso desde tu cuenta de Google no elimina por sí solo los datos ya
            guardados en este sitio; puedes solicitar su eliminación por el mismo correo.
          </p>
        </section>
      </div>
    </article>
  );
}
