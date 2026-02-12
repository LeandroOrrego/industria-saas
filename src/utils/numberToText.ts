
export function numberToText(num: number): string {
    if (num === 0) return 'CERO';

    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];

    // Helper for hundreds
    function getHundreds(n: number): string {
        if (n > 99) {
            if (n === 100) return 'CIEN';
            const hun = Math.floor(n / 100);
            const rem = n % 100;
            let str = '';
            if (hun === 1) str = 'CIENTO';
            else if (hun === 5) str = 'QUINIENTOS';
            else if (hun === 7) str = 'SETECIENTOS';
            else if (hun === 9) str = 'NOVECIENTOS';
            else str = units[hun] + 'CIENTOS';

            if (rem > 0) str += ' ' + getTens(rem);
            return str;
        }
        return getTens(n);
    }

    function getTens(n: number): string {
        if (n < 10) return units[n];
        if (n >= 10 && n < 20) return teens[n - 10];
        const ten = Math.floor(n / 10);
        const rem = n % 10;
        if (rem === 0) return tens[ten];
        if (ten === 2) return 'VEINTI' + units[rem]; // Veintiuno, Veintidos...
        return tens[ten] + ' Y ' + units[rem];
    }

    // Main logic for Millions, Thousands
    const millions = Math.floor(num / 1000000);
    const remainderAfterMillions = num % 1000000;
    const thousands = Math.floor(remainderAfterMillions / 1000);
    const remainder = remainderAfterMillions % 1000;

    let result = '';

    if (millions > 0) {
        if (millions === 1) result += 'UN MILLON ';
        else result += getHundreds(millions) + ' MILLONES ';
    }

    if (thousands > 0) {
        if (thousands === 1) result += 'MIL ';
        else result += getHundreds(thousands) + ' MIL ';
    }

    if (remainder > 0) {
        result += getHundreds(remainder);
    }

    return result.trim() + ' GUARANIES';
}
