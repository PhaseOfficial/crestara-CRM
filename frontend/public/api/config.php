<?php
/**
 * Crestara CRM - cPanel Server Configuration
 * 
 * Instructions:
 * 1. Edit this file directly in cPanel File Manager (under /api/config.php).
 * 2. Configure your SMTP mail server or use local cPanel mail.
 * 3. Set your cron security key.
 * 
 * Note: This file is executed strictly server-side and is blocked from direct
 * web access via .htaccess. Sensitive passwords are NEVER exposed to browsers.
 */

return [
    // =========================================================================
    // 1. SMTP & TRANSACTIONAL EMAIL DISPATCH
    // =========================================================================
    'mail' => [
        // Set to true to route emails through an authenticated SMTP server.
        // Set to false to use cPanel's local PHP sendmail (mail() function).
        'use_smtp'    => false,

        // SMTP Server Host (e.g. mail.crestaraadvisorygroup.com, smtp.gmail.com)
        'smtp_host'   => 'mail.crestaraadvisorygroup.com',

        // SMTP Port: 465 (SSL/TLS) or 587 (STARTTLS) or 25
        'smtp_port'   => 465,

        // SMTP Authentication Credentials
        'smtp_user'   => 'billing@crestaraadvisorygroup.com',
        'smtp_pass'   => '',

        // Encryption protocol: 'ssl' (port 465) or 'tls' (port 587) or ''
        'smtp_secure' => 'ssl',

        // Default Sender Identity
        'from_name'   => 'Crestara Advisory Group',
        'from_email'  => 'billing@crestaraadvisorygroup.com',
        'reply_to'    => 'billing@crestaraadvisorygroup.com',
    ],

    // =========================================================================
    // 2. AUTOMATED PAYMENT REMINDERS & CRON SECURITY
    // =========================================================================
    'reminders' => [
        // Security key required to trigger the cron endpoint via web/URL
        // Example: https://crm.crestaraadvisorygroup.com/api/cron_reminders.php?token=cr_rem_live_secret
        'cron_secret_token'    => 'cr_rem_live_secret',

        // Server-side fallback intervals if not configured in CRM UI
        'default_days_before'  => '7, 3, 1',
        'default_overdue_days' => '3, 7',
        'remind_on_due_date'   => true,
    ],

    // =========================================================================
    // 3. SUPABASE REST INTEGRATION (Server-Side)
    // =========================================================================
    'supabase' => [
        'url'              => 'https://svvqqmljgmgrcijkmjsk.supabase.co',
        'service_role_key' => 'sb_publishable_FzlvHScSdhbugbIKIGGnnQ_I3Y6oRVV',
    ],
];
