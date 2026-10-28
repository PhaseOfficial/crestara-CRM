<?php
/**
 * Crestara CRM - Automated Payment Reminders cPanel Cron Script
 * 
 * Scheduled daily script for cPanel cron jobs.
 * Evaluates unsettled commercial invoices, calculates day countdowns to deadline,
 * dispatches pre-deadline countdown reminders, due-today notices, and gentle overdue follow-ups.
 * 
 * cPanel Cron Command Example:
 *   /usr/local/bin/php /home/username/public_html/api/cron_reminders.php >> /home/username/cron_reminders.log 2>&1
 *
 * Webhook Trigger Example:
 *   curl -s "https://crm.yourdomain.com/api/cron_reminders.php?token=cr_rem_live_secret"
 *
 * Dry Run Test:
 *   /usr/local/bin/php /home/username/public_html/api/cron_reminders.php --dry-run
 *   or: curl -s "https://crm.yourdomain.com/api/cron_reminders.php?token=cr_rem_live_secret&dry_run=1"
 */

// Determine CLI vs Web execution
$isCli = (php_sapi_name() === 'cli');

if (!$isCli) {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// ============================================================================
// CONFIGURATION & CREDENTIAL RESOLUTION
// ============================================================================
$envFile = __DIR__ . '/../../.env';
$envConfig = [];
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($k, $v) = explode('=', $line, 2);
            $envConfig[trim($k)] = trim(trim($v), '"\'');
        }
    }
}

$supabaseUrl = getenv('SUPABASE_URL') ?: ($envConfig['VITE_SUPABASE_URL'] ?? '');
$supabaseKey = getenv('SUPABASE_SERVICE_ROLE_KEY') 
    ?: getenv('SUPABASE_ANON_KEY') 
    ?: ($envConfig['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? ($envConfig['VITE_SUPABASE_ANON_KEY'] ?? ''));

// Fallback Cron Secret Token
$defaultCronSecret = 'cr_rem_live_secret';

// Parse CLI flags or Web query parameters
$options = [];
if ($isCli) {
    $cliArgs = getopt('', ['dry-run', 'token::', 'date::']);
    $isDryRun = isset($cliArgs['dry-run']);
    $providedToken = $cliArgs['token'] ?? null;
    $simulatedDate = $cliArgs['date'] ?? null;
} else {
    $isDryRun = isset($_GET['dry_run']) && in_array(strtolower((string)$_GET['dry_run']), ['1', 'true', 'yes']);
    $providedToken = $_GET['token'] ?? null;
    if (!$providedToken && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\s+(\S+)/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            $providedToken = $matches[1];
        }
    }
    $simulatedDate = $_GET['date'] ?? null;
}

// ============================================================================
// SUPABASE REST HELPER FUNCTIONS
// ============================================================================
function supabaseRequest($method, $endpoint, $supabaseUrl, $supabaseKey, $body = null) {
    if (empty($supabaseUrl) || empty($supabaseKey)) {
        return ['status' => 500, 'error' => 'Missing Supabase URL or Key', 'data' => null];
    }
    
    $url = rtrim($supabaseUrl, '/') . '/rest/v1/' . ltrim($endpoint, '/');
    $ch = curl_init($url);
    
    $headers = [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json',
        'Prefer: return=representation',
    ];
    
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    
    $rawResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        return ['status' => 500, 'error' => $curlError, 'data' => null];
    }
    
    $data = json_decode($rawResponse, true);
    return ['status' => $httpCode, 'data' => $data, 'raw' => $rawResponse];
}

// 1. Fetch Business Settings
$settingsRes = supabaseRequest('GET', 'business_settings?id=eq.default', $supabaseUrl, $supabaseKey);
$bizSettings = [];
if (!empty($settingsRes['data']) && is_array($settingsRes['data']) && count($settingsRes['data']) > 0) {
    $bizSettings = $settingsRes['data'][0];
}

// Security Check for Webhook mode
$expectedSecret = !empty($bizSettings['cron_secret_token']) ? $bizSettings['cron_secret_token'] : $defaultCronSecret;
if (!$isCli) {
    if (empty($providedToken) || !hash_equals($expectedSecret, $providedToken)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized: Invalid cron secret token.',
        ]);
        exit;
    }
}

// Check Global Reminder Enablement
$reminderEnabled = !isset($bizSettings['reminder_enabled']) || (bool)$bizSettings['reminder_enabled'];
if (!$reminderEnabled) {
    $response = [
        'success' => true,
        'message' => 'Automated payment reminders are currently disabled globally in Business Settings.',
        'processed_count' => 0,
        'sent_count' => 0,
    ];
    if ($isCli) {
        echo "[CRON] " . $response['message'] . PHP_EOL;
    } else {
        echo json_encode($response);
    }
    exit;
}

