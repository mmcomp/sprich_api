'use strict'

const Log = use('App/Models/Log')
const Validations = use('App/Libs/Validations')
const Messages = use('App/Libs/Messages/Messages')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

const status = {
  'empty': 0,
  'working': 1,
  'complete': 2
}

class FugeController {
  // دریافت اطلاعات مرتبط با سانترفیوژ کاربر
  static async info (params, user) {
    let fuge = await user.fuge().with('fuge').fetch()
    const fugeData = fuge.toJSON()
    let boostCoin = fugeData.fuge.fast_finish_coin

    let readyAtTime = 0
    if (fugeData.status == 'working') {
      readyAtTime = Time(fugeData.ready_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')

      if (readyAtTime <= 0) {
        readyAtTime = 0
        fugeData.status = 'complete'
        await user.fuge().update({
          status: 'complete'
        })
      }
    }

    let nextFuge = {
      status: false,
      user_level: '',
      level: '',
      time: [0, 0],
      capacity: 0,
      coin: 0,
      yellow: 0
    }

    let result = await fuge.upgradeAvalible(user)
    // console.log('result')
    // console.log(result)

    if (result.avalible) {
      if(result.data.fuge){
        nextFuge = {
          status: result.upgrade,
          user_level: result.data.name,
          level: result.data.fuge.name,
          time: [result.data.fuge.time_one, result.data.fuge.time_two],
          capacity: result.data.fuge.capacity,
          coin: result.data.fuge.coin,
          yellow: result.data.fuge.ye
        }
      }
    }

    return [{
      status: 1,
      messages: [],
      data: {
        level: fugeData.fuge.name,
        status: status[fugeData.status],
        type: fugeData.type,
        amount: fugeData.amount,
        capacity: fugeData.fuge.capacity,
        time: [fugeData.fuge.time_one, fugeData.fuge.time_two],
        ready: Math.abs(readyAtTime),
        upgrade: nextFuge,
        boost_coin: boostCoin
      }
    }]
  }

  static async boost (params, user) {
    let fuge = await user.fuge().with('fuge').fetch()
    const fugeData = fuge.toJSON()
    let boostCoin = fugeData.fuge.fast_finish_coin

    let readyAtTime = 0
    if (fugeData.status == 'working') {
      readyAtTime = Time(fugeData.ready_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')

      if (readyAtTime <= 0) {
        return [{
          status: 0,
          messages: [{
            "code":"FugeComplete",
            "message":'سانتریفیوژ شما در حال کار نیست'
          }],
          data: {}
        }]
      }

      if(user.coin < boostCoin) {
        return [{
          status: 0,
          messages: [{
            "code":"CoinNotEnough",
            "message":'سکه شما برای این عملیات کافی نیست'
          }],
          data: {}
        }]
      }

      user.coin -= boostCoin
      await user.save();

      fugeData.status = 'complete'
      await user.fuge().update({
        status: 'complete'
      })

      return [{
        status: 1,
        messages: [],
        data: {
          boost_coin: boostCoin
        }
      }]
    }
  }

  // برداشت اکسیر حاضر شده از سانترفیوژ
  static async removal (params, user) {
    await user.loadMany(['property', 'fuge', 'fuge.fuge'])
    const userData = user.toJSON()

    if (userData.fuge.status == 'working') {
      let readyAtTime = Time(userData.fuge.ready_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')

      if (readyAtTime <= 0) {
        await user.fuge().update({
          status: 'complete'
        })
      } else {
        return [{
          status: 0,
          messages: Messages.parse(['notComplete']),
          data: {}
        }]
      }
    }

    const log = new Log()
    log.type = 'fuge_update_'+((userData.fuge.type==1)?'1-2':'2-3')
    log.type_id = userData.fuge.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.ye,
      be: userData.be,
      elixir_1: userData.elixir_1,
      elixir_2: userData.elixir_2,
      elixir_3: userData.elixir_3
    })
    let logState = {
      ye: userData.ye,
      be: userData.be,
      elixir_1: userData.elixir_1,
      elixir_2: userData.elixir_2,
      elixir_3: userData.elixir_3
    }

    switch (userData.fuge.type) {
      case 1:
        userData.property.elixir_2 = userData.property.elixir_2 + userData.fuge.amount
        logState.elixir_2 += userData.fuge.amount
        break

      case 2:
        userData.property.elixir_3 = userData.property.elixir_3 + userData.fuge.amount
        user.elixir_stat += userData.fuge.amount
        await user.save()
        logState.elixir_3 += userData.fuge.amount
        break
    }

    log.after_state = JSON.stringify(logState)
    await log.save()

    await user.property().update(userData.property)

    userData.fuge.amount = 0
    userData.fuge.type = 0
    userData.fuge.status = 'empty'

    let response = {
      elixir: [userData.property.elixir_1, userData.property.elixir_2, userData.property.elixir_3]
    }

    delete userData.fuge['fuge']
    await user.fuge().update(userData.fuge)

    return [{
      status: 1,
      messages: [],
      data: response
    }]
  } 

  // قرار دادن اکسیر جدید برای خالص سازی در سانترفیوژ
  static async fill (params, user) {
    const rules = {
      type: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    await user.loadMany(['property', 'fuge', 'fuge.fuge'])
    const userData = user.toJSON()

    if (userData.fuge.status != 'empty') {
      return [{
        status: 0,
        messages: Messages.parse(['notEmpty']),
        data: {}
      }]
    }

    userData.fuge.type = 1
    userData.fuge.ready_at = Time().add(userData.fuge.fuge.time_one, 'seconds').format('YYYY-M-D HH:mm:ss')

    if (params.type == 2) {
      userData.fuge.type = 2
      userData.fuge.ready_at = Time().add(userData.fuge.fuge.time_two, 'seconds').format('YYYY-M-D HH:mm:ss')
    }

    if (userData.property['elixir_' + userData.fuge.type] < 1) {
      return [{
        status: 0,
        messages: Messages.parse(['elixirNotEnough']),
        data: {}
      }]
    }

    const log = new Log()
    log.type = 'fuge_start_'+((userData.fuge.type==1)?'1-2':'2-3')
    log.type_id = userData.fuge.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    })
    let logState = {
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3
    }

    if (userData.property['elixir_' + userData.fuge.type] < userData.fuge.fuge.capacity) {
      userData.fuge.amount = userData.property['elixir_' + userData.fuge.type]
      userData.property['elixir_' + userData.fuge.type] = 0
    } else {
      userData.fuge.amount = userData.fuge.fuge.capacity
      userData.property['elixir_' + userData.fuge.type] = userData.property['elixir_' + userData.fuge.type] - userData.fuge.fuge.capacity
    }
    userData.fuge.status = 'working'

    logState.elixir_1 = userData.property.elixir_1
    logState.elixir_2 = userData.property.elixir_2
    log.after_state = JSON.stringify(logState)
    await log.save()

    let response = {
      time: params.type == 1 ? userData.fuge.fuge.time_one : userData.fuge.fuge.time_two,
      elixir: [userData.property.elixir_1, userData.property.elixir_2, userData.property.elixir_3]
    }

    delete userData.fuge['fuge']

    await user.fuge().update(userData.fuge)
    await user.property().update(userData.property)

    return [{
      status: 1,
      messages: [],
      data: response
    }]
  }

