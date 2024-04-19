const odbc = require('odbc');

async function con() {
    //const connection = await odbc.connect('Driver={NetezzaSQL};server=10.49.5.173;UserName=U_RFISCAL;Password=R)1=sc4%l23;Database=SYSTEM;LoginTimeout=120');
    const connection = await odbc.connect('Driver={NetezzaSQL};server=10.49.5.173;UserName=U_ISHERRERA;Password=Isherra23;Database=SYSTEM;LoginTimeout=120');
    console.log('Base de datos conectada Netezza SYSTEM');
    return connection;
}
const netezzaConnection = con()
async function odeco() {
    //const connection = await odbc.connect('Driver={NetezzaSQL};server=10.49.5.173;UserName=U_RFISCAL;Password=R)1=sc4%l23;Database=SYSTEM;LoginTimeout=120');
    const connection = await odbc.connect('Driver={NetezzaSQL};server=10.49.5.173;UserName=U_ISHERRERA;Password=Isherra23;Database=PR_DETALLE_LLAMADAS;LoginTimeout=120');
    console.log('Base de datos conectada Netezza PR_DETALLE_LLAMADAS');
    return connection;
}
const netezzaConnectionOdeco = odeco()
module.exports = { netezzaConnection, netezzaConnectionOdeco };
