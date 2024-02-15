const async1 = require('async');
const FtpClient = require('ftp');
const fs = require('fs');
const path = require('path');

// Creación de una cola para manejar tareas FTP con concurrencia limitada a 4
const ftpQueue = async1.queue(ftpTaskHandler, 4);

// Función que se llama cuando todas las tareas de la cola han sido procesadas
ftpQueue.drain(() => {
    // Aquí se podría agregar lógica adicional una vez que todas las tareas FTP han sido completadas
    // console.log('Todas las tareas han sido procesadas');
});

// Manejador para tareas FTP individuales en la cola
function ftpTaskHandler(task, callback) {
    const id = task.id; // Identificador de la tarea
    const datos = task.datos; // Datos asociados con la tarea
    let callbackCalled = false; // Flag para asegurar que el callback se llama una sola vez

    // Creación de una nueva instancia de cliente FTP para manejar la conexión
    const ftp = new FtpClient();

    // Función segura para llamar al callback, asegurando que se llama solo una vez
    function safeCallback(err, result) {
        if (!callbackCalled) {
            callback(err, result);
            callbackCalled = true;
        }
    }

    // Notificación inicial del progreso de la tarea
    task.io.emit('server:progressRF_' + id, 60, 'Obteniendo Respuesta y/o archivos');

    // Evento ready: se dispara cuando la conexión FTP está lista para recibir comandos
    ftp.on('ready', function () {
        // Listado de archivos en un directorio específico del servidor FTP
        ftp.list('/backup/utl/ld_file/', function (err, list) {
            if (err) return safeCallback(err);

            // Filtrado de archivos que comienzan con un prefijo específico
            const archivosFiltrados = list.filter(item => item.name.startsWith('RF_' + id));
            let b = 0; // Contador para archivos procesados

            for (const archivo of archivosFiltrados) {
                let fileContent = ''; // Para acumular el contenido de los archivos de texto
                const localPath = path.join(__dirname, `../../public/img/imgenCliente/${archivo.name}`);

                // Recuperación de un archivo específico del servidor FTP
                ftp.get('/backup/utl/ld_file/' + archivo.name, function (err, stream) {
                    if (err) return safeCallback(err);

                    b++;

                    // Procesamiento específico para archivos .txt
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
                            // Llamada segura al callback con los resultados
                            safeCallback(null, { txt: fileContent, datos1 });
                        });

                        stream.on('error', function (err) {
                            safeCallback(err);
                        });
                    } else {
                        // Para otros tipos de archivos, simplemente se guardan localmente
                        const writeStream = fs.createWriteStream(localPath);
                        stream.pipe(writeStream);
                    }
                });
            }

            // Finalización de la conexión FTP
            ftp.end();
            // Notificación del progreso de la tarea
            task.io.emit('server:progressRF_' + id, 65, 'Resultados obtenidos');
        });
    });

    // Manejo de errores de conexión FTP
    ftp.on('error', function (err) {
        safeCallback(err);
    });

    // Inicio de la conexión FTP con las credenciales proporcionadas
    ftp.connect({
        host: '10.49.4.20',
        port: 21,
        user: 'ld',
        password: 'LD16'
    });
}

// Función para encolar una tarea FTP, devolviendo una promesa que se resuelve o rechaza basada en el resultado de la tarea
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

// Exportación de la función para su uso en otros módulos
module.exports = enqueueFtpTask
