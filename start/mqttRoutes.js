// تابع اصلی بازی که حکم dispatcher را دارد و درخواست های mqtt را به تابع مورد نظر ارسال کرده و پاسخ را مجدد باری کاربر ارسال می کند .

'use strict'

const Validations = use('App/Libs/Validations')
const Messages = use('App/Libs/Messages/Messages')
const Logger = use('Logger')
const RequestLog = use('App/Models/RequestLog')

const _ = require('lodash')
const User = use('App/Models/User')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

// لیست کلیه route های داخل سیستم که مشخص می کند هر عملیات مربوط به کدام controller و method است .
// Route List
const routes = {
  'ShowGameInfo': 'Game/info',
  'ShowMinesweeperInfo': 'Game/mineInfo',
  'ShowSmasherInfo': 'Game/smasherInfo',
  'CreateGameLand': 'Game/create',
  'PointClickPlace': 'Game/play',
  'GameCancel': 'Game/cancel',
  'GameContinue': 'Game/gameContinue',
  'SmasherFinish': 'Game/smasherFinish',
  'MineSweeperFinish': 'Game/mineSweeperFinish',

  // Profile
  'UserGet': 'User/get',
  'UserProfile': 'User/profile',
  // 'UserBuyAvatar': 'User/profileBuyAvatar',
  'UserProfilePublicSet': 'User/profilePublicSet',
  'UserProfileSet': 'User/profileSet',
  'UserProfileVerify': 'User/profileVerify',
  'UserProfileNoVerify': 'User/profileNoVerify',
  'UserBuyAvatar': 'User/buyAvatar',
  'AvatarList': 'User/avatarList',
  'UserDepoLoseGift': 'User/loseGift',
  'UserDepoFlushBlue': 'User/flushBlueGift',
  'UserDepoFlushYellow': 'User/flushYellowGift',
  'UserCoin': 'User/coin',

  // Lands
  'UserPathInfo': 'Land/show',
  'UserPathStore': 'Land/store',

  // Fuges
  'FugeInfo': 'Fuge/info',
  'FugeBoost': 'Fuge/boost',
  'FugeFill': 'Fuge/fill',
  'FugeRemoval': 'Fuge/removal',
  'FugeUpgrade': 'Fuge/upgrade',

  // Leaderboard
  'LeaderBoard': 'LeaderBoard/list',

  // Settings
  'SetPuzzle': 'User/puzzle',

  // Antiques
  'AntiquesList': 'Antique/list',
  'AntiquesRemoval': 'Antique/removal',

  // Stores
  'StoreList': 'Store/list',
  'StoreBuy': 'Store/buy',

  // Products
  'ProductList': 'Product/list',
  'BuyProduct': 'Product/buy',

  // Attack
  'AttackFind': 'Attack/find',
  'AttackFinish': 'Attack/finish',
  'AttackRevenge': 'Attack/revenge',
  'AttackSticker': 'Attack/sticker',
  'Attack': 'Attack/attack',

  // Contacts
  'ContactList': 'Contact/list',
  'ContactSend': 'Contact/send',

  // Exchanges
  'ExchangeList': 'Exchange/list',
  'ExchangeDetail': 'Exchange/detail',
  'ExchangeBuy': 'Exchange/buy',
  'ExchangeCodes': 'Exchange/codes',

  // Shield
  'ShieldList': 'Shield/list',
  'ShieldBuy': 'Shield/buy',

  // Messages
  'MessageList': 'Message/list',
  'MessageAttacker': 'Message/user',

  // Notifications
  'NotificationList': 'Notification/list',

  'Test': 'Test/test'
}

module.exports = async(topic, message) => {
  let request_log = new RequestLog()
  request_log.type = topic
  request_log.data = message.toString()
  await request_log.save()

  let tmpTime = new Date()
  let end_time, start_time = tmpTime.getTime()
  console.log('topic')
  console.log(topic)
  console.log('message')
  console.log(message.toString())
  let pubTopic = ''
  try {
    const params = JSON.parse(message.toString())
    Logger.info('message recived', topic, params)
    if(params.type=='ping'){
      pubTopic = 'client_0On4IJ6EXizGBZM/'
      return Mqtt.publish(pubTopic + params.type, message.toString())
    }
    request_log.type = params.type
    // Check Params
    const rules = {
      client_id: 'required',
      token: 'required',
      type: 'required',
      data: 'object',
      client: 'object'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      throw check.messages
    }

    // Check User
    const user = await User.query().where('client_id', params.client_id).where('token', params.token).first()
    if (!user) {
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = JSON.stringify(Messages.parse(['UserAuthWrong']))
      await request_log.save()
      throw Messages.parse(['UserAuthWrong'])
    }
    request_log.user_id = user.id

    pubTopic = 'client_' + user.token + '/'
    if (!_.has(routes, params.type)) {
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = JSON.stringify(Messages.parse(['RouteNotFound']))
      await request_log.save()
      throw Messages.parse(['RouteNotFound'])
    }

    const routeTopic = routes[params.type]
    const splitedRoute = routeTopic.split('/')

    user.last_activity = Moment.now('YYYY-MM-DD HH:mm:ss')
    user.save()

    // Send request to controller
    let controller = use('App/Controllers/Mqtt/' + splitedRoute[0] + 'Controller')
    let result = await controller[splitedRoute[1]](params['data'], user)
    

    if (result.length < 2) {
      if (_.has(params, 'client')) {
        result[0]['client'] = params['client']
      }
      result[0]['pid'] = process.pid
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = pubTopic + params.type + ':' + JSON.stringify(result[0])
      await request_log.save()
      tmpTime = new Date()
      end_time = tmpTime.getTime()  
      Logger.info('Time : [' + process.pid + ']' + (end_time - start_time))
      Logger.info(JSON.stringify(result[0]))
      return Mqtt.publish(pubTopic + params.type, JSON.stringify(result[0]))
    } else {
      if (_.has(params, 'client')) {
        result[1]['client'] = params['client']
      }
      result[1]['pid'] = process.pid
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = pubTopic + result[0] + ':' + JSON.stringify(result[1])
      await request_log.save()
      tmpTime = new Date()
      end_time = tmpTime.getTime()
      Logger.info('Time : [' + process.pid + ']' + (end_time - start_time))
      Logger.info(JSON.stringify(result[1]))
      return Mqtt.publish(pubTopic + result[0], JSON.stringify(result[1]))
    }
  } catch (error) {
    console.log(error)
    // SentryException.captureException(JSON.stringify(error))

    let displayError = error
    if (_.isTypedArray(error)) {
      displayError = [error]
    }

    if (pubTopic) {
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = pubTopic + result[0], JSON.stringify(pubTopic + 'error', JSON.stringify({
        status: 0,
        messages: displayError,
        data: {}
      }))
      await request_log.save()
      return Mqtt.publish(pubTopic + 'error', JSON.stringify({
        status: 0,
        messages: displayError,
        data: {}
      }))
    }
  }
}
