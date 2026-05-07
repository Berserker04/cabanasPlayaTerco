<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Nueva solicitud de contacto</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
    <h1 style="font-size: 22px; margin-bottom: 12px;">Nueva solicitud desde la web</h1>
    <p>Un visitante envió una solicitud de cotización/reserva desde el formulario de contacto.</p>

    <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 680px;">
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Nombre</td>
            <td style="border-bottom: 1px solid #e5e7eb;">{{ $lead->name }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Correo</td>
            <td style="border-bottom: 1px solid #e5e7eb;">
                <a href="mailto:{{ $lead->email }}">{{ $lead->email }}</a>
            </td>
        </tr>
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Teléfono</td>
            <td style="border-bottom: 1px solid #e5e7eb;">{{ $lead->phone ?? 'No indicado' }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Llegada</td>
            <td style="border-bottom: 1px solid #e5e7eb;">{{ $lead->check_in?->format('Y-m-d') ?? 'Por definir' }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Salida</td>
            <td style="border-bottom: 1px solid #e5e7eb;">{{ $lead->check_out?->format('Y-m-d') ?? 'Por definir' }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Huéspedes</td>
            <td style="border-bottom: 1px solid #e5e7eb;">{{ $lead->guests_count ?? 'Por definir' }}</td>
        </tr>
        <tr>
            <td style="font-weight: bold; border-bottom: 1px solid #e5e7eb;">Cabaña</td>
            <td style="border-bottom: 1px solid #e5e7eb;">{{ $lead->cabinType?->name ?? 'Por definir' }}</td>
        </tr>
    </table>

    <h2 style="font-size: 18px; margin-top: 24px;">Mensaje</h2>
    <p style="white-space: pre-line;">{{ $lead->message }}</p>

    <p style="margin-top: 24px; color: #52606d;">
        Lead #{{ $lead->id }} creado el {{ $lead->created_at?->format('Y-m-d H:i') }}.
    </p>
</body>
</html>
