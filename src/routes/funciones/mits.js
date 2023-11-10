const { pool1 } = require('../../dataBaseOracle');
const enqueueFtpTask = require('./ftp')


const filtradoQuery = async (json, id, io) => {
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
    var procedure = '';
    if (json.opcionSeleccionada == "nombre") {
        try {
            var conexion = await pool1;
            procedure = `
                           BEGIN
LD.RF_DATOS.NOMBRE(pvi_cod_req   =>'RF_${id}',
              pvi_nombre      =>'${datos}',
              pvi_fecha_ini =>'${fechaIni}',
              pvi_fecha_fin =>'${fechaFin}',
              pvi_imeis     =>'${imei}',
              pvi_titulares =>'${titular}',
              pvi_llamadas  =>'${opciones}',
              pvi_tit_traf  =>'${refTitulares}');
END;`;

            await conexion.execute(procedure);
            //await conexion.close();
            ////console.log('datos mits obtenido')
        } catch (error) {
            console.error('Error al ejecutar el procedimiento almacenado nombre:', error);
        }
    }
    if (json.opcionSeleccionada == "telefono") {
        try {
            var conexion = await pool1;
            procedure = `
BEGIN
LD.RF_DATOS.TELEFONO(pvi_cod_req =>'RF_${id}',
              pvi_telefono  =>'${datos}',
              pvi_fecha_ini =>'${fechaIni}',
              pvi_fecha_fin =>'${fechaFin}',
              pvi_titulares =>'${titular}',
              pvi_imeis_reg =>'${imei}',
              pvi_llamadas  =>'${opciones}',
              pvi_tit_traf  =>'${refTitulares}');
END;`;
            ////console.log(procedure);
            await conexion.execute(procedure);
            //await conexion.close();
            ////console.log('datos mits obtenido')
        } catch (error) {
            console.error('Error al ejecutar el procedimiento almacenado telefono:', error);
        }
    }
    if (json.opcionSeleccionada == "imei") {
        try {
            var conexion = await pool1;
            procedure = `
                           BEGIN
LD.RF_DATOS.IMEI(pvi_cod_req   =>'RF_${id}',
              pvi_imei      =>'${datos}',
              pvi_fecha_ini =>'${fechaIni}',
              pvi_fecha_fin =>'${fechaFin}',
              pvi_titulares =>'${titular}',
              pvi_llamadas  =>'${opciones}',
              pvi_tit_traf  =>'${refTitulares}');
END;`;
            await conexion.execute(procedure);
            //await conexion.close();
            ////console.log('datos mits obtenido')//console.log
        } catch (error) {
            console.error('Error al ejecutar el procedimiento almacenado imei:', error);
        }
    }
    if (json.opcionSeleccionada == "ci") {
        try {
            var conexion = await pool1;
            procedure = `
                           BEGIN
LD.RF_DATOS.CI(pvi_cod_req   =>'RF_${id}',
              pvi_ci      =>'${datos}',
              pvi_fecha_ini =>'${fechaIni}',
              pvi_fecha_fin =>'${fechaFin}',
              pvi_imeis     =>'${imei}',
              pvi_titulares =>'${titular}',
              pvi_llamadas  =>'${opciones}',
              pvi_tit_traf  =>'${refTitulares}');
END;
`;
            await conexion.execute(procedure);
            //await conexion.close();
            ////console.log('datos mits obtenido')
        } catch (error) {
            console.error('Error al ejecutar el procedimiento almacenado ci:', error);
        }
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