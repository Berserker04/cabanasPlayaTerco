<?php

namespace App\Mail;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactLeadAutoresponse extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Lead $lead)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Recibimos tu solicitud - Cabañas Playa Terco',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contact-autoresponse',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
