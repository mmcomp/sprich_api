'use strict'

// تبدیل تاریخ ها و کار با تاریخ ها

const moment = require('moment-jalaali')

class Moment {
  static now (format = 'YYYY-M-D HH:mm:ss') {
    return moment().format(format)
  }

  // تبدیل میلادی به شمسی
  static m2s (date = '', format = 'jYYYY/jM/jD HH:mm:ss', inputFormat = 'YYYY-M-D HH:mm:ss') {
    return moment(date, inputFormat).format(format)
  }

  static moment () {
    return moment
  }
}

module.exports = Moment
