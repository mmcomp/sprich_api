'use strict'

const ExchangeController = use('App/Controllers/Mqtt/ExchangeController')

const User = use('App/Models/User')
const phone = require('phone')

const Env = use('Env')
const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const _ = require('lodash')

class HttpExchangeController {
  async list ({
    request,
    response
  }) {
    let exchangeList = await ExchangeController.list()

    return exchangeList
  }

  async detail ({
    request,
    response
  }) {
    let exchangeDetail = await ExchangeController.detail(request.all())
    return exchangeDetail
  }

  async buy ({
    request,
    response
  }) {
    let params = request.all()
    if(params.id && params.mobile && params.token) {
      let user = await User.query().where('mobile', params.mobile).where('token', params.token).first()
      if(!user) {
        return [{
          status:0,
          messages: [{
            code: "UserNotFound",
            message: "کاربری با این مشخصات وچود ندارد"
          }],
          data: {}
        }]
      }
      let exchangeBuy = await ExchangeController.buy(params, user)
      return exchangeBuy  
    } else {
      return [{
        status:0,
        messages: [{
          code: "InputError",
          message: "ورودی های کافی نمی باشند"
        }],
        data: {}
      }]
    }
  }

  async codes ({
    request,
    response
  }) {
    let params = request.all()
    let user = await User.query().where('mobile', params.mobile).where('token', params.token).first()
    if(!user) {
      return [{
        status:0,
        messages: [{
          code: "UserNotFound",
          message: "کاربری با این مشخصات وچود ندارد"
        }],
        data: {}
      }]
    }
    let exchangeBuy = await ExchangeController.codes(params, user)
    return exchangeBuy  
  }
}

module.exports = HttpExchangeController
