
const async1 = require('async');
const FtpClient = require('ftp');
const fs = require('fs');
const path = require('path');

const ftpQueue = async1.queue(ftpTaskHandler, 4);

ftpQueue.drain(() => {
    // console.log('Todas las tareas han sido procesadas');
});

function ftpTaskHandler(task, callback) {
    const id = task.id;
    const datos = task.datos;
    let callbackCalled = false;

    // Crear una nueva instancia de FtpClient para esta tarea
    const ftp = new FtpClient();

    function safeCallback(err, result) {
        if (!callbackCalled) {
            callback(err, result);
            callbackCalled = true;
        }
    }
    task.io.emit('server:progressRF_' + id, 60, 'Obteniendo Respuesta y/o archivos')
    ftp.on('ready', function () {
        ftp.list('/backup/utl/ld_file/', function (err, list) {
            if (err) return safeCallback(err);

            const archivosFiltrados = list.filter(item => item.name.startsWith('RF_' + id));
            let b = 0;

            for (const archivo of archivosFiltrados) {
                let fileContent = '';
                const localPath = path.join(__dirname, `../../public/img/imgenCliente/${archivo.name}`);

                ftp.get('/backup/utl/ld_file/' + archivo.name, function (err, stream) {
                    if (err) return safeCallback(err);

                    b++;

                    if (archivo.name.endsWith('.txt')) {
                        stream.on('data', function (chunk) {
                            fileContent += chunk.toString('latin1');
                        });

                        stream.once('close', function () {
                            const datos1 = {
                                nombre: 'RF_' + id,
                                busqueda: datos,
                                archivos: b - 1
                            };
                            safeCallback(null, { txt: fileContent, datos1 });
                        });

                        stream.on('error', function (err) {
                            safeCallback(err);
                        });
                    } else {
                        const writeStream = fs.createWriteStream(localPath);
                        stream.pipe(writeStream);
                    }
                });
            }

            ftp.end();
            task.io.emit('server:progressRF_' + id, 65, 'Resultados obtenidos')
        });
    });

    ftp.on('error', function (err) {
        safeCallback(err);
    });

    ftp.connect({
        host: '10.49.4.20',
        port: 21,
        user: 'ld',
        password: 'LD16'
    });
}

const enqueueFtpTask = (id, datos, io) => {
    return new Promise((resolve, reject) => {
        ftpQueue.push({ id, datos, io }, (err, result) => {
            if (err) {
                console.log('Error en la tarea:', err);
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

module.exports = enqueueFtpTask