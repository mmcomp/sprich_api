'use strict'

const Model = use('Model')

class Ip extends Model {
  static get table () {
    return 'ips'
  }
}

module.exports = Ip
