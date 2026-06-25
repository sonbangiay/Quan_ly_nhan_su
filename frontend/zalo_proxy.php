<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Nhan du lieu qua POST (an toan hon GET - tranh WAF chăn)
$input = json_decode(file_get_contents('php://input'), true);

$user_id     = $input['user_id'] ?? ($_GET['user_id'] ?? '');
$access_token = $input['access_token'] ?? '';

if (!$user_id) {
    echo json_encode(["error" => -1, "message" => "Missing user_id"]);
    exit;
}

// Neu khong co token trong POST, tu lay token bang Refresh Token
if (!$access_token) {
    $ZALO_APP_ID     = '3872938296996027660';
    $ZALO_SECRET_KEY = 'v65u7m88vP35YcJ88P38';
    $ZALO_REFRESH_TOKEN = 'KdHv3vO7CHbTT7aAbmm-7rPwUGoL5LWU5XDiIgOcK0uyFNL2Z4bA2X9HRLsrOaK8C1OCJhOXFWyYDWmPcI0xJ1y5VJYeCLXH30TXBiyFOanlA5y8xYfgUbWEI3tx2MbMUNzN9RjG44W-UILPgtOBIo84I2UW6d9Z925L9wOrQ6OyDrLxgKDf2M9aJKtpV5a5C51vQVDGFIqsHNbxy3T55aWzVXwFI5rZEqKUTRrgDmStHmnbzLCu2rac1NRBNYSX2IrlOyiYB7DQ6H5bvIXDCr8DTsNj8589RXiQ7iqLFGrjE09vsIfACqzTN73uRKGNRs02LgXHHXukM0Hnx2eU9cPSF7BaBtyvNLb2A_rlTMCw5b0Nh0OGGX0_DIxM2YXcK188S9CrDpS15p1-tnaBQtmxBYDByq5n9PKREn8';
    $TOKEN_FILE = __DIR__ . '/zalo_token_cache.json';

    // Doc tu cache
    if (file_exists($TOKEN_FILE)) {
        $cached = json_decode(file_get_contents($TOKEN_FILE), true);
        if ($cached && isset($cached['access_token']) && $cached['expires_at'] > (time() + 3600)) {
            $access_token = $cached['access_token'];
        }
    }

    // Neu cache het han, lay token moi
    if (!$access_token) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth.zaloapp.com/v4/oa/access_token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded',
            'secret_key: ' . $ZALO_SECRET_KEY
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'app_id'        => $ZALO_APP_ID,
            'refresh_token' => $ZALO_REFRESH_TOKEN,
            'grant_type'    => 'refresh_token'
        ]));
        $resp = curl_exec($ch);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) {
            echo json_encode(["error" => -1, "message" => "cURL error getting token: $err"]);
            exit;
        }

        $td = json_decode($resp, true);
        if (isset($td['access_token'])) {
            $access_token = $td['access_token'];
            file_put_contents($TOKEN_FILE, json_encode([
                'access_token'  => $td['access_token'],
                'refresh_token' => $td['refresh_token'] ?? $ZALO_REFRESH_TOKEN,
                'expires_at'    => time() + (int)($td['expires_in'] ?? 86400)
            ]));
        } else {
            echo json_encode(["error" => -1, "message" => "Cannot refresh token", "detail" => $td]);
            exit;
        }
    }
}

// Goi Zalo V3 API lay thong tin nguoi dung
$data_param = urlencode(json_encode(["user_id" => $user_id]));
$url = 'https://openapi.zalo.me/v3.0/oa/user/detail?data=' . $data_param;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['access_token: ' . $access_token]);

$response = curl_exec($ch);
$curl_err  = curl_error($ch);
curl_close($ch);

if ($curl_err) {
    echo json_encode(["error" => -1, "message" => "cURL error: $curl_err"]);
    exit;
}

echo $response;
?>
