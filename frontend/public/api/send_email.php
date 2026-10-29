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
// Configure your business sender identity and credentials directly on cPanel.
// This ensures sensitive credentials and business info are NEVER exposed to or
// transmitted from client browsers.
// ============================================================================
$SERVER_CONFIG = [
    // Business Identity & Sender Address
    'business_name'   => 'Crestara Advisory Group',
    'from_email'      => 'billing@' . ($_SERVER['SERVER_NAME'] ?? 'crestaraadvisorygroup.com'),
    'from_name'       => 'Crestara Billing',
    'reply_to'        => 'billing@' . ($_SERVER['SERVER_NAME'] ?? 'crestaraadvisorygroup.com'),
    
    // Optional SMTP credentials if routing via external SMTP rather than local sendmail
    'use_smtp'        => false,
    'smtp_host'       => 'localhost',
    'smtp_port'       => 465,
    'smtp_user'       => '',
    'smtp_pass'       => '',
    'smtp_secure'     => 'ssl',
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

// Dispatch Email
$mailSent = false;
$errorMsg = null;

try {
    // Standard cPanel native mail dispatch
    // The -f flag sets envelope sender (Return-Path)
    $mailSent = @mail($recipient, $subject, $body, $headerStr, "-f" . $fromEmail);
    if (!$mailSent) {
        // Retry without additional params if restrictive safe mode
        $mailSent = @mail($recipient, $subject, $body, $headerStr);
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
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $errorMsg ?: 'Failed to dispatch email via cPanel mail server. Please verify sendmail configuration or SMTP credentials.',
    ]);
}
