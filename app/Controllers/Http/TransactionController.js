'use strict'

const Transaction = use('App/Models/Transaction')
const User = use('App/Models/User')
const Store = use('App/Models/Store')
const Log = use('App/Models/Log')
const RequestLog = use('App/Models/RequestLog')
const Env = use('Env')
const Database = use('Database')

const Validations = use('App/Libs/Validations')
const Moment = use('App/Libs/Moment')

class TransactionController {

  // پس از انجام پرداخت بانکی توسط کاربر بانک او را به این صفحه می فرستد
  //  بررسی صحت پرداخت و اعمال خرید بسته مورد نظر
  async revert ({
    request,
    response
  }) {
    let rules = {
      resultCode: 'required',
      paymentId: 'required',
      referenceNumber: 'required',
      RRN: 'required',
      trace: 'required',
      amount: 'required'
    }

    let request_log = new RequestLog()
    request_log.user_id = -1
    request_log.type = request.method() + ':bank_revert'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()

    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let transaction = await Transaction.query().where('payment_ticket', request.input('paymentId')).where('price', request.input('amount')).first()
    if (!transaction) {
      request_log.response = JSON.stringify(
        {
          status: 0,
          messages: '',
          data: {}
        }
      )
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    if (request.input('resultCode') != '00') {
      transaction.status = 'error'
      transaction.message = request.input('resultCode')
      await transaction.save()

      request_log.response = 'Error:' + request.input('resultCode') + JSON.stringify({
        status: 0,
        messages: check.messages,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    transaction.ref_id = request.input('referenceNumber')
    transaction.rnn = request.input('RRN')
    transaction.trace = request.input('trace')
    transaction.status = 'pay'
    await transaction.save()

    let verifyResult = await transaction.verify()

    if (!verifyResult) {
      request_log.response = 'pay ok not verified'
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return [{
        status: 0,
        messages: [],
        data: {}
      }]
    }


    let user = User.query().where('id', transaction.user_id).with('property').first()
    let userData = user.toJSON()

    let store = Store.find(transaction.type_id)
    store.stat++
    await store.save()
    const log = new Log()
    log.type = 'mall_trade'
    log.type_id = store.id
    log.user_id = user.id

    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin
    })
    log.after_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin+store.coin
    })

    await log.save()

    // await user.property().update({
    //   coin: userData.property.coin + store.coind
    // })
    user.coin += store.coin
    user.coin_incomes += store.coin
    await user.save()

    request_log.response = 'pay ok'
    request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
    await request_log.save()

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }

  async mellatRevert ({
    request,
    response
  }) {
    let rules = {
      ResCode: 'required',
      RefId: 'required',
      SaleOrderId: 'required'
    }

    let request_log = new RequestLog()
    request_log.user_id = -1
    request_log.type = request.method() + ':bank_mellat_revert'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()

    var outHtml = '<html><body dir="rtl"><h1 style="text-align:center;">#msg#</h1></body></html>'
    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return outHtml.replace('#msg#', check.messages[0].message)
      /*
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
      */
    }

    let transaction = await Transaction.query().where('payment_ticket', request.input('RefId')).where('status', 'pending').first()
    if (!transaction) {
      request_log.response = JSON.stringify(
        {
          status: 0,
          messages: '',
          data: {}
        }
      )
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return outHtml.replace('#msg#', 'تراکنش شما معتبر نمی باشد')
      /*
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
      */
    }

