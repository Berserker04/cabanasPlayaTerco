<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Recibimos tu solicitud</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.6;">
    <h1 style="font-size: 22px; margin-bottom: 12px;">Hola, {{ $lead->name }}</h1>

    <p>
        Gracias por escribir a Cabañas Playa Terco. Recibimos tu solicitud y revisaremos los
        detalles para responderte pronto con disponibilidad, recomendaciones y próximos pasos.
        La disponibilidad está sujeta a confirmación.
        Esta solicitud no confirma una reserva.
    </p>

    <h2 style="font-size: 18px; margin-top: 24px;">Resumen de tu solicitud</h2>
    <ul>
        <li><strong>Fechas:</strong> {{ $lead->check_in?->format('Y-m-d') ?? 'Por definir' }} - {{ $lead->check_out?->format('Y-m-d') ?? 'Por definir' }}</li>
        <li><strong>Huéspedes:</strong> {{ $lead->guests_count ?? 'Por definir' }}</li>
        <li><strong>Alojamiento:</strong> {{ $lead->cabin?->name ?? $lead->cabinType?->name ?? 'Por confirmar' }}</li>
    </ul>

    <p style="white-space: pre-line;">{{ $lead->message }}</p>

    <p>
        Si necesitas una respuesta inmediata, también puedes escribirnos por WhatsApp al
        <a href="https://wa.me/573147427806">314 742 7806</a>.
    </p>

    <p style="margin-top: 24px;">
        Un saludo,<br>
        Equipo Cabañas Playa Terco
    </p>
</body>
</html>
