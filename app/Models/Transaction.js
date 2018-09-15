'use strict'

// مدل مربوط به تراکنش های کاربران که این تراکنش ها می تواند شامل خرید سکه ، تعویض اکسیر با یک محصول و یا تعویض سکه با یک محصول باشد .

const Model = use('Model')
const axios = require('axios')
const querystring = require('querystring')

const Soap = require('soap')
const Env = use('Env')
const _ = require('lodash')

class Transaction extends Model {
  static get table () {
    return 'transactions'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  // Relations
  user () {
    return this.belongsTo('App/Models/User', 'user_id', 'id')
  }

  // Mehtods
  // تایید تراکنش مرتبط با خرید سکه
  async verify () {
    /*
    return Soap.createClientAsync(Env.get('BANK_REQUEST_URL')).then(async client => {
      return client.verifyAsync({
        merchantId: Env.get('BANK_MERCHANT_ID'),
        wsp1: Env.get('BANK_WSP1'),
        wsp2: Env.get('BANK_WSP2'),
        paymentTicket: this.payment_ticket
      })
    }).then(async result => {
      if (_.has(result, 'resultCode') && result.resultCode >= 0 &&
        result.resultCode == this.price && result.paymentId == this.payment_id) {
        this.status = 'success'
        await this.save()

        return true
      } else {
        this.status = 'error'
        this.messages = 'verify faield'
        await this.save()

        return false
      }
    })
    */

    let args = {
      terminalId: Env.get('BANK_MELLAT_MERCHANT_ID'),
      userName: Env.get('BANK_MELLAT_USER'),
      userPassword: Env.get('BANK_MELLAT_PASS'),
      orderId: this.payment_id,
      saleOrderId: this.payment_id,
      saleReferenceId: this.ref_id
    }

    return new Promise(function(resolve, reject){
      let res = Soap.createClient(Env.get('BANK_MELLAT_REQUEST_URL'), function(err, client) {
        if(err !== null) return reject(err)
        client.bpVerifyRequest(args, function(err, result) {
          if(err !== null) return reject(err)
          resolve(result)
        })
      })
    })
  }

  async verifySaderat (digitalreceipt) {
    let args = {
      digitalreceipt: digitalreceipt,
      Tid: Env.get('BANK_SADERAT_MERCHANT_ID')
    }

    return new Promise(function(resolve, reject){
      console.log('Verify Request')
      console.log(args)
      axios.post(Env.get('BANK_SADERAT_VERIFY_URL'), args).then(function(res) {
        console.log('Verify Response')
        console.log(res.data)
        resolve(res.data)
      }).catch(function(err) {
        reject(err)
      })
    })
  }

  async verifySaman () {
    /*
    return Soap.createClientAsync(Env.get('BANK_REQUEST_URL')).then(async client => {
      return client.verifyAsync({
        merchantId: Env.get('BANK_MERCHANT_ID'),
        wsp1: Env.get('BANK_WSP1'),
        wsp2: Env.get('BANK_WSP2'),
        paymentTicket: this.payment_ticket
      })
    }).then(async result => {
      if (_.has(result, 'resultCode') && result.resultCode >= 0 &&
        result.resultCode == this.price && result.paymentId == this.payment_id) {
        this.status = 'success'
        await this.save()

        return true
      } else {
        this.status = 'error'
        this.messages = 'verify faield'
        await this.save()

        return false
      }
    })
    */

    let args = {
      String_1: this.ref_id,
      String_2: Env.get('BANK_SAMAN_MERCHANT_ID')
    }
    console.log('Verify SAMAN')
    console.log(args)
    return new Promise(function(resolve, reject){
      let res = Soap.createClient(Env.get('BANK_SAMAN_VERIFY_URL'), function(err, client) {
        if(err !== null) return reject(err)
        client.verifyTransaction(args, function(err, result) {
          if(err !== null) return reject(err)
          resolve(result)
        })
      })
    })
  }
}

module.exports = Transaction
