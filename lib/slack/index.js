const https = require("https");

module.exports = {
    sendToSlack: async attachments => new Promise((resolve) => {
        const slackWebhookPath = process.env.webhookUrl;

        const req = https.request({
            host: "hooks.slack.com",
            path: slackWebhookPath,
            method: "POST",
        }, () => {
            resolve();
        });

        req.write(JSON.stringify({
            attachments,
        }));
        req.end();
    }),
};
