const config = require('./config.js')
const loginUrl = config.loginUrl
const saveUserInfoUrl = config.saveUserInfo
const checkSessionUrl = config.checkSessionUrl

App({

    /**
     * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
     */
    onLaunch: function () {
        var self = this;

        // 用户登录
        this.userLogin(function(err, res) {
            if (!err) {
                // 用户登录成功，处理获取用户信息等等流程
                console.log('用户登录成功！！！');

                // 每次登录成功，新建用户或者更新用户信息，完成之后获取用户授权状态
                self.getUserInfo(function(err) {
                    if (!err) {
                        console.log('成功更新/新建用户')
                    } else {
                        console.log('更新/新建用户失败')
                    }
                });
            } else {
                // 用户登录失败，这部分流程还不知道怎么处理
                console.log('用户登录失败！！！');
            }
        })
    },

    /**
     * 当小程序启动，或从后台进入前台显示，会触发 onShow
     */
    onShow: function (options) {
        
    },

    /**
     * 当小程序从前台进入后台，会触发 onHide
     */
    onHide: function () {
        
    },

    /**
     * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
     */
    onError: function (msg) {
        
    },

    /**
     * 全局变量
     */
    globalData: {
        hasLogin: false,            // 登录状态
        userInfo: null,             // 用户信息
        session_id: null,           // 自主管理session_id
        authScope: null,            // 用户权限对象
    },

    /**
     * 小程序用户登录流程：修改为不论微信登录态过期，还是自主session过期，均重新登录
     * (登录干的事：wx.login、换取openid及session_key、维护自主session状态、session_id存入本地)
     * (登录失败意味着：)
     * session_id ： 自己管理的
     * session_key ： 微信管理的
     * 1. 用户提前授权请求wx.authroize：scope.userInfo；用户拒绝的流程之后再考虑；（把这个剥离出来，在登录成功之后再进行处理）
     * 2. 通过wx.checkSession判断用户的微信登录态(微信派发的session_key是否已过期)：
     * 3. 如果微信登录态未过期：通过localStorage获取自主管理的session_id，与自己服务器交互判断session_id是否过期
     *  3.1. 自主管理的session_id已过期：重新登录
     *  3.2. 自主管理的session_id未过期：登录成功处理
     * 4. 如果微信登录态已过期：通过wx.login获取登录凭证code，使用code在服务器换取微信session_key、openid，服务器生成自己维护的session_id，写入session数据，然后将session_id派发至小程序端进行存储，登录成功处理。
     * *5. 首次进入小程序的用户，必会走到用户登录态已过期流程！！！
     * *6. localStorage是微信管理的本地缓存，不知道会出现什么情况。可把缓存过期时间设置稍短，在有过期时删除。
     */
    userLogin: function(callback) {
        var self = this;        // 以便于在回调中能使用 App() 实例

        wx.checkSession({
            success: function(res) {
                // 微信登录态未过期，检查自主管理session
                console.log('微信登录态未过期，检查自主管理session_id');

                try {
                    var session_id = wx.getStorageSync('session_id');
                    if (session_id) {
                        // 检查session_id
                        console.log('检查本地session_id状态');

                        self.globalData.session_id = session_id;

                        wx.request({
                            url: checkSessionUrl,
                            data: {'session_id' : session_id},
                            success: function(res) {
                                if (res.data.code == 0) {
                                    console.log('本地session未过期');
                                    callback(false);
                                } else {
                                    console.log('errorCode: '+res.data.code+ '; error desc: '+res.data.desc);
                                    // 本地session校验失败，重新登录
                                    self.doLogin(function(err) {
                                        callback(err);
                                    });
                                }
                            },
                            fail: function(res) {
                                // 接口访问失败，返回异常
                                console.log('checkSession 接口访问失败，异常处理待做');
                            },
                        })
                    } else {
                        // 本地不存在session_id，需要登录
                        console.log('本地session_id不存在，需重新登');

                        self.doLogin(function(err) {
                            callback(err);
                        })
                    }
                } catch(e) {
                    // 不太清楚什么情况会进入这个流程
                    // 反正就是异常嘛，重新登录一下
                    console.log('获取session_id流程异常，暂时不做处理');

                    self.doLogin(function(err) {
                        callback(err);
                    })
                }
            },
            fail: function(res) {
                // 微信登录态已过期，需要重新登录
                console.log('微信登录态已过期，需要重新登');

                self.doLogin(function(err) {
                    callback(err);
                })
            },
        })
    },

    doLogin: function(callback) {
        wx.login({
            success: function(res) {
                // 使用code换取openid、session_key，服务器派发回session_id
                wx.request({
                    url: loginUrl,
                    data: {'code' : res.code},
                    success: function(res) {
                        // 根据返回值判断session处理情况 
                        console.log('登录接口访问成功\n', res);

                        var resData = res.data;
                        wx.setStorage({
                            key: 'session_id',
                            data: resData.data.session_id,
                            success: function(res) {
                                console.log('session_id成功写入localStorage');
                            },
                            fail: function(res) {
                                console.log('session_id写入localStorage失败');
                            },
                        })

                        callback(false);    // 表示没有错误
                    },
                    fail: function(res) {
                        // 接口访问失败
                        console.log('login 接口访问失败，错误处理');

                        callback(true);     // 表示存在错误
                    },
                })
            },
            fail: function(res) {
                // 登录失败，不知道怎么处理了...
                console.log('wx.login 登录失败');
            },
        })
    },

    /**
     * 获取用户的授权信息
     * 可以不要回调的，失败的以后再设置呗
     */
    getAuthSetting: function() {
        var self = this;

        wx.getSetting({
            success: function(res) {
                console.log('成功获取用户授权信息');
                self.globalData.authScope = res.authSetting;
            },
            fail: function(res) {
                console.log('获取用户授权信息失败');
            },
        })
    },

    /**
     * 获取用户信息，然后在服务器更新或新建用户
     * 暂时不做加密验证
     */  
    getUserInfo: function(callback) {
        var self = this
        var err = true

        wx.getUserInfo({
            withCredentials: false,
            success: function(res) {
                // 不判断返回参数了，要判断也是以后加密的判断
                self.globalData.userInfo = res.userInfo;

                wx.request({
                    url: saveUserInfoUrl,
                    data: {
                        'session_id': self.globalData.session_id, 
                        'userinfo': self.globalData.userInfo
                    },
                    success: function(res) {
                        // 根据服务器返回参数判断状态
                        if (res.data.code == 0) {
                            err = false;
                        }
                        callback(err)
                    },
                    fail: function(res) {
                        console.log('存储用户信息失败')
                        callback(err)
                    },
                })
            },
            fail: function(res) {
                console.log('获取用户信息失败，暂时不处理')

                callback(err)
            },
            complete: function(res) {
                // 获取用户信息处理结束，获取用户授权状态
                self.getAuthSetting()
            },
        })
    }
})