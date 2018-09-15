'use strict'

const Code = use('App/Models/Code')
const Transaction = use('App/Models/Transaction')
const Exchange = use('App/Models/Exchange')
const ExchangeCategory = use('App/Models/ExchangeCategory')
const ExchangeStat = use('App/Models/ExchangeStat')
const Stat = use('App/Models/Stat')
const Log = use('App/Models/Log')
const axios = require('axios')
const querystring = require('querystring')
const UserSms = use('App/Models/UserSms')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

const Env = use('Env')
const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const _ = require('lodash')

class ExchangeController {
  // نمایش لیست کلیه آیتم های مرکز مبادله به کاربر
  static async list (params, user) {
    let categories = await ExchangeCategory.all()
    let result = []

    for (const category of categories.rows) {
      let item = {
        name: category.name,
        items: []
      }

      let exchanges = await Exchange.query().where('category_id', category.id).where('status', 'active')/*.whereHas('codes', (builder) => {
        builder.where('status', 'free')
      })*/.with('item').with('codes').fetch()
      let exchangeData = exchanges.toJSON()
      let total_count = 0

      for (const exchange of exchangeData) {
        exchange.can_sale = false
        total_count = 0
        for(let i = 0;i < exchange.codes.length;i++){
          if(exchange.codes[i].status=='free'){
            exchange.can_sale = true
            total_count++
          }
        }
        item.items.push({
          id: exchange.id,
          name: exchange.name,
          price: exchange.price / 10,
          price_discount: (exchange.price - (exchange.price * (exchange.price_discount / 100))) / 10,
          elixir: exchange.elixir,
          elixir_type: exchange.elixir_type,
          image: Env.get('SITE_URL') + exchange.image,
          stat: exchange.stat,
          can_sale: exchange.can_sale,
          total_count: total_count
        })
      }

      result.push(item)
    }

    await Stat.incrementView()

    return [{
      status: 1,
      messages: [],
      data: {
        exchanges: result
      }
    }]
  }

  // جزئیات آیتم های مرکز مبادله
  static async detail (params, user) {
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

    let exchange = await Exchange.query().where('status', 'active').where('id', params.id)/*.whereHas('codes', (builder) => {
      builder.where('status', 'free')
    })*/.with('pictures').with('category').with('item').with('codes').first()

    if (!exchange) {
      return [{
        status: 0,
        messages: Messages.parse(['ProductNotFound']),
        data: {}
      }]
    }

    

    // await user.loadMany(['property'])
    // let userData = user.toJSON()
    let exchangeData = exchange.toJSON()
    let available = true

    // if (userData.property.elixir_3 < exchange.elixir) {
    //   available = false
    // }

    let code = await Code.query().where('exchange_id', exchange.id).where('status', 'free').first()
    let can_sale = true

    if (!code) {
      can_sale = false
      /*
      return [{
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      }]
      */
    }

    // if(exchange.total_count<=0){
    //   can_sale = false
    // }

    let gallery = []

    _.each(exchangeData.pictures, gl => {
      gallery.push(Env.get('SITE_URL') + gl.image)
    })

    let total_count = 0
    _.each(exchangeData.codes, cd => {
      if(cd.status == 'free'){
        total_count++
      }
    })

    await ExchangeStat.incrementStat(exchangeData.id)

    return [{
      status: 1,
      messages: [],
      data: {
        id: exchangeData.id,
        available: available,
        name: exchangeData.name,
        description: exchangeData.description,//exchangeData.item.description,
        category: exchangeData.category.name,
        price: exchangeData.price / 10,
        price_discount: (exchangeData.price - (exchangeData.price * (exchangeData.price_discount / 100))) / 10,
        elixir: exchangeData.elixir,
        elixir_type: exchangeData.elixir_type,
        image: Env.get('SITE_URL') + exchangeData.image,
        stat: exchangeData.stat,
        gallery: gallery,
        can_sale: can_sale,
        total_count: total_count
      }
    }]
  }

  // خرید از مرکز مبادله
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


