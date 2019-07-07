const songRLEcommas = songString => {
    for (let i = 0; i < songString.length; ++i) {
        let char = songString[i];

        if (char === ',') {
            commaCount++;
        } else {
            if (commaCount === 1) {
                result += ',';
            }
            else if (commaCount === 2) {
                result += ',,';
            }
            else if (commaCount >= 3) {
                result += '(' + commaCount + ')';
            }
            commaCount = 0;
            result += char;
        }
    }

    return result;
};

const songUnRLEcommas = s => {
    let i = s.indexOf('('), j = s.indexOf(')');
    return i < 0 ? eval(`x=${s};x`) : decompress(s.substr(0, i) + ','.repeat(parseInt(s.substr(i+1,j-i))) + s.substr(j+1));
};