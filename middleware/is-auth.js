const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const header = req.get('Authorization');
    if (!header) {
        const err = new Error('header bot found..');
        err.statusCode = 401;
        throw (err);
    }
    const token = header.split(' ')[1];
    let decodeToken;
    try {
        decodeToken = jwt.verify(token, 'secretcodedf');
    } catch (err) {
        err.statusCode = 500;
        throw (err);
    }
    if (!decodeToken) {
        const err = new Error('not authenticated');
        err.statusCode = 401;
        throw (err);
    }
    req.userId = decodeToken.userId;
    next();
}