    let exchange = await Exchange.query().where('status', 'active').where('id', params.id).with('pictures').with('category').first()
    if (!exchange) {
      return [{
        status: 0,
        messages: Messages.parse(['ProductNotFound']),
        data: {}
      }]
    }

    await user.loadMany(['property'])
    let userData = user.toJSON()

    if (userData.property[exchange.elixir_type] < exchange.elixir) {
      return [{
        status: 0,
        messages: Messages.parse(['elixirNotEnough']),
        data: {}
      }]
    }

    let code = await Code.query().where('exchange_id', exchange.id).where('status', 'free').first()

    if (!code) {
      return [{
        status: 0,
        messages: [{
          code: "NoCodeAvailable",
          messge: "کد تخفیفی موجود نیست"
        }],
        data: {}
      }]
    }

    let transaction = new Transaction()
    transaction.user_id = user.id
    transaction.type = 'exchange'
    transaction.type_id = exchange.id
    transaction.price_type = (exchange.elixir_type=='elixir_3')?'elixir':exchange.elixir_type
    transaction.price = exchange.elixir
    transaction.status = 'success'
    await transaction.save()

    let updateProperty = {}
    updateProperty[exchange.elixir_type] = userData.property[exchange.elixir_type] - exchange.elixir
    await user.property().update(updateProperty)

    user.elixir_exchange += exchange.elixir
    await user.save()

    code.user_id = user.id
    code.status = 'used'
    await code.save()

    exchange.stat++
    exchange.total_count--
    await exchange.save()

    let msg = 'کد تخفیف شما برای '+exchange.name+' '+code.code+' می باشد'

    await UserSms.createMany([{
      user_id: user.id,
      message: msg,
      type: 'exchange'
    }])

    const response = await axios({
      method: 'post',
      url: Env.get('SMS_URL'),
      data: querystring.stringify({
        UserName: Env.get('SMS_USERNAME'),
        Password: Env.get('SMS_PASSWORD'),
        PhoneNumber: Env.get('SMS_NUMBER'),
        RecNumber: userData.mobile.replace('+98','0'),
        MessageBody: msg,
        Smsclass: 1
      })
    })

    const log = new Log()
    log.type = 'exchange_trade'
    log.type_id = exchange.id
    log.user_id = user.id
    log.before_state = JSON.stringify({
      ye: userData.ye,
      be: userData.be,
      elixir_1: userData.elixir_1,
      elixir_2: userData.elixir_2,
      elixir_3: userData.elixir_3
    })
    log.after_state = JSON.stringify({
      ye: userData.ye,
      be: userData.be,
      elixir_1: userData.elixir_1-((exchange.elixir_type=='elixir_1')?exchange.elixir:0),
      elixir_2: userData.elixir_2-((exchange.elixir_type=='elixir_2')?exchange.elixir:0),
      elixir_3: userData.elixir_3-((exchange.elixir_type=='elixir_3')?exchange.elixir:0)
    })
    await log.save()

    // if (response.status === 200) {
      // return {
      //   err: false,
      //   messages: []
      // }
    // }

    return [{
      status: 1,
      messages: [],
      data: {
        code: code.code
      }
    }]
  }

  // نمایش کلیه آیتم های خریداری شده از مرکز مبادله توسط کاربر
  static async codes (params, user) {
    let results = []

    let codes = await Code.query().where('status', 'used').where('user_id', user.id).with('exchange').orderBy('updated_at', 'DESC').fetch()

    let codesData = codes.toJSON()
    // console.log(''+codesData[0].exchange.image+'')

    _.each(codesData, code => {
      code.exchange.image = Env.get('SITE_URL') + code.exchange.image
      code.exchange.price =  code.exchange.price / 10
      code.exchange.price_discount =  (code.exchange.price - (code.exchange.price * (code.exchange.price_discount / 100)))
      results.push({
        exchange: code.exchange,
        code: code.code,
        reg_date: Moment.m2s(Time(code.updated_at).format('YYYY-M-D HH:mm:ss'))
      })
    })

    return [{
      status: 1,
      data: {
        exchanges: results
      },
      messages: []
    }]
  }
}

module.exports = ExchangeController
