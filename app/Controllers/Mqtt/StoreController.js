'use strict'

const Store = use('App/Models/Store')
const Transaction = use('App/Models/Transaction')
const Randomatic = require('randomatic')

const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const _ = require('lodash')
const Env = use('Env')

class StoreBoardController {
  // لیست بسته های سکه
  static async list (params, user) {
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

    let results = []

    if (params.page == 1) {
      params.page = 0
    } else {
      params.page--
      params.page *= params.limit
    }

    let stores = await Store.query().where('status', 'active').offset(params.page).limit(params.limit).fetch()

    _.each(stores.toJSON(), (store) => {
      results.push({
        id: store.id,
        name: store.name,
        coin: store.coin,
        image: store.image,
        description: store.description,
        price: store.price,
        currency: ''
      })
    })

    return [{
      status: 1,
      messages: [],
      data: {
        products: results
      }
    }]
  }

  // خرید بسته سکه و ایجاد لینک برای خرید اینترنتی
  static async buy (params, user) {
    let rules = {
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

    let store = await Store.find(params.id)
    if (!store) {
      return [{
        status: 0,
        messages: Messages.parse(['StoreNotFound']),
        data: {}
      }]
    }

    var bankType = (params.bank_type)?params.bank_type:'mellat';

    var transaction = new Transaction()
    transaction.user_id = user.id
    transaction.type = 'store'
    transaction.type_id = store.id
    transaction.price = store.price
    transaction.payment_id = Randomatic('0', 12)
    transaction.price_type = 'rial'
    transaction.status = 'pending'
    // if(bankType=='saman') {
    //   transaction.payment_ticket = transaction.payment_id
    //   await transaction.save()

    //   return [{
    //     status: 1,
    //     messages: [],
    //     data: {
    //       pay_url: Env.get('BANK_SAMAN_SEND_URL') + '?transaction=' + transaction.id
    //     }
    //   }] 
    // }
    let postData
    try{
      postData = await store.getBuyLink(user, transaction.payment_id, bankType)
      console.log('Bank Response')
      console.log(postData)
    }catch(e){
      return [{
        status: 0,
        messages: [{
          code: "BankError",
          message: "خطا در ارسال به بانک"
        }],
        data: {
          error_code: e.message
        }
      }] 
    }
    if(bankType=='saman') {
      if(postData.status==1) {
        transaction.payment_ticket = postData.token
        await transaction.save()

        return [{
          status: 1,
          messages: [],
          data: {
            pay_url: Env.get('BANK_SAMAN_SEND_URL') + '?transaction=' + transaction.id
          }
        }] 
      }else {
        return [{
          status: 0,
          messages: [{
            code: "BankError",
            message: "خطا در ارسال به بانک"
          }],
          data: {
            error_code: postData.status
          }
        }] 
      }
    } else if(bankType=='saderat') {
      if(postData.Status==0) {
        transaction.payment_ticket = postData.Accesstoken
        await transaction.save()

        return [{
          status: 1,
          messages: [],
          data: {
            pay_url: Env.get('BANK_SADERAT_SEND_URL') + '?transaction=' + transaction.id
          }
        }] 
      }else {
        return [{
          status: 0,
          messages: [{
            code: "BankError",
            message: "خطا در ارسال به بانک"
          }],
          data: {
            error_code: postData.Status
          }
        }] 
      }
    }
    if(postData.return.indexOf('0,')==0) {
      transaction.payment_ticket = postData.return.split(',')[1]
      await transaction.save()

      return [{
        status: 1,
        messages: [],
        data: {
          pay_url: Env.get('BANK_MELLAT_SEND_URL') + '?transaction=' + transaction.id
        }
      }]  
    } else {
      return [{
        status: 0,
        messages: [{
          code: "BankError",
          message: "خطا در ارسال به بانک"
        }],
        data: {
          error_code: postData.return
          // revertURL: Env.get('BANK_MELLAT_REVERT_URL')
        }
      }]  
    }
  }
}

module.exports = StoreBoardController
