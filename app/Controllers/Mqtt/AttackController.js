'use strict'

const User = use('App/Models/User')
const Level = use('App/Models/Level')
const Message = use('App/Models/Message')
const Setting = use('App/Models/Setting')
const GameSession = use('App/Models/GameSession')
const UserAntique = use('App/Models/UserAntique')
const Log = use('App/Models/Log')
const Trap = use('App/Models/Trap')

const Redis = use('Redis')
const Randomatic = require('randomatic')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()
const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const _ = require('lodash')
const Env = use('Env')
const hasha = require('hasha')
const md5 = require('md5');

class AttackController {
  // یافتن حریف برای حمله
  static async find (params, user) {
    let lastTarget = (params && params.id)?params.id:-1

    await user.loadMany(['property', 'level'])
    let userData = user.toJSON()
    let settings = await Setting.get()

    if ((_.has(params, 'change') && params.change===true && userData.property.ye < settings.attack_change_ye) ||
      ((!_.has(params, 'change') || (_.has(params, 'change') && params.change===false)) && userData.property.ye < settings.attack_ye)) {
      return [{
        status: 0,
        messages: Messages.parse(['yeNotEnough']),
        data: {
          attack_cost: settings.attack_ye,
          change_cost: settings.attack_change_ye
        }
      }]
    }

    let shield_duration = /*(userData.shield_duration>0)?userData.shield_duration*60:*/settings.attack_shield
    let shield_end = Moment.now('YYYY-M-D HH:mm:ss')
    let new_sh = new Time(shield_end)
    let nn = new_sh.subtract(shield_duration,'minute')
    shield_end = nn.format('YYYY-MM-DD HH:mm:ss')
    let last_activity_limit = Time(Moment.now('YYYY-M-D HH:mm:ss')).subtract(settings.attack_online,'minute')

    
    let targets = await User.query().whereNot('id', user.id).whereNot('id', lastTarget)
      .where(function () {
        this.whereBetween('courage_stat', [userData.courage_stat - 30, userData.courage_stat + 30])
        .orWhereBetween('courage_stat', [userData.courage_stat - 70, userData.courage_stat + 70])
        .orWhereBetween('courage_stat', [userData.courage_stat - 100, userData.courage_stat + 100])
        .orWhereBetween('courage_stat', [userData.courage_stat - 100000, userData.courage_stat + 100000])
      })
      .where('last_activity', '<', last_activity_limit.format('YYYY-MM-DD HH:mm:ss'))
      .where(function () {
        this.where('shield_at', '<', shield_end)
        .orWhereNull('shield_at')
      }).where('under_attack', 'no')
      .orderByRaw('RAND()').with('property').with('level').with('antiques').with('antiques.antique')//.first()
    
    // console.log('shield end')
    // console.log(shield_end)
    // console.log('All possible Targets :')
    // console.log(targets)
    
    // let targets = await User.query().where('id',54).with('property').with('level').with('antiques').with('antiques.antique')

    // console.log(targets)
    if (!targets) {
      return [{
        status: 0,
        messages: Messages.parse(['TargetNotFound']),
        data: {
          attack_cost: settings.attack_ye,
          change_cost: settings.attack_change_ye
        }
      }]
    }

    let targetTmp,targetsJson = targets
    for(let i = 0;i < targetsJson.length;i++){      
      if((targetsJson[i].shield_duration>0 && Time(targetsJson[i].shield_at).add(targetsJson[i].shield_duration,'hour').diff(Moment.now('YYYY-M-D HH:mm:ss'),'second')<0) || (targetsJson[i].shield_duration==0)){
        targetTmp = targetsJson[i]
        break
      }
    }

    if(!targetTmp){
      return [{
        status: 0,
        messages: Messages.parse(['TargetNotFound']),
        data: {
          attack_cost: settings.attack_ye,
          change_cost: settings.attack_change_ye
        }
      }]
    }

    let target = await User.query().where('id',targetTmp.id).with('property').with('level').with('antiques').with('antiques.antique').with('traps.trap').first()

    // console.log(target)
    if (!target) {
      return [{
        status: 0,
        messages: Messages.parse(['TargetNotFound']),
        data: {
          attack_cost: settings.attack_ye,
          change_cost: settings.attack_change_ye
        }
      }]
    }

    let currentUserYellow = userData.property.ye
    
    const log = new Log()
    log.type = 'attack_find'
    log.type_id = target.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })

    if (_.has(params, 'change') && params.change===true) {
      currentUserYellow -= settings.attack_change_ye
      await user.property().update({
        ye: userData.property.ye - settings.attack_change_ye
      })
    } else {
      currentUserYellow -= settings.attack_ye
      await user.property().update({
        ye: userData.property.ye - settings.attack_ye
      })
    }

    log.after_state = JSON.stringify({
      ye: currentUserYellow,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })
    await log.save()

    let targetData = target.toJSON()

    let trapLevel = 0, trapId, trap;
    let trapPath = JSON.parse(targetData.property.path)

    for(let i in trapPath){
      trapId = trapPath[i].id
      trap = await Trap.query().where('id', trapId).first()
      if(trap) {
        trapLevel += (trap.hardness + 1)
      }
    }

    let antiques = []
    targetData.antiques.forEach(ant => {
      antiques.push({
        name: ant.antique.name,
        description: ant.antique.description,
        image: ant.antique.image,
        value: ant.antique.score_first
      })
    })

    let data = {
      id: targetData.id,
      nickname: targetData.nickname,
      avatar: targetData.avatar,
      cup: targetData.courage_stat,
      level: targetData.level.name,
      traps: trapPath.length,//targetData.property.path_traps_count,
      trap_level: trapLevel,
      antiques: antiques,
      attack_cost: settings.attack_ye,
      change_cost: settings.attack_change_ye,
      attack_redo_coin: settings.attack_redo_coin,
      my_yellow: currentUserYellow
    }

    // Energy Yellow
    data['yellow'] = _.min([
      _.round((settings.loot_ye/100) * targetData.property.ye),
      targetData.property.ye >= settings.loot_ye_max ? settings.loot_ye_max : targetData.property.ye
    ])

    // Energy Blue
    data['blue'] = _.min([
      _.round((settings.loot_be/100) * targetData.property.be),
      targetData.property.be >= settings.loot_be_max ? settings.loot_be_max : targetData.property.be
    ])

    // Elixir
    data['elixir'] = _.min([
      _.round((settings.loot_elixir/100) * targetData.property.elixir_1),
      targetData.property.elixir_1 >= settings.loot_elixir_max ? settings.loot_elixir_max : targetData.property.elixir_1
    ])

    return [{
      status: 1,
      messages: [],
      data: data
    }]
  }

  // حمله به حریف یافت شده
  static async attack (params, user) {
    await user.loadMany(['property'])
    let userData = user.toJSON()
    let settings = await Setting.get()

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
    const theTarget = await User.query().where('id', params.id)
    let theTargetData = theTarget
    let shield_duration = /*(theTargetData.shield_duration>0)?theTargetData.shield_duration*60:*/settings.attack_shield
    let shield_end = Moment.now('YYYY-M-D HH:mm:ss')
    let new_sh = new Time(shield_end)
    let nn = new_sh.subtract(shield_duration,'minute')
    shield_end = nn.format('YYYY-MM-DD HH:mm:ss')
    let last_activity_limit = Time(Moment.now('YYYY-M-D HH:mm:ss')).subtract(settings.attack_online,'minute')
    
    const target = await User.query().where('id', params.id)
    .where(function () {
      this.whereBetween('courage_stat', [userData.courage_stat - 10, userData.courage_stat + 10])
      .orWhereBetween('courage_stat', [userData.courage_stat - 20, userData.courage_stat + 20])
      .orWhereBetween('courage_stat', [userData.courage_stat - 30, userData.courage_stat + 30])
      .orWhereBetween('courage_stat', [userData.courage_stat - 1000, userData.courage_stat + 1000])
    })//.where('last_activity', '<', last_activity_limit.format('YYYY-MM-DD HH:mm:ss'))
    .where(function () {
      this.where('shield_at', '<', shield_end)
      .orWhereNull('shield_at')
    })//.where('under_attack', 'no')
    .with('property').with('antiques').with('antiques.antique').first()

    if (!target) {
      return [{
        status: 0,
        messages: Messages.parse(['UserNotFound']),
        data: {}
      }]
    }

    if(target.last_activity>=last_activity_limit.format('YYYY-MM-DD HH:mm:ss')){
      return [{
        status: 0,
        messages: [{"code":"UserOnline","message":'کاربر مورد نظر آنلاین شد'}],
        data: {}
      }]
    }

    if(target.under_attack=='on'){
      return [{
        status: 0,
        messages: [{"code":"UserUnderAttack","message":'کاربر مورد نظر مورد حمله قرار گرفت'}],
        data: {}
      }]
    }

    target.shield_duration = 0;
    await target.save()

    if(params.reattack && params.reattack==true){
      if(user.coin<settings.attack_redo_coin){
        return [{
          status: 0,
          messages: [{"code":"CoinNotEnougth","message":'میزان سکه شما برای حمله مجدد کافی نیست'}],
          data: {}
        }]
      }
      user.coin -= settings.attack_redo_coin
      user.save()
    }

    let targetData = target.toJSON()
    let stageKey = Randomatic('Aa', 30)
    stageKey = 'attack_' + stageKey

    let session = new GameSession()
    session.user_id = user.id
    session.type = 'attack'
    session.user_defence = targetData.id
    session.depo_type = 'none'
    session.session_id = stageKey
    await session.save()

    await Redis.select(1)
    await Redis.hmset(stageKey, [
      'user',
      user.id
    ])
    await Redis.expire(stageKey, 120)

    target.under_attack = 'yes'
    await target.save()

    var ts = stageKey;//Math.round((new Date()).getTime() / 1000);
    let encryptedPath = hasha(ts + '|' + targetData.property.path + '|' + md5(ts + '|' + targetData.property.path), {
      algorithm: 'sha256'
    }).toUpperCase()

    return [{
      status: 1,
      messages: [],
      data: {
        session: stageKey,
        path: JSON.parse(targetData.property.path),
        // path: encryptedPath,
        user: {
          id: targetData.id,
          nickname: targetData.nickname,
          avatar: targetData.avatar
        }
      }
    }]
  }

  // اعلام پایان حمله توسط کلاینت و اهدای جایزه کاربر
  static async finish (params, user) {
    const rules = {
      session: 'required',
      hash: 'required'
    }

    let settings = await Setting.get()
    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    await user.loadMany(['property','level','antiques'])
    let userData = user.toJSON()

    const log = new Log()

    let gameSession = await GameSession.query().where('user_id', user.id).where('session_id', params.session).where('type', 'attack').first()
    if (!gameSession) {
      gameSession = await GameSession.query().where('user_id', user.id).where('session_id', params.session).where('type', 'revenge').first()
      if(!gameSession){
        return [{
          status: 0,
          messages: Messages.parse(['GameNotFound']),
          data: {}
        }]
      }
    }

    const userDefence = await User.query().where('id', gameSession.user_defence).with('property').first()
    let userDefenceData = userDefence.toJSON()
    let userDefenceRadeSucceed = userDefenceData.property.rade_succeed

    const winHash = hasha('win' + Env.get('ATTACK_SESSION') + params.session, {
      algorithm: 'sha256'
    })

    // const winHash = hasha('win' + Env.get('ATTACK_SESSION') + params.session + '|' + params.session + '|' + userDefenceData.property.path, {
    //   algorithm: 'sha256'
    // })

    await Redis.select(1)
    await Redis.del(gameSession.session_id)

    let award = {
      elixir: 0,
      yellow: 0,
      blue: 0,
      antique: []
    }

    if (winHash.toUpperCase() != params.hash) {
      user.game_lose++
      user.courage('sub', 1)
      await user.property().update({
        lose_attack: userData.property.lose_attack+1
      })

      await user.save()

      award['win'] = false
      award['revenge'] = gameSession.type != 'attack'

      await Message.create({
        user_id: userDefence.id,
        sender_id: user.id,
        type: gameSession.type,//'attack',
        status: 'unread',
        sticker_id: -1,
        message: JSON.stringify(award)
      })

      userDefence.unread_messages++
      userDefence.under_attack = 'no'

      await userDefence.property().update({
        rade_total: userDefenceData.property.rade_total+1
      })

      await userDefence.save()

      return [{
        status: 0,
        messages: [],
        data: {
          courage: 1,
          attack_redo_coin : settings.attack_redo_coin,
          id: userDefence.id,
          nickname: userDefence.nickname,
          avatar: userDefence.avatar
        }
      }]
    }else{
      userDefenceRadeSucceed++
    }


    log.type = 'under_attack'
    log.type_id = gameSession.id
    log.user_id = userDefenceData.id
    log.before_state = JSON.stringify({
      ye: userDefenceData.property.ye,
      be: userDefenceData.property.be,
      elixir_1: userDefenceData.property.elixir_1,
      elixir_2: userDefenceData.property.elixir_2,
      elixir_3: userDefenceData.property.elixir_3
    })

    // Energy Yellow
    award['yellow'] = _.min([
      _.round((settings.loot_ye/100) * userDefenceData.property.ye),
      userDefenceData.property.ye >= settings.loot_ye_max ? settings.loot_ye_max : userDefenceData.property.ye
    ])

    // Energy Blue
    award['blue'] = _.min([
      _.round((settings.loot_be/100) * userDefenceData.property.be),
      userDefenceData.property.be >= settings.loot_be_max ? settings.loot_be_max : userDefenceData.property.be
    ])

    // Elixir
    award['elixir'] = _.min([
      _.round((settings.loot_elixir/100) * userDefenceData.property.elixir_1),
      userDefenceData.property.elixir_1 >= settings.loot_elixir_max ? settings.loot_elixir_max : userDefenceData.property.elixir_1
    ])


    log.after_state = JSON.stringify({
      ye: userDefenceData.property.ye,
      be: userDefenceData.property.be,
      elixir_1: userDefenceData.property.elixir_1,
      elixir_2: userDefenceData.property.elixir_2,
      elixir_3: userDefenceData.property.elixir_3
    })
    await log.save()

    await userDefence.property().update({
      ye: userDefenceData.property.ye - award.yellow > 0 ? userDefenceData.property.ye - award.yellow : 0,
      be: userDefenceData.property.be - award.blue > 0 ? userDefenceData.property.be - award.blue : 0,
      elixir_1: userDefenceData.property.elixir_1 - award.elixir > 0 ? userDefenceData.property.elixir_1 - award.elixir : 0,
      rade_total: userDefenceData.property.rade_total+1,
      rade_succeed: userDefenceRadeSucceed
    })

    userDefence.under_attack = 'no'
    userDefence.shield_at = Time()/*.add(settings.attack_shield, 'minutes')*/.format('YYYY-M-D HH:mm:ss')
    userDefence.elixir_lost_attack += award.elixir
    userDefence.blue_lost_attack += award.blue

    await userDefence.save()

    user.score += settings.attack_score
    
    // Antique
    let antique
    var tmplevelJson = userData.level
    if(tmplevelJson.antique_count > userData.antiques.length) {
      console.log('Count OK.')
      antique = await UserAntique.query().where('user_id', userDefence.id).orderByRaw('RAND()').with('antique').first()
      if (antique) {
        let antiqueData = antique.toJSON()
        award['antique'] = antique.antique_id

        const readyAt = await UserAntique.calculateReadyAt(antiqueData.antique)

        antique.user_id = user.id
        antique.status = 'working'
        antique.ready_at = readyAt
        await antique.save()
        user.score += antiqueData.antique.score_first
      }
    }

    let levels = await Level.query().where('score_min','<=',user.score).where('score_max','>=',user.score).first()

    if(levels){
      tmplevelJson = levels.toJSON()
    }
    // console.log(tm)
    tmplevelJson.score = user.score
    tmplevelJson.blue = tmplevelJson.be
    tmplevelJson.yellow = tmplevelJson.ye
    let levelUp = {
      status: false,
      yellow: 0,
      blue: 0
    }
    if(user.level_id<tmplevelJson.id){
      let oldLevel = await Level.query().where('id', user.level_id).first()
      oldLevel.users--
      oldLevel.save()
      let newLevel = await Level.query().where('id', tmplevelJson.id).first()
      if(isNaN(parseInt(newLevel.user, 10))) {
        newLevel.user = 0
      }
      newLevel.users++
      newLevel.save()

      user.level_id = tmplevelJson.id
      levelUp = {
        status: true,
        yellow: tmplevelJson.ye,
        blue: tmplevelJson.be,
        message: tmplevelJson.levelup_message
      }

      log.type = 'levelup'
      log.type_id = user.level_id
      log.user_id = user.id
      log.before_state = JSON.stringify({
        ye: userData.property.ye,
        be: userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3
      })
      log.after_state = JSON.stringify({
        ye: tmplevelJson.ye+userData.property.ye,
        be: tmplevelJson.be+userData.property.be,
        elixir_1: userData.property.elixir_1,
        elixir_2: userData.property.elixir_2,
        elixir_3: userData.property.elixir_3
      })
      await log.save()

    }


    award['level'] = tmplevelJson
    award['level_up'] = levelUp

    log.type = 'attack_finish'
    log.type_id = GameSession.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })
    log.after_state = JSON.stringify({
      ye: award.yellow+userData.property.ye,
      be: award.blue+userData.property.be,
      elixir_1: award.elixir+userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })
    await log.save()

    await user.property().update({
      ye: userData.property.ye + award.yellow + levelUp.yellow,
      be: userData.property.be + award.blue + levelUp.blue,
      elixir_1: userData.property.elixir_1 + award.elixir,
      success_attack: userData.property.success_attack+1
    })

    user.elixir_reward += award.elixir
    user.blue_reward += award.blue + levelUp.blue

    user.game_success++
    user.courage('add', 1)
    await user.save()
    await user.awardStat(award)
    // Messages

    award['win'] = true
    award['revenge'] = gameSession.type != 'attack'
    await Message.create({
      user_id: userDefence.id,
      sender_id: user.id,
      type: gameSession.type,//'attack',
      sticker_id: 0,
      session: params.session,
      status: 'unread',
      message: JSON.stringify(award)
    })

    
    if (award['antique'] && antique) {
      let antiqueTmpData = antique.toJSON()
      award['antique'] = [{
        name: antiqueTmpData.antique.name,
        image: antiqueTmpData.antique.image
      }]
    }


    award['score'] = settings.attack_score
    award['courage'] = 1

    award['id'] = userDefence.id
    award['nickname'] = userDefence.nickname
    award['avatar'] = userDefence.avatar

    await gameSession.delete()

    return [{
      status: 1,
      messages: [],
      data: award
    }]
  }

  // کنسل کردن حمله در حین حمله
  static async cancel (params, user) {
    const rules = {
      session: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let gameSession = await GameSession.query().where('type', 'attack').where('user_id', user.id).where('session_id', params.session).first()
    if (!gameSession) {
      return [{
        status: 0,
        messages: Messages.parse(['GameNotFound']),
        data: {}
      }]
    }

    await User.query().where('id', gameSession.user_defence).update({
      under_attack: 'no'
    })

    await gameSession.delete()

    user.game_lose++
    user.courage('sub', 1)
    await user.save()

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  // انتقام گیری از شخصی که قبل به کاربر حمله موفقیت آمیز انجام داده .
  static async revenge (params, user) {
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

    let message = await Message.query().where('type', 'attack').where('id', params.id).where('user_id', user.id).first()

    if (!message) {
      return [{
        status: 0,
        messages: Messages.parse(['TargetNotFound']),
        data: {}
      }]
    }

    const settings = await Setting.get()
    const target = await User.query().where('id', message.sender_id)
    .with('property').with('antiques').with('antiques.antique').first()

    if (!target) {
      return [{
        status: 0,
        messages: Messages.parse(['UserNotFound']),
        data: {}
      }]
    }
    let targetData = target.toJSON()
    let shield = 0

    if (targetData.shield_at && Time(targetData.shield_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds') > 0) {
      shield = Time(targetData.shield_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
    }

    if (shield) {
      return [{
        status: 0,
        message: Messages.parse(['UnderSheild']),
        data: {}
      }]
    }

    if (targetData.under_attack == 'yes') {
      return [{
        status: 0,
        message: Messages.parse(['UnderAttack']),
        data: {}
      }]
    }

    let stageKey = Randomatic('Aa', 30)
    stageKey = 'attack_' + stageKey

    let session = new GameSession()
    session.user_id = user.id
    session.type = 'revenge'
    session.user_defence = targetData.id
    session.depo_type = 'none'
    session.session_id = stageKey
    await session.save()

    await Redis.select(1)
    await Redis.hmset(stageKey, [
      'user',
      user.id
    ])
    await Redis.expire(stageKey, 120)
    await message.delete()

    target.under_attack = 'yes'
    await target.save()

    var ts = stageKey;//Math.round((new Date()).getTime() / 1000);
    let encryptedPath = hasha(ts + '|' + targetData.property.path + '|' + md5(ts + '|' + targetData.property.path), {
      algorithm: 'sha256'
    }).toUpperCase()

    return [{
      status: 1,
      messages: [],
      data: {
        session: stageKey,
        path: JSON.parse(targetData.property.path),
        // path: encryptedPath,
        user: {
          id: targetData.id,
          nickname: targetData.nickname,
          avatar: targetData.avatar
        }
      }
    }]
  }

  // ارسال استیکر پس از حمله موفقیت آمیز برای حریف
  static async sticker (params, user) {
    const rules = {
      session: 'required',
      sticker: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let message = await Message.query().where('type', 'attack').where('sender_id', user.id).where('sticker_id', 0).where('session', params.session).first()
    if (!message) {
      return [{
        status: 0,
        message: Messages.parse(['GameNotFound']),
        data: {}
      }]
    }

    message.sticker_id = params.sticker
    await message.save()

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }
}

module.exports = AttackController
