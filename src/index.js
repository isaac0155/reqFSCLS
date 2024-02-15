const express = require ('express');
const morgan = require('morgan');
const { engine } = require('express-handlebars');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const MySQLStore = require('express-mysql-session');
const {database} = require('./keys');
const passport = require('passport');
const schedule = require('node-schedule');
import { Server as WebSocketServer } from "socket.io";
const http = require('http')
const device = require('express-device')
import {PORT} from './config.js'
const eliminarArchivosAntiguos = require('./lib/config/deleteFiles')
const { backupDatabase, restoreDatabase, prueba } = require('./lib/config/backupMySQL')

//inicializaciones
const app = express();
const Server = http.createServer(app)
const io = new WebSocketServer(Server);
require('./lib/passport');

//app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(app.get('views'), 'layouts'),
    patialsDir: path.join(app.get('views'), 'partials'),
    extname: '.hbs',
    helpers: require('./lib/handlebars')
}));

app.set('view engine', '.hbs')

//middlewares
app.use(session({
    secret: 'sesionrapidamysql',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 3600000, // 1 hora
    },
    store: new MySQLStore(database)
}));


app.use(device.capture());
app.use(flash());
app.use(morgan('dev'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

//gloal variables
app.use((req, res, next) => {
    app.locals.success = req.flash('success');
    app.locals.warning = req.flash('warning');
    app.locals.danger = req.flash('danger');
    app.locals.user = req.user;
    req.device.type == 'desktop' ? app.locals.desk = true : app.locals.desk = false;
    next();
});

//archivos publicos
app.use(express.static(path.join(__dirname, 'public')));

//rutas
app.use(require('./routes/autentication'));
app.use('/links', require('./routes/links')(io));
app.use(require('./routes/index'));

//revision de datos y archivos
schedule.scheduleJob('0 4 * * *', function () {
    console.log("Revisar archivos pasados");
    eliminarArchivosAntiguos();
    console.log("Backup de Base de Datos");
    backupDatabase(false)
});

//backupDatabase()
//iniciar servidor
Server.listen(PORT, () =>{
    console.log('Servidor en el puerto', PORT);
});
