const path = require('path');
const XLSX = require('xlsx');
const { netezzaConnection } = require('../../dataBaseNetezza');


const resultadosSys = async  (name, fechaIni, fechaFin, datos, io, id) => {
    try {
        io.emit('server:progressRF_' + id, 70, 'Esperando a Netezza para Flujo de Datos')
        var connection = await netezzaConnection;
        const query = `
        SELECT A.FECHA_INICIO_LLAMADA, A.FECHA_FIN_LLAMADA, A.nro_telefono, A.NRO_TELEFONO_DESTINO,
        A.END_VALUE AS BYTES_NAVEGADOS, A.value BYTES_FACTURADOS, A.cell_id, A.imei,
        d.DESCRIPCION_CELDA
        FROM PR_TRAFICO.MODELO.fact_trafico a, PR_CATALOGO.DIM.dim_red_acceso d
        WHERE A.service_type LIKE '%data%'
        AND A.nro_telefono IN (${datos})
        AND D.IDW_RED_ACCESO =  a.IDW_RED_ACCESO
        AND FECHA_INICIO_LLAMADA >= '${fechaIni}'
        AND fecha_fin_llamada < '${fechaFin}';
        `;
        
        console.log('Datos enviados e neteza');
        io.emit('server:progressRF_' + id, 75, 'Esperando a Netezza')
        const result = await connection.query(query);
        if (result.count == 0) {
            console.log('no hay datos');
            return 0
        }
        const jsonData = result;

        io.emit('server:progressRF_' + id, 85, 'Datos Obtenido de Netezza')
        const wb = XLSX.utils.book_new();

        // Crear una hoja de trabajo con los datos transformados
        const ws = XLSX.utils.json_to_sheet(jsonData);
        
        // Añadir la hoja de trabajo al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
        
        // Escribir el archivo XLSX (guardar en una ruta específica)
        io.emit('server:progressRF_' + id, 86, 'Excel Configurado con Flujo de Datos')
        const rutaCompleta = path.join(__dirname, '..', '..', 'public', 'img', 'imgenCliente', `${name}_FLUJO_DE_DATOS.xlsx`);
        XLSX.writeFile(wb, rutaCompleta);
        io.emit('server:progressRF_' + id, 88, 'Excel finalizado')
        return 1
    } catch (err) {
        console.log({ error: err.message });
        return 0
    }
}

module.exports = resultadosSys;