<?php

namespace App\Enums;

enum DocumentType: string
{
    case PaymentReceipt = 'payment_receipt';
    case IdDocument = 'id_document';
    case ReservationContract = 'reservation_contract';
    case Invoice = 'invoice';
    case Other = 'other';

    public function label(): string
    {
        return match($this) {
            self::PaymentReceipt => 'Comprobante de pago',
            self::IdDocument => 'Documento de identidad',
            self::ReservationContract => 'Contrato de reserva',
            self::Invoice => 'Factura',
            self::Other => 'Otro',
        };
    }
}
