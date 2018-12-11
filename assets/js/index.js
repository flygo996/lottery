window.Turntable = (function() {
  var actInfo = null; //活动信息对象
  var userInfo = null; //用户信息
  var isStarted = false; //是否已启动转盘

  var MESSAGE = { //弹窗类型
    NO_AWARD: 'NO_AWARD', //没有获奖
    CHANCES_LIMITED: 'TIMES_LIMITED', //每日抽奖次数上限
    NO_CHANCES: 'NO_CHANCES', //没有抽奖机会
    DRAW_AGAIN: 'DRAW_AGAIN', //再抽一次
    MSG: 'MSG' //提示信息窗口
  };

  var AWARDS_DEGREE = {//奖项位置
    IPHONE7: 30,
    THANKS_TO_JOIN_1: 90,
    DRAW_AGAIN_1: 150,
    TEL_FARE: 210,
    THANKS_TO_JOIN_2: 270,
    DRAW_AGAIN_2: 330
  };

  var AWARDS = {//奖品编码
    THANKS_TO_JOIN: '100010401', //谢谢参与
    DRAW_AGAIN: '100010402' //再抽一次
  };

  var FrogConfig = window.FrogConfig,
    FrogUtils = window.FrogUtils;


  /**
   * 初始化
   *
   * @author fcy
   */
  function init() {
    // mock();
    FrogUtils.getActivityInfo(function(res) {
      userInfo = res;
      if (!userInfo || !userInfo.userId || !userInfo.token) { //未登录
        message(MESSAGE.MSG, '请先登录！');
        return false;
      }
      getUserActInfo(res.userId); //获取用户活动信息
      return true;
    });
    scrollNotice(); //滚动消息

    $('.spinner').on('click', function() {//绑定开始抽奖事件
      startRotate(); //启动转盘
      setTimeout(() => {
        rotateToTarget(100);
      }, 1000);
      return;
      if (isActAvailable() && !isStarted) {
        draw(userInfo.userId, userInfo.token);
      }
    });

    $('.shade, .message_btn').on('click', function() {//绑定关闭弹窗事件
      closeMessage();
      if ($(this).attr('class') == 'message_btn'
                && $(this).text().indexOf('去记账') > -1) {
        console.log('redirect to accounting page..');
        FrogUtils.redirectToAppPage();
      } else if ($(this).text().indexOf('再来一次') > -1) {
        setTimeout(function() {
          $('.spinner').click();
        }, 800);
      }
    });

    $('.rules_item_btn').on('click', function() {//绑定任务按钮事件
      if ($(this).attr('class') == 'rules_item_btn grey') {
        message(MESSAGE.MSG, '该任务已完成，还有其他任务等着你哦！');
      } else {
        FrogUtils.redirectToAppPage();
      }
    });
  }


  /**
   * 请求抽奖接口
   *
   * @author fcy
   * @param {string} userId 用户id
   * @param {string} token token值
   */
  function draw(userId, token) {
    startRotate(); //启动转盘
    $.ajax({
      type: 'GET',
      url: FrogConfig.SERVER + '/frog-api/activity/userDraw',
      data: {
        userId: userId,
        actCode: FrogConfig.ACT_CODE,
        token: token
      },
      dataType: 'json',
      timeout: 5000,
      success: function(result) {
        if (result.code != 0) {
          message(MESSAGE.MSG, result.msg);
          return;
        }
        var data = result.data;
        actInfo.drawToday = actInfo.drawToday + 1;
        if (data.giftCode == AWARDS.THANKS_TO_JOIN) {//抽到谢谢参与，抽奖次数减1
          actInfo.remainTimes = actInfo.remainTimes - 1;
        }
        rotateToTarget(data.giftCode);
        setRemainTimes(data.remainTimes);
      },
      error: function() {
        message(MESSAGE.MSG, '网络异常，请稍后重试！');
      }
    })
  }

  /**
   * 请求用户活动信息接口
   *
   * @author fcy
   * @param {string} userId 用户id
   */
  function getUserActInfo(userId) {
    showLoading();
    $.ajax({
      type: 'GET',
      url: FrogConfig.SERVER + '/frog-api/activity/userActs',
      data: {
        userId: userId
      },
      dataType: 'json',
      timeout: 5000,
      success: function(result) {
        hideLoading();
        actInfo = getActWheelInfo(result.data.actInfoList);
        setTaskStatus(actInfo.taskFinishedToday);
        setRemainTimes(actInfo.remainTimes);
      },
      error: function() {
        hideLoading();
        message(MESSAGE.MSG, '网络异常，请稍后重试！');
      }
    })
  }

  /**
   * 获取活动状态信息
   *
   * @author fcy
   * @param actInfoList
   * @returns {*}
   */
  function getActWheelInfo(actInfoList) {
    var act = null;
    $.each(actInfoList, function(index, actInfo) {
      if (actInfo.actCode === FrogConfig.ACT_CODE) {
        act = actInfo;
        return false;
      }
      return true;
    });
    return act;
  }

  /**
   * 验证当前用户是否可参与抽奖
   *
   * @author fcy
   * @returns {boolean}
   */
  function isActAvailable() {
    if (!userInfo || !userInfo.userId || !userInfo.token) { //未登录
      message(MESSAGE.MSG, '请先登录！');
      return false;
    }

    var currentTime = new Date().getTime();
    if (currentTime < actInfo.startTime) {
      message(MESSAGE.MSG, '活动暂未开始！');
      return false;
    }

    if (currentTime > actInfo.endTime) {
      message(MESSAGE.MSG, '活动已经结束！');
      return false;
    }

    if (actInfo.drawToday >= FrogConfig.DRAW_TIMES_LIMITED) {//每天抽奖次数到达上限
      message(MESSAGE.CHANCES_LIMITED);
      return false;
    }

    if (actInfo.remainTimes == 0) {//抽奖次数为0
      message(MESSAGE.NO_CHANCES);
      return false;
    }

    return true;
  }

  /**
   * 转动转盘至奖项位置
   *
   * @author fcy
   * @param result
   */
  function rotateToTarget(result) {
    var randomDeg = Math.floor(20 - Math.random() * 40); //目标奖项
    var randomReward = Math.ceil(Math.random() * 2); //相同奖项随机位置
    var awardDeg = result === AWARDS.DRAW_AGAIN
      ? AWARDS_DEGREE['DRAW_AGAIN_' + randomReward]
      : AWARDS_DEGREE['THANKS_TO_JOIN_' + randomReward];
    var remainDeg = awardDeg + randomDeg + 1440; //当前位置距离奖项位置还需转动角度
    var rotatedDeg = FrogUtils.rotate.rotateSpeed * FrogUtils.rotate.rotateSeconds; //转盘已经转动角度
    var targetDeg = rotatedDeg + remainDeg; //到达奖项位置需转动总角度
    var duration = Math.ceil(remainDeg / FrogUtils.rotate.rotateSpeed) + 1; //剩余距离所需时间间隔
    FrogUtils.rotate.run(targetDeg, duration, FrogUtils.rotate.EASE_OUT, function() {
      var messageType = result === AWARDS.DRAW_AGAIN ? MESSAGE.DRAW_AGAIN : MESSAGE.NO_AWARD;
      message(messageType);
    });
  }

  /**
   * 启动转盘
   *
   * @author fcy
   */
  function startRotate() {
    isStarted = true;
    FrogUtils.rotate.run(FrogUtils.rotate.rotateSpeed * 20, 20, FrogUtils.rotate.LINEAR); //启动转盘
  }

  /**
   * 转盘复位
   *
   * @author fcy
   */
  function resetRotate() {
    isStarted = false;
    FrogUtils.rotate.run(0, 0, FrogUtils.rotate.LINEAR); //启动转盘
  }


  /**
   * 设置剩余抽奖次数
   *
   * @author fcy
   * @param {string} times 次数
   */
  function setRemainTimes(times) {
    $('.rest_count span').html(times);
  }

  /**
   * 设置任务完成状态
   *
   * @author fcy
   * @param {string} tasks 任务
   */
  function setTaskStatus(tasks) {
    $.each(tasks, function(index, task) {
      $('[data-task=\'' + task + '\']')
        .addClass('grey');
    })
  }

  /**
   * 弹窗
   *
   * @author fcy
   * @param type 弹窗类型
   */
  function message(type, msg) {
    var $message =
            type == MESSAGE.NO_AWARD
              ? $('.message_with_header')
              : $('.message'),
      $messageTitle = $message.find('.message_title'),
      $messageContent = $message.find('.message_content'),
      $messageBtn = $message.find('.message_btn'),
      $messageBtTitle = $message.find('.message_bt_title');

    switch (type) {
      case MESSAGE.CHANCES_LIMITED: //抽奖次数上限
        $messageTitle.html('抽奖次数已达上限');
        $messageContent.html('您今天抽奖的次数已达上限(4次)');
        $messageBtTitle.html('');
        $messageBtn.css('fontSize', '.8rem').html('明天再来');
        break;
      case MESSAGE.NO_CHANCES: //抽奖次数为0
        $messageTitle.html('抽奖次数为0');
        $messageContent.html('您今天抽奖的次数已经为0，请去记账领取更多抽奖机会！');
        $messageBtTitle.html('不放过每一笔有价值的投资');
        $messageBtn.css('fontSize', '.8rem').html('去记账');
        break;
      case MESSAGE.DRAW_AGAIN: //再抽一次
        $messageTitle.html('手气真好');
        $messageContent.html('恭喜获得"再抽一次"的机会');
        $messageBtTitle.html('');
        $messageBtn.css('fontSize', '.5rem').html('马上再来一次');
        break;
      case MESSAGE.MSG: //提示信息
        $messageTitle.html('');
        $messageContent.html(msg);
        $messageBtTitle.html('');
        $messageBtn.css('fontSize', '.8rem').html('我知道了');
        break;
    }
    $('.shade').css('display', 'block');
    $message.css('display', 'block');
    $message.animate({
      top: '35%'
    }, 500, 'ease-out');
  }

  /**
   * 关闭弹窗
   *
   * @author fcy
   */
  function closeMessage() {
    resetRotate();
    $('.message, .message_with_header').animate(
      {top: '-40%'}
      , 500
      , 'ease-out'
      , function() {
        $('.shade').css('display', 'none');
        $('.message').css('display', 'none');
      }
    );
  }

  /**
   * 抽奖结果滚动
   *
   * @author fcy
   */
  function scrollNotice() {
    scrollNoticeIn();
    setInterval(function() {
      scrollNoticeOut()
    }, 3000);
  }

  /**
   * 滚动消息淡出动画
   *
   * @author fcy
   * @param {string} phone 手机号码
   * @param {string} award 奖励
   */
  function scrollNoticeOut() {
    $('.reward_item').animate(
      {
        top: '-1rem',
        opacity: '0'
      }
      , 500
      , 'ease-out'
      , function() {
        setTimeout(function() {
          scrollNoticeIn();
        }, 100);
      }
    );
  }

  /**
     * 滚动消息淡入动画
     *
     * @author fcy
     * @param {string} phone 手机号码
     * @param {string} award 奖励
     */
  function scrollNoticeIn() {
    $('.reward_item').css({top: '1rem'});
    $('.reward_item span').eq(0).html('恭喜' + FrogUtils.getRandomPhoneNum() + '抽中');
    $('.reward_item span').eq(1).html('30元话费充值卡');
    $('.reward_item').animate(
      {
        top: '0rem',
        opacity: '1'
      }
      , 500
      , 'ease-out'
    );
  }

  /**
   * 显示loading
   *
   * @author fcy
   */
  function showLoading() {
    $('.loading_shade').css('display', 'block');
    $('.loading').css('display', 'block');
  }

  /**
   * 隐藏loading
   *
   * @author fcy
   */
  function hideLoading() {
    $('.loading_shade').css('display', 'none');
    $('.loading').css('display', 'none');
  }


  return {
    init: init
  }
})();

$(document).ready(function() {
  window.Turntable.init();
});
