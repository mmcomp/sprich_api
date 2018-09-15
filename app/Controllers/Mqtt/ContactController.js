'use strict'

const Contact = use('App/Models/Contact')
const Validations = use('App/Libs/Validations')
const Moment = use('App/Libs/Moment')

class ContactController {
  // لیست پیام های ارسال شده به سرور توسط کاربر
  static async list (params, user) {
    let results = []
    let messages = await Contact.query().where('user_id', user.id).orderBy('created_at', 'DESC').fetch()

    for (const message of messages) {
      results.push({
        type: message.type == 'user_aggregator' ? 1 : 2,
        message: message.message,
        data: Moment.m2s(message.created_at)
      })
    }

    await Contact.query().where('user_id', user.id).where('type', 'user_aggregator').update({
      status: 'read'
    })

    return [{
      status: 1,
      messages: [],
      data: {
        messages: results
      }
    }]
  }

  // ارسال پیام جدید در ارتباط با ما
  static async send (params, user) {
    const rules = {
      message: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let message = new Contact()
    message.user_id = user.id
    message.type = 'user_aggregator'
    message.message = params.message
    message.status = 'unread'
    await message.save()

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }
}

module.exports = ContactController
