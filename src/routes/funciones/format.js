function convertirFecha(fecha) {
    const fechaOriginal = new Date(fecha);

    const dia = fechaOriginal.getDate();
    const mes = fechaOriginal.toLocaleDateString('es-ES', { month: 'short' });
    const anio = fechaOriginal.getFullYear();

    const hora = fechaOriginal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `${dia} ${mes} ${anio} - ${hora}`;
}


function extraerNumeros(texto) {
    const regex = /-\d+\s/g;
    const numerosEncontrados = texto.match(regex);

    if (numerosEncontrados) {
        return numerosEncontrados
            .map((numero) => `'${numero.replace(/-|\s/g, "").trim()}'`)
            .join(",");
    } else {
        return "";
    }
}

module.exports = {
    convertirFecha,
    extraerNumeros
};