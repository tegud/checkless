const { sendToWebhook } = require("./lib/webhook");

module.exports.sendToWebhook = async (event, context, callback) => {
    const result = JSON.parse(event.Records[0].Sns.Message);

    console.log(`Sending to webhook, Site check result: ${result.url} (${result.location}) ${result.success ? "was successful" : "failed"}`);
    console.log(result);

    await sendToWebhook(result);

    callback();
};
