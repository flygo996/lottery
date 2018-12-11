window.FrogUtils = (function() {
  var rotateInterval = null;
  var rotateSeconds = 0; //转盘启动时长
  var rotateSpeed = 720; //转盘速度
  var phonePrefix = ['134', '135', '136', '137', '138', '139', '130', '131', '132', '133', '153', '189']; //手机段号

  return {
    rotate: {
      LINEAR: 'linear',
      EASE_OUT: 'ease-out',
      run: rotate,
      rotateInterval: rotateInterval,
      rotateSeconds: rotateSeconds,
      rotateSpeed: rotateSpeed
    },
    getActivityInfo: getActivityInfo,
    redirectToAppPage: redirectToAppPage,
    getRandomPhoneNum: getRandomPhoneNum
  }

  /**
   * 转动转盘
   *
   * @author fcy
   * @param deg 转动角度
   * @param duration 转动时间
   * @param type 缓动类型
   * @param callback 转动结束回调
   */
  function rotate(deg, duration, type, callback) {
    clearInterval(rotateInterval);
    rotateSeconds = 0;
    var rotateZ = 'rotateZ(' + -deg + 'deg)';
    var transform = 'transform ' + duration + 's ' + type + ' 0s';
    $('.round_table').css(
      {
        'transform': rotateZ,
        '-ms-transform': rotateZ,
        '-moz-transform': rotateZ,
        '-webkit-transform': rotateZ,
        '-o-transform': rotateZ,
        'transition': transform,
        '-moz-transition': transform,
        '-webkit-transition': transform,
        '-o-transition': transform
      }
    );

    setTimeout(function() {//转动结束后回调
      callback && callback();
    }, (duration + 0.5) * 1000);

    if (deg != 0 && type == window.FrogUtils.rotate.LINEAR) {//转盘已转动时间计时器
      rotateInterval = setInterval(function() {
        rotateSeconds = rotateSeconds + 1;
      }, 1000);
    }
  }

  /**
   * 从APP获取用户信息
   *
   * @author fcy
   * @param callback
   */
  function getActivityInfo(callback) {
    // callback({userId: '1', token: '123456'});
    setupWebViewJavascriptBridge(function(bridge) {
      bridge.callHandler('getUserData', null, function(response) {
        var res = eval('(' + response + ')');
        callback && callback(res);
      })
    });
  }

  /**
   * 设置JSBridge
   *
   * @author fcy
   * @param callback
   * @returns {*}
   */
  function setupWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
      callback(window.WebViewJavascriptBridge)
    } else {
      document.addEventListener(
        'WebViewJavascriptBridgeReady'
        , function() {
          callback(window.WebViewJavascriptBridge)
        },
        false
      );
    }

    if (window.WVJBCallbacks) {return window.WVJBCallbacks.push(callback);}
    window.WVJBCallbacks = [callback];
    var WVJBIframe = document.createElement('iframe');
    WVJBIframe.style.display = 'none';
    WVJBIframe.src = 'wvjbscheme://__BRIDGE_LOADED__';
    document.documentElement.appendChild(WVJBIframe);
    setTimeout(function() {document.documentElement.removeChild(WVJBIframe)}, 0);
    return true;
  }

  /**
   * 跳转到App页面
   *
   * @author fcy
   */
  function redirectToAppPage() {
    location.href = 'jinmaoguanjia://router/p2p/create?page=platformChoose';
  }

  /**
   * 生成随机手机号
   *
   * @author fcy
   * @returns {string}
   */
  function getRandomPhoneNum() {
    var phonePrefixIndex = Math.floor(Math.random() * 12);
    var random999 = Math.ceil(Math.random() * 999);
    var phoneSuffix = random999 < 10
      ? '00' + random999
      : random999 < 100 ? '0' + random999 : random999;
    return phonePrefix[phonePrefixIndex] + '*****' + phoneSuffix;
  }
})();
