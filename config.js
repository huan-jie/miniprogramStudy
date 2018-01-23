/**
 * 小程序配置文件，url配置等
 */

var host = "39.106.217.236";

var config = {

    host,

    // 登录地址，用于建立会话
    loginUrl : `http://${host}/index.php?r=miniprogram/login`,

    // 存储用户信息
    saveUserInfo : `http://${host}/index.php?r=miniprogram/save-userinfo`,

    // 检查用户session是否过期
    checkSessionUrl : `http://${host}/index.php?r=miniprogram/check-session`, 

    // 其他各种各样的地址在需要使用时再添加
};

module.exports = config;