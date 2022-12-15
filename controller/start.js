import { Server } from '/-controller/Server.js'
import fs from 'fs/promises'

const { APP_PORT = 8888, APP_IP = null } = process.env;
Server.follow(APP_PORT, APP_IP)