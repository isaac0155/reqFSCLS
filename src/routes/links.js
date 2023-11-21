const helpers = require('../lib/helpers');
const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const archiver = require('archiver');
const express = require('express');
const router = express.Router();
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth')
const { isAdmin } = require('../lib/auth')
const { formatJson, controlRRFF } = require('./funciones/controlRRFF')
const { convertirFecha } = require('./funciones/format');

var ret = (io) => {
    io.on("connection", (socket) => {
        socket.on('cliente:verifUser', async (user) => {
            let existe = await pool.query('select COUNT(a.ad) as user from persona a where a.ad = ?', user)
            existe[0].user == 0 ? socket.emit('server:usuarioLibre') : socket.emit('server:usuarioUsado');
        });
        socket.on('cliente:verifRol', async (rol) => {
            var existe = await pool.query('select COUNT(a.idRol) as idRol from rol a where a.nombreRol = ?', rol);
            if (existe[0].idRol == 0) {
                socket.emit('server:rolLibre');
            } else {
                socket.emit('server:rolUsado')
            }
        });
        socket.on('cliente:registrarRol', async (id, rol, fecha) => {
            await pool.query('insert into rol set ?', { nombreRol: rol });
            var resul = await pool.query('select rol.nombreRol from rol where rol.nombreRol = ?', rol);
            await pool.query("insert into historialCambios set accion= 'Crear', cambio = 'Se crea el rol " + rol + "', idPersona=" + id + ", fecha='" + fecha + "';")
            var nits = await pool.query('SELECT * FROM rol ORDER BY idRol DESC');
            socket.emit('server:rolRegistrado', resul[0].nombreRol, nits);
        });
        socket.on('cliente:eliminarRol', async (id, rol, fecha) => {
            var persona = await pool.query('select count(*) per from persona where idRol=?', rol)
            if (persona[0].per > 0) {
                socket.emit('server:rolDependiente');
            } else {
                var oldRol = await pool.query('select nombreRol from rol where idRol=' + rol)
                await pool.query('DELETE FROM rol WHERE idRol = ?', rol)
                const nits = await pool.query('SELECT * FROM rol ORDER BY idRol DESC');
                await pool.query("insert into historialCambios set accion= 'Eliminar', cambio = 'Se elimina el rol " + oldRol[0].nombreRol + "', idPersona=" + id + ", fecha='" + fecha + "';")
                socket.emit('server:rolRegistrado', null, nits);
            }
        });
        socket.on('cliente:solicitudRRFF', async (json, idPersona) => {
            var nuevoReqBody = await formatJson(json)
            var id = shortid.generate();
            await controlRRFF( json, nuevoReqBody, idPersona, id, socket, io )
            
        });
    });
    /** */
    router.get('/profile/modify', isLoggedIn, async (req, res) => {
        res.render('links/index');
    });
    router.get('/panel', isAdmin, async (req, res) => {
        res.render('panel/index');
    });
    router.get('/profile/admin/modify', isAdmin, async (req, res) => {
        var rol = await pool.query('select * from rol;')
        res.render('panel/profile', { rol });
    });
    router.get('/admin/profile/:idPersona', isAdmin, async (req, res) => {
        const { idPersona } = req.params;
        var persona = await pool.query('select p.*, r.nombreRol as rol from persona p, rol r where p.idRol=r.idRol and p.idPersona=?;', idPersona)
        var rol = await pool.query('select * from rol;')
        res.render('panel/profileUser', { persona: persona[0], rol });
    });
    router.post('/admin/profile/:idPersona', isAdmin, async (req, res) => {
        const { idPersona } = req.params;
        var { username, rol, fecha } = req.body;
        var newData = {
            ad: username,
            idRol: rol,
            activo: req.body.activo ? true : false
        }
        await pool.query('update persona set ? where idPersona =' + idPersona, [newData])
        await pool.query("insert into historialCambios set accion= 'Modificar', cambio = 'Se modifica los datos del usuario " + newData.ad + "', idPersona=" + req.user.idPersona + ", fecha='" + fecha + "';")
        req.flash('success', 'Datos del Usuario modificados')
        res.redirect('/links/admin/profile/' + idPersona);
    });
    router.get('/admin/profile/reset/:idPersona/:fecha', isAdmin, async (req, res) => {
        const { idPersona, fecha } = req.params;
        var persona = await pool.query('select * from persona where idPersona = ?;', idPersona)
        persona = persona[0].ad;
        var passwordNew = await helpers.encryptPassword(persona);
        //console.log(passwordNew, idPersona)
        await pool.query("update persona set password='" + passwordNew + "' where idPersona=" + idPersona)
        await pool.query("insert into historialCambios set accion= 'Modificar', cambio = 'Se hace reset a la contraseña de " + persona + "', idPersona=" + req.user.idPersona + ", fecha='" + fecha + "';")
        req.flash('warning', 'La contraseña nueva es Igual que el AD')
        res.redirect('/links/admin/profile/' + idPersona);
    });
    router.get('/panel/roles', isAdmin, async (req, res) => {
        var rol = await pool.query('select * from rol;')
        res.render('panel/gestionarRoles', { rol });
    });
    router.get('/panel/newuser', isAdmin, async (req, res) => {
        var tipo = await pool.query('select * from rol;')
        res.render('auth/signup', { tipo });
    });
    router.get('/panel/verusuarios', isAdmin, async (req, res) => {
        var persona = await pool.query('SELECT p.*, r.nombreRol AS rol, COUNT(h.idHistorialConsulta) AS rrff FROM persona p JOIN rol r ON p.idRol = r.idRol LEFT JOIN historialconsulta h ON h.idPersona = p.idPersona GROUP BY p.idPersona, r.nombreRol order by p.ad asc')
        res.render('panel/verusuarios', { persona });
    });
    router.post('/panel/newuser', isAdmin, async (req, res) => {
        var { username, rol, fecha } = req.body;
        var newUser = {
            ad: username,
            idRol: rol,
            activo: req.body.activo ? true : false
        };
        newUser.password = await helpers.encryptPassword(username);
        await pool.query('INSERT INTO persona SET ?', [newUser]);
        await pool.query("insert into historialCambios set accion= 'Crear', cambio = 'Se crea el usuario " + username + "', idPersona=" + req.user.idPersona + ", fecha='" + fecha + "';")
        req.flash('success', 'usuario ' + req.body.username + ', registrado exitosamente')
        res.redirect('/links/panel/newuser');
    });
    router.post('/profile/admin/modify', isAdmin, async (req, res) => {
        var camb = req.body
        camb.activo = camb.activo ? true : false
        pool.query('update persona set ? where idPersona = ' + req.user.idPersona, { ad: camb.username, idRol: camb.rol, activo: camb.activo })
        await pool.query("insert into historialCambios set accion= 'Modificar', cambio = 'Modifica sus propios datos " + req.user.ad + "', idPersona=" + req.user.idPersona + ", fecha='" + camb.fecha + "';")
        req.flash('success', 'Cambios realizados correctamente')
        res.redirect('/links/profile/admin/modify');
    });
    router.post('/profile/modify', isLoggedIn, async (req, res) => {
        const validPassword = await helpers.matchPassword(req.body.passwordOld, req.user.password);
        if (validPassword) {
            var passwordNew = await helpers.encryptPassword(req.body.password);
            await pool.query("update persona set password = ? where idPersona=" + req.user.idPersona, [passwordNew]);
            await pool.query("insert into historialCambios set accion= 'Modificar', cambio = 'Modifica su propia Contraseña " + req.user.ad + "', idPersona=" + req.user.idPersona + ", fecha='" + req.body.fecha + "';")
            req.flash('success', 'Contraseña Actualizada Correctamente')
        } else {
            req.flash('danger', 'Contraseña Actual Incorrecta')
        }
        res.redirect('/links/profile/modify');
    });
    router.get('/requerimientoFiscal/resultado/:nombre', isLoggedIn, async (req, res) => {
        const { nombre } = req.params;
        var resp = await pool.query("select a.*, b.ad from historialconsulta a, persona b where a.nombre = ? and a.idPersona = b.idPersona", nombre)
        try {
            resp[0].fecha = convertirFecha(resp[0].fecha);
            //console.log(resp[0])
            res.render('links/resultado', { res: resp[0] });
        } catch (error) {
            res.redirect('/no existe')
        }
        //res.render('links/resultado');
    });
    router.get('/download/:nombre', isLoggedIn, async (req, res) => {
        const { nombre } = req.params;
        const directoryPath = path.join(__dirname, '../public/img/imgenCliente/');
        const outputFilePath = path.join(__dirname, nombre + '.rar'); // Ruta completa al archivo .rar
        const output = fs.createWriteStream(outputFilePath);
        const archive = archiver('zip');

        // Escuchar eventos de archivado
        archive.on('error', (err) => {
            throw err;
        });

        // Empaquetar archivos en el archivo rar
        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }

            files.forEach((file) => {
                if (file.startsWith(nombre)) {
                    const filePath = path.join(directoryPath, file);
                    archive.append(fs.createReadStream(filePath), { name: file });
                }
            });
            archive.finalize();
        });
        res.attachment(nombre + '.rar');
        archive.pipe(res);
        archive.pipe(output);  // Esto guardará el archivo en el servidor
        res.on('finish', function () {
            fs.unlink(outputFilePath, (err) => {
                if (err) 
                    console.error('Error al eliminar el archivo:', err)
            });
        });
    });
    router.get('/historial', isLoggedIn, async (req, res) => {
        var historial = await pool.query('select * from historialcambios where idPersona = ' + req.user.idPersona + ' order by idHistorialCambios desc')
        historial.forEach((element, index) => {
            historial[index].fecha = convertirFecha(element.fecha);
        })
        var historialReq = await pool.query(`
            SELECT a.*,
                CASE
                    WHEN c.nombreRol = 'Administrador' THEN 'Administrador'
                    ELSE NULL
                END AS nombreRol
            FROM historialconsulta a, persona b, rol c
            WHERE a.idPersona = ${req.user.idPersona}
                AND a.idPersona = b.idPersona
                AND b.idRol = c.idRol
            ORDER BY a.idHistorialConsulta DESC;
        `)
        historialReq.forEach((element, index) => {
            historialReq[index].fecha = convertirFecha(element.fecha);
        })
        var ad = req.user
        var cantidad = await pool.query('select count(idHistorialConsulta) cantidad from historialconsulta where idPersona = ' + req.user.idPersona)
        cantidad = cantidad[0]
        var cantidad1 = await pool.query('select count(idHistorialCambios) cantidad from historialcambios where idPersona = ' + req.user.idPersona)
        cantidad1 = cantidad1[0]
        res.render('links/historial', { historial, historialReq, ad, cantidad, cantidad1 });
    });
    router.get('/panel/historial/sistem', isAdmin, async (req, res) => {
        var historial = await pool.query('select * from historialcambios a, persona b where a.idPersona = b.idPersona order by a.idHistorialCambios desc')
        historial.forEach((element, index) => {
            historial[index].fecha = convertirFecha(element.fecha);
        })
        var historialReq = await pool.query(`SELECT a.*, b.ad,
        CASE
            WHEN c.nombreRol = 'Administrador' THEN 'Administrador'
            ELSE NULL
        END AS nombreRol
        FROM historialconsulta a, persona b, rol c
        WHERE a.idPersona = b.idPersona
            AND b.idRol = c.idRol
            ORDER BY a.idHistorialConsulta DESC;
        `)
        historialReq.forEach((element, index) => {
            historialReq[index].fecha = convertirFecha(element.fecha);
        })
        var cantidad = await pool.query('select count(idHistorialConsulta) cantidad from historialconsulta;')
        cantidad = cantidad[0]
        var cantidad1 = await pool.query('select count(idHistorialCambios) cantidad from historialcambios;')
        cantidad1 = cantidad1[0]
        var ad = req.user.ad
        res.render('panel/historial', { historial, historialReq, ad, cantidad, cantidad1 });
    });
    router.get('/historial/:idPersona', isLoggedIn, async (req, res) => {
        const { idPersona } = req.params;
        var historial = await pool.query('select * from historialcambios where idPersona = ' + idPersona + ' order by idHistorialCambios desc')
        historial.forEach((element, index) => {
            historial[index].fecha = convertirFecha(element.fecha);
        })
        var historialReq = await pool.query(`
            SELECT a.*,
                CASE
                    WHEN c.nombreRol = 'Administrador' THEN 'Administrador'
                    ELSE NULL
                END AS nombreRol
            FROM historialconsulta a, persona b, rol c
            WHERE a.idPersona = ${idPersona}
                AND a.idPersona = b.idPersona
                AND b.idRol = c.idRol
            ORDER BY a.idHistorialConsulta DESC;
        `)
        historialReq.forEach((element, index) => {
            historialReq[index].fecha = convertirFecha(element.fecha);
        })
        var ad = await pool.query('select * from persona where idPersona = ' + idPersona)
        ad = ad[0]
        var cantidad = await pool.query('select count(idHistorialConsulta) cantidad from historialconsulta where idPersona = ' + idPersona)
        cantidad = cantidad[0]
        var cantidad1 = await pool.query('select count(idHistorialCambios) cantidad from historialcambios where idPersona = ' + idPersona)
        cantidad1 = cantidad1[0]
        ////console.log(ad)
        res.render('links/historial', { historial, historialReq, ad, cantidad, cantidad1 });
    });
    router.get('/requerimientoFiscal', isLoggedIn, async (req, res) => {
        res.render('links/requerimientoFiscal');
    });
    /** */
    return router
}

module.exports = ret