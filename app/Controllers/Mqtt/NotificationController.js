'use strict'

const Notification = use('App/Models/Notification')

const Validations = use('App/Libs/Validations')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

class NotificationController {
  // دریافت لیست نوتیفیکیشن ها
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

    let notifications = await Notification.query().where('status', 'active').orderBy('created_at', 'DESC').offset(params.page).limit(params.limit).fetch()

    let notificationsData = notifications.toJSON()

    for (const res of notificationsData) {
      res.date = Time(res.created_at).diff(Time().format('YYYY-M-D HH:mm:ss'), 'seconds')
      res.created_at = undefined
      res.updated_at = undefined
      res.status = undefined
    }

    user.unread_notifications = 0
    await user.save()

    return [{
      status: 1,
      messages: [],
      data: notificationsData
    }]
  }
}

module.exports = NotificationController
