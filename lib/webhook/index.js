const request = require("../promise-request");

module.exports = {
    sendToWebhook: json => request({
        url: process.env.webhookUrl,
        method: "POST",
        json,
    }),
};
