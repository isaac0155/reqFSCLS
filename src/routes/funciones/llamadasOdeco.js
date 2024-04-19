const path = require('path');
const XLSX = require('xlsx');
const { netezzaConnectionOdeco } = require('../../dataBaseNetezza');


const resultOdeco = async (name, fechaIni, fechaFin, datos, io, id, ad) => {
    let str = datos;
    let array = str.split(',').map(s => s.trim().replace(/'/g, ''));
    console.log(array)
    var i = 0
    for (const element of array) {
        try {
            io.emit('server:progressRF_' + id, 88, 'Esperando a Llamadas Odeco')
            var connection = await netezzaConnectionOdeco;
            var query = `
            execute PR_DETALLE_LLAMADAS.STAGING.DETALLE(${element}1234,'${ad}','${element}','${fechaIni}','${fechaFin}','01111',NOW());
            `;
            
            console.log('Datos enviados e neteza');
            io.emit('server:progressRF_' + id, 88, 'Enviado a Llamadas Odeco')
            const result = await connection.query(query);

            await result;

            io.emit('server:progressRF_' + id, 88, 'Datos Obtenidos de Netezza')

            query = `
                select
                REQ_ID, NAME_A,NAME_B,FECHA_LLAMADA ,fecha_llamada_fin,
                tipo_llamada_grupo TIPO,SEGUNDOS_REDONDEO, tipo_llamada estado, ciudad_destino destino, mtr_comment,saldo_datos / 1000 saldo_datos_KB,(data_volumen_redondeo)/1000 KBYTES,
                saldo_segundos, saldo_sms,
                (saldo_controlado + saldo_carga + saldo_tranfucion + saldo_promo) saldo , importe
                FROM PR_DETALLE_LLAMADAS.STAGING.trafico_prepago_portal a
                --WHERE req_id  between 664 and 67
                WHERE req_id  in (${element}1234)
                and fecha_llamada >= TO_date ('${fechaIni}', 'YYYY-MM-DD')
                and fecha_llamada < TO_date ('${fechaFin}', 'YYYY-MM-DD')
                AND A.tipo_llamada_grupo<>'ENT'
                order by name_a,fecha_llamada_fin, FECHA_LLAMADA;
            `
            const resultOdeco = await connection.query(query);
            const jsonData = await resultOdeco
            const wb = XLSX.utils.book_new();

            // Crear una hoja de trabajo con los datos transformados
            const ws = XLSX.utils.json_to_sheet(jsonData);

            // Añadir la hoja de trabajo al libro
            XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');

            // Escribir el archivo XLSX (guardar en una ruta específica)
            io.emit('server:progressRF_' + id, 88, 'Excel Configurado con Llamadas Odeco')
            const rutaCompleta = path.join(__dirname, '..', '..', 'public', 'img', 'imgenCliente', `${name}_LLAMADAS_ODECO.xlsx`);
            XLSX.writeFile(wb, rutaCompleta);
            io.emit('server:progressRF_' + id, 88, 'Excel finalizado')
            i += 1
        } catch (err) {
            console.log({ error: err.message });
        }
    }
    return i
}

module.exports = resultOdeco;