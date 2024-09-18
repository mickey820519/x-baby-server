const {
  DobLogApi
} = require('@dob/log');
const {
  DobUtilApi
} = require('@dob/util');
const {
  DobHttpApi
} = require('@dob/http');
const TelegramBot = require('node-telegram-bot-api');
const {
  createCanvas,
  registerFont,
  loadImage
} = require('canvas');
const jqBabyBot088ConfigData = require('../config/daemon/jq-baby-bot-088.json');

//初始化库
//--日志
DobLogApi.configure(
  {
    config: jqBabyBot088ConfigData.log
  }
);
const botLogger = DobLogApi.getLogger('bot');

//--Http
DobHttpApi.createClient(
  {
    name: 'jq-baby',
    config: {
      baseURL: "http://43.154.166.77:23000/api/",
      timeout: 30000
    }
  }
);
const jqBabyHttpClient = DobHttpApi.getClient(
  {
    name: 'jq-baby'
  }
);

// 创建一个Tg机器人实例
const bot = new TelegramBot(
  jqBabyBot088ConfigData.telegramBotToken,
  {
    polling: true
  }
);

async function run() {
  botLogger.info('机器人启动...');

  // 创建canvas
  const canvas = createCanvas(350, 262);
  const ctx = canvas.getContext('2d');
  registerFont('./asset/font/Song.ttf', { family: 'Song' });
  ctx.font = '24px Song';
  const backgroundImage = await loadImage('./asset/img/photo_msg_bg.png');

  // 宝贝推荐
  let maxRecommendId = null;

  while(true) {

    if(maxRecommendId === null) {
      maxRecommendId = 0;
    }
    else {
      //等待
      await DobUtilApi.sleep(
        {
          millisecond: 5000
        }
      );
    }

    try {
      // 获取进球宝贝推荐
      botLogger.info('获取进球宝贝推荐...');
      let res = await jqBabyHttpClient.request(
        {
          method: 'GET',
          url: '/v1/soccer/recommend/live'
        }
      );

      if(res.data.code === 0) {
        let recommendList = res.data.data.recommendList;

        recommendList.sort(
          (a, b) => {
            return b.id - a.id;
          }
        );

        botLogger.debug('推荐列表', recommendList);

        for(let recommend of recommendList) {
          if(recommend.id > maxRecommendId) {
            maxRecommendId = recommend.id;
            //清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            //背景图
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            //文字
            let message = `${recommend.match.league.nameCn}\n`;
            message += `时间：${recommend.minute}\n`;
            message += `${recommend.match.homeTeam.nameCn}\n`;
            message += `${recommend.homeTeamG} : ${recommend.guestTeamG}\n`;
            message += `${recommend.match.guestTeam.nameCn}\n`;
            message += `推荐 ${recommend.period === 1 ? '半场' : '全场'} 继续进球`;
            let messageWidth = ctx.measureText(message).width;
            ctx.fillText(message, (canvas.width - messageWidth) / 2, 50);
            //生成图片
            let photoBuffer = canvas.toBuffer();
            //发送消息
            let channelUsernameList = jqBabyBot088ConfigData.channelUsernameList;
            for(let channelUsername of channelUsernameList) {
              await bot.sendPhoto(
                channelUsername,
                photoBuffer,
                {},
                {
                  filename: 'awesome',
                  contentType: 'image/png'
                }
              );

              message = '';
              message += '进球宝贝会员地址：http://43\\.154\\.166\\.77:23001/\n';
              message += '开通会员请找：@jinqiu\\_baobei\n';
              message += '转U到这个地址自动换trx 10U起换（当前汇率1USDT：6TRX）：`TErTvwnLsMFFFC4jeRXcySFn62EiU8PSTP`\n';
              await bot.sendMessage(
                channelUsername,
                message,
                {
                  parse_mode: 'MarkdownV2',
                  link_preview_options: {
                    is_disabled: true
                  }
                }
              );
            }
          }
        }
      }
    }
    catch(err) {
      botLogger.error(err);
    }
  }
}

run().then(

).catch(
  (err) => {
    botLogger.error(err);
    bot.stopPolling();
  }
).finally(
  () => {
    botLogger.info('机器人退出...');
  }
);