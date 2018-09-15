'use strict'

const Label = use('App/Models/Label')
const User = use('App/Models/User')
const Validations = use('App/Libs/Validations')

const Database = use('Database')

const _ = require('lodash')

const type = {
  0: 'antiques_stat',
  1: 'elixir_stat',
  2: 'courage_stat'
}

const labelType = {
  0: 'antique',
  1: 'elixir',
  2: 'courge'
}

class LeaderBoardController {
  // نمایش لیست درخواستی کاربران بر حسب نوع لیست 
  static async list_old(params, user) {
    const rules = {
      type: 'required',
      limit: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    await user.loadMany(['level'])
    let userData = user.toJSON()

    let labels = await Label.query().where('type', labelType[params.type]).fetch()
    let users = await User.query().orderBy(type[params.type], 'DESC').limit(params.limit).with('level').fetch()

    let TopUsers = []
    let SimilarUsers = []
    let userInTop = false

    let rank = 1
    _.each(users.toJSON(), (usr) => {
      let newRecord = {
        rank: rank,
        name: usr.nickname,
        level: usr.level.name,
        avatar: usr.avatar,
        value: usr[type[params.type]],
        label: {
          name: '',
          image: 0
        },
        mine: false
      }

      if (usr.id == user.id) {
        userInTop = true
        newRecord.mine = true
      }

      _.each(labels.toJSON(), (label) => {
        if ((label.min <= rank || label.min === null) && (label.max > rank || label.max === null)) {
          newRecord.label = {
            name: label.name,
            image: parseInt(label.image)
          }
        }
      })

      TopUsers.push(newRecord)
      rank++
    })

    // Check Relations
    if (userInTop) {
      return [{
        status: 1,
        messages: [],
        data: {
          top: TopUsers,
          similar: []
        }
      }]
    }

    let limit = _.round(params.limit / 2)
    let userRank = await User.query().where('id', '!=', user.id).where('type[params.type]', '>=', userData[type[params.type]]).count()
    userRank = userRank[0]['count(*)']
    userRank++

    let topLimit = limit
    if (userRank - limit < params.limit) {
      topLimit = userRank - params.limit
    }

    users = await User.query().where('id', '!=', user.id).where('type[params.type]', '>=', userData[type[params.type]]).limit(topLimit).with('level').fetch()
    users.push(user)

    let usersBottom = await User.query().where('id', '!=', user.id).where('type[params.type]', '<', userData[type[params.type]]).limit(limit).with('level').fetch()

    _.merge(users, usersBottom)

    rank = userRank - topLimit
    _.each(users, (usr) => {
      let newRecord = {
        rank: rank,
        name: usr.nickname,
        level: usr.Level.name,
        avatar: usr.avatar,
        value: usr[type[params.type]],
        label: {
          name: '',
          image: 0
        },
        mine: false
      }

      if (usr.id == user.id) {
        newRecord.mine = true
      }

      _.each(labels, (label) => {
        if ((label.min <= rank || label.min === null) && (label.max > rank || label.max === null)) {
          newRecord.label = {
            name: label.name,
            image: parseInt(label.image)
          }
        }
      })

      SimilarUsers.push(newRecord)
      rank++
    })

    return [{
      status: 1,
      messages: [],
      data: {
        top: TopUsers,
        similar: SimilarUsers
      }
    }]
  }
  static async list(params, user) {
    let labels = await Database.raw('select * from labels where type = \'' + labelType[params.type] + "'");
    labels = labels[0]
    let users = await Database.raw("select users.*, levels.* from users left join levels on (levels.id = level_id) order by " + type[params.type] + " limit " + params.limit)
    users = users[0]

    let userData = await Database.raw("select users.*, levels.* from users left join levels on (levels.id = level_id)  where users.id = " + user.id)
    userData = userData[0][0]
    

    let TopUsers = []
    let SimilarUsers = []
    let userInTop = false

    let rank = 1
    _.each(users, (usr) => {
      let newRecord = {
        rank: rank,
        name: usr.nickname,
        level: usr.name,
        avatar: usr.avatar,
        value: usr[type[params.type]],
        label: {
          name: '',
          image: 0
        },
        mine: false
      }

      if (usr.id == user.id) {
        userInTop = true
        newRecord.mine = true
      }

      _.each(labels, (label) => {
        if ((label.min <= rank || label.min === null) && (label.max > rank || label.max === null)) {
          newRecord.label = {
            name: label.name,
            image: parseInt(label.image)
          }
        }
      })

      TopUsers.push(newRecord)
      rank++
    })


    if (userInTop) {
      return [{
        status: 1,
        messages: [],
        data: {
          top: TopUsers,
          similar: []
        }
      }]
    }

    let limit = _.round(params.limit / 2)

    let userRank = await Database.raw("select count(*) from users where id != " + user.id + " and " + type[params.type] + " >= " + userData[type[params.type]])
    userRank = userRank[0]['count(*)']
    userRank++

    let topLimit = limit
    if (userRank > params.limit && userRank - limit < params.limit) {
      topLimit = userRank - params.limit
    }

    users = await Database.raw("select users.*, levels.* from users left join levels on (levels.id = level_id) where users.id != " + user.id + " and " + type[params.type] + " >= " + userData[type[params.type]] + " limit " + topLimit)
    users = users[0]
    users.push(user.toJSON())

    let usersBottom = await Database.raw("select users.*, levels.* from users left join levels on (levels.id = level_id) where users.id != " + user.id + " and " + type[params.type] + " < " + userData[type[params.type]] + " limit " + limit)
    _.merge(users, usersBottom)

    rank = userRank - topLimit
    _.each(users, (usr) => {
      let newRecord = {
        rank: rank,
        name: usr.nickname,
        level: usr.name,
        avatar: usr.avatar,
        value: usr[type[params.type]],
        label: {
          name: '',
          image: 0
        },
        mine: false
      }

      if (usr.id == user.id) {
        newRecord.mine = true
      }

      _.each(labels, (label) => {
        if ((label.min <= rank || label.min === null) && (label.max > rank || label.max === null)) {
          newRecord.label = {
            name: label.name,
            image: parseInt(label.image)
          }
        }
      })

      SimilarUsers.push(newRecord)
      rank++
    })

    return [{
      status: 1,
      messages: [],
      data: {
        top: TopUsers,
        similar: SimilarUsers
      }
    }]
  }
}

module.exports = LeaderBoardController