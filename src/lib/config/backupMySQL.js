const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const clave = '0155'
const { database } = require('../../keys');
const data = `mysqldump -h${database.host} -u ${database.user}${database.password != '' ? '-p' + database.password : ''} ${database.database}`

function eliminarArchivo(rutaArchivo) {
    fs.unlink(rutaArchivo, (error) => {
        if (error) {
            console.error('Error al eliminar el archivo:', error);
            return;
        }
        console.log(`Archivo eliminado: ${rutaArchivo}`);
    });
}
const backupDatabase = () => {
    let fechaActual = new Date();
    let dia = fechaActual.getDate();
    let mes = fechaActual.getMonth() + 1; // getMonth() devuelve un índice basado en cero, por lo que se suma 1
    let año = fechaActual.getFullYear();
    // Formato de fecha y hora: DD-MM-AAAA
    let fechaFormateada = `${dia}-${mes}-${año}`;

    const backupPath = path.join(__dirname, '..', `/backup/${fechaFormateada}.sql`);
    exec(`${data} > ${backupPath}` , (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al realizar el backup: ${error}`);
            return;
        }
        console.log('Backup realizado con éxito.');
        encryptBackup(backupPath);
    });
}
async function encryptBackup(filePath) {
    const algorithm = 'aes-256-cbc';
    const password = clave; // Reemplaza con tu clave
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16); // IV aleatorio
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(filePath + '.enc');
    
    // Escribir el IV al inicio del archivo encriptado
    output.write(iv);
    
    input.pipe(cipher).pipe(output);
    
    output.on('finish', () => {
        console.log('Backup encriptado y guardado con éxito.');
        eliminarArchivo(filePath)
    });
}
const restoreDatabase = async (encryptedFilePath) => {
    //console.log('Archivo encriptado:', encryptedFilePath);
    const algorithm = 'aes-256-cbc';
    const password = clave; // La misma clave usada para encriptar
    const key = crypto.scryptSync(password, 'salt', 32);
    
    // Leer el IV del inicio del archivo encriptado
    const iv = fs.readFileSync(encryptedFilePath).slice(0, 16);
    
    // Crear el decipher con el IV
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const input = fs.createReadStream(encryptedFilePath, { start: 16 }); // Empezar a leer después del IV
    const output = fs.createWriteStream(encryptedFilePath.replace('.enc', ''));
    
    input.pipe(decipher).pipe(output);
    
    output.on('finish', () => {
        console.log('Backup desencriptado con éxito.');
        loadBackupIntoDatabase(encryptedFilePath.replace('.enc', ''));
    });
};
async function loadBackupIntoDatabase(filePath) {
    const loadCommand = `mysql -h${database.host} -u ${database.user}${database.password != '' ? ' -p' + database.password : ''} ${database.database} < ${filePath}`;
    await exec(loadCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al restaurar el backup: ${error}`);
            return;
        }
        console.log('Backup restaurado con éxito.');
        eliminarArchivo(filePath)
    });
}
module.exports = {
    backupDatabase,
    restoreDatabase,
}