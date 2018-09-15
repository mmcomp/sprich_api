'use strict'

const Ticket = use('App/Models/Ticket')
const User = use('App/Models/User')
const RequestLog = use('App/Models/RequestLog')
const phone = require('phone')


const axios = require('axios')
const querystring = require('querystring')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()

const Env = use('Env')
const Messages = use('App/Libs/Messages/Messages')
const Validations = use('App/Libs/Validations')
const _ = require('lodash')

class TicketController {
  async update ({
    request,
    response
  }) {
    let request_log = new RequestLog()
    request_log.user_id = -1
    request_log.type = request.method() + ':ticket_update'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()
    try {
      let params = request.all()

      const rules = {
        id: 'required',
        state: 'required',
        response: 'required'
      }
  
      let check = await Validations.check(params, rules)
      if (check.err) {
        request_log.response = JSON.stringify({
          status: 0,
          messages: check.messages,
          data: {}
        })
        request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
        await request_log.save()

        return [{
          status: 0,
          messages: check.messages,
          data: {}
        }]
      }

      if(params.state!='unread' && params.state!='read' && params.state!='checking' && params.state!='responsed' && params.state!='rejected'){
        request_log.response = JSON.stringify({
          status: 0,
          messages: [
            {
              "code": "stateNotFound",
              "message": "کد وضعیت موجود نمی باشد"
            }
          ],
          data: {}
        })
        request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
        await request_log.save()

        return response.send({
          status: 0,
          messages: [
            {
              "code": "stateNotFound",
              "message": "کد وضعیت موجود نمی باشد"
            }
          ],
          data: {}
        })
      }

      let ticket = await Ticket.query().where('id', params.id).first()

      if(!ticket){
        request_log.response = JSON.stringify({
          status: 0,
          messages: [
            {
              "code": "ticketNotFound",
              "message": "شماره تیکت موجود نمی باشد"
            }
          ],
          data: {}
        })
        request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
        await request_log.save()

        return response.send({
          status: 0,
          messages: [
            {
              "code": "ticketNotFound",
              "message": "شماره تیکت موجود نمی باشد"
            }
          ],
          data: {}
        })
      }

      ticket.state = params.state
      ticket.response = params.response
      await ticket.save()  

      request_log.user_id = ticket.user_id
      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {
          ticket_id: ticket.id,
          message: ticket.message,
          response: params.response,
          state: params.state
        }
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {
          ticket_id: ticket.id,
          message: ticket.message,
          response: params.response,
          state: params.state
        }
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)
      request_log.response = JSON.stringify({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  async add ({
    request,
    response
  }) {
    let request_log = new RequestLog()
    request_log.mobile = request.input('mobile')
    request_log.user_id = -1
    request_log.type = request.method() + ':ticket_add'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()
    try {
      let params = request.all()

      const rules = {
        mobile: 'required',
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

      let user = await User.query().where('mobile', params.mobile).first()

      if(!user){
        request_log.response = JSON.stringify({
          status: 0,
          messages: [
            {
              "code": "userNotFound",
              "message": "شماره موبایل موجود نمی باشد"
            }
          ],
          data: {}
        })
        request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
        await request_log.save()

        return response.send({
          status: 0,
          messages: [
            {
              "code": "userNotFound",
              "message": "شماره موبایل موجود نمی باشد"
            }
          ],
          data: {}
        })
      }

      let ticket = new Ticket()
      ticket.user_id = user.id
      ticket.message = params.message
      await ticket.save()  

      request_log.user_id = user.id
      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {
          ticket_id: ticket.id,
          message: ticket.message
        }
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {
          ticket_id: ticket.id,
          message: ticket.message
        }
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      request_log.response = JSON.stringify({
        status: 0,
        messages: error.message,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  async get ({
    request,
    response,
    params
  }) {
    let request_log = new RequestLog()
    request_log.mobile = request.input('mobile')
    request_log.user_id = -1
    request_log.type = request.method() + ':ticket_get'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()
    try {
      const rules = {
        mobile: 'required'
      }
  
      let check = await Validations.check(params, rules)
      if (check.err) {
        return [{
          status: 0,
          messages: check.messages,
          data: {}
        }]
      }
      params.mobile = phone(params.mobile, 'IR')
      params.mobile = params.mobile[0]

      let user = await User.query().where('mobile', params.mobile).first()

      if(!user){
        request_log.response = JSON.stringify({
          status: 0,
          messages: [
            {
              "code": "userNotFound",
              "message": "شماره موبایل موجود نمی باشد"
            }
          ],
          data: {}
        })
        request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
        await request_log.save()


        return response.send({
          status: 0,
          messages: [
            {
              "code": "userNotFound",
              "message": "شماره موبایل موجود نمی باشد"
            }
          ],
          data: {}
        })
      }

      let tickets = await Ticket.query().where('user_id',user.id).fetch()
      tickets = tickets.toJSON()
      let ticketDatas = [],tmpTicket
      for(let i =0;i < tickets.length;i++){
        tmpTicket = tickets[i]
        delete tmpTicket.user_id
        ticketDatas.push(tmpTicket)
      }

      request_log.user_id = user.id
      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {
          tickets: ticketDatas
        }
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {
          tickets: ticketDatas
        }
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      request_log.response = JSON.stringify({
        status: 0,
        messages: error.message,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  async get_all ({
    request,
    response
  }) {
    let request_log = new RequestLog()
    request_log.type = request.method() + ':ticket_getall'
    request_log.data = JSON.stringify(request.all())
    await request_log.save()
    try {

      let tickets = await Ticket.query().with('user').fetch()
      tickets = tickets.toJSON()
      let ticketDatas = [],tmpTicket
      for(let i =0;i < tickets.length;i++){
        tmpTicket = tickets[i]
        delete tmpTicket.user_id
        tmpTicket.name = tmpTicket.user.nickname
        tmpTicket.avtar = tmpTicket.user.avatar
        delete tmpTicket.user
        ticketDatas.push(tmpTicket)
      }

      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {
          tickets: ticketDatas
        }
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {
          tickets: ticketDatas
        }
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      request_log.response = JSON.stringify({
        status: 0,
        messages: error.message,
        data: {}
      })
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      await request_log.save()

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }
}

module.exports = TicketController
