<?php

namespace App\Services\Fax\Support;

/**
 * Describes one credential field exposed to the React Fax Settings page.
 *
 * Providers return arrays of these from credentialSchema(), letting the UI
 * render dynamic forms without hard-coding any provider knowledge.
 */
class CredentialField
{
    public const TYPE_STRING = 'string';

    public const TYPE_SECRET = 'secret';     // masked input, never echoed back

    public const TYPE_URL = 'url';

    public const TYPE_BOOLEAN = 'boolean';

    public const TYPE_SELECT = 'select';

    public function __construct(
        public readonly string $name,
        public readonly string $label,
        public readonly string $type = self::TYPE_STRING,
        public readonly bool $required = true,
        public readonly ?string $help = null,
        public readonly ?string $placeholder = null,
        /** @var array<int, array{value:string,label:string}>|null */
        public readonly ?array $options = null,
    ) {}

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'type' => $this->type,
            'required' => $this->required,
            'help' => $this->help,
            'placeholder' => $this->placeholder,
            'options' => $this->options,
            'is_secret' => $this->type === self::TYPE_SECRET,
        ];
    }
}
