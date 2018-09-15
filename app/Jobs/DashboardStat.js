'use strict'

// شامل job های منشر شده ایجاد شده برای kue 
// start/kue

const User = use('App/Models/User')
const UserFuge = use('App/Models/UserFuge')
const Property = use('App/Models/Property')
const Stat = use('App/Models/Stat')
const UserSms = use('App/Models/UserSms')
const Exchange = use('App/Models/Exchange')
const ExchangeNotification = use('App/Models/ExchangeNotification')
const Message = use('App/Models/Message')
const Setting = use('App/Models/Setting')
const GameSession = use('App/Models/GameSession')
const WeeklyGift = use('App/Models/WeeklyGift')
const UserGift = use('App/Models/UserGift')
const querystring = require('querystring')

const Database = use('Database')
const Redis = use('Redis')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()
const _ = require('lodash')
const axios = require('axios')
const Env = use('Env')
const Buffer = require('buffer').Buffer

class DashboardStat {
  // جمع آوری داده ها از redis و ثبت روزانه در mysql
  static async stat (job, done) {
    try {
      await Stat.query().where('date', Time().format('YYYY-M-D')).delete()

      let stat = {
        users: 0,
        users_disable: 0,
        online: 0,
        register: 0,
        coin_buy: 0,
        coin_used: 0,
        game: 0,
        game_success: 0
      }

      stat['users'] = await User.query().count()
      stat['users'] = stat['users'][0]['count(*)']

      stat['users_disable'] = await User.query().where('last_activity', '<', Time().subtract(Env.get('DISABLE_USER_DAY'), 'days').format('YYYY-M-D')).count()
      stat['users_disable'] = stat['users_disable'][0]['count(*)']

      stat['register'] = await User.query().where('created_at', '>', Time().subtract(1, 'days').format('YYYY-M-D HH:mm:ss')).count()
      stat['register'] = stat['register'][0]['count(*)']

      stat['elixir_1'] = await Property.query().sum('elixir_1')
      stat['elixir_1'] = stat['elixir_1'][0]['sum(`elixir_1`)']

      stat['elixir_2'] = await Property.query().sum('elixir_2')
      stat['elixir_2'] = stat['elixir_2'][0]['sum(`elixir_2`)']

      stat['elixir_3'] = await Property.query().sum('elixir_3')
      stat['elixir_3'] = stat['elixir_3'][0]['sum(`elixir_3`)']

      stat['elixir_exchange'] = await User.query().sum('elixir_exchange')
      stat['elixir_exchange'] = stat['elixir_exchange'][0]['sum(`elixir_exchange`)']      

      stat['elixir_shield'] = await User.query().sum('elixir_shield')
      stat['elixir_shield'] = stat['elixir_shield'][0]['sum(`elixir_shield`)']      

      stat['elixir_award'] = await User.query().sum('elixir_reward')
      stat['elixir_award'] = stat['elixir_award'][0]['sum(`elixir_reward`)']
      
      stat['elixir_fuge'] = await UserFuge.query().sum('amount')
      stat['elixir_fuge'] = stat['elixir_fuge'][0]['sum(`amount`)']    

      await Redis.select(Env.get('REDIS_STAT_DATABASE'))
      const cacheStat = await Redis.hgetall(Env.get('REDIS_STAT_KEY'))
      await Redis.del(Env.get('REDIS_STAT_KEY'))

      if (cacheStat) {
        stat['online'] = cacheStat['online']
        stat['coin_buy'] = cacheStat['coin_buy']
        stat['coin_used'] = cacheStat['coin_used']
        stat['game'] = cacheStat['game']
        stat['game_success'] = cacheStat['game_success']
      }

      stat['exchanges_view'] = 0
      let exchangeViewCount = await Redis.get(Env.get('REDIS_STAT_EXCHANGE_VIEW'))
      if (exchangeViewCount) {
        stat['exchanges_view'] = parseInt(exchangeViewCount)
      }
      await Redis.del(Env.get('REDIS_STAT_EXCHANGE_VIEW'))

      stat['date'] = Time().format('YYYY-M-D')
      await Stat.create(stat)

      return done()
    } catch (error) {
      // SentryException.captureException(error)
    }
  }