// ============================================================================
// EVALUATE UNSETTLED INVOICES & SCHEDULE MATCHING
// ============================================================================
$todayDateStr = $simulatedDate ?: date('Y-m-d');
$todayTs = strtotime($todayDateStr . ' 00:00:00');

$defaultDaysBeforeStr = !empty($bizSettings['reminder_days_before']) ? $bizSettings['reminder_days_before'] : '7, 3, 1';
$defaultOverdueDaysStr = !empty($bizSettings['reminder_overdue_days']) ? $bizSettings['reminder_overdue_days'] : '3, 7';
$reminderOnDueDate = !isset($bizSettings['reminder_on_due_date']) || (bool)$bizSettings['reminder_on_due_date'];

function parseIntervals($str) {
    if (empty($str)) return [];
    $parts = explode(',', (string)$str);
    $result = [];
    foreach ($parts as $p) {
        $val = abs((int)trim($p));
        if ($val >= 0 && !in_array($val, $result)) {
            $result[] = $val;
        }
    }
    rsort($result);
    return $result;
}

$globalDaysBefore = parseIntervals($defaultDaysBeforeStr);
$globalOverdueDays = parseIntervals($defaultOverdueDaysStr);

// Fetch outstanding invoices: status not in Paid or Cancelled and balance_due > 0
$invFilter = 'status=not.in.(Paid,Cancelled)&balance_due=gt.0&select=*';
$invRes = supabaseRequest('GET', 'invoices?' . $invFilter, $supabaseUrl, $supabaseKey);
$invoices = !empty($invRes['data']) && is_array($invRes['data']) ? $invRes['data'] : [];

$processed = 0;
$sentCount = 0;
$skippedCount = 0;
$actions = [];

// Native cPanel mail sender
function sendCronEmail($recipient, $subject, $htmlBody, $bizSettings) {
    $fromEmail = !empty($bizSettings['smtp_from_email']) 
        ? $bizSettings['smtp_from_email'] 
        : (!empty($bizSettings['business_email']) ? $bizSettings['business_email'] : 'billing@' . ($_SERVER['SERVER_NAME'] ?? 'crestara.com'));
    $fromName = !empty($bizSettings['smtp_from_name']) 
        ? $bizSettings['smtp_from_name'] 
        : (!empty($bizSettings['business_name']) ? $bizSettings['business_name'] : 'Crestara Billing');

    $boundary = '==_MIME_' . md5(time() . mt_rand());
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'From: "' . addslashes($fromName) . '" <' . $fromEmail . '>';
    $headers[] = 'Reply-To: <' . $fromEmail . '>';
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $headers[] = 'X-Mailer: Crestara-CRM-Cron/1.0';

    return @mail($recipient, '=?UTF-8?B?' . base64_encode($subject) . '?=', $htmlBody, implode("\r\n", $headers));
}

