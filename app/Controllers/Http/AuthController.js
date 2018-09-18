'use strict'

// controller مرتبط به درخواست های auth, mqtt Auth

const User = use('App/Models/User')
const Verify = use('App/Models/Verify')

const Messages = use('App/Libs/Messages/Messages')
const Setting = use('App/Models/Setting')
const RequestLog = use('App/Models/RequestLog')
const Randomatic = require('randomatic')
const Ip = use('App/Models/Ip')

const querystring = require('querystring')
const axios = require('axios')

const Validations = use('App/Libs/Validations')
const Env = use('Env')
const Moment = use('App/Libs/Moment')
const Time = Moment.moment()
const _ = require('lodash')
class AuthController {
  // تست فعال بودن سرور از سمت کلاینت
  async ping ({
    request,
    response
  }) {
    try {
      return response.send({
        status: 1,
        messages: [],
        data: {}
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  // ایجاد کد یکبار مصرف برای ثبت نام و لاگین به سیستم
  async signin ({
    request,
    response
  }) {
    try {
      const ipAddress = request.request.socket.remoteAddress
      let theIp = await Ip.query().where('ip', ipAddress).first()
      if(theIp) {
        let lastReq = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(theIp.updated_at, 'second')
        if(lastReq <= 60 && theIp.count < 5) {
          theIp.count++
          theIp.save()
        } else if(lastReq > 60) {
          theIp.count = 1
          theIp.save()
        } else {
          return response.send({
            status: 0,
            messages: [
              {
                "code": "ipBlocked",
                "message": "از آی پی شما درخواست غیرمجاز ارسال شده"
              }
            ],
            data: {}
          })
        }
      } else {
        theIp = new Ip
        theIp.ip = ipAddress
        theIp.count = 1
        theIp.save()
      }
    
      const rules = {
        mobile: 'required|mobile'
      }

      let check = await Validations.check(request.all(), rules)
      if (check.err) {
        return response.status(400).send({
          status: 0,
          messages: check.messages,
          data: {}
        })
      }

      let request_log = new RequestLog()
      request_log.mobile = request.input('mobile')
      request_log.user_id = -1
      request_log.type = 'post:signin'
      request_log.save()

      request_log.data = JSON.stringify(request.all())
      

      const setting = await Setting.get()
      let user = await User.query().where('mobile', request.input('mobile')).whereRaw("token like 'ban_%'").first()
      if(user){
        //User is Banned
        request_log.user_id = user.id
        request_log.response = JSON.stringify({
          status: 0,
          messages: [{
            code: 'userBanned',
            message: setting.ban_message//'شماره شا غیرفعال می باشد'
          }],
          data: {}
        })
        
        
        await request_log.save()
  
        return response.status(400).send({
          status: 0,
          messages: [{
            code: 'userBanned',
            message: setting.ban_message//'شماره شا غیرفعال می باشد'
          }],
          data: {}
        })
      }

      user = await User.query().where('mobile', request.input('mobile')).first()
      

      if (!user) {
        request_log.type = 'post:signup'
        let verifyStatus = await Verify.send('signup', request.input('mobile'))
        if (verifyStatus.err) {
          request_log.response = JSON.stringify({
            status: 0,
            messages: Messages.parse(verifyStatus.messages),
            data: {}
          })

          await request_log.save()
          return response.status(400).send({
            status: 0,
            messages: Messages.parse(verifyStatus.messages),
            data: {}
          })
        }

        request_log.response = JSON.stringify({
          status: 1,
          messages: [],
          data: {}
        })
        await request_log.save()

        return response.send({
          status: 1,
          messages: [],
          data: {}
        })
      }

      request_log.user_id = user.id

      let verifyStatus = await Verify.send('signin', request.input('mobile'))
      if (verifyStatus.err) {
        request_log.response = JSON.stringify({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
        await request_log.save()
        return response.status(400).send({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
      }

      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {}
      })
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {}
      })
    } catch (error) {
      // log error
      console.log('Error')
      console.log(error)

      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  async httpSignin ({
    request,
    response
  }) {
    try {
      const ipAddress = request.request.socket.remoteAddress
      let theIp = await Ip.query().where('ip', ipAddress).first()
      if(theIp) {
        let lastReq = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(theIp.updated_at, 'second')
        if(lastReq <= 60 && theIp.count < 5) {
          theIp.count++
          theIp.save()
        } else if(lastReq > 60) {
          theIp.count = 1
          theIp.save()
        } else {
          return response.send({
            status: 0,
            messages: [
              {
                "code": "ipBlocked",
                "message": "از آی پی شما درخواست غیرمجاز ارسال شده"
              }
            ],
            data: {}
          })
        }
      } else {
        theIp = new Ip
        theIp.ip = ipAddress
        theIp.count = 1
        theIp.save()
      }
    
      const rules = {
        mobile: 'required|mobile'
      }

      let check = await Validations.check(request.all(), rules)
      if (check.err) {
        return response.status(400).send({
          status: 0,
          messages: check.messages,
          data: {}
        })
      }

      let request_log = new RequestLog()
      request_log.mobile = request.input('mobile')
      request_log.user_id = -1
      request_log.type = 'post:http_signin'
      request_log.save()

      request_log.data = JSON.stringify(request.all())
      

      const setting = await Setting.get()
      let user = await User.query().where('mobile', request.input('mobile')).whereRaw("token like 'ban_%'").first()
      if(user){
        //User is Banned
        request_log.user_id = user.id
        request_log.response = JSON.stringify({
          status: 0,
          messages: [{
            code: 'userBanned',
            message: setting.ban_message//'شماره شا غیرفعال می باشد'
          }],
          data: {}
        })
        
        
        await request_log.save()
  
        return response.status(400).send({
          status: 0,
          messages: [{
            code: 'userBanned',
            message: setting.ban_message//'شماره شا غیرفعال می باشد'
          }],
          data: {}
        })
      }

      user = await User.query().where('mobile', request.input('mobile')).first()
      

      if (!user) {
        return response.status(400).send({
          status: 0,
          messages: [{
            code: "NotRegistered",
            message: "شماره موبایل وارد شده در بازی ثبت نام نشده است"
          }],
          data: {}
        })
      }

      request_log.user_id = user.id

      let verifyStatus = await Verify.send('http_signin', request.input('mobile'))
      if (verifyStatus.err) {
        request_log.response = JSON.stringify({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
        await request_log.save()
        return response.status(400).send({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
      }

      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')
      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {}
      })
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {}
      })
    } catch (error) {
      // log error
      console.log('Error')
      console.log(error)

      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  // بررسی کد وارد شده توسط کاربر و ثبت نام او در صورت عدم وجود شماره موبایل در سیستم
  async verify ({
    request,
    response
  }) {
    try {
      const ipAddress = request.request.socket.remoteAddress
      let theIp = await Ip.query().where('ip', ipAddress).first()
      if(theIp) {
        let lastReq = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(theIp.updated_at, 'second')
        if(lastReq <= 60 && theIp.count < 5) {
          theIp.count++
          theIp.save()
        } else if(lastReq > 60) {
          theIp.count = 1
          theIp.save()
        } else {
          return response.send({
            status: 0,
            messages: [
              {
                "code": "ipBlocked",
                "message": "از آی پی شما درخواست غیرمجاز ارسال شده"
              }
            ],
            data: {}
          })
        }
      } else {
        theIp = new Ip
        theIp.ip = ipAddress
        theIp.count = 1
        theIp.save()
      }
    
      const rules = {
        code: 'required',
        mobile: 'required|mobile'
      }

      let check = await Validations.check(request.all(), rules)
      if (check.err) {
        return response.status(400).send({
          status: 0,
          messages: check.messages,
          data: {}
        })
      }

      let request_log = new RequestLog()
      request_log.mobile = request.input('mobile')
      request_log.user_id = -1
      request_log.type = 'post:verify'
      request_log.data = JSON.stringify(request.all())
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')

      let verifyStatus = await Verify.check(request.input('mobile'), request.input('code'))
      if (verifyStatus.err) {
        request_log.response = JSON.stringify({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
        await request_log.save()

        return response.status(400).send({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
      }

      const token = User.getToken()
      let user

      switch (verifyStatus.verify.type) {
        case 'signup':
          request_log.type = 'post:verify_signup'
          user = new User()
          user.nickname = 'کاوشگر ' + Randomatic('0', 6)
          user.mobile = request.input('mobile')
          user.status = 'active'
          user.token = token

          await user.register()
          break

        case 'signin':
          request_log.type = 'post:verify_signin'
          user = await User.query().where('mobile', request.input('mobile')).first()
          user.token = token
          await user.save()
          break
      }
      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {
          mobile: request.input('mobile'),
          token: token
        }
      })
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {
          mobile: request.input('mobile'),
          token: token
        }
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  async httpVerify ({
    request,
    response
  }) {
    try {
      const ipAddress = request.request.socket.remoteAddress
      let theIp = await Ip.query().where('ip', ipAddress).first()
      if(theIp) {
        let lastReq = Time(Moment.now('YYYY-M-D HH:mm:ss')).diff(theIp.updated_at, 'second')
        if(lastReq <= 60 && theIp.count < 5) {
          theIp.count++
          theIp.save()
        } else if(lastReq > 60) {
          theIp.count = 1
          theIp.save()
        } else {
          return response.send({
            status: 0,
            messages: [
              {
                "code": "ipBlocked",
                "message": "از آی پی شما درخواست غیرمجاز ارسال شده"
              }
            ],
            data: {}
          })
        }
      } else {
        theIp = new Ip
        theIp.ip = ipAddress
        theIp.count = 1
        theIp.save()
      }
    
      const rules = {
        code: 'required',
        mobile: 'required|mobile'
      }

      let check = await Validations.check(request.all(), rules, 'http_signin')
      if (check.err) {
        return response.status(400).send({
          status: 0,
          messages: check.messages,
          data: {}
        })
      }

      let request_log = new RequestLog()
      request_log.mobile = request.input('mobile')
      request_log.user_id = -1
      request_log.type = 'post:http_verify'
      request_log.data = JSON.stringify(request.all())
      request_log.response_time = Moment.now('YYYY-M-D HH:mm:ss')

      let verifyStatus = await Verify.check(request.input('mobile'), request.input('code'), 'http_signin')
      if (verifyStatus.err) {
        request_log.response = JSON.stringify({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
        await request_log.save()

        return response.status(400).send({
          status: 0,
          messages: Messages.parse(verifyStatus.messages),
          data: {}
        })
      }

      let user = await User.query().where('mobile', request.input('mobile')).first()

      await user.loadMany(['property'])
      let userData = user.toJSON()

      let token = user.token

      request_log.response = JSON.stringify({
        status: 1,
        messages: [],
        data: {
          mobile: request.input('mobile'),
          token: token
        }
      })
      await request_log.save()

      return response.send({
        status: 1,
        messages: [],
        data: {
          mobile: request.input('mobile'),
          token: token,
          avatar: user.avatar,
          coin: user.coin,
          elixir_1: userData.property.elixir_1,
          elixir_2: userData.property.elixir_2,
          elixir_3: userData.property.elixir_3,
          nickname: user.nickname
        }
      })
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  // اعتبار سنجی ورود به mqtt ... 
  // با استفاده از کدی توکنی که در مرحله verify برای کاربر ثبت می شود باید داهل mqtt متصل شود .
  async mqttSignin ({
    request,
    response
  }) {
    console.log('MQTT SIGNIN')
    try {
      const rules = {
        username: 'required',
        password: 'required',
        clientid: 'required'
      }

      let check = await Validations.check(request.all(), rules)
      if (check.err) {
        // console.log('Error 1')
        return response.status(400).send({
          status: 0,
          messages: check.messages,
          data: {}
        })
      }

      if (Env.get('SERVER_CLIENT') == request.input('clientid') || Env.get('SERVER_CLIENT') == 'ad_' + request.input('clientid') || request.input('clientid') == 'terefik') {
        return response.send({})
        /*
        if (Env.get('SERVER_USERNAME') == request.input('username') && Env.get('SERVER_PASSWORD') == request.input('password')) {
          console.log('Is Server OK ' + process.pid)
          return response.send({})
        } else {
          console.log('Is Server NOK ' + process.pid)
          response
            .status(401)
            .send({})
        }
        */
      }

      //----TEREFIK------
      // console.log('Check Terefik')
      if(request.input('clientid').indexOf('terefik')==0){
        // console.log('Client Id : ' + request.input('clientid'))
        try{
          const terefikRes = await axios({
            method: 'post',
            url: 'http://localhost:3333/mqtt/auth',
            data: /*querystring.stringify(*/{
              username: request.input('username'),
              password: request.input('password'),
              clientid: request.input('clientid')
            }//)
          })
          // console.log('Terefik Response')
          // return terefikRes
          // console.log(terefikRes)
          if(terefikRes.status==200) {
            return response.send({})
          }else{
            return response.status(401).send({})
          }
          // return response.send({})
        }catch(e){
          // console.log('TERROR')
          // return response.send({})
          return response.status(401).send({})
        }
        // return terefikRes
      }
      //\---TEREFIK------

      const normalMobile = await Validations.normalizeMobile(request.input('username'))
      request.all()['username'] = normalMobile[0]
      // console.log('Request:')
      // console.log(request.all())
      const user = await User.query().where('mobile', request.input('username')).where('token', request.input('password')).first()
      // console.log('USER:')
      // console.log(user)
      if (!user || user.status !== 'active') {
        // console.log('Error 2')
        return response
          .status(401)
          .send({})
      }

      const unique = await User.query().where('client_id', request.input('clientid')).where('id', '!=', user.id).first()
      if (unique) {
        // console.log('Error 3')
        return response
          .status(401)
          .send({})
      }

      user.client_id = request.input('clientid')
      user.last_activity = Moment.now('YYYY-M-D HH:mm:ss')
      await user.save()

      return response.send({})
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }

  // اعتبار سنجی اجازه pub, sub داخل mqtt
  // بسته به اینکه سرور اصلی قصد ورود به mqtt را دارد یا کاربر معمولی این تابع بررسی های مورد نیاز را انجام می دهد .
  async mqttAcl ({
    request,
    response
  }) {
    console.log('MQTT ACL')
    try {
      const rules = {
        username: 'required',
        clientid: 'required',
        topic: 'required',
        access: 'required'
      }

      let check = await Validations.check(request.all(), rules)
      if (check.err) {
        console.log('E0')
        return response.status(400).send({
          status: 0,
          messages: check.messages,
          data: {}
        })
      }

      if (Env.get('SERVER_CLIENT') == request.input('clientid') || Env.get('SERVER_CLIENT') == 'ad_' + request.input('clientid') || request.input('clientid') == 'terefik') {
        return response.send({})
      }

      //----TEREFIK------
      // console.log('Check Terefik')
      if(request.input('clientid').indexOf('terefik')==0){
        // console.log('Client Id : ' + request.input('clientid'))
        try{
          const terefikRes = await axios({
            method: 'get',
            url: 'http://localhost:3333/mqtt/acl?' + querystring.stringify({
              username: request.input('username'),
              topic: request.input('topic'),
              clientid: request.input('clientid'),
              access: request.input('access')
            }),
            data: null
          })
          // console.log('Terefik Response', terefikRes.status)
          // return terefikRes
          // console.log(terefikRes)
          if(terefikRes.status==200) {
            return response.send({})
          }else{
            return response.status(401).send({})
          }
          // return response.send({})
        }catch(e){
          // console.log('TERROR')
          // console.log(e)
          // return response.send({})
          return response.status(401).send({})
        }
        // return terefikRes
      }
      //\---TEREFIK------

      const normalMobile = await Validations.normalizeMobile(request.input('username'))
      request.all()['username'] = normalMobile[0]

      const user = await User.query().where('mobile', request.input('username')).first()

      if (!user || user.status !== 'active' || user.client_id !== request.input('clientid')) {
        console.log('E1')
        return response
          .status(400)
          .send({})
      }

      // if ((request.input('topic') == Env.get('SERVER_SENDER_TOPIC') && request.input('access') == 2) ||
      //   (_.startsWith(request.input('topic'), 'client_' + user.token + '/') && request.input('access') == 1)) {
      //   return response
      //     .status(200)
      //     .send({})
      // }

      return response
        //.status(400)
        .send({})
    } catch (error) {
      // log error
      // SentryException.captureException(error)

      return response.status(500).send({
        status: 0,
        messages: Messages.parse(['UnknownError']),
        data: {}
      })
    }
  }
}

module.exports = AuthController
