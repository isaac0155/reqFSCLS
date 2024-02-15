// Función para convertir una fecha en formato string a un formato más legible
function convertirFecha(fecha) {
    // Creación de un objeto Date a partir de la cadena de fecha proporcionada
    const fechaOriginal = new Date(fecha);

    // Extracción de los componentes de la fecha
    const dia = fechaOriginal.getDate(); // Obtención del día del mes
    const mes = fechaOriginal.toLocaleDateString('es-ES', { month: 'short' }); // Obtención del mes en formato corto y en español
    const anio = fechaOriginal.getFullYear(); // Obtención del año

    // Formateo de la hora en formato 24h con horas, minutos y segundos
    const hora = fechaOriginal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Construcción de la cadena de fecha formateada para su retorno
    return `${dia} ${mes} ${anio} - ${hora}`;
}

// Función para extraer todos los números precedidos por un guion y seguidos por un espacio en una cadena de texto
function extraerNumeros(texto) {
    // Definición de la expresión regular para identificar los números con el patrón especificado
    const regex = /-\d+\s/g;
    // Aplicación de la expresión regular al texto para encontrar coincidencias
    const numerosEncontrados = texto.match(regex);

    // Verificación de si se encontraron números
    if (numerosEncontrados) {
        // Mapeo de los números encontrados para eliminar guiones y espacios, y encapsularlos entre comillas simples
        return numerosEncontrados
            .map((numero) => `'${numero.replace(/-|\s/g, "").trim()}'`)
            .join(",");
    } else {
        // Retorno de una cadena vacía si no se encontraron números
        return "";
    }
}

// Exportación de las funciones para permitir su uso en otros archivos
module.exports = {
    convertirFecha,
    extraerNumeros
};
