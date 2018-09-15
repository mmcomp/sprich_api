'use strict'

const User = use('App/Models/User')
const Trap = use('App/Models/Trap')
const UserTrap = use('App/Models/UserTrap')

const Validations = use('App/Libs/Validations')
const Messages = use('App/Libs/Messages/Messages')
const _ = require('lodash')
const Randomatic = require('randomatic')
const Env = use('Env')
const hasha = require('hasha')

class LandController {
  // نمایش اطلاعات زمین و مقبره کاربر
  static async show (params, user) {
    await user.loadMany(['property', 'level'])
    const userData = user.toJSON()
    const pathParsed = JSON.parse(userData.property.path)

    let path = []
    let results = []

    let session = Randomatic('Aa', 30)

    await user.property().update({
      path_session: session
    })

    pathParsed.forEach(async (pa) => {
      let pathTrap = await Trap.query().where('id', pa.id).first()
      if (pathTrap) {
        path.push({
          index: pa.index,
          id: pa.id,
          level: pathTrap.hardness,
          block: pathTrap.block
        })
      }
    })

    let traps = await UserTrap.query().where('user_id', user.id).with('trap').fetch()
    traps = traps.toJSON()

    for (const trap of traps) {
      let trapIndex = -1
      results.forEach((res, index) => {
        if (res.id == trap.trap_id) {
          trapIndex = index
        }
      })
      if (trapIndex > -1) {
        results[trapIndex]['count']++
      } else {
        results.push({
          id: trap.trap_id,
          level: trap.trap.hardness,
          block: trap.trap.block,
          count: 1
        })
      }
    }

    return [{
      status: 1,
      messages: [],
      data: {
        traps: results,
        path: path,
        allow_traps: userData.level.path_traps_count,
        session: session
      }
    }]
  }

  // ویرایش زمین - ذخیره تغییرات کاربر بروی زمین مقبره شخصی
  static async store (params, user) {
    const rules = {
      path: 'array',
      hash: 'required',
      session: 'required'
    }

    let check = await Validations.check(params, rules)
    if (check.err) {
      return [{
        status: 0,
        messages: check.messages,
        data: {}
      }]
    }

    let userTrapUsed = []
    let userOwnTrap = {}

    let userTraps = await UserTrap.query().where('user_id', user.id).with('trap').fetch()
    let userTrapsData = userTraps.toJSON()

    const storeHash = hasha('store' + Env.get('ATTACK_SESSION') + params.session, {
      algorithm: 'sha256'
    })

    if (storeHash.toUpperCase() != params.hash) {
      return [{
        status: 0,
        messages: Messages.parse(['wrongPath']),
        data: {}
      }]
    }

    for (const trap of userTrapsData) {
      if (_.has(userOwnTrap, trap.trap_id)) {
        userOwnTrap[trap.trap_id]['count']++
      } else {
        userOwnTrap[trap.trap_id] = {
          count: 0,
          block: trap.trap.block
        }
      }
    }

    params.path.forEach((pa, index) => {
      if (!_.has(pa, 'index') || !_.has(pa, 'id')) {
        return [{
          status: 0,
          messages: Messages.parse(['wrongPath']),
          data: {}
        }]
      }

      if (!_.has(userOwnTrap, pa.id)) {
        return [{
          status: 0,
          messages: Messages.parse(['wrongPath']),
          data: {}
        }]
      }

      params.path.forEach((item, itemIndex) => {
        if (!_.has(userOwnTrap, pa.id) && item.index >= pa.index && item.index <= pa.index + userOwnTrap[pa.id]['block'] && index != itemIndex) {
          return [{
            status: 0,
            messages: Messages.parse(['wrongPath']),
            data: {}
          }]
        }
      })

      if (_.has(userTrapUsed, pa.id)) {
        userTrapUsed[pa.id]++
      } else {
        userTrapUsed[pa.id] = 0
      }

      params.path[index]['block'] = userOwnTrap[pa.id]['block']
    })

    for (const trapIndex in userTrapUsed) {
      if (userTrapUsed[trapIndex] > userOwnTrap[trapIndex]['count']) {
        return [{
          status: 0,
          messages: Messages.parse(['wrongPath']),
          data: {}
        }]
      }
    }

    await user.property().update({
      path: JSON.stringify(params.path)
    })

    await UserTrap.query().where('user_id', user.id).update({
      in_use: 'no'
    })

    for (const trapUsed in userTrapUsed) {
      await UserTrap.query().where('user_id', user.id).where('trap_id', trapUsed).limit(userTrapUsed[trapUsed]).update({
        in_use: 'yes'
      })
    }

    return [{
      status: 1,
      messages: [],
      data: {}
    }]
  }
}

module.exports = LandController
