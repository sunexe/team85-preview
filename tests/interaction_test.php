<?php
// 简易 assert 测试运行器
$PASS = 0; $FAIL = 0;
function check($name, $cond) {
    global $PASS, $FAIL;
    if ($cond) { $PASS++; echo "  ✓ $name\n"; }
    else { $FAIL++; echo "  ✗ $name\n"; }
}

require __DIR__ . '/../api/interaction_lib.php';

echo "contains_sensitive_words:\n";
check('命中敏感词', contains_sensitive_words('这是赌博广告', ['赌博', '彩票']) === true);
check('不命中', contains_sensitive_words('正常内容', ['赌博', '彩票']) === false);
check('空词表不命中', contains_sensitive_words('x', []) === false);

echo "validate_comment_input:\n";
check('空昵称报错', validate_comment_input('', '内容', []) !== null);
check('空内容报错', validate_comment_input('张三', '', []) !== null);
check('昵称过长报错', validate_comment_input(str_repeat('a', 31), '内容', []) !== null);
check('内容过长报错', validate_comment_input('张三', str_repeat('a', 501), []) !== null);
check('敏感词报错', validate_comment_input('张三', '赌博', ['赌博']) !== null);
check('合法输入通过', validate_comment_input('张三', '好球', []) === null);

echo "normalize_photo_key:\n";
check('去前导斜杠', normalize_photo_key('/matches/2026/a.jpg') === 'matches/2026/a.jpg');
check('无斜杠原样', normalize_photo_key('team/h1.jpg') === 'team/h1.jpg');

echo "verify_captcha_answer:\n";
check('答案正确', verify_captcha_answer(8, '8') === true);
check('答案错误', verify_captcha_answer(8, '9') === false);
check('期望值为空', verify_captcha_answer(null, '8') === false);

echo "is_rate_limited:\n";
$limits = [];
check('首次不限', is_rate_limited('1.2.3.4', $limits, 1000, 60) === false);
check('写入时间戳', isset($limits['1.2.3.4']) && $limits['1.2.3.4'] === 1000);
check('窗口内限频', is_rate_limited('1.2.3.4', $limits, 1059, 60) === true);
check('窗口外放行', is_rate_limited('1.2.3.4', $limits, 1061, 60) === false);

echo "read_json / write_json:\n";
$tmp = sys_get_temp_dir() . '/interaction_test_' . uniqid() . '.json';
check('写入返回 true', write_json($tmp, ['a' => 1]) === true);
check('读回一致', read_json($tmp) === ['a' => 1]);
check('读不存在文件返回默认', read_json($tmp . '.nope', ['x']) === ['x']);
@unlink($tmp);

echo "get_comments / post_comment:\n";
$comments = ['p1' => [['id' => 'a', 'name' => '张三', 'content' => '好球', 'time' => '2026-08-30T00:00:00+08:00']]];
check('评论结构含字段', isset($comments['p1'][0]['id'], $comments['p1'][0]['name'], $comments['p1'][0]['content'], $comments['p1'][0]['time']));

echo "\n结果: $PASS 通过, $FAIL 失败\n";
exit($FAIL > 0 ? 1 : 0);