// Build responsive reminder HTML
function buildReminderHtml($invoice, $bizSettings, $countdownStage, $daysMetric, $personalMessage) {
    $bizName = htmlspecialchars($bizSettings['business_name'] ?? 'Crestara CRM');
    $invNum = htmlspecialchars($invoice['invoice_number'] ?? 'INV');
    $clientName = htmlspecialchars($invoice['client_name'] ?? 'Valued Customer');
    $cur = htmlspecialchars($invoice['currency'] ?? ($bizSettings['currency'] ?? 'USD'));
    $balanceDue = number_format((float)($invoice['balance_due'] ?? 0), 2);
    $totalAmount = number_format((float)($invoice['total_amount'] ?? 0), 2);
    $dueDate = htmlspecialchars($invoice['due_date'] ?? '-');

    $badgeColor = '#2563eb';
    $badgeText = "⏰ {$daysMetric} DAYS UNTIL DEADLINE";

    if ($countdownStage === 'due_today') {
        $badgeColor = '#d97706';
        $badgeText = "🔔 PAYMENT DEADLINE IS TODAY";
    } elseif ($countdownStage === 'overdue') {
        $badgeColor = '#dc2626';
        $badgeText = "⏳ GENTLE REMINDER • {$daysMetric} DAY" . ($daysMetric === 1 ? '' : 'S') . " PAST DEADLINE";
    }

    $bankHtml = '';
    if (!empty($bizSettings['bank_name']) || !empty($bizSettings['bank_account_number'])) {
        $bankHtml = '
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
            <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Remittance & Bank Wire Details:</strong>'
            . (!empty($bizSettings['bank_name']) ? '<div>Bank: ' . htmlspecialchars($bizSettings['bank_name']) . '</div>' : '')
            . (!empty($bizSettings['bank_account_name']) ? '<div>Account Name: ' . htmlspecialchars($bizSettings['bank_account_name']) . '</div>' : '')
            . (!empty($bizSettings['bank_account_number']) ? '<div>Account / IBAN: ' . htmlspecialchars($bizSettings['bank_account_number']) . '</div>' : '')
            . (!empty($bizSettings['swift_bic']) ? '<div>SWIFT / BIC: ' . htmlspecialchars($bizSettings['swift_bic']) . '</div>' : '')
            . '</div>';
    }

    $formattedMsg = nl2br(htmlspecialchars($personalMessage));

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder {$invNum}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="background-color: #0f172a; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">{$bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Commercial Invoice: {$invNum}</p>
    </div>
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: {$badgeColor}15; color: {$badgeColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 18px; border: 1px solid {$badgeColor}30;">
        {$badgeText}
      </div>
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>{$clientName}</strong>,
      </p>
      <div style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0;">
        {$formattedMsg}
      </div>
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Deadline:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">{$dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Total Invoice Amount:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">{$cur} {$totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b;">Balance Due:</td>
          <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: #b45309; text-align: right;">{$cur} {$balanceDue}</td>
        </tr>
      </table>
      {$bankHtml}
      <p style="font-size: 12px; color: #64748b; margin-top: 24px; line-height: 1.5;">
        Please feel free to reply directly to this email or contact our accounts team if you have any questions.
      </p>
    </div>
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      {$bizName} • Crestara CRM Automated Billing
    </div>
  </div>
</body>
</html>
HTML;
}

// Iterate through invoices
foreach ($invoices as $inv) {
    $processed++;
    $invId = $inv['id'];
    $invNum = $inv['invoice_number'];
    $clientEmail = trim($inv['client_email'] ?? '');

    // Skip if reminders are explicitly disabled on this invoice
    if (isset($inv['reminders_enabled']) && $inv['reminders_enabled'] === false) {
        $skippedCount++;
        $actions[] = ['invoice' => $invNum, 'action' => 'skipped', 'reason' => 'Reminders disabled on invoice'];
        continue;
    }

    if (empty($clientEmail) || !filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        $skippedCount++;
        $actions[] = ['invoice' => $invNum, 'action' => 'skipped', 'reason' => 'Invalid or missing client email'];
        continue;
    }

    // Skip if already sent today
    if (!empty($inv['last_reminder_sent_at'])) {
        $lastSentDateStr = date('Y-m-d', strtotime($inv['last_reminder_sent_at']));
        if ($lastSentDateStr === $todayDateStr) {
            $skippedCount++;
            $actions[] = ['invoice' => $invNum, 'action' => 'skipped', 'reason' => 'Reminder already sent today'];
            continue;
        }
    }

    // Calculate countdown
    $dueTs = strtotime($inv['due_date'] . ' 00:00:00');
    $daysUntilDue = (int)round(($dueTs - $todayTs) / 86400);
    $daysPastDue = max(0, -$daysUntilDue);

    // Resolve intervals (per-invoice override vs global)
    $preDays = !empty($inv['custom_reminder_days']) 
        ? parseIntervals($inv['custom_reminder_days']) 
        : $globalDaysBefore;
    $overdueDays = !empty($inv['custom_overdue_days']) 
        ? parseIntervals($inv['custom_overdue_days']) 
        : $globalOverdueDays;

    $shouldTrigger = false;
    $stage = '';
    $metricDays = 0;

    if ($daysUntilDue > 0 && in_array($daysUntilDue, $preDays)) {
        $shouldTrigger = true;
        $stage = 'upcoming';
        $metricDays = $daysUntilDue;
    } elseif ($daysUntilDue === 0 && $reminderOnDueDate) {
        $shouldTrigger = true;
        $stage = 'due_today';
        $metricDays = 0;
    } elseif ($daysUntilDue < 0 && in_array($daysPastDue, $overdueDays)) {
        $shouldTrigger = true;
        $stage = 'overdue';
        $metricDays = $daysPastDue;
    }

    if (!$shouldTrigger) {
        $skippedCount++;
        continue;
    }

    // Compose message copy
    $bizName = $bizSettings['business_name'] ?? 'Crestara CRM';
    $dueDateStr = $inv['due_date'];
    if ($stage === 'overdue') {
        $subject = "Gentle Reminder: Invoice {$invNum} from {$bizName}";
        $personalMessage = "We hope this note finds you well. We know schedules can get hectic, so we wanted to gently follow up on invoice {$invNum}, which had a settlement deadline of {$dueDateStr} ({$metricDays} day" . ($metricDays === 1 ? '' : 's') . " ago).\n\nIf payment has already been remitted, please disregard this note with our sincere thanks. Otherwise, we kindly ask you to review the remittance details below.";
    } elseif ($stage === 'due_today') {
        $subject = "Payment Due Today: Invoice {$invNum} from {$bizName}";
        $personalMessage = "This is a friendly reminder that invoice {$invNum} is due for settlement today ({$dueDateStr}).\n\nPlease find your invoice details and wire remittance instructions below. If payment has already been initiated, thank you!";
    } else {
        $daysTxt = ($metricDays === 1) ? 'tomorrow' : "in {$metricDays} days";
        $subject = "Friendly Reminder: Invoice {$invNum} is due {$daysTxt}";
        $personalMessage = "This is a courteous reminder that payment for invoice {$invNum} is due {$daysTxt} on {$dueDateStr}.\n\nPlease find the invoice summary and bank remittance instructions below. Thank you for your continued partnership.";
    }

    $htmlBody = buildReminderHtml($inv, $bizSettings, $stage, $metricDays, $personalMessage);

    if ($isDryRun) {
        $sentCount++;
        $actions[] = [
            'invoice' => $invNum,
            'client_email' => $clientEmail,
            'stage' => $stage,
            'metric_days' => $metricDays,
            'subject' => $subject,
            'action' => 'simulated_send',
        ];
    } else {
        $mailOk = sendCronEmail($clientEmail, $subject, $htmlBody, $bizSettings);
        if ($mailOk) {
            $sentCount++;
            $nowIso = gmdate('Y-m-d\TH:i:s\Z');
            $sentCountTotal = (int)($inv['reminders_sent_count'] ?? 0) + 1;
            
            // Append history
            $history = !empty($inv['reminder_history']) && is_array($inv['reminder_history']) ? $inv['reminder_history'] : [];
            $history[] = [
                'sent_at' => $nowIso,
                'stage' => $stage,
                'metric_days' => $metricDays,
                'recipient' => $clientEmail,
                'channel' => 'cron_email',
            ];

            // Update Supabase
            supabaseRequest('PATCH', 'invoices?id=eq.' . $invId, $supabaseUrl, $supabaseKey, [
                'last_reminder_sent_at' => $nowIso,
                'reminders_sent_count' => $sentCountTotal,
                'reminder_history' => $history,
            ]);

            $actions[] = [
                'invoice' => $invNum,
                'client_email' => $clientEmail,
                'stage' => $stage,
                'metric_days' => $metricDays,
                'action' => 'sent',
            ];
        } else {
            $actions[] = [
                'invoice' => $invNum,
                'client_email' => $clientEmail,
                'action' => 'failed',
                'error' => 'cPanel mail() function returned false',
            ];
        }
    }
}

// ============================================================================
// RESPONSE / LOG GENERATION
// ============================================================================
$report = [
    'success' => true,
    'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
    'reference_date' => $todayDateStr,
    'dry_run' => $isDryRun,
    'invoices_scanned' => $processed,
    'reminders_triggered' => $sentCount,
    'skipped' => $skippedCount,
    'details' => $actions,
];

if ($isCli) {
    echo "==========================================================" . PHP_EOL;
    echo "CRESTARA CRM - PAYMENT REMINDERS CRON RUN" . PHP_EOL;
    echo "Timestamp: " . $report['timestamp'] . PHP_EOL;
    echo "Reference Date: " . $report['reference_date'] . PHP_EOL;
    echo "Mode: " . ($isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE EXECUTION') . PHP_EOL;
    echo "Invoices Scanned: " . $report['invoices_scanned'] . PHP_EOL;
    echo "Reminders Triggered: " . $report['reminders_triggered'] . PHP_EOL;
    echo "Skipped: " . $report['skipped'] . PHP_EOL;
    echo "----------------------------------------------------------" . PHP_EOL;
    foreach ($actions as $act) {
        $st = $act['stage'] ?? '';
        echo "- [{$act['action']}] Invoice: {$act['invoice']} | Email: " . ($act['client_email'] ?? 'N/A') . ($st ? " | Stage: {$st}" : '') . PHP_EOL;
    }
    echo "==========================================================" . PHP_EOL;
} else {
    echo json_encode($report, JSON_PRETTY_PRINT);
}
