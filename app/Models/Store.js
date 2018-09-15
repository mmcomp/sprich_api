'use strict'

// مدل مربوط به خرید سکه از فروشگاه

const Model = use('Model')
const axios = require('axios')
const querystring = require('querystring')

const Soap = require('soap')
const Env = use('Env')

class Store extends Model {
  static get table () {
    return 'store'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Methods
  // ساخت لینک خرید ویا همان لینک اتصال به بانک برای خرید سکه
  async getBuyLink (user, payment_id, bankType) {
    function twoDigit(inp) {
      let out = parseInt(inp, 10)
      if(out<10) {
          out = '0' + out
      } else {
          out = String(out)
      }
      return out
    }
    if(bankType=='saman') {
      console.log(payment_id, parseInt(payment_id, 10))
      let args = {
        action: 'token',
        TerminalId: Env.get('BANK_SAMAN_MERCHANT_ID'),
        RedirectUrl: Env.get('BANK_SAMAN_REVERT_URL'),
        ResNum: payment_id,
        Amount: parseInt(this.price),
        CellNumber: user.mobile.replace('+98', '0')
      }
      /*
      args = {
        action: 'token',
        TerminalId: '11160946' ,
        RedirectUrl: 'http://185.88.153.232:8080/bank_saman_revert',
        ResNum: 4,
        Amount: 1000,
        CellNumber: '09155193104'
      }
      */
      console.log('Bank Request')
      console.log(args)
      const response = await axios({
        method: 'post',
        url: 'https://sep.shaparak.ir/MobilePG/MobilePayment',
        data: querystring.stringify(args)
      })
      console.log('Bank Response')
      console.log(response.data)
      /*
      return new Promise(function(resolve, reject){
        console.log('Bank Request')
        console.log(args)
        axios.post(Env.get('BANK_SADERAT_REQUEST_URL'), args).then(function(res) {
          console.log('Bank Response')
          console.log(res.data)
          resolve(res.data)
        }).catch(function(err) {
          reject(err)
        })
      })
      */
     return response.data
    }else if(bankType=='saderat') {
      let args = {
        Amount: parseInt(this.price),
        callBackUrl: Env.get('BANK_SADERAT_REVERT_URL'),
        invoiceID: payment_id,
        terminalID: Env.get('BANK_SADERAT_MERCHANT_ID')
      }

      return new Promise(function(resolve, reject){
        console.log('Bank Request')
        console.log(args)
        axios.post(Env.get('BANK_SADERAT_REQUEST_URL'), args).then(function(res) {
          console.log('Bank Response')
          console.log(res.data)
          resolve(res.data)
        }).catch(function(err) {
          reject(err)
        })
      })
    }else{
      let d = new Date()

      let args = {
        terminalId: Env.get('BANK_MELLAT_MERCHANT_ID'),
        userName: Env.get('BANK_MELLAT_USER'),
        userPassword: Env.get('BANK_MELLAT_PASS'),
        amount: parseInt(this.price),
        orderId: payment_id,
        payerId: user.id,
        localDate: d.getFullYear() + twoDigit(d.getMonth()+1) + twoDigit(d.getDate()),
        localTime: twoDigit(d.getHours()) + twoDigit(d.getMinutes()) + twoDigit(d.getSeconds()),
        additionalData: '',
        callBackUrl: Env.get('BANK_MELLAT_REVERT_URL')
      }
      console.log('Bank Request')
      console.log(args)

      return new Promise(function(resolve, reject){
        let result = Soap.createClient(Env.get('BANK_MELLAT_REQUEST_URL'), function(err, client) {
          if(err !== null) return reject(err)
          client.bpPayRequest(args, function(err, result) {
            if(err !== null) return reject(err)
            resolve(result)
          })
        })  
      })
    }
  }
}

module.exports = Store
