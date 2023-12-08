const pool = require('../../database');
const filtradoQuery = require('./mits');
const resultadosSys = require('./system')
const { extraerNumeros } = require('./format');
const recargas = require('./recargas')



const formatJson = (json) => {
    const { opcionSeleccionada, ...otrosCampos } = json;
    let campo = [];
    for (const key in otrosCampos) {
        if (key.startsWith('campo_')) {
            campo.push(otrosCampos[key].trim());
            delete otrosCampos[key];
        }
    }
    return { opcionSeleccionada, campo, ...otrosCampos }
}

const controlRRFF = async (json, nuevoReqBody, idPersona, id, socket, io) => {
    const keys_to_check = ["datostitular", "flujollamadas", "flujosms", "radiobases", "imei", "datostitularref", "imeiref", "flujodatos", "recargas"];
    const keys_present = keys_to_check.filter(key => key in json);
    const result_string = keys_present.join(", ");
    await pool.query(`
            insert into historialconsulta set 
            idPersona = ${idPersona}, 
            fecha = '${json.fecha}', 
            rangoBusqueda = '${json.fechaIni} / ${json.fechaFin}', 
            datoSolicitado = '${result_string}', 
            nombre = 'RF_${id}', 
            tipoBusqueda='${json.opcionSeleccionada}', 
            pm = '${json.pm}',
            body = '${JSON.stringify(nuevoReqBody)}';`)

    socket.emit('server:solicitudRRFF', id);
    io.emit('server:progressRF_' + id, 5, 'Historial creado')

    var respo = await filtradoQuery(nuevoReqBody, id, io)
    var response = respo.txt.trim() || ''
    const posicion = response.indexOf("--------------");
    var nuevoTexto = posicion !== -1 ? response.substring(0, posicion) : response;
    var archivos = respo.datos1.archivos > 0 ? respo.datos1.archivos : false
    //console.log('archivos', archivos);
    nuevoTexto = nuevoTexto.trim()
    const resultado = nuevoTexto.match(/\d+\. TRAFICO:\n([\s\S]*?)(?:\n\n|\d+\.\s+\w+:|$)/);
    var ang
    ang = extraerNumeros(resultado[1].trim())
    if ('flujodatos' in json) {

        if (resultado && resultado[1]) {
            io.emit('server:progressRF_' + id, 65, 'Enviando datos a Netezza')
            
            var xls = await resultadosSys(respo.datos1.nombre, json.fechaIni, json.fechaFin, ang, io, id);
            //console.log('xls',xls);
            if (xls > 0) {
                archivos = archivos + xls;
                nuevoTexto += `
-TRAFICO DE DATOS ADJUNTO.
                        `
            } else {
                nuevoTexto += `
-NO HAY TRAFICO DE DATOS.
                        `
            }
        } else {
            //console.log('No se encontró el patrón');
            nuevoTexto += `
-NO HAY TRAFICO DE DATOS.
                `
        }
    }
    if ('recargas' in json) {
        io.emit('server:progressRF_' + id, 90, 'Buscando detalle de Recargas Credito')
        var rec = await recargas(json.fechaIni, json.fechaFin, ang, io, id)
        if (rec) {
            archivos = archivos + rec
            nuevoTexto += `
-TRAFICO DE RECARGAS Y CREDITO ADJUNTO.`
        } else {
            nuevoTexto += `
-NO HAY TRAFICO DE RECARGAS.
`
        }
    }
    nuevoTexto += `
---------------------------------------------------------------------------------------------------------

`
    io.emit('server:progressRF_' + id, 99, 'Historial finalizado')
    await pool.query(`
            update historialconsulta set 
                entradaBusqueda = '${respo.datos1.busqueda}', 
                resultado = '${nuevoTexto.trim()}', 
                archivo = ${archivos}, 
                body = null 
                where nombre = 'RF_${id}';
            `)
    io.emit('server:progressRF_' + id, 100, 'Tarea Finalizada')
    var instruccion = 'server:solicitudRRFFRF_' + id;
    io.emit(instruccion);
}

module.exports = {
    controlRRFF,
    formatJson
}