  // آپگرید سانترفیوژ و ارتقا آن بسته لول کاربر
  static async upgrade (params, user) {
    const rules = {
      type: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let fuge = await user.fuge().with('fuge').fetch()
    const fugeData = fuge.toJSON()

    await user.loadMany(['property','fuge'])
    const userData = user.toJSON()
    /*
    if (fugeData.fuge.level_id == user.level_id) {
      return [{
        status: 0,
        messages: Messages.parse(['wrongAction']),
        data: {}
      }]
    }
    */
    let result = await fuge.upgradeAvalible(user)

    if (!result.avalible) {
      return [{
        status: 0,
        messages: Messages.parse(['wrongAction']),
        data: {}
      }]
    }

    if(!result.upgrade){
      return [{
        status: 0,
        messages: Messages.parse(['upgradeNotPossible']),
        data: {}
      }]
    }

    if (params.type == 'coin') {
      if (result.data.fuge.coin > user.coin) {
        return [{
          status: 0,
          messages: Messages.parse(['coinNotEnough']),
          data: {}
        }]
      }

      user.coin_outcome += result.data.fuge.coin
      user.coin = user.coin - result.data.fuge.coin
      userData.coin = user.coin
      await user.save()
    } else {
      if (result.data.fuge.ye > userData.property.ye) {
        return [{
          status: 0,
          messages: Messages.parse(['yeNotEnough']),
          data: {}
        }]
      }

      const log = new Log()
      log.type = 'fuge_upgrade',
      log.type_id = userData.fuge.id
      log.user_id = user.id
      log.before_state = JSON.stringify({
        ye: userData.ye,
        be: userData.be,
        elixir_1: userData.elixir_1,
        elixir_2: userData.elixir_2,
        elixir_3: userData.elixir_3
      })
      log.after_state = JSON.stringify({
        ye: userData.ye - result.data.fuge.ye,
        be: userData.be,
        elixir_1: userData.elixir_1,
        elixir_2: userData.elixir_2,
        elixir_3: userData.elixir_3
      })
      log.save()

      userData.property.ye = userData.property.ye - result.data.fuge.ye
      await user.property().update(userData.property)
    }
    // console.log('upgrade to')
    // console.log(result)
    delete fugeData['fuge']
    fugeData.fuge_id = result.data.fuge.id
    // fugeData.level_id = result.data.id
    await user.fuge().update(fugeData)

    return [{
      status: 1,
      messages: [],
      data: {
        coin: userData.coin,
        yellow: userData.property.ye,
        type: params.type
      }
    }]
  }
}

module.exports = FugeController
