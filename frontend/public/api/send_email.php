<?php
/**
 * cPanel Mail Delivery Endpoint
 * Handles automated & manual email dispatch for invoices and receipts with PDF attachments.
 * Compatible with cPanel PHP 7.4, 8.0, 8.1, 8.2, 8.3
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// ============================================================================
// CPANEL SERVER-SIDE BUSINESS & EMAIL DISPATCH CONFIGURATION
// Load external config.php if present; otherwise fall back to server defaults.
// ============================================================================
$configFile = __DIR__ . '/config.php';
$serverConfigFile = file_exists($configFile) ? require $configFile : [];
$mailConfig = is_array($serverConfigFile) && isset($serverConfigFile['mail']) ? $serverConfigFile['mail'] : [];

$SERVER_CONFIG = [
    // Business Identity & Sender Address
    'business_name'   => $mailConfig['from_name'] ?? 'Crestara Advisory Group',
    'from_email'      => !empty($mailConfig['from_email']) ? $mailConfig['from_email'] : ('billing@' . ($_SERVER['SERVER_NAME'] ?? 'crestaraadvisorygroup.com')),
    'from_name'       => !empty($mailConfig['from_name']) ? $mailConfig['from_name'] : 'Crestara Billing',
    'reply_to'        => !empty($mailConfig['reply_to']) ? $mailConfig['reply_to'] : ('billing@' . ($_SERVER['SERVER_NAME'] ?? 'crestaraadvisorygroup.com')),
    
    // SMTP credentials if routing via external/cPanel SMTP rather than local sendmail
    'use_smtp'        => !empty($mailConfig['use_smtp']),
    'smtp_host'       => $mailConfig['smtp_host'] ?? 'localhost',
    'smtp_port'       => (int)($mailConfig['smtp_port'] ?? 465),
    'smtp_user'       => $mailConfig['smtp_user'] ?? '',
    'smtp_pass'       => $mailConfig['smtp_pass'] ?? '',
    'smtp_secure'     => strtolower($mailConfig['smtp_secure'] ?? 'ssl'),
];

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!$payload || empty($payload['recipient'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid payload. "recipient" is required.']);
    exit;
}

$recipient = filter_var(trim($payload['recipient']), FILTER_VALIDATE_EMAIL);
if (!$recipient) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid recipient email address.']);
    exit;
}

$subject = !empty($payload['subject']) ? trim($payload['subject']) : ('Official Document from ' . $SERVER_CONFIG['business_name']);
$htmlBody = !empty($payload['html']) ? $payload['html'] : '';
$attachments = !empty($payload['attachments']) && is_array($payload['attachments']) ? $payload['attachments'] : [];

// Sender details managed securely on the server
$fromEmail = !empty($SERVER_CONFIG['from_email']) ? trim($SERVER_CONFIG['from_email']) : ('billing@' . ($_SERVER['SERVER_NAME'] ?? 'crestaraadvisorygroup.com'));
$fromName = !empty($SERVER_CONFIG['from_name']) ? trim($SERVER_CONFIG['from_name']) : $SERVER_CONFIG['business_name'];
$replyTo = !empty($SERVER_CONFIG['reply_to']) ? trim($SERVER_CONFIG['reply_to']) : $fromEmail;

// If no custom HTML was sent, generate a default fallback responsive body
if (empty($htmlBody)) {
    $docTitle = htmlspecialchars($subject);
    $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{$docTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">{$docTitle}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">Please find your official document attached to this email as a PDF.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">Sent securely via Crestara CRM</p>
  </div>
</body>
</html>
HTML;
}

// Build Multipart MIME Email
$boundaryMixed = '==_MIXED_' . md5(time() . mt_rand());
$boundaryAlt = '==_ALT_' . md5(time() . mt_rand() . 'alt');

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'From: "' . addslashes($fromName) . '" <' . $fromEmail . '>';
$headers[] = 'Reply-To: <' . $replyTo . '>';
$headers[] = 'Return-Path: <' . $fromEmail . '>';
$headers[] = 'X-Mailer: Crestara CRM cPanel Mailer';

if (!empty($attachments)) {
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundaryMixed . '"';
    
    // Multipart Body
    $body = "--" . $boundaryMixed . "\r\n";
    $body .= "Content-Type: multipart/alternative; boundary=\"" . $boundaryAlt . "\"\r\n\r\n";
    
    // Plain text part
    $plainText = strip_tags(str_replace(['<br>', '<br/>', '</p>'], "\n", $htmlBody));
    $body .= "--" . $boundaryAlt . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $body .= $plainText . "\r\n\r\n";
    
    // HTML part
    $body .= "--" . $boundaryAlt . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $body .= $htmlBody . "\r\n\r\n";
    $body .= "--" . $boundaryAlt . "--\r\n\r\n";
    
    // Attachment parts
    foreach ($attachments as $att) {
        $filename = !empty($att['filename']) ? basename($att['filename']) : 'document.pdf';
        $contentType = !empty($att['content_type']) ? $att['content_type'] : 'application/pdf';
        $base64Data = !empty($att['base64_data']) ? $att['base64_data'] : '';
        
        // Strip data URI scheme header if passed (e.g., data:application/pdf;base64,...)
        if (strpos($base64Data, ',') !== false) {
            $parts = explode(',', $base64Data);
            $base64Data = $parts[1];
        }
        
        // Chunk base64 data to RFC 2045 standard (76 chars per line)
        $chunkedData = chunk_split($base64Data);
        
        $body .= "--" . $boundaryMixed . "\r\n";
        $body .= "Content-Type: " . $contentType . "; name=\"" . $filename . "\"\r\n";
        $body .= "Content-Disposition: attachment; filename=\"" . $filename . "\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= $chunkedData . "\r\n\r\n";
    }
    
    $body .= "--" . $boundaryMixed . "--";
} else {
    // Single HTML message
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: 8bit';
    $body = $htmlBody;
}

$headerStr = implode("\r\n", $headers);

// ============================================================================
// NATIVE SOCKET-BASED SMTP CLIENT (RFC 5321)
// ============================================================================
function sendViaSmtp($recipient, $subject, $body, $headersStr, $config) {
    $host = $config['smtp_host'] ?? 'localhost';
    $port = (int)($config['smtp_port'] ?? 465);
    $secure = strtolower($config['smtp_secure'] ?? '');
    $user = $config['smtp_user'] ?? '';
    $pass = $config['smtp_pass'] ?? '';
    $fromEmail = $config['from_email'] ?? 'billing@crestaraadvisorygroup.com';
    $timeout = 25;

    $protocol = '';
    if ($secure === 'ssl' || $port === 465) {
        $protocol = 'ssl://';
    }

    $socket = @stream_socket_client($protocol . $host . ':' . $port, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new Exception("SMTP Connection Failed to {$host}:{$port} ({$errno}): {$errstr}");
    }

    stream_set_timeout($socket, $timeout);

    $readResponse = function($sock, $expectedCode) {
        $data = '';
        while (!feof($sock)) {
            $line = fgets($sock, 512);
            if ($line === false) break;
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        $code = (int)substr($data, 0, 3);
        if ($code !== $expectedCode) {
            throw new Exception("SMTP Server Response Error: Expected {$expectedCode}, received: {$data}");
        }
        return $data;
    };

    $sendCommand = function($sock, $cmd, $expectedCode) use ($readResponse) {
        fwrite($sock, $cmd . "\r\n");
        return $readResponse($sock, $expectedCode);
    };

    // 1. Initial Greeting
    $readResponse($socket, 220);

    // 2. EHLO
    $clientHost = $_SERVER['SERVER_NAME'] ?? 'localhost';
    $sendCommand($socket, "EHLO " . $clientHost, 250);

    // 3. STARTTLS Upgrade if port 587 or tls
    if ($secure === 'tls' || ($port === 587 && empty($protocol))) {
        $sendCommand($socket, "STARTTLS", 220);
        $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
            $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
        }
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
            $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
        }
        if (!stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
            throw new Exception("STARTTLS Handshake failed with {$host}");
        }
        $sendCommand($socket, "EHLO " . $clientHost, 250);
    }

    // 4. AUTH LOGIN
    if (!empty($user) && !empty($pass)) {
        $sendCommand($socket, "AUTH LOGIN", 334);
        $sendCommand($socket, base64_encode($user), 334);
        $sendCommand($socket, base64_encode($pass), 235);
    }

    // 5. Envelope Sender
    $sendCommand($socket, "MAIL FROM:<" . $fromEmail . ">", 250);

    // 6. Recipient
    $sendCommand($socket, "RCPT TO:<" . $recipient . ">", 250);

    // 7. DATA
    $sendCommand($socket, "DATA", 354);

    // 8. Stream Full Message
    $msgData = "To: <{$recipient}>\r\n";
    $msgData .= "Subject: {$subject}\r\n";
    $msgData .= $headersStr . "\r\n\r\n";
    $msgData .= $body . "\r\n.\r\n";

    fwrite($socket, $msgData);
    $readResponse($socket, 250);

    // 9. QUIT
    @fwrite($socket, "QUIT\r\n");
    @fclose($socket);

    return true;
}

// ============================================================================
// DISPATCH EXECUTION
// ============================================================================
$mailSent = false;
$errorMsg = null;

try {
    if ($SERVER_CONFIG['use_smtp']) {
        // Route via Authenticated Socket SMTP
        $mailSent = sendViaSmtp($recipient, $subject, $body, $headerStr, $SERVER_CONFIG);
    } else {
        // Route via cPanel local sendmail
        $mailSent = @mail($recipient, $subject, $body, $headerStr, "-f" . $fromEmail);
        if (!$mailSent) {
            $mailSent = @mail($recipient, $subject, $body, $headerStr);
        }
    }
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
}

if ($mailSent) {
    echo json_encode([
        'success' => true,
        'message' => 'Email dispatched successfully to ' . $recipient,
        'recipient' => $recipient,
        'has_attachments' => !empty($attachments),
        'transport' => $SERVER_CONFIG['use_smtp'] ? 'smtp' : 'local_mail',
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $errorMsg ?: 'Failed to dispatch email via cPanel mail server. Please verify sendmail configuration or SMTP credentials in /api/config.php.',
    ]);
}
