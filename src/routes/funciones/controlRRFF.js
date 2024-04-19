// Importaciones de módulos y archivos necesarios para la funcionalidad
const pool = require('../../database');
const filtradoQuery = require('./mits');
const resultadosSys = require('./system');
const resultadoOdeco = require('./llamadasOdeco');
const { extraerNumeros } = require('./format');
const recargas = require('./recargas');

// Función para formatear el JSON eliminando prefijos específicos y organizando los datos
const formatJson = (json) => {
    const { opcionSeleccionada, ...otrosCampos } = json;
    let campo = [];
    for (const key in otrosCampos) {
        if (key.startsWith('campo_')) {
            campo.push(otrosCampos[key].trim());
            delete otrosCampos[key];
        }
    }
    return { opcionSeleccionada, campo, ...otrosCampos };
}

// Función principal para el control de solicitudes RF, incluyendo inserciones en la base de datos y emisiones de eventos
const controlRRFF = async (json, nuevoReqBody, idPersona, id, socket, io, ad) => {
    // Filtro de claves presentes en el JSON para determinar los datos solicitados
    const keys_to_check = ["datostitular", "referencias", "flujollamadas", "flujosms", "radiobases", "imei", "datostitularref", "imeiref", "flujodatos", "recargas", "flujollamadasodeco"];
    const keys_present = keys_to_check.filter(key => key in json);
    const result_string = keys_present.join(", ");
    
    //console.log(result_string)
    // Inserción en la tabla de historial de consulta con los datos recopilados
    await pool.query(`
            INSERT INTO historialconsulta SET 
            idPersona = ${idPersona}, 
            fecha = '${json.fecha}', 
            rangoBusqueda = '${json.fechaIni} / ${json.fechaFin}', 
            datoSolicitado = '${result_string}', 
            nombre = 'RF_${id}', 
            tipoBusqueda='${json.opcionSeleccionada}', 
            pm = '${json.pm}',
            body = '${JSON.stringify(nuevoReqBody)}';`);

    // Notificación al cliente sobre la solicitud en proceso
    socket.emit('server:solicitudRRFF', id);
    io.emit('server:progressRF_' + id, 5, 'Historial creado');

    // Procesamiento del filtro de consulta y manejo de resultados
    var respo = await filtradoQuery(nuevoReqBody, id, io);
    var response = respo.txt.trim() || '';
    const posicion = response.indexOf("--------------");
    var nuevoTexto = posicion !== -1 ? response.substring(0, posicion) : response;
    var archivos = respo.datos1.archivos > 0 ? respo.datos1.archivos : false;
    nuevoTexto = nuevoTexto.trim();
    const resultado = nuevoTexto.match(/\d+\. TRAFICO:\n([\s\S]*?)(?:\n\n|\d+\.\s+\w+:|$)/);
    var ang = '';
    
    try {
        ang = extraerNumeros(resultado[1].trim());
    } catch {
        ang = '';
    }
    //console.log(ang)
    if ('flujollamadasodeco' in json){
        if(ang.length > 0){
            var xls = await resultadoOdeco(respo.datos1.nombre, json.fechaIni, json.fechaFin, ang, io, id, ad)
            if (xls > 0) {
                archivos += xls;
                nuevoTexto += '\n-TRAFICO DE LLAMADAS ODECO ADJUNTO.\n';
            } else {
                nuevoTexto += '\n-NO HAY TRAFICO DE LLAMADAS ODECO.\n';
            }
        } else {
            nuevoTexto += '\n-NO HAY TRAFICO DE LLAMADAS ODECO.\n';
        }
    }
    
    // Procesamiento de flujos de datos si se incluyen en la solicitud
    if ('flujodatos' in json) {
        if (resultado && resultado[1]) {
            io.emit('server:progressRF_' + id, 65, 'Enviando datos a Netezza');

            var xls = await resultadosSys(respo.datos1.nombre, json.fechaIni, json.fechaFin, ang, io, id);
            if (xls > 0) {
                archivos += xls;
                nuevoTexto += '\n-TRAFICO DE DATOS ADJUNTO.\n';
            } else {
                nuevoTexto += '\n-NO HAY TRAFICO DE DATOS.\n';
            }
        } else {
            nuevoTexto += '\n-NO HAY TRAFICO DE DATOS.\n';
        }
    }

    // Procesamiento de recargas si se incluyen en la solicitud
    if ('recargas' in json) {
        io.emit('server:progressRF_' + id, 90, 'Buscando detalle de Recargas Credito');
        var rec = await recargas(json.fechaIni, json.fechaFin, ang, io, id);
        if (rec) {
            archivos += rec;
            nuevoTexto += '\n-TRAFICO DE RECARGAS Y CREDITO ADJUNTO.\n';
        } else {
            nuevoTexto += '\n-NO HAY TRAFICO DE RECARGAS.\n';
        }
    }

    // Finalización del texto y actualización del historial de consulta con los resultados finales
    nuevoTexto += '\n---------------------------------------------------------------------------------------------------------\n';
    io.emit('server:progressRF_' + id, 99, 'Historial finalizado');
    await pool.query(`
            UPDATE historialconsulta SET 
                entradaBusqueda = '${respo.datos1.busqueda}', 
                resultado = '${nuevoTexto.trim()}', 
                archivo = ${archivos}, 
                body = null 
                WHERE nombre = 'RF_${id}';
            `);
    io.emit('server:progressRF_' + id, 100, 'Tarea Finalizada');
    var instruccion = 'server:solicitudRRFFRF_' + id;
    io.emit(instruccion);
}

// Exportación de las funciones para su uso en otros módulos
module.exports = {
    controlRRFF,
    formatJson
}
