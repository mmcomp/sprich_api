'use strict'

const Necklace = use('App/Models/Necklace')
const Verify = use('App/Models/Verify')
const Product = use('App/Models/Product')
const Label = use('App/Models/Label')
const Bank = use('App/Models/Bank')
const Setting = use('App/Models/Setting')
const Recall = use('App/Models/Recall')
const Antique = use('App/Models/Antique')
const Notification = use('App/Models/Notification')
const UserNotification = use('App/Models/UserNotification')
const UserRecall = use('App/Models/UserRecall')
const Avatar = use('App/Models/Avatar')
const UserAvatar = use('App/Models/UserAvatar')
const Database = use('Database')

const Validations = use('App/Libs/Validations')
const Messages = use('App/Libs/Messages/Messages')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

const _ = require('lodash')

class UserController {
  // دریافت اطلاعات اولیه و کلی کاربر
  // api که در اولین صفحه کلبه فراخوانی می شود
  static async get (params, user) {
    await user.loadMany(['property', 'level', 'fuge', 'fuge.fuge', 'puzzles', 'notifications', 'antiques'])
    let userData = user.toJSON()

    user.elixir_stat = userData.elixir_shop + userData.elixir_exchange + userData.elixir_shield + userData.property.elixir_3
    let anti, antiques_stat = 0
    for(let i = 0;i < userData.antiques.length;i++){
      anti = await Antique.query().where('id', userData.antiques[i].antique_id).first()
      anti = anti.toJSON()
      antiques_stat += anti.score_first
    }
    user.antiques_stat = antiques_stat
    await user.save()

    let viewed_notifications = []
    let last_notifications = [-1]
    let settings = await Setting.get()

    for(let i = 0;i < userData.notifications.length;i++){
      last_notifications.push(userData.notifications[i].notification_id)
    }

    let nowDate = new Date()
    nowDate = nowDate.getFullYear()+'-'+(nowDate.getMonth()+1)+'-'+nowDate.getDate()+' 00:00:00'
    let userDateNotifications = await Notification.query().where('last_show_date','>=',nowDate)
    let secretaryNotifications = []
    for(let i = 0;i < userDateNotifications.length;i++){
      viewed_notifications.push({
        user_id: user.id,
        notification_id :userDateNotifications[i].id
      })
      userDateNotifications[i].last_show_date = Moment.m2s(Time(userDateNotifications[i].last_show_date).format('YYYY-M-D HH:mm:ss'))
      userDateNotifications[i].title = userDateNotifications[i].title.replace(/#nickname#/gi, user.nickname)
      userDateNotifications[i].text = userDateNotifications[i].text.replace(/#nickname#/gi, user.nickname)
      if(userDateNotifications[i].is_secretary=='yes'){
        secretaryNotifications.push(userDateNotifications[i])
      }
    }

    let userOnceNotifications = await Notification.query().where('last_show_date',null).whereNotIn('id',last_notifications)
    for(let i = 0;i < userOnceNotifications.length;i++){
      viewed_notifications.push({
        user_id: user.id,
        notification_id :userOnceNotifications[i].id
      })
      userOnceNotifications[i].title = userOnceNotifications[i].title.replace(/#nickname#/gi, user.nickname)
      userOnceNotifications[i].text = userOnceNotifications[i].text.replace(/#nickname#/gi, user.nickname)
      if(userOnceNotifications[i].is_secretary=='yes'){
        secretaryNotifications.push(userOnceNotifications[i])
      }
    }

    // let userNotification = await UserNotification.createMany(viewed_notifications)


    let userNotifications = {
      once_notification: userOnceNotifications,
      date_notification: userDateNotifications
    }

    let PuzzlesList = []
    _.each(userData.puzzles, (puzzle) => {
      PuzzlesList.push(puzzle.number)
    })
    let shield_duration = (userData.shield_duration>0)?userData.shield_duration*60:settings.attack_shield

    let now_time = Moment.now('YYYY-M-D HH:mm:ss')
    now_time = new Time(now_time)
    let shield_end = now_time.clone().subtract(shield_duration,'minute')
    let shield_end_str = shield_end.format('YYYY-MM-DD HH:mm:ss')
    let shield_time = new Time(userData.shield_at)
    let shield_time_str = shield_time.format('YYYY-MM-DD HH:mm:ss')
    let shield_until = shield_time.add(shield_duration,'minute')
    let shield_until_str = shield_until.format('YYYY-MM-DD HH:mm:ss')
    let shield_data = {}

    if(shield_end_str<=shield_time_str){
      let shield_dif = shield_until.diff(now_time,'second')
      shield_data = {
        shield_start: shield_time_str,
        shield_until: shield_until_str,
        shield_remain: (shield_dif?shield_dif:0)
      }
    }

    let data = {
      attack_cost: settings.attack_ye,
      coin: userData.coin,
      courage: userData.courage_stat,
      yellow: userData.property.ye,
      blue: userData.property.be,
      avatar: userData.avatar,
      elixir: [userData.property.elixir_1, userData.property.elixir_2, userData.property.elixir_3],
      notifications: userNotifications,//userData.unread_notifications,
      secretary: secretaryNotifications,
      revenges: userData.unread_messages,
      puzzles: PuzzlesList,
      // Recall
      recall: null/*{
        type: 0,
        land: 0,
        time: 0
      }*/,
      // Necklace
      necklace: {
        name: '',
        health: 0,
        left: 0
      },
      // Level
      level: {
        name: userData.level.name,
        next: userData.level.score_max + 1,
        id: userData.level.id,
        score_min: userData.level.score_min,
        score_max: userData.level.score_max,
        score: userData.score,
        message: userData.level.levelup_message
      },
      // Fuge
      fuge: {
        statuse: 0,
        type: 1,
        amount: 0,
        capacity: 0,
        ready: 0
      },
      // Shield
      shield : shield_data,
      //Version
      last_critical_version: settings.last_critical_version,
      last_version: settings.last_version
    }

    // Check Recall
    let recall = await Recall.query().where(function () {
      this.where('status', 'active').where('started_at', '<=', Time().format('YYYY-M-D')).where('expired_at', '>', Time().format('YYYY-M-D'))
    }).orWhere(function () {
      this.where('status', 'active').where('started_at', '>', Time().format('YYYY-M-D'))
    }).first()

    let user_recall_fase = 'after_start'
    if(recall>Time().format('YYYY-M-D')){
      user_recall_fase = 'before_start'
    }

    if (recall) {
      let user_recalls = await UserRecall.query().where('user_id',user.id).where('recall_id',recall.id).where('fase',user_recall_fase)
      if(user_recalls.length>0){
        data.recall = null
      }else{
        let user_recall = new UserRecall()
        user_recall.fase = user_recall_fase
  
        user_recall.user_id = user.id
        user_recall.recall_id = recall.id
        await user_recall.save()
  
        recall.game = (recall == 'back' ? 1 : 0)
        recall.time = recall.started_at > Time().format('YYYY-M-D') ? Time(recall.started_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') : Time(recall.expired_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
        data.recall = recall/*{
          type: recall.started_at > Time().format('YYYY-M-D') ? 2 : 1,
          land: recall.game == 'back' ? 1 : 0,
          time: recall.started_at > Time().format('YYYY-M-D') ? Time(recall.started_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') : Time(recall.expired_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
        }*/  
      }
    }

    if (userData.property.necklace_id) {
      const necklace = await Necklace.query().where('id', userData.property.necklace_id).first()
      if (necklace) {
        data['necklace']['name'] = necklace.name
        data['necklace']['health'] = necklace.health
        data['necklace']['left'] = necklace.left
      }
    }

    let status = {
      'empty': 0,
      'working': 1,
      'complete': 2
    }
    data['fuge']['type'] = userData.fuge.type
    data['fuge']['amount'] = userData.fuge.amount
    data['fuge']['capacity'] = userData.fuge.fuge.capacity

    // Fuge
    let readyAtTime = 0
    if (userData.fuge.status === 'working') {
      readyAtTime = Time(userData.fuge.ready_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')

      if (readyAtTime <= 0) {
        userData.fuge.status = 'complete'
        readyAtTime = 0
        delete userData.fuge['fuge']
        await user.fuge().update(userData.fuge)
      }
    }

    data['fuge']['status'] = status[userData.fuge.status]
    data['fuge']['ready'] = Math.abs(readyAtTime)

    return [{
      status: 1,
      messages: [],
      data: data
    }]
  }

  // اطلاعات کاربر برای صفحه پروفایل و ویرایش اطلاعات کاربر
  static async profile (params, user) {
    const labels = await Label.all()
    let mainUser = user
    await user.loadMany(['transactions', 'bank', 'property', 'traps'])
    user = user.toJSON()
    let settings = await Setting.get()

    let myAvatars = await UserAvatar.query().where('users_id', user.id)

    let avatar_ids = [-1]
    for(let i = 0;i < myAvatars.length;i++){
      avatar_ids.push(myAvatars[i].avatar_id)
    }

    let all_avatars = await Avatar.query().where('is_enabled', 1).whereNotIn('id', avatar_ids)
    for(let i = 0;i < all_avatars.length;i++){
      delete all_avatars[i]['id']
      delete all_avatars[i]['name']
      delete all_avatars[i]['description']
      delete all_avatars[i]['is_enabled']
      delete all_avatars[i]['created_at']
      delete all_avatars[i]['updated_at']
    }

    let my_avatars = await Avatar.query().whereIn('id', avatar_ids)
    for(let i = 0;i < my_avatars.length;i++){
      delete my_avatars[i]['id']
      delete my_avatars[i]['name']
      delete my_avatars[i]['description']
      delete my_avatars[i]['is_enabled']
      delete my_avatars[i]['created_at']
      delete my_avatars[i]['updated_at']
    }

    function imageByRate(rank, sticker_rate) {
      var sticker_rate = (typeof sticker_rate!='undefined')?sticker_rate:5
      let image_id = 0
      rank = rank/sticker_rate
      if(rank > 1 && rank <= 3) {
          image_id = 1
      }else if(rank > 3 && rank <= 6) {
          image_id = 2
      }else if(rank > 6 && rank <= 10) {
          image_id = 3
      }else if(rank > 10 && rank <= 15) {
          image_id = 4
      }else if(rank > 15) {
          image_id = 5
      }
      return image_id
    }

    let courage_image = 0

    let tmp_cor = await Database.raw('select count(`cs`) cc from (select count(*) `cs` from `users` where `courage_stat` > ? group by `courage_stat` order by `courage_stat` desc) as tmp_table ', [user.courage_stat])
    tmp_cor = tmp_cor[0][0].cc
    // console.log('Tmp Cor', tmp_cor)
    courage_image = imageByRate(tmp_cor, settings.sticker_rate)
    // let tmp_label = await Label.query().where('min', '>=', user.courage_stat).where('max', '<=', user.courage_stat).where('type', 'courage').first()
    // if(tmp_label) {
    //   courage_image = tmp_label.id
    // }

    let elixir_image = 0

    let tmp_elx = await Database.raw('select count(`cs`) cc from (select count(*) `cs` from `users` where `elixir_stat` > ? group by `elixir_stat` order by `elixir_stat` desc) as tmp_table ', [user.elixir_stat])
    tmp_elx = tmp_elx[0][0].cc
    // console.log('Tmp Elx', tmp_elx)
    elixir_image = imageByRate(tmp_elx, settings.sticker_rate)
    // tmp_label = await Label.query().where('min', '>=', user.elixir_stat).where('max', '<=', user.elixir_stat).where('type', 'elixir').first()
    // if(tmp_label) {
    //   elixir_image = tmp_label.id
    // }

    let antiques_image = 0

    let tmp_ant = await Database.raw('select count(`cs`) cc from (select count(*) `cs` from `users` where `antiques_stat` > ? group by `antiques_stat` order by `antiques_stat` desc) as tmp_table ', [user.antiques_stat])
    tmp_ant = tmp_ant[0][0].cc
    // console.log('Tmp Elx', tmp_ant)
    antiques_image = imageByRate(tmp_ant, settings.sticker_rate)
    // tmp_label = await Label.query().where('min', '>=', user.elixir_stat).where('max', '<=', user.elixir_stat).where('type', 'antique').first()
    // if(tmp_label) {
    //   antiques_image = tmp_label.id
    // }

    let userInfo = {
      nickname: user.nickname,
      score: user.score,
      courage_stat: {
        value : user.courage_stat,
        image : courage_image
      },
      elixir_stat : {
        value : user.elixir_stat,
        image : elixir_image
      },
      antiques_stat : {
        value : user.antiques_stat,
        image : antiques_image
      },
      mobile: user.mobile,
      avatar: user.avatar,
      avatars: all_avatars,
      my_avatars: my_avatars,
      province: user.province_id,
      address: user.address,
      postal_code: user.postal_code,
      bank_name: user.bank.name,
      bank_number: user.bank.number,
      bank_sheba: user.bank.sheba,
      level: user.level_id,
      property: {
        success_attack: user.property.success_attack,
        success_minesweeper: user.property.success_minesweeper,
        success_smasher: user.property.success_smasher,
        lose_attack: user.property.lose_attack,
        lose_minesweeper: user.property.lose_minesweeper,
        lose_smasher: user.property.lose_smasher,
        defense_total: user.property.rade_total,
        defense_succeed: user.property.rade_succeed
      },
      traps: user.traps.length
    }

    let productsForSale = []
    /*
    const products = await Product.query().where('type', 'avatar').where('status', 'active').fetch()

    _.each(products.toJSON(), (product) => {
      let bought = false

      _.each(user.transactions, trans => {
        if (trans.type_id == product.id) {
          bought = true
        }
      })
      productsForSale.push({
        id: product.type_additional,
        price: product.coin,
        bought: bought
      })
    })
    */
    // userInfo['avatars'] = productsForSale
    let rank

    for (let lbl of labels.toJSON()) {
      switch (lbl.type) {
        case 'courage':
          if ((lbl.min <= user.courage_stat || lbl.min === null) && (lbl.max > user.courage_stat || lbl.max === null)) {
            rank = await mainUser.rank('courage_stat')
            userInfo['courage_lavel'] = {
              name: lbl.name,
              image: parseInt(lbl.image),
              rank: rank,
              value: user.courage_stat
            }
          }
          break

        case 'score':
          if ((lbl.min <= user.score || lbl.min === null) && (lbl.max > user.score || lbl.max === null)) {
            rank = await mainUser.rank('score')
            userInfo['score_lavel'] = {
              name: lbl.name,
              image: parseInt(lbl.image),
              rank: rank,
              value: user.score_stat
            }
          }
          break

        case 'elixir':
          if ((lbl.min <= user.elixir_stat || lbl.min === null) && (lbl.max > user.elixir_stat || lbl.max === null)) {
            rank = await mainUser.rank('elixir_stat')
            userInfo['elixir_lavel'] = {
              name: lbl.name,
              image: parseInt(lbl.image),
              rank: rank,
              value: user.elixir_stat
            }
          }
          break

        case 'antique':
          if ((lbl.min <= user.antiques_stat || lbl.min === null) && (lbl.max > user.antiques_stat || lbl.max === null)) {
            rank = await mainUser.rank('antiques_stat')
            userInfo['antique_lavel'] = {
              name: lbl.name,
              image: parseInt(lbl.image),
              rank: rank,
              value: user.antique_stat
            }
          }
          break
      }
    }

    return [{
      status: 1,
      messages: [],
      data: userInfo
    }]
  }

  // خرید آواتار در صفحه پروفایل
  static async profileBuyAvatar (params, user) {
    const rules = {
      id: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    const product = await Product.query().where('type', 'avatar').where('status', 'active').where('type_additional', params.id).first()
    if (!product) {
      return [{
        status: 0,
        messages: Messages.parse(['wrongInput']),
        data: {}
      }]
    }

    let result = await user.buy('product', product)
    if (result.err) {
      return [{
        status: 0,
        messages: result.messages,
        data: {}
      }]
    }

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  // تغییر آواتار در صفحه پروفایل
  static async profilePublicSet (params, user) {
    const rules = {
      nickname: 'min:2,max:15',
      avatar: 'integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    if (params.avatar && user.avatar != params.avatar) {
      const product = await Product.query().where('type', 'avatar').where('status', 'active').where('type_additional', params.avatar).first()
      if (product) {
        let checkBuy = user.alreadyBuy('product', product)
        if (!checkBuy) {
          return [{
            status: 0,
            messages: Messages.parse(['needPurchasedAvatar'])
          }]
        }
      }
      user.avatar = params.avatar
    }

    if (params.nickname) {
      user.nickname = params.nickname
    }

    await user.save()
    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  // تغییر اطلاعات در صفحه پروفایل و ایجاد کد تایید برای ثبت اطلاعات
  static async profileSet (params, user) {
    const rules = {
      province: 'integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let data = {
      address: _.get(params, 'address'),
      postal_code: _.get(params, 'postal_code'),
      bank_sheba: _.get(params, 'bank_sheba'),
      bank_name: _.get(params, 'bank_name'),
      bank_number: _.get(params, 'bank_number'),
      province: _.get(params, 'province')
    }

    await Verify.query().where('mobile', user.mobile).delete()

    let verifyStatus = await Verify.send('profile', user.mobile, data)
    if (verifyStatus.err) {
      return [{
        status: 0,
        messages: Messages.parse(verifyStatus.messages),
        data: {}
      }]
    }

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  // بررسی تایید پروفایل و ذخیره تغییرات 
  static async profileVerify (params, user) {
    const rules = {
      code: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let verifyStatus = await Verify.check(user.mobile, params.code)
    if (verifyStatus.err) {
      return [{
        status: 0,
        messages: Messages.parse(verifyStatus.messages),
        data: {}
      }]
    }

    let content = JSON.parse(verifyStatus.verify.content)
    let userBank = await user.bank().fetch()

    if (!userBank) {
      userBank = new Bank()
      userBank.user_id = user.id
    }

    if (_.get(content, 'address') && _.get(content, 'address') != user.address) {
      user.address = _.get(content, 'address')
    }
    if (_.get(content, 'postal_code') && _.get(content, 'postal_code') != user.postal_code) {
      user.postal_code = _.get(content, 'postal_code')
    }
    if (_.get(content, 'province') && _.get(content, 'province') != user.province_id) {
      user.province_id = _.get(content, 'province')
    }
    await user.save()

    if (_.get(content, 'bank_name') && _.get(content, 'bank_name') != userBank.name) {
      userBank.name = _.get(content, 'bank_name')
    }
    if (_.get(content, 'bank_number') && _.get(content, 'bank_number') != userBank.number) {
      userBank.number = _.get(content, 'bank_number')
    }
    if (_.get(content, 'bank_sheba') && _.get(content, 'bank_sheba') != userBank.sheba) {
      userBank.sheba = _.get(content, 'bank_sheba')
    }
    await userBank.save()

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  //ذخیره تغییرات پروفایل بدون اس ام اس
  static async profileNoVerify (params, user) {
    const rules = {
      province: 'integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let content = {
      address: _.get(params, 'address'),
      postal_code: _.get(params, 'postal_code'),
      bank_sheba: _.get(params, 'bank_sheba'),
      bank_name: _.get(params, 'bank_name'),
      bank_number: _.get(params, 'bank_number'),
      province: _.get(params, 'province'),
      nickname: _.get(params, 'nickname')
    }

    let userBank = await user.bank().fetch()

    if (!userBank) {
      userBank = new Bank()
      userBank.user_id = user.id
    }

    if (_.get(content, 'address') && _.get(content, 'address') != user.address) {
      user.address = _.get(content, 'address')
    }
    if (_.get(content, 'postal_code') && _.get(content, 'postal_code') != user.postal_code) {
      user.postal_code = _.get(content, 'postal_code')
    }
    if (_.get(content, 'province') && _.get(content, 'province') != user.province_id) {
      user.province_id = _.get(content, 'province')
    }    
    if (_.get(content, 'nickname') && _.get(content, 'nickname') != user.nickname) {
      user.nickname = _.get(content, 'nickname')
    }
    await user.save()

    if (_.get(content, 'bank_name') && _.get(content, 'bank_name') != userBank.name) {
      userBank.name = _.get(content, 'bank_name')
    }
    if (_.get(content, 'bank_number') && _.get(content, 'bank_number') != userBank.number) {
      userBank.number = _.get(content, 'bank_number')
    }
    if (_.get(content, 'bank_sheba') && _.get(content, 'bank_sheba') != userBank.sheba) {
      userBank.sheba = _.get(content, 'bank_sheba')
    }
    await userBank.save()

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  // دریافت لیست تکه های پازل کاربر
  static async puzzle (params, user) {
    let puzzles = await user.puzzles().fetch()
    puzzles = puzzles.toJSON()

    const setting = await Setting.get()
    if (setting['puzzle_parts'] === puzzles.length) {
      return [{
        status: 0,
        messages: [],
        data: {}
      }]
    }

    let puzzleAvalible = _.range(setting['puzzle_parts'])
    _.each(puzzles, (pzl) => {
      _.remove(puzzleAvalible, (n) => {
        return n === pzl.number
      })
    })

    let randomPuzzle = _.sample(puzzleAvalible)
    await user.puzzles().create({
      number: randomPuzzle
    })

    return [{
      status: 1,
      messages: [],
      data: {
        puzzle: randomPuzzle
      }
    }]
  }

  static async buyAvatar (params, user) {
    const rules = {
      avatar: 'integer'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let theAvatar = await Avatar.query().where('id', params.avatar).first()
    if(!theAvatar){
      return [{
        status: 0,
        messages: Messages.parse(['wrongInput']),
        data: {}
      }]
    }

    let is_mine = false
    let myAvatar = await UserAvatar.query().where('users_id', user.id).where('avatar_id', theAvatar.id).first()

    if(myAvatar){
      user.avatar = theAvatar.code
      await user.save()
      return [{
        status: 1,
        messages: [
          {
            "code": "AvatarIsMine",
            "message": "قبلا این آواتار خریداری شده است"
          }
        ],
        data: {}
      }]
    }

    if(user.coin < theAvatar.coin_cost){
      return [{
        status: 0,
        messages: [
          {
            "code": "ShortOnCoin",
            "message": "سکه کافی برای خرید این آواتار را ندارید"
          }
        ],
        data: {}
      }]
    }

    user.coin -= theAvatar.coin_cost
    user.avatar = theAvatar.code
    await user.save()

    let userAvatar = new UserAvatar()
    userAvatar.users_id  = user.id
    userAvatar.avatar_id = theAvatar.id
    await userAvatar.save()

    return [{
      status: 1,
      messages: [],
      data: {
      }
    }]
  }

  static async avatarList (params, user) {
    let myAvatars = await UserAvatar.query().where('users_id', user.id)
    let avatar_ids = []
    for(let i = 0;i < myAvatars.length;i++){
      avatar_ids.push(myAvatars[i].avatar_id)
    }

    let avatars = await Avatar.query().where('is_enabled', 1).whereNotIn('id', avatar_ids)
    let my_avatars = await Avatar.query().whereIn('id', avatar_ids)

    return [{
      status: 1,
      messages: [],
      data: {
        avatars: avatars,
        my_avatars: my_avatars
      }
    }]
  }

  static async flushBlueGift (params, user) {
    let settings = await Setting.get()
    await user.loadMany(['property'])
    let userData = user.toJSON()

    if(user.blue_lost == settings.blue_lost_max) {
      user.blue_lost = 0
      user.blue_reward += settings.blue_lost_max
      await user.save()

      await user.property().update({
        be: userData.property.be + settings.blue_lost_max
      })
      return [{
        status: 1,
        messages: [],
        data: {
          reward: settings.blue_lost_max
        }
      }]
    }
    return [{
      status: 0,
      messages: [{
        code: "NotReadyGift",
        message: "هنوز انرژی آبی به حد کافی دپو نشده است"
      }],
      data: {
      }
    }]
  }

  static async flushYellowGift (params, user) {
    let settings = await Setting.get()
    await user.loadMany(['property'])
    let userData = user.toJSON()

    if(user.yellow_lost == settings.yellow_lost_max) {
      user.yellow_lost = 0
      await user.save()

      await user.property().update({
        ye: userData.property.ye + settings.yellow_lost_max
      })
      return [{
        status: 1,
        messages: [],
        data: {
          reward: settings.yellow_lost_max
        }
      }]
    }
    return [{
      status: 0,
      messages: [{
        code: "NotReadyGift",
        message: "هنوز انرژی زرد به حد کافی دپو نشده است"
      }],
      data: {
      }
    }]
  }

  static async loseGift (params, user) {
    let settings = await Setting.get()
    return [{
      status: 1,
      messages: [],
      data: {
        blue_lost: user.blue_lost,
        blue_lost_max: settings.blue_lost_max,
        yellow_lost: user.yellow_lost,
        yellow_lost_max: settings.yellow_lost_max
      }
    }]
  }

  static async coin (params, user) {
    return [{
      status: 1,
      messages: [],
      data: {
        user_coin: user.coin
      }
    }]
  }
}

module.exports = UserController
