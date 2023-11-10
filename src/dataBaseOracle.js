const oracledb = require('oracledb');

// Configuración de la base de datos 1
var config1 = {
    user: 'APP_RFISCAL',
    password: 'R%f1sc4l23',
    connectString: '10.49.4.20:1521/mits' // Asegúrate de que esta propiedad esté configurada correctamente.
};

// Función para crear un pool de conexión
async function createPool(config) {
    try {
        try {
            var db = await oracledb.getConnection(config);
            console.log('Base de datos conectada Oracle ' + config.connectString.split('/')[1]);
            return db;
        } catch (error) {
            console.error('oracle Error al crear el pool de conexión: ', error);
            throw error;
        }
    } catch{}
}

// Crear pools para ambas bases de datos
var pool1 = createPool(config1);
//console.log("pool1")
//console.log(pool1)
module.exports = {
    pool1
};
