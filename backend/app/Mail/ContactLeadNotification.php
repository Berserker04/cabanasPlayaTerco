<?php

namespace App\Mail;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactLeadNotification extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public readonly Lead $lead)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [
                new Address($this->lead->email, $this->lead->name),
            ],
            subject: 'Nueva solicitud de contacto - Cabañas Playa Terco',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contact-notification',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
