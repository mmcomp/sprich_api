'use strict'

class UserController {
  static async getData (params, user) {
    let userData = user.toJSON()

    console.log('User Data')
    console.log(userData)

    return [{
      status: 1,
      messages: [],
      data: {
        nickname: userData.nickname
      }
    }]
  }
}

module.exports = UserController