  // آمارهای مرتبط با صفحه اول پنل مدیریت و ثبت در redis
  static async dashboard (job, done) {
    try {
      //از بین بردن بازی ها و شبیخون هایی که بیش از ۱۵ دقیقه از شروع آن گذشته و اتمام آن گزارش نشده است
      
      let fifth = Time(Moment.now('YYYY-MM-DD HH:mm:ss')).subtract(15,'minute').format('YYYY-MM-DD HH:mm:ss')
      let theAttack, userAttacked, underAttacks, attackGames = await GameSession.query().whereNot('user_defence',null).where('created_at','<=',fifth)
      for(let i = 0;i < attackGames.length;i++){
        theAttack = attackGames[i]
        underAttacks = await GameSession.query().where('user_defence',theAttack.user_defence).where('created_at','>',Time(Moment.now('YYYY-MM-DD HH:mm:ss')).subtract(50,'second').format('YYYY-MM-DD HH:mm:ss'))
        if(underAttacks.length==0){
          userAttacked = await User.query().where('id',theAttack.user_defence).first()
          userAttacked.under_attack = 'no'
          userAttacked.save()
        }
      }

      // let lostGames = await GameSession.query().where('created_at','<=',Time(Moment.now('YY-MM-DD HH:mm:ss')).subtract(15,'minute').format('YYY-MM-DD HH:mm:ss')).delete()

      

      await Redis.select(Env.get('REDIS_STAT_DATABASE'))

      let stat
      let existStat = await Redis.keys(Env.get('REDIS_DASHBOARD_KEY'))
      if (!existStat.length) {
        stat = {
          users: 0,
          online: 0,
          register_today: 0,
          register_week: 0
        }
      } else {
        stat = await Redis.hgetall(Env.get('REDIS_DASHBOARD_KEY'))
      }

      stat['elixir_1'] = await Property.query().sum('elixir_1')
      stat['elixir_1'] = stat['elixir_1'][0]['sum(`elixir_1`)']

      stat['elixir_2'] = await Property.query().sum('elixir_2')
      stat['elixir_2'] = stat['elixir_2'][0]['sum(`elixir_2`)']

      stat['elixir_3'] = await Property.query().sum('elixir_3')
      stat['elixir_3'] = stat['elixir_3'][0]['sum(`elixir_3`)']

      stat['elixir_exchange'] = await User.query().sum('elixir_exchange')
      stat['elixir_exchange'] = stat['elixir_exchange'][0]['sum(`elixir_exchange`)']      

      stat['elixir_shield'] = await User.query().sum('elixir_shield')
      stat['elixir_shield'] = stat['elixir_shield'][0]['sum(`elixir_shield`)']      

      stat['elixir_award'] = await User.query().sum('elixir_reward')
      stat['elixir_award'] = stat['elixir_award'][0]['sum(`elixir_reward`)']
      
      stat['elixir_fuge'] = await UserFuge.query().sum('amount')
      stat['elixir_fuge'] = stat['elixir_fuge'][0]['sum(`amount`)']            

      stat['users'] = await User.query().count()
      stat['users'] = stat['users'][0]['count(*)']

      let subDays = Time().day() + 1
      if(subDays>6){
        subDays = 0
      }

      stat['register_week'] = await User.query().where('created_at', '>', Time().subtract(subDays, 'days').format('YYYY-M-D HH:mm:ss')).count()
      stat['register_week'] = stat['register_week'][0]['count(*)']

      stat['register_today'] = await User.query().where('created_at', '>', Time().subtract(1, 'days').format('YYYY-M-D HH:mm:ss')).count()
      stat['register_today'] = stat['register_today'][0]['count(*)']

      const response = await axios.get(Env.get('EMQTT_API_ADDRESS'), {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(Env.get('EMQTT_DASHBOARD_USER') + ':' + Env.get('EMQTT_DASHBOARD_PASSWORD')).toString('base64')
        }
      })
      if (response.status === 200) {
        const server = _.keys(response.data.result[0])
        const data = response.data.result[0][server]
        if (stat['online'] < (data['clients/count'] - 1)) {
          stat['online'] = data['clients/count'] - 1
        }
        await Redis.hmset(Env.get('REDIS_DASHBOARD_KEY'), stat)
      }

      done()
    } catch (error) {
      console.log('Error')
      console.log(error)
      // SentryException.captureException(error)
    }
  }

  //شناسایی کاربران غایب
  static async absents (job, done) {
    try{
      let settings = await Setting.get()

      let users, exchangeNot, elixirLimit, exchangeNotifications = await ExchangeNotification.query().where('is_active',1).with('exchange').fetch()
      exchangeNotifications = exchangeNotifications.toJSON()
      for(let i = 0;i < exchangeNotifications.length;i++){
        exchangeNot = exchangeNotifications[i]
        elixirLimit = exchangeNot.exchange.elixir * (100 - exchangeNot.elixir_percent) / 100
        users = await User.query().select('users.id','users_property.elixir_3').leftJoin('users_property','users.id','users_property.user_id').where('elixir_3','>=',elixirLimit).where('elixir_3','<',exchangeNot.exchange.elixir).fetch()
        users = users.toJSON()
        
        for(let j = 0;j < users.length;j++){
          await Message.create({
            user_id : users[j].id,
            type : 'system',
            status: 'unread',
            message : 'شما تا امکان مبادله کالای ' + exchangeNot.exchange.name + ' تنها ' + (users[j].elixir_3 - exchangeNot.exchange.elixir) + 'اکسیر کم دارید'  
          })
        }
        
      }
      
      if(settings.two_week_absent_message!='') {
        let notifiedUsers = await UserSms.query().where('type','two_week_absent')

        let tmpUsers = []
        for(let i = 0;i < notifiedUsers.length;i++){
          tmpUsers.push(notifiedUsers[i].user_id)
        }
        let absent_users = await User.query().where('last_activity','<',Time(Moment.now('YYYY-MM-DD HH:mm:ss')).subtract(2,'week').format('YYYY-MM-DD HH:mm:ss')).whereNotIn('id',tmpUsers)
        let messagedUsers = []
  
        for(let i = 0;i < absent_users.length;i++){
          tmpUsers.push(absent_users[i].id)
          messagedUsers.push({
            user_id: absent_users[i].id,
            message: settings.two_week_absent_message,
            type: 'two_week_absent'
          })
  
          const response = await axios({
            method: 'post',
            url: Env.get('SMS_URL'),
            data: querystring.stringify({
              UserName: Env.get('SMS_USERNAME'),
              Password: Env.get('SMS_PASSWORD'),
              PhoneNumber: Env.get('SMS_NUMBER'),
              RecNumber: absent_users[i].mobile.replace('+98','0'),
              MessageBody: settings.two_week_absent_message,
              Smsclass: 1
            })
          })
        }
  
        await UserSms.createMany(messagedUsers)
      }

      if(settings.one_week_absent_message!='') {
        notifiedUsers = await UserSms.query().where('type','one_week_absent')
    
        for(let i = 0;i < notifiedUsers.length;i++){
          tmpUsers.push(notifiedUsers[i].user_id)
        }
        absent_users = await User.query().where('last_activity','<',Time(Moment.now('YYYY-MM-DD HH:mm:ss')).subtract(1,'week').format('YYYY-MM-DD HH:mm:ss')).whereNotIn('id',tmpUsers)
        messagedUsers = []
    
        for(let i = 0;i < absent_users.length;i++){
          messagedUsers.push({
            user_id: absent_users[i].id,
            message: settings.one_week_absent_message,
            type: 'one_week_absent'
          })

          const response = await axios({
            method: 'post',
            url: Env.get('SMS_URL'),
            data: querystring.stringify({
              UserName: Env.get('SMS_USERNAME'),
              Password: Env.get('SMS_PASSWORD'),
              PhoneNumber: Env.get('SMS_NUMBER'),
              RecNumber: absent_users[i].mobile.replace('+98','0'),
              MessageBody: settings.one_week_absent_message,
              Smsclass: 1
            })
          })
        }

        await UserSms.createMany(messagedUsers)
      }

      done()
    } catch (error) {
      console.log('Error')
      console.log(error)
      // SentryException.captureException(error)
      done()
    }
    
  }

  // 
  static async weeklyGift (job, done) {
    try{
      // console.log('Weekly Gift')
      let user = await Database.raw("SELECT users.* FROM users left join users_gifts on (users.id = user_id) WHERE (user_id is null or gcount = 6) order by courage_stat desc limit 1")//User.query().with('property').orderBy('courage_stat','DESC').first()
      if(user.length>0 && user[0].length>0){
        user = await User.find( user[0][0].id)
        await user.loadMany(['property'])
        // console.log('User Id ', user.id)
        if(user) {
          let userJson = user.toJSON()
          // console.log(userJson)
          
          let weeklyGift = await WeeklyGift.query().where('is_enabled', 1).orderBy('updated_at','DESC').first()
          if(weeklyGift) {
            // console.log('Weekly Gift')
            // console.log(weeklyGift.toJSON())
            // console.log('User')
            // console.log(user.toJSON())
            let userGift = await UserGift.query().where('user_id', user.id).where('weekly_gifts_id', weeklyGift.id).orderBy('updated_at', 'DESC').first()
            if(!userGift) {
              userGift = new UserGift
              userGift.weekly_gifts_id = weeklyGift.id
              userGift.user_id = user.id
            }
            userGift.gcount = 0
  
            user.coin += weeklyGift.coin
            await user.save()
  
            userJson.property.elixir_1 += weeklyGift.elixir_1
            userJson.property.be += weeklyGift.be
            await user.property().update(userJson.property)
  
            await userGift.save()
            let cost  = ((weeklyGift.coin>0)?weeklyGift.coin + ' سکه ' :'') + ((weeklyGift.elixir_1>0)?weeklyGift.elixir_1 + ' اکسیر ۵٪ ':'') + ((weeklyGift.be>0)?weeklyGift.be + ' انرژی آبی ' :'')
            await Message.create({
              user_id : user.id,
              type : 'system',
              status: 'unread',
              message : 'شما برنده جایزه هفتگی به ارزش ' + cost + ' شده اید'  
            })
            let users = []
            let allGifts = await User.query().where('courage_stat', '>=', user.courage_stat).fetch()
            if(allGifts) {
              allGifts = allGifts.toJSON()
              for(user of allGifts) {
                users.push(user.id)
                await Message.create({
                  user_id : user.id,
                  type : 'system',
                  status: 'unread',
                  message : 'تبریک شما جزو برترین های هفته هستید'  
                })
              }
              // console.log('Users', users)
            }
            await Database.raw("update users_gifts set gcount = if(gcount<6,gcount + 1,1) where user_id in (" + users.join(',') + ")")
          }
          
        }
      }
      done()
    } catch (error) {
      console.log('Error')
      console.log(error)
      // SentryException.captureException(error)
      done()
    }
    
  }
}

module.exports = DashboardStat
