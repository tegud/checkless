const request = require("../promise-request");

module.exports = {
    sendToSlack: attachments => request({
        url: `https://hooks.slack.com${process.env.webhookUrl}`,
        method: "POST",
        json: { attachments },
    }),
};
