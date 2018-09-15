'use strict'

const Message = use('App/Models/Message')
const Antique = use('App/Models/Antique')
const User = use('App/Models/User')
const Setting = use('App/Models/Setting')
const GameSession = use('App/Models/GameSession')
const UserNotification = use('App/Models/UserNotification')

const Database = use('Database')

const Validations = use('App/Libs/Validations')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()
const Messages = use('App/Libs/Messages/Messages')
const Notification = use('App/Models/Notification')
const Recall = use('App/Models/Recall')
const _ = require('lodash')

class MessageController {
  // دریافت لیست پیام ها
  static async list_old (params, user) {
    const rules = {
      limit: 'required|integer',
      page: 'required|integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let settings = await Setting.get()
    let attackResult = []
    let attackStatus = []

    if(params.ids && params.ids.length>0) {
      for(let attacker_id of params.ids){
        let attacker = await User.query().where('id', attacker_id).first()
        if(attacker){
          let attackerData = attacker.toJSON()
          let shield = 0
          let shield_duration = (attackerData.shield_duration>0)?attackerData.shield_duration*60:settings.attack_shield
          let shield_out = Time(attackerData.shield_at).add(shield_duration,'minute')

          let last_activity_diff = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(attackerData.last_activity,'minute')
          let is_online = (last_activity_diff<settings.attack_online)

          if (attackerData.shield_at && shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second') > 0) {
            shield = shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second')
          }
          attackStatus.push({
            id: attacker.id,
            shield: shield,
            is_online: is_online,
            under_attack: attackerData.under_attack == 'yes'
          })
        }
      }
    }else {
      let attackMessages = await Message.query().where('user_id', user.id).whereIn('type', ['attack','revenge']).orderBy('created_at', 'DESC').fetch()
      let attackMessagesData = attackMessages.toJSON()

      for (const attack of attackMessagesData) {
        let message = JSON.parse(attack.message)
        let attacker = await User.query().where('id', attack.sender_id).with('level').first()
        if(attacker){
          let attackerData = attacker.toJSON()
          let shield = 0
          let shield_duration = (attackerData.shield_duration>0)?attackerData.shield_duration*60:settings.attack_shield
          let shield_out = Time(attackerData.shield_at).add(shield_duration,'minute')

          let last_activity_diff = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(attackerData.last_activity,'minute')
          let is_online = (last_activity_diff<settings.attack_online)

          if (attackerData.shield_at && shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second') > 0) {
            shield = shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second')
          }
          
          let theAntique = []
          if(!isNaN(parseInt(message.antique,10))){
            let tmpAntique = await Antique.query().where('id',message.antique).first()
            tmpAntique = tmpAntique.toJSON()
            theAntique.push(tmpAntique)
          }
          let theLost = (attack.session==null || attack.session=='');
          let attackRevenge = (attack.type == 'revenge')?'انتقام از':'حمله به'
          attackStatus.push({
            id: attacker.id,
            shield: shield,
            is_online: is_online,
            under_attack: attackerData.under_attack == 'yes'
          })
          attackResult.push({
            id: attack.id,
            time: Time(Time().format('YYYY-M-D HH:mm:ss')).diff(attack.created_at, 'seconds'),
            sticker: attack.sticker_id,
            shield: shield,
            is_online: is_online,
            under_attack: attackerData.under_attack == 'yes',
            image: attackerData.avatar,
            name: attackerData.nickname,
            level: attackerData.level.name,
            cup: attackerData.courage_stat,
            win: message.win,
            blue: message.blue,
            yellow: message.yellow,
            elixir: message.elixir,
            antique: theAntique,//message.antique,
            message: 'کاوشگر ' + attacker.nickname + (theLost?' در '+attackRevenge+' شما شکست خورده است.':' در '+attackRevenge+' شما پیروز شده است.'),
            lost : theLost,
            is_revenge: (attack.type == 'revenge')
          })
          /*
          if(attack.session==null){
            attackResult.push({
              id: attack.id,
              time: Time(Time().format('YYYY-M-D HH:mm:ss')).diff(attack.created_at, 'seconds'),
              sticker: attack.sticker_id,
              shield: shield,
              is_online: is_online,
              under_attack: attackerData.under_attack == 'yes',
              image: attackerData.avatar,
              name: attackerData.nickname,
              level: attackerData.level.name,
              cup: attackerData.courage_stat,
              win: message.win,
              blue: message.blue,
              yellow: message.yellow,
              elixir: message.elixir,
              antique: theAntique,//message.antique,
              message: 'کاوشگر ' + attacker.nickname + ' در حمله به شما شکست خورده است.',
              lost : lost,
              is_revenge: (attack.type == 'revenge')
            })
          }else{ 
            attackResult.push({
              id: attack.id,
              time: Time(Time().format('YYYY-M-D HH:mm:ss')).diff(attack.created_at, 'seconds'),
              sticker: attack.sticker_id,
              shield: shield,
              is_online: is_online,
              under_attack: attackerData.under_attack == 'yes',
              image: attackerData.avatar,
              name: attackerData.nickname,
              level: attackerData.level.name,
              cup: attackerData.courage_stat,
              win: message.win,
              blue: message.blue,
              yellow: message.yellow,
              elixir: message.elixir,
              antique: theAntique,//message.antique,
              message: 'کاوشگر ' + attacker.nickname + ' در حمله به شما پیروز شده است.',
              is_revenge: (attack.type == 'revenge')
            })
          }
          */
        }
      }

    }
    user.unread_messages = 0
    await user.save()

    await user.loadMany(['notifications'])
    let userData = user.toJSON()

    let last_notifications = [-1]
    let viewed_notifications = []

    for(let i = 0;i < userData.notifications.length;i++){
      last_notifications.push(userData.notifications[i].notification_id)
    }

    let userDateNotifications = await Notification.query().where('status','active').where('last_show_date','>=',Moment.now('YYYY-M-D HH:mm:ss'))
    let secretaryNotifications = []
    for(let i = 0;i < userDateNotifications.length;i++){
      viewed_notifications.push({
        user_id: user.id,
        notification_id :userDateNotifications[i].id
      })
      userDateNotifications[i].last_show_date = Moment.m2s(Time(userDateNotifications[i].last_show_date).format('YYYY-M-D HH:mm:ss'))
      userDateNotifications[i].time = -1 * Time(userDateNotifications[i].created_at).diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')
      if(userDateNotifications[i].is_secretary=='yes'){
        secretaryNotifications.push(userDateNotifications[i])
      }
    }

    let userOnceNotifications = await Notification.query().where('status','active').where('last_show_date',null).whereNotIn('id',last_notifications)
    for(let i = 0;i < userOnceNotifications.length;i++){
      viewed_notifications.push({
        user_id: user.id,
        notification_id :userOnceNotifications[i].id
      })
      userOnceNotifications[i].time = -1 * Time(userOnceNotifications[i].created_at).diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')
      if(userOnceNotifications[i].is_secretary=='yes'){
        secretaryNotifications.push(userOnceNotifications[i])
      }
    }

    let systemMessages = await Message.query().where('user_id', user.id).whereIn('type', 'system').where('status','unread').orderBy('created_at', 'DESC').fetch()
    let systemMessagesData = systemMessages.toJSON()

    for(let i = 0;i < systemMessagesData.length;i++){
      userOnceNotifications.push({
        title: 'پیام سیستمی',
        text: systemMessagesData[i].message,
        time: -1 * Time(systemMessagesData[i].created_at).diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')
      })
    }

    await Message.query().where('user_id', user.id).whereIn('type', 'system').where('status','unread').update({status: 'read'})

    let userNotifications = {
      once_notification: userOnceNotifications,
      date_notification: userDateNotifications
    }

    let userNotification = await UserNotification.createMany(viewed_notifications)

    let recall = await Recall.query().where(function () {
      this.where('status', 'active').where('started_at', '<=', Time().format('YYYY-M-D')).where('expired_at', '>', Time().format('YYYY-M-D'))
    }).orWhere(function () {
      this.where('status', 'active').where('started_at', '>', Time().format('YYYY-M-D'))
    }).first()
    let recallsData = null/*{
      type: 0,
      land: 0,
      time: 0
    }*/

    if(recall){
      recall.game = (recall.game == 'back' ? 1 : 0)
      recall.time = recall.started_at > Time().format('YYYY-M-D') ? Time(recall.started_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') : Time(recall.expired_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
      recallsData = recall/*{
        type: recall.started_at > Time().format('YYYY-M-D') ? 2 : 1,
        land: recall.game == 'back' ? 1 : 0,
        time: recall.started_at > Time().format('YYYY-M-D') ? Time(recall.started_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') : Time(recall.expired_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
      }*/
    }

    return [{
      status: 1,
      messages: [],
      data: {
        attack: attackResult,
        attack_status: attackStatus,
        notifications: userNotifications,
        recall: recallsData
      }
    }]
  }

  static async list (params, user) {
    let attackResult = []
    let attackStatus = []
    let settings = await Database.raw("select * from settings limit 1")
    settings = settings[0][0]


    if(params.ids && params.ids.length>0) {
      for(let attacker_id of params.ids){
        let attacker = await Database.raw("select * from users where id = " + attacker_id)

        if(attacker){
          let attackerData = attacker
          let shield = 0
          let shield_duration = (attackerData.shield_duration>0)?attackerData.shield_duration*60:settings.attack_shield
          let shield_out = Time(attackerData.shield_at).add(shield_duration,'minute')

          let last_activity_diff = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(attackerData.last_activity,'minute')
          let is_online = (last_activity_diff<settings.attack_online)

          if (attackerData.shield_at && shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second') > 0) {
            shield = shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second')
          }
          attackStatus.push({
            id: attacker.id,
            shield: shield,
            is_online: is_online,
            under_attack: attackerData.under_attack == 'yes'
          })
        }
      }
    }else {
      let attackMessages = await Database.raw("select * from messages where user_id = " + user.id + " and `type` in ('attack','revenge') order by created_at desc")
      attackMessages = attackMessages[0]

      for (const attack of attackMessages) {
        let attacker = await Database.raw("select users.*, levels.* from users left join levels on (levels.id=level_id) where users.id = " + attack.sender_id)
        attacker = attacker[0]

        if(attacker[0]){
          attacker = attacker[0]
          let message = JSON.parse(attack.message)

          let shield = 0
          let shield_duration = (attacker.shield_duration>0)?attacker.shield_duration*60:settings.attack_shield
          let shield_out = Time(attacker.shield_at).add(shield_duration,'minute')

          let last_activity_diff = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(attacker.last_activity,'minute')
          let is_online = (last_activity_diff<settings.attack_online)

          if (attacker.shield_at && shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second') > 0) {
            shield = shield_out.diff(Moment.now('YYYY-M-D HH:mm:ss'), 'second')
          }

          let theAntique = []
          if(!isNaN(parseInt(message.antique,10))){
            let tmpAntique = await Database.raw("select * from antiques where id = " + message.antique)
            tmpAntique = tmpAntique[0][0]
            theAntique.push(tmpAntique)
          }

          let theLost = (attack.session==null || attack.session=='');
          let attackRevenge = (attack.type == 'revenge')?'انتقام از':'حمله به'
          attackStatus.push({
            id: attacker.id,
            shield: shield,
            is_online: is_online,
            under_attack: attacker.under_attack == 'yes'
          })
          attackResult.push({
            id: attack.id,
            time: Time(Time().format('YYYY-M-D HH:mm:ss')).diff(attack.created_at, 'seconds'),
            sticker: attack.sticker_id,
            shield: shield,
            is_online: is_online,
            under_attack: attacker.under_attack == 'yes',
            image: attacker.avatar,
            name: attacker.nickname,
            level: attacker.name,
            cup: attacker.courage_stat,
            win: message.win,
            blue: message.blue,
            yellow: message.yellow,
            elixir: message.elixir,
            antique: theAntique,//message.antique,
            message: 'کاوشگر ' + attacker.nickname + (theLost?' در '+attackRevenge+' شما شکست خورده است.':' در '+attackRevenge+' شما پیروز شده است.'),
            lost : theLost,
            is_revenge: (attack.type == 'revenge')
          })
        }
      }
    }

    let last_notifications = [-1]
    let viewed_notifications = ''

    let userNotifications = await Database.raw("select * from user_notification where user_id = " + user.id)
    userNotifications = userNotifications[0]
    for(let i = 0;i < userNotifications.length;i++) {
      last_notifications.push(userNotifications[i].notification_id)
    }

    let userDateNotifications = await Database.raw("select * from notifications where status = 'active' and last_show_date >= '" + Moment.now('YYYY-M-D HH:mm:ss') + "' ")
    userDateNotifications = userDateNotifications[0]
    let secretaryNotifications = []
    for(let i = 0;i < userDateNotifications.length;i++){
      viewed_notifications += ((viewed_notifications == '')?'':' , ') + "(" + user.id + ", " + userDateNotifications[i].id + ")"

      userDateNotifications[i].last_show_date = Moment.m2s(Time(userDateNotifications[i].last_show_date).format('YYYY-M-D HH:mm:ss'))
      userDateNotifications[i].time = -1 * Time(userDateNotifications[i].created_at).diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')
      if(userDateNotifications[i].is_secretary=='yes'){
        secretaryNotifications.push(userDateNotifications[i])
      }
    }

    let userOnceNotifications = await Database.raw("select * from notifications where last_show_date is null and not id in (" + last_notifications.join(',') + ")")
    userOnceNotifications = userOnceNotifications[0]
    for(let i = 0;i < userOnceNotifications.length;i++){
      viewed_notifications.push({
        user_id: user.id,
        notification_id :userOnceNotifications[i].id
      })
      userOnceNotifications[i].time = -1 * Time(userOnceNotifications[i].created_at).diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')
      if(userOnceNotifications[i].is_secretary=='yes'){
        secretaryNotifications.push(userOnceNotifications[i])
      }
    }


    let systemMessages = await Database.raw("select * from messages where `type` = 'system' and status = 'unread' order by created_at desc ")
    let systemMessagesData = systemMessages[0]

    for(let i = 0;i < systemMessagesData.length;i++){
      userOnceNotifications.push({
        title: 'پیام سیستمی',
        text: systemMessagesData[i].message,
        time: -1 * Time(systemMessagesData[i].created_at).diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')
      })
    }

    await Database.raw("update messages set status='read' where user_id = " + user.id + " and status= 'unread'")

    if(viewed_notifications!='') {
      await Database.raw("insert into user_notification (user_id, notification_id) values " + viewed_notifications)
    }

    userNotifications = {
      once_notification: userOnceNotifications,
      date_notification: userDateNotifications
    }

    let recall = await  Database.raw("select * from recalls where status = 'active' and ((started_at <= '" + Time().format('YYYY-M-D') + "' and expired_at > '" + Time().format('YYYY-M-D') + "') or (started_at > '" + Time().format('YYYY-M-D') + "')) limit 1")
    recall = recall[0]

    let recallsData = null

    if(recall.length>0){
      recall = recall[0]
      recall.game = (recall.game == 'back' ? 1 : 0)
      recall.time = recall.started_at > Time().format('YYYY-M-D') ? Time(recall.started_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') : Time(recall.expired_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
      recallsData = recall/*{
        type: recall.started_at > Time().format('YYYY-M-D') ? 2 : 1,
        land: recall.game == 'back' ? 1 : 0,
        time: recall.started_at > Time().format('YYYY-M-D') ? Time(recall.started_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') : Time(recall.expired_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
      }*/
    }

    return [{
      status: 1,
      messages: [],
      data: {
        attack: attackResult,
        attack_status: attackStatus,
        notifications: userNotifications,
        recall: recallsData
      }
    }]
  }

  // نمایش اطلاعات ارسال کننده پیام : منظور شخصی است که حمله کرده و پیام از طریق او ایجاد شده
  static async user (params, user) {
    const rules = {
      id: 'required|integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let message = await Message.query().where('id', params.id).where('id', '').where('user_id', user.id).where('type', 'attack').first()
    if (!message) {
      return [{
        status: 0,
        message: Messages.parse(['TargetNotFound']),
        data: {}
      }]
    }

    const settings = await Setting.get()

    let target = await User.queyr().where('id', message.sender_id).with('property').with('antique').with('antique.antique').with('level').first()

    let targetData = target.toJSON()

    let antiques = []
    targetData.antiques.forEach(ant => {
      antiques.push({
        name: ant.antique.name,
        description: ant.antique.description,
        image: ant.antique.image,
        value: ant.score_first
      })
    })

    let data = {
      id: targetData.id,
      nickname: targetData.nickname,
      avatar: targetData.avatar,
      cup: targetData.courage_stat,
      level: targetData.level.name,
      traps: targetData.property.path_traps_count,
      antiques: antiques
    }

    // Energy Yellow
    data['yellow'] = _.min([
      _.round((1 / settings.loot_ye) * targetData.property.ye),
      targetData.property.ye >= settings.loot_ye_max ? settings.loot_ye_max : targetData.property.ye
    ])

    // Energy Blue
    data['blue'] = _.min([
      _.round((1 / settings.loot_be) * targetData.property.be),
      targetData.property.be >= settings.loot_be_max ? settings.loot_be_max : targetData.property.be
    ])

    // Elixir
    data['elixir'] = _.min([
      _.round((1 / settings.loot_elixir) * targetData.property.elixir_1),
      targetData.property.elixir_1 >= settings.loot_elixir_max ? settings.loot_elixir_max : targetData.property.elixir_1
    ])

    return [{
      status: 1,
      messages: [],
      data: data
    }]
  }
}

module.exports = MessageController
