const bcrypt = require("bcryptjs");
const { promisify } = require("util");


const hash = promisify( bcrypt.hash );
const genSalt = promisify(bcrypt.genSalt);
const compare = promisify(bcrypt.compare);


exports.compare = compare;
exports.saltAndHash = password => {
    return genSalt().then(salt => {
        return hash(password, salt);
    });
};