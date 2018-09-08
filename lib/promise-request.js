const request = require("request");

module.exports = options => new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
        if (err) {
            reject(err);
        }

        resolve({ res, body });
    });
});
