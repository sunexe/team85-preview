<?php
// 照片评论/点赞 —— HTTP 入口
require __DIR__ . '/interaction_lib.php';

header('Content-Type: application/json; charset=utf-8');
session_start();
ensure_data_dir();

function respond(array $result): void {
    $status = $result['status'] ?? 200;
    unset($result['status']);
    http_response_code($status);
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

// 外部输入归一化为 string：数组等畸形值归一为空串，交由后续校验拦截（避免 string 类型声明的 TypeError）
function str_input($value): string {
    return is_string($value) ? $value : '';
}

$action = str_input($_GET['action'] ?? ($_POST['action'] ?? ''));
$photo = normalize_photo_key(str_input($_GET['photo'] ?? ($_POST['photo'] ?? '')));

// 需要照片标识的 action 做非空校验（防把评论/点赞存到空 key）
$requiresPhoto = in_array($action, ['get_comments', 'post_comment', 'get_likes', 'post_like'], true);
if ($requiresPhoto && $photo === '') {
    respond(['ok' => false, 'error' => '缺少照片标识', 'status' => 400]);
}

switch ($action) {
    case 'get_captcha':
        respond(get_captcha());
    case 'get_comments':
        respond(get_comments($photo));
    case 'post_comment':
        respond(post_comment($photo, str_input($_POST['name'] ?? ''), str_input($_POST['content'] ?? ''), str_input($_POST['captcha'] ?? ''), client_ip()));
    case 'get_likes':
        respond(get_likes($photo));
    case 'post_like':
        respond(post_like($photo, client_ip()));
    default:
        respond(['ok' => false, 'error' => '未知操作', 'status' => 400]);
}
