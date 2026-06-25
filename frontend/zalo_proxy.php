<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$user_id = $_GET['user_id'] ?? '';
$token = $_GET['token'] ?? '';

if (!$user_id || !$token) {
    echo json_encode(["error" => -1, "message" => "Missing parameters"]);
    exit;
}

// Zalo OA API V3.0 - lay thong tin nguoi dung
$data_param = json_encode(["user_id" => $user_id]);
$url = 'https://openapi.zalo.me/v3.0/oa/user/detail?data=' . urlencode($data_param);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'access_token: ' . $token,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo json_encode(["error" => -1, "message" => "cURL error: " . $curlError]);
    exit;
}

echo $response;
?>
