<?php
// 照片评论/点赞 —— 纯函数库（可单测，无 HTTP 副作用）

const INTERACTION_DATA_DIR = __DIR__ . '/../data/interactions/';
const INTERACTION_COMMENTS_FILE = INTERACTION_DATA_DIR . 'comments.json';
const INTERACTION_LIKES_FILE = INTERACTION_DATA_DIR . 'likes.json';
const INTERACTION_RATE_LIMIT_FILE = INTERACTION_DATA_DIR . 'rate-limit.json';
const INTERACTION_MAX_NAME_LEN = 30;
const INTERACTION_MAX_CONTENT_LEN = 500;
const INTERACTION_RATE_LIMIT_SECONDS = 60;

function contains_sensitive_words(string $text, array $words): bool {
    foreach ($words as $word) {
        if ($word !== '' && strpos($text, $word) !== false) {
            return true;
        }
    }
    return false;
}

function validate_comment_input(string $name, string $content, array $words): ?string {
    if (trim($name) === '') return '昵称不能为空';
    if (trim($content) === '') return '评论内容不能为空';
    if (mb_strlen($name) > INTERACTION_MAX_NAME_LEN) return '昵称过长';
    if (mb_strlen($content) > INTERACTION_MAX_CONTENT_LEN) return '内容过长';
    if (contains_sensitive_words($content, $words)) return '内容包含敏感词';
    return null;
}

function normalize_photo_key(string $key): string {
    return preg_replace('#^/+#', '', trim($key));
}

function verify_captcha_answer($expected, $answer): bool {
    return $expected !== null && (string)$expected === (string)$answer;
}

function is_rate_limited(string $ip, array &$limits, int $now, int $windowSeconds): bool {
    if (isset($limits[$ip]) && ($now - $limits[$ip]) < $windowSeconds) {
        return true;
    }
    $limits[$ip] = $now;
    return false;
}

function default_sensitive_words(): array {
    return ['赌博', '彩票', '代开发票', '办证', '贷款', '色情'];
}

function read_json(string $file, $default = []) {
    if (!file_exists($file)) return $default;
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $default;
}

function write_json(string $file, array $data): bool {
    $handle = fopen($file, 'c');
    if ($handle === false) return false;
    $ok = false;
    if (flock($handle, LOCK_EX)) {
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($data, JSON_UNESCAPED_UNICODE));
        fflush($handle);
        flock($handle, LOCK_UN);
        $ok = true;
    }
    fclose($handle);
    return $ok;
}

function ensure_data_dir(): void {
    if (!is_dir(INTERACTION_DATA_DIR)) {
        mkdir(INTERACTION_DATA_DIR, 0755, true);
    }
}
