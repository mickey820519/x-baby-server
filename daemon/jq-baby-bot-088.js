const moment = require('moment');
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
  const canvas = createCanvas(350, 300);
  const ctx = canvas.getContext('2d');
  registerFont('./asset/font/Song.ttf', { family: 'Song' });
  const backgroundImage = await loadImage('./asset/img/photo_msg_bg.png');
  const winIcon = await loadImage('./asset/img/win.png');
  const lostIcon = await loadImage('./asset/img/lost.png');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // 宝贝推荐
  let maxRecommendId = null;
  let messageCount = 0;

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

        // //mock
        // recommendList = [
        //   {
        //     id: 1,
        //     match: {
        //       league: {
        //         nameCn: '英超'
        //       },
        //       homeTeam: {
        //         nameCn: '曼联'
        //       },
        //       guestTeam: {
        //         nameCn: '曼城'
        //       }
        //     },
        //     minute: '45+1',
        //     homeTeamG: 1,
        //     guestTeamG: 0,
        //     period: 1
        //   }
        // ];

        recommendList.sort(
          (a, b) => {
            return b.id - a.id;
          }
        );

        //获取历史推荐
        let getHistoryResponse = await jqBabyHttpClient.request(
          {
            method: 'GET',
            url: '/v1/soccer/recommend/history',
            params: {
              searchAlgorithmId: 26,
              offset: 0,
              limit: 10
            }
          }
        );
        let historyRecommendList = getHistoryResponse.data.data.recommendList;

        botLogger.debug('推荐列表', recommendList);

        for(let recommend of recommendList) {
          if(recommend.id > maxRecommendId) {
            maxRecommendId = recommend.id;
            //清空画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            //背景图
            ctx.drawImage(backgroundImage, 0, 0, 350, 262);
            //文字
            ctx.font = '30px Song';
            let title = '进球宝贝免费提醒您：';
            ctx.fillText(title, 30, 20);

            ctx.font = '24px Song';
            let message = `${recommend.match.league.nameCn}\n`;
            message += `时间：${recommend.minute}\n`;
            message += `${recommend.match.homeTeam.nameCn}\n`;
            message += `${recommend.homeTeamG} : ${recommend.guestTeamG}\n`;
            message += `${recommend.match.guestTeam.nameCn}\n`;
            message += `推荐 ${recommend.period === 1 ? '半场' : '全场'} 继续进球`;
            ctx.fillText(message, 30, 60);
            //战绩
            let result = '最近：'
            ctx.fillText(result, 30, 260);
            let currentDate = moment();
            let hour = currentDate.hour();

            if(hour < 12) {
              currentDate = currentDate.subtract(1, 'days');
            }

            let index = 0;
            for(let historyRecommend of historyRecommendList) {
              if(historyRecommend.goalResult === 1) {
                ctx.drawImage(winIcon, 100 + index * 25, 270, 20, 20);
                index++;
              }
              else if(historyRecommend.goalResult === 0) {
                ctx.drawImage(lostIcon, 100 + index * 25, 270, 20, 20);
                index++;
              }
            }
            
            //生成图片
            let photoBuffer = canvas.toBuffer();
            //发送消息
            let channelUsernameList = jqBabyBot088ConfigData.channelUsernameList;
            messageCount++;
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

              if(messageCount % 5 !== 0) {
                continue;
              }

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