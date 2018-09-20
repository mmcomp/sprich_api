'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/guides/routing
|
*/

const Env = use('Env')

const Route = use('Route')
const MqttClient = require('mqtt')

Route.match(['options'],'*',function * () {
  return 'allowed'
})

Route.get('/', ({
  request
}) => {
  return 'Api is working ...'
})

// All Http Routes
Route.post('/signin', 'AuthController.signin')
Route.post('/verify', 'AuthController.verify')
Route.post('/ping', 'AuthController.ping')

// Mqtt Http Routes
Route.post('/mqtt_signin', 'AuthController.mqttSignin')
Route.post('/mqtt_acl', 'AuthController.mqttAcl')

Route.post('/mqtt/auth', 'AuthController.mqttSignin')
Route.post('/mqtt/superuser', 'AuthController.mqttSignin')
Route.get('/mqtt/acl', 'AuthController.mqttAcl')

const { exec } = require('child_process')
exec('/root/downloads/emqx/bin/./emqx start', (err, stdout, stderr) => {
  if (err){
    console.log(err)
  }
  try{
  // Mqtt Connection
    let client = MqttClient.connect(Env.get('SERVER_MQTT'), {
      username: Env.get('SERVER_USERNAME'),
      password: Env.get('SERVER_PASSWORD'),
      clientId: Env.get('SERVER_CLIENT')
    })
    global.Mqtt = client

    client.on('connect', function () {
      client.subscribe(Env.get('SERVER_SENDER_TOPIC'))
      console.log('MQTT connected ...')
    })
    client.on('message', require('./mqttRoutes'))
  }catch(e){
    console.log('Mqtt Error', e.message)
  }
  console.log(stdout)
  console.log(stderr)
});