'use strict'

// انجام normalize کردن شماره موبایل ارسالی توسط کاربر قبل از اینکه به controller برسد درخواست

const phone = require('phone')

class MobileNormalize {
  async handle ({
    request
  }, next) {
    // call next to advance the request
    const normalMobile = phone(request.input('mobile'), 'IR')
    if (normalMobile.length) {
      request.all()['mobile'] = normalMobile[0]
    }
    console.log(request.all())

    await next()
  }
}

module.exports = MobileNormalize