    if (request.input('ResCode') != "0") {
      transaction.status = 'error'
      transaction.message = request.input('ResCode')
      await transaction.save()

      request_log.response = 'Error:' + request.input('ResCode') + JSON.stringify({
        status: 0,
        messages: check.messages,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return outHtml.replace('#msg#', 'خطا در تراکنش بانکی')
      /*
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
      */
    }

    transaction.ref_id = request.input('SaleReferenceId')

    transaction.status = 'pay'
    await transaction.save()
    
    let verifyResult = await transaction.verify()

    if (verifyResult.return!=0) {
      request_log.response = 'pay ok not verified'
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()


      transaction.status = 'error'
      await transaction.save()
      return outHtml.replace('#msg#', 'خطا در تایید تراکنش بانکی')
      /*
      return [{
        status: 0,
        messages: [],
        data: {}
      }]
      */
    }
    

    let user = await User.query().where('id', transaction.user_id).with('property').first()
    let userData = user.toJSON()

    let store = await Store.find(transaction.type_id)
    if(!store) {
      return outHtml.replace('#msg#', 'کالا پیدا نشد')
      /*
      return [{
        status: 0,
        messages: [],
        data: {}
      }]
      */
    }

    store.stat++
    await store.save()

    const log = new Log()
    log.type = 'mall_trade'
    log.type_id = store.id
    log.user_id = user.id

    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin
    })
    log.after_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin+store.coin
    })

    await log.save()


    user.coin += store.coin
    user.coin_incomes += store.coin
    await user.save()

    request_log.response = 'pay ok'
    request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
    await request_log.save()

    return outHtml.replace('#msg#', 'تراکنش با موفقیت انجام گرفت و ' + store.coin + ' سکه به حساب شما اضافه شد' + '<br/>' + 'لطفا به بازی مراجعه کرده و روی آیکون سکه های خود کلیک کنید')
    /*
    return [{
      status: 1,
      messages: [],
      data: {}
    }]
    */
  }

  async mellatSend ({
    request,
    response
  }) {
    let rules = {
      transaction: 'required'
    }


    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let transaction = await Transaction.find(request.input('transaction'))
    if (!transaction) {
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    let user = await User.find(transaction.user_id)
    if(!user) {
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    let output = '<html><body><form method="POST" id="frm1" action="' + Env.get('BANK_MELLAT_POST_ACTION') + '" target="_self">'
    output += '<input type="hidden" name="RefId" value="' + transaction.payment_ticket + '" />'
    // mobileNo
    // output += '<input type="hidden" name="mobileNo" value="' + user.mobile.replace('+', '') + '" />'
    output += '</form><script> /*if(confirm("send?")){*/document.getElementById("frm1").submit();/*}*/ </script></body></html>'

    return output
  }

  async saderatRevert ({
    request,
    response
  }) {

    let rules = {
      respcode: 'required',
      invoiceid: 'required'
    }

    let request_log = new RequestLog()
    request_log.user_id = -1
    request_log.type = request.method() + ':bank_saderat_revert'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()

    var outHtml = '<html><body dir="rtl"><h1 style="text-align:center;">#msg#</h1></body></html>'
    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return outHtml.replace('#msg#', check.messages[0].message)
    }

    let transaction = await Transaction.query().where('payment_id', request.input('invoiceid')).where('status', 'pending').first()
    if (!transaction) {
      request_log.response = JSON.stringify(
        {
          status: 0,
          messages: '',
          data: {}
        }
      )
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return outHtml.replace('#msg#', 'تراکنش شما معتبر نمی باشد')
    }

    if (request.input('respcode') != "0") {
      transaction.status = 'error'
      transaction.message = request.input('respmsg')
      await transaction.save()

      request_log.response = 'Error:' + request.input('respmsg') + JSON.stringify({
        status: 0,
        messages: check.messages,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return outHtml.replace('#msg#', 'خطا در تراکنش بانکی' + '<br/>' + request.input('respmsg'))
      /*
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
      */
    }

    transaction.ref_id = request.input('tracenumber')
    transaction.rnn = request.input('rrn')

    transaction.status = 'pay'
    await transaction.save()

    // return 'Before Verify'


    let verifyResult = await transaction.verifySaderat(request.input('digitalreceipt'))

    if (verifyResult.Status!='Ok') {
      request_log.response = 'pay ok not verified : ' + verifyResult.Message
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()


      transaction.status = 'error'
      await transaction.save()
      return outHtml.replace('#msg#', 'خطا در تایید تراکنش بانکی' + '<br/>' + verifyResult.Message)
    }
    

    let user = await User.query().where('id', transaction.user_id).with('property').first()
    let userData = user.toJSON()

    let store = await Store.find(transaction.type_id)
    if(!store) {
      return outHtml.replace('#msg#', 'کالا پیدا نشد')
      /*
      return [{
        status: 0,
        messages: [],
        data: {}
      }]
      */
    }

    store.stat++
    await store.save()

    const log = new Log()
    log.type = 'mall_trade'
    log.type_id = store.id
    log.user_id = user.id

    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin
    })
    log.after_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin+store.coin
    })

    await log.save()


    user.coin += store.coin
    user.coin_incomes += store.coin
    await user.save()

    request_log.response = 'pay ok'
    request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
    await request_log.save()

    return outHtml.replace('#msg#', 'تراکنش با موفقیت انجام گرفت و ' + store.coin + ' سکه به حساب شما اضافه شد' + '<br/>' + 'لطفا به بازی مراجعه کرده و روی آیکون سکه های خود کلیک کنید')
    /*
    return [{
      status: 1,
      messages: [],
      data: {}
    }]
    */
  }

  async saderatSend ({
    request,
    response
  }) {
    let rules = {
      transaction: 'required'
    }


    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let transaction = await Transaction.find(request.input('transaction'))
    if (!transaction) {
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    let user = await User.find(transaction.user_id)
    if(!user) {
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    let output = '<html><body><form method="POST" id="frm1" action="' + Env.get('BANK_SADERAT_POST_ACTION') + '" target="_self">'
    output += '<input type="hidden" name="token" value="' + transaction.payment_ticket + '" />'
    // mobileNo
    output += '<input type="hidden" name="TerminalID" value="' + Env.get('BANK_SADERAT_MERCHANT_ID') + '" />'
    output += '</form><script> /*if(confirm("send?")){*/document.getElementById("frm1").submit();/*}*/ </script></body></html>'

    return output
  }

  async samanSend ({
    request,
    response
  }) {
    let rules = {
      transaction: 'required'
    }


    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let transaction = await Transaction.find(request.input('transaction'))
    if (!transaction) {
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    let user = await User.find(transaction.user_id)
    if(!user) {
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
    }

    let output = '<html><body><form method="POST" id="frm1" action="' + Env.get('BANK_SAMAN_POST_ACTION') + '" target="_self">'
    output += '<input type="hidden" name="Token" value="' + transaction.payment_ticket + '" />'
    output += '</form><script> /*if(confirm("send?")){*/document.getElementById("frm1").submit();/*}*/ </script></body></html>'

    return output
  }
 /*
0|server   | { Token: 'c17264525662464e9751635098bc64e6',
0|server   |   MID: '',
0|server   |   TerminalId: '11160946',
0|server   |   RefNum: 'fpxfCQtAYBXGty8oBD7xQGEAyn7Hyo',
0|server   |   ResNum: '976849030185',
0|server   |   State: 'OK',
0|server   |   TraceNo: '96458',
0|server   |   Amount: '1000',
0|server   |   Wage: '',
0|server   |   Rrn: '9600596533',
0|server   |   SecurePan: '627381******4555',
0|server   |   TRACENO: '96458',
0|server   |   RRN: '9600596533',
0|server   |   Status: '2' }

0|server   | { Token: '40c1a577b4194a91a07f689c3a815625',
0|server   |   MID: '',
0|server   |   TerminalId: '11160946',
0|server   |   RefNum: '',
0|server   |   ResNum: '715671084504',
0|server   |   State: 'CanceledByUser',
0|server   |   TraceNo: '',
0|server   |   Amount: '1000',
0|server   |   Wage: '',
0|server   |   Rrn: '',
0|server   |   SecurePan: '',
0|server   |   TRACENO: '',
0|server   |   RRN: '',
0|server   |   Status: '1' }
 */
  async samanRevert ({
    request,
    response
  }) {
    // return request.all()

    let rules = {
      State: 'required',
      // RefNum: 'required',
      ResNum: 'required'
    }

    let request_log = new RequestLog()
    request_log.user_id = -1
    request_log.type = request.method() + ':bank_saman_revert'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()

    var outHtml = '<html><body dir="rtl"><h1 style="text-align:center;">#msg#</h1></body></html>'
    let check = await Validations.check(request.all(), rules)
    if (check.err) {
      return outHtml.replace('#msg#', check.messages[0].message)
      /*
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
      */
    }

    let transaction = await Transaction.query().where('payment_ticket', request.input('Token')).where('status', 'pending').first()
    if (!transaction) {
      request_log.response = JSON.stringify(
        {
          status: 0,
          messages: '',
          data: {}
        }
      )
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return outHtml.replace('#msg#', 'تراکنش شما معتبر نمی باشد')
      /*
      return [{
        status: 0,
        messages: '',
        data: {}
      }]
      */
    }

    if (request.input('State') != "OK") {
      transaction.status = 'error'
      transaction.message = request.input('State')
      await transaction.save()

      request_log.response = 'Error:' + request.input('State') + JSON.stringify({
        status: 0,
        messages: check.messages,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return outHtml.replace('#msg#', 'خطا در تراکنش بانکی')
      /*
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
      */
    }

    transaction.ref_id = request.input('RefNum')
    transaction.trace = request.input('TraceNo')

    transaction.status = 'pay'
    await transaction.save()

    let verifyResult
    try {
      verifyResult = await transaction.verifySaman()
      console.log('Verify Result')
      console.log(verifyResult)
    } catch(e) {
      console.log('Verify Error')
      console.log(e)
      return outHtml.replace('#msg#', 'خطا در تایید تراکنش بانکی')
    }
    if (verifyResult.result.$value!=transaction.price) {
      request_log.response = 'pay ok not verified'
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()


      transaction.status = 'error'
      await transaction.save()
      return outHtml.replace('#msg#', 'خطا در تایید تراکنش بانکی')

    }
    

    let user = await User.query().where('id', transaction.user_id).with('property').first()
    let userData = user.toJSON()

    let store = await Store.find(transaction.type_id)
    if(!store) {
      return outHtml.replace('#msg#', 'کالا پیدا نشد')
      /*
      return [{
        status: 0,
        messages: [],
        data: {}
      }]
      */
    }

    store.stat++
    await store.save()

    const log = new Log()
    log.type = 'mall_trade'
    log.type_id = store.id
    log.user_id = user.id

    log.before_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin
    })
    log.after_state = JSON.stringify({
      ye: userData.property.ye,
      be: userData.property.be,
      elixir_1: userData.property.elixir_1,
      elixir_2: userData.property.elixir_2,
      elixir_3: userData.property.elixir_3,
      coin: userData.coin+store.coin
    })

    await log.save()


    user.coin += store.coin
    user.coin_incomes += store.coin
    await user.save()

    request_log.response = 'pay ok'
    request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
    await request_log.save()

    return outHtml.replace('#msg#', 'تراکنش با موفقیت انجام گرفت و ' + store.coin + ' سکه به حساب شما اضافه شد' + '<br/>' + 'لطفا به بازی مراجعه کرده و روی آیکون سکه های خود کلیک کنید')
    /*
    return [{
      status: 1,
      messages: [],
      data: {}
    }]
    */
  }
}

module.exports = TransactionController
