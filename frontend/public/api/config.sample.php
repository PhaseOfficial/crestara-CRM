<?php
/**
 * Crestara CRM - cPanel Server Configuration (Sample Template)
 * 
 * Copy this file to config.php and update your credentials:
 * cp config.sample.php config.php
 */

return [
    'mail' => [
        'use_smtp'    => false,
        'smtp_host'   => 'mail.crestaraadvisorygroup.com',
        'smtp_port'   => 465,
        'smtp_user'   => 'billing@crestaraadvisorygroup.com',
        'smtp_pass'   => '',
        'smtp_secure' => 'ssl',
        'from_name'   => 'Crestara Advisory Group',
        'from_email'  => 'billing@crestaraadvisorygroup.com',
        'reply_to'    => 'billing@crestaraadvisorygroup.com',
    ],

    'reminders' => [
        'cron_secret_token'    => 'cr_rem_live_secret',
        'default_days_before'  => '7, 3, 1',
        'default_overdue_days' => '3, 7',
        'remind_on_due_date'   => true,
    ],

    'supabase' => [
        'url'              => 'https://svvqqmljgmgrcijkmjsk.supabase.co',
        'service_role_key' => 'sb_publishable_FzlvHScSdhbugbIKIGGnnQ_I3Y6oRVV',
    ],
];
