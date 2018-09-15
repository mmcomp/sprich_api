'use strict'

const Varbs = require('./Varbs')

class Messages {
  // ارسال کدهای پیام های و ارسال آن ها به همراه ترجمه آن ها برای کلاینت
  static parse (messages) {
    var text = []
    for (var filed in messages) {
      var filedValue = filed
      if (messages[filed] in Varbs) {
        filedValue = Varbs[messages[filed]]
      }
      text.push({
        code: messages[filed],
        message: filedValue
      })
    }
    return text
  }
}

module.exports = Messages
