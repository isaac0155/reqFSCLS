const enqueueFtpTask = require('./ftp')


const filtradoQuery = async (json, id, io) => {
    const { executeProcedure } = require('./oracleDbService');
    var datos = json.campo.join(',');
    var titular = 'datostitular' in json ? 'NOM+DIR' : ''
    var fechaIni = json.fechaIni.replace(/-/g, '')
    var fechaFin = json.fechaFin.replace(/-/g, '')
    var imei = 'imei' in json ? 'S' : ''
    var opciones
    var refTitulares = 'datostitularref' in json ? 'NOM' : ''

    let resultStrings = [];
    if ('flujollamadas' in json && !('flujosms' in json)) {
        resultStrings.push("LLA");
    } else if ('flujosms' in json || ('flujollamadas' in json && 'flujosms' in json)) {
        resultStrings.push("SMS");
    }
    if ('radiobases' in json) {
        resultStrings.push("CEL");
    }
    if ('imeiref' in json) {
        resultStrings.push("IMEI");
    }
    opciones = resultStrings.join('+');
    io.emit('server:progressRF_' + id, 15, 'Esperando a Mits')




    var procedureName, params;

    // Caso para "nombre"
    if (json.opcionSeleccionada == "nombre") {
        procedureName = `LD.RF_DATOS.NOMBRE`;
        params = {
            pvi_cod_req: `RF_${id}`,
            pvi_nombre: datos,
            pvi_fecha_ini: fechaIni,
            pvi_fecha_fin: fechaFin,
            pvi_imeis: imei,
            pvi_titulares: titular,
            pvi_llamadas: opciones,
            pvi_tit_traf: refTitulares
        };
    }

    // Caso para "telefono"
    if (json.opcionSeleccionada == "telefono") {
        procedureName = "LD.RF_DATOS.TELEFONO";
        params = {
            pvi_cod_req: `RF_${id}`,
            pvi_telefono: datos, 
            pvi_fecha_ini: fechaIni,
            pvi_fecha_fin: fechaFin,
            pvi_titulares: titular, 
            pvi_imeis_reg: imei, 
            pvi_llamadas: opciones, 
            pvi_tit_traf: refTitulares 
        };
    }

    // Caso para "imei"
    if (json.opcionSeleccionada == "imei") {
        procedureName = "LD.RF_DATOS.IMEI";
        params = {
            pvi_cod_req: `RF_${id}`,
            pvi_imei: datos, 
            pvi_fecha_ini: fechaIni,
            pvi_fecha_fin: fechaFin,
            pvi_titulares: titular, 
            pvi_llamadas: opciones, 
            pvi_tit_traf: refTitulares 
        };
    }

    // Caso para "ci"
    if (json.opcionSeleccionada == "ci") {
        procedureName = "LD.RF_DATOS.CI";
        params = {
            pvi_cod_req: `RF_${id}`,
            pvi_ci: datos, 
            pvi_fecha_ini: fechaIni,
            pvi_fecha_fin: fechaFin,
            pvi_imeis: imei, 
            pvi_titulares: titular, 
            pvi_llamadas: opciones, 
            pvi_tit_traf: refTitulares 
        };
    }
    try {
        await executeProcedure(procedureName, params);
        console.log('Procedimiento ejecutado exitosamente');
    } catch (error) {
        console.error('Error al ejecutar el procedimiento:', error, '//En:', json.opcionSeleccionada, params);
    }
    io.emit('server:progressRF_' + id, 45, 'Recogiendo resultados de Mits')
    // Ejemplo de cómo llamar a enqueueFtpTask
    return enqueueFtpTask(id, datos, io)
        .then(result => {
            //console.log('Tarea completada:', result);
            return result
        })
        .catch(error => {
            console.error('Error en la tarea:', error);
        });

}
module.exports = filtradoQuery;