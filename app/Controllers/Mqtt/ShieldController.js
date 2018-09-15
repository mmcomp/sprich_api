'use strict'

const Code = use('App/Models/Code')
const Transaction = use('App/Models/Transaction')
const Shield = use('App/Models/Shield')
const Stat = use('App/Models/Stat')
const Log = use('App/Models/Log')
const axios = require('axios')
const querystring = require('querystring')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

const Env = use('Env')
const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const _ = require('lodash')

class ShieldController {
  static async list (params, user) {
    let stat = 1;
    let result = await Shield.query().where('is_enabled',1)
    if(!result){
      result = [];
      stat = 0;
    }
    // console.log(result)
    for(let i = 0;i < result.length;i++){
      result[i]['cost'] = result[i].elixir_cost
    }
    return [{
      status: stat,
      messages: [],
      data: {
        shields: result
      }
    }]
  }

  static async buy (params, user) {
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

    await user.loadMany(['property'])

    let result = await Shield.query().where('id',params.id)
    if(!result || result.length===0){
      return [{
        status: 0,
        messages: [
          {
            code: 'shieldNotFound',
            message: 'سپر مورد نظر یافت نشد'
          }
        ],
        data: {}
      }]
    }

    let currentTime = Moment.now('YYYY-MM-DD HH:mm:ss')
    let userData = user.toJSON()


    let selectedShield = result[0]

    if(selectedShield.elixir_cost>userData.property.elixir_3 || selectedShield.coin_cost>userData.coin){
      return [{
        status: 0,
        messages: [
          {
          code: 'elixirCoinShort',
          message : 'میزان اکسیر یا سکه شما کافی نمی باشد'
          }
        ],
        data: {}
      }]
    }

    let transaction
    if(selectedShield.elixir_cost>0){
      transaction = new Transaction()
      transaction.user_id = user.id
      transaction.type = 'shield'
      transaction.type_id = selectedShield.id
      transaction.price_type = 'elixir'
      transaction.price = selectedShield.elixir_cost
      transaction.status = 'success'
      await transaction.save()
    }

    if(selectedShield.coin_cost>0){
      transaction = new Transaction()
      transaction.user_id = user.id
      transaction.type = 'shield'
      transaction.type_id = selectedShield.id
      transaction.price_type = 'coin'
      transaction.price = selectedShield.coin_cost
      transaction.status = 'success'
      await transaction.save()
    }

    const log = new Log()
    log.type = 'shiled_trade'
    log.type_id = selectedShield.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.ye,
      be: userData.be,
      elixir_1: userData.elixir_1,
      elixir_2: userData.elixir_2,
      elixir_3: userData.elixir_3,
      coin: userData.coin
    })
    log.after_state = JSON.stringify({
      ye: userData.ye,
      be: userData.be,
      elixir_1: userData.elixir_1,
      elixir_2: userData.elixir_2,
      elixir_3: userData.elixir_3 - selectedShield.elixir_cost,
      coin: userData.coin - selectedShield.coin_cost
    })
    await log.save()

    user.shield_at = currentTime
    user.shield_duration = selectedShield.last_time

    if(selectedShield.elixir_cost>0){
      await user.property().update({
        elixir_3: userData.property.elixir_3 - selectedShield.elixir_cost
      })
    }

    user.elixir_shield += selectedShield.elixir_cost
    user.coin -= selectedShield.coin_cost
    user.coin_outcome += selectedShield.coin_cost
    await user.save()
    

    return [{
      status: 1,
      messages: [],
      data: {
        shields: selectedShield
      }
    }]
  }

}

module.exports = ShieldController
