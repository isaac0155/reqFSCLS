const oracledb = require('oracledb');

async function executeProcedure(procName, params = {}) {
    let connection;

    try {
        connection = await oracledb.getConnection(); // Obtener una conexión del pool

        // Construir la lista de parámetros basada en las claves del objeto params
        const paramKeys = Object.keys(params);
        const paramPlaceholders = paramKeys.map(key => `:${key}`).join(', ');

        // Construir la cadena SQL para llamar al procedimiento almacenado

        const sql = `BEGIN ${procName}(${paramPlaceholders}); END;`;
        console.log(sql, params)
        // Ejecutar el procedimiento almacenado con los parámetros
        await connection.execute(sql, params);
        console.error('ejecutado');
        
    } catch (err) {
        console.error('Error al ejecutar el procedimiento almacenado:', err);
        console.log({ sql, params }); // Mostrar la consulta y los parámetros para depuración
        throw err; // Relanzar el error para manejo externo
    } finally {
        if (connection) {
            try {
                await connection.close(); // Asegurarse de cerrar la conexión
            } catch (err) {
                console.error('Error al cerrar la conexión:', err);
            }
        }
    }
}
function convertirAPlano(sql, params) {
    // Extraer el nombre del procedimiento desde el sql original
    const procedureName = sql.match(/BEGIN\s+(.*?CI)\s*\(/)[1];

    // Iniciar la construcción de la cadena de llamada al procedimiento
    let procedureCall = `BEGIN\n${procedureName}(`;

    // Iterar sobre los parámetros para construir la lista de argumentos
    const paramsList = Object.entries(params).map(([key, value]) => {
        // Considerar si el valor es una cadena para añadir comillas
        const formattedValue = typeof value === 'string' ? `'${value}'` : value;
        return `              ${key} => ${formattedValue}`;
    }).join(",\n");

    // Cerrar la llamada al procedimiento
    procedureCall += `${paramsList}\n              );\nEND;`;

    return procedureCall;
}

module.exports = {
    executeProcedure
};
