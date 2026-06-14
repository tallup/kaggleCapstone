<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Minishlink\WebPush\Subscription as WebPushSubscription;

class PushSubscription extends Model
{
    protected $table = 'user_push_subscriptions';

    protected $fillable = [
        'user_id',
        'endpoint',
        'public_key',
        'auth_token',
        'content_encoding',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Build a Minishlink WebPush Subscription instance from this model.
     */
    public function toWebPushSubscription(): WebPushSubscription
    {
        $contentEncoding = $this->content_encoding ?? 'aes128gcm';

        return WebPushSubscription::create([
            'endpoint' => $this->endpoint,
            'publicKey' => $this->public_key,
            'authToken' => $this->auth_token,
            'contentEncoding' => $contentEncoding,
        ]);
    }
